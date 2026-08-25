import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { User } from '../../../../core/models/user.model';
import { UserService } from '../../../../core/services/user-service';
import { Alerts } from '../../../../core/utils/alerts';
import { AuthServices } from '../../../auth/services/auth.services';
import { CloudinaryService } from '../../../auth/services/cloudinary.service';

@Component({
  selector: 'app-profile',
  imports: [FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile {
  private authService = inject(AuthServices);
  private cloudinaryService = inject(CloudinaryService);
  private userService = inject(UserService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  user: User | null = null;
  isLoading = true;
  isEditing = false;
  isSaving = false;
  selectedImage: File | null = null;
  imagePreview = '';
  showPasswordForm = false;
  isChangingPassword = false;
  passwordData = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  };

  editData = {
    name: '',
    phone: '',
    guardianPhone: '',
    studentGrade: '',
    studentTrack: '' as '' | 'علمي' | 'أدبي',
    image: '',
  };

  async ngOnInit() {
    try {
      const firebaseUser = await this.authService.getCurrentUser();
      if (!firebaseUser) return;

      this.user = await this.authService.getUserData(firebaseUser.uid);
    } catch (error) {
      console.error('Error loading student profile:', error);
      Alerts.error('تعذر تحميل البيانات', 'حاول مرة أخرى بعد قليل');
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  startEditing() {
    if (!this.user) return;

    this.editData = {
      name: this.user.name,
      phone: this.user.phone,
      guardianPhone: this.user.guardianPhone ?? '',
      studentGrade: this.user.studentGrade ?? '',
      studentTrack: this.user.studentTrack ?? '',
      image: this.user.image ?? '',
    };
    this.selectedImage = null;
    this.imagePreview = this.user.image ?? '';
    this.isEditing = true;
  }

  cancelEditing() {
    this.revokeLocalPreview();
    this.selectedImage = null;
    this.imagePreview = '';
    this.isEditing = false;
  }

  onStudentGradeChange() {
    if (!this.requiresTrack) {
      this.editData.studentTrack = '';
    }
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      Alerts.error('ملف غير صالح', 'اختر صورة بصيغة JPG أو PNG أو WebP');
      input.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      Alerts.error('الصورة كبيرة', 'الحد الأقصى لحجم الصورة هو 5 ميجابايت');
      input.value = '';
      return;
    }

    this.revokeLocalPreview();
    this.selectedImage = file;
    this.imagePreview = URL.createObjectURL(file);
  }

  async saveChanges() {
    if (!this.user || this.isSaving || !this.validateForm()) return;

    this.isSaving = true;

    try {
      const firebaseUser = await this.authService.getCurrentUser();
      if (!firebaseUser) return;

      let imageUrl = this.editData.image;
      if (this.selectedImage) {
        imageUrl = await this.cloudinaryService.uploadImage(this.selectedImage);
      }

      const updatedUser: User = {
        ...this.user,
        name: this.editData.name.trim(),
        phone: this.editData.phone.trim(),
        guardianPhone: this.editData.guardianPhone.trim(),
        studentGrade: this.editData.studentGrade,
        image: imageUrl,
      };

      if (this.requiresTrack) {
        updatedUser.studentTrack = this.editData.studentTrack as 'علمي' | 'أدبي';
      } else {
        delete updatedUser.studentTrack;
      }

      await this.authService.saveUserData(firebaseUser.uid, updatedUser);
      this.user = updatedUser;
      this.userService.user.set(updatedUser);
      this.revokeLocalPreview();
      this.selectedImage = null;
      this.imagePreview = '';
      this.isEditing = false;
      Alerts.success('تم تحديث البيانات', 'تم حفظ بيانات ملفك الشخصي بنجاح');
    } catch (error) {
      console.error('Error updating student profile:', error);
      Alerts.error('تعذر حفظ البيانات', 'حاول مرة أخرى بعد قليل');
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  togglePasswordForm() {
    this.showPasswordForm = !this.showPasswordForm;
    if (!this.showPasswordForm) this.resetPasswordForm();
  }

  async changePassword() {
    if (this.isChangingPassword) return;

    if (!this.passwordData.currentPassword) {
      Alerts.error('كلمة المرور الحالية مطلوبة', 'اكتب كلمة المرور الحالية أولًا');
      return;
    }

    if (this.passwordData.newPassword.length < 6) {
      Alerts.error('كلمة المرور قصيرة', 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    if (this.passwordData.newPassword !== this.passwordData.confirmPassword) {
      Alerts.error('كلمتا المرور غير متطابقتين', 'تأكد من كتابة كلمة المرور الجديدة بشكل صحيح');
      return;
    }

    if (this.passwordData.currentPassword === this.passwordData.newPassword) {
      Alerts.error('اختر كلمة مرور مختلفة', 'كلمة المرور الجديدة مطابقة لكلمة المرور الحالية');
      return;
    }

    this.isChangingPassword = true;

    try {
      await this.authService.changeCurrentUserPassword(
        this.passwordData.currentPassword,
        this.passwordData.newPassword,
      );
      await this.authService.logout();
      Alerts.success('تم تغيير كلمة المرور', 'سجل الدخول مرة أخرى باستخدام كلمة المرور الجديدة');
      await this.router.navigate(['/login']);
    } catch (error: any) {
      const isWrongPassword =
        error?.code === 'auth/invalid-credential' || error?.code === 'auth/wrong-password';
      Alerts.error(
        'تعذر تغيير كلمة المرور',
        isWrongPassword
          ? 'كلمة المرور الحالية غير صحيحة'
          : 'حدث خطأ أثناء تغيير كلمة المرور، حاول مرة أخرى',
      );
    } finally {
      this.isChangingPassword = false;
      this.cdr.detectChanges();
    }
  }

  get profileImage() {
    return this.isEditing && this.imagePreview ? this.imagePreview : (this.user?.image ?? '');
  }

  get requiresTrack() {
    return (
      this.editData.studentGrade === 'الثاني الثانوي' ||
      this.editData.studentGrade === 'الثالث الثانوي'
    );
  }

  gradeLabel(grade?: string) {
    const labels: Record<string, string> = {
      'الاول الثانوي': 'الأول الثانوي',
      'الثاني الثانوي': 'الثاني الثانوي',
      'الثالث الثانوي': 'الثالث الثانوي',
    };

    return grade ? (labels[grade] ?? grade) : 'غير محدد';
  }

  private validateForm() {
    if (this.editData.name.trim().length < 3) {
      Alerts.error('الاسم غير صحيح', 'الاسم يجب أن يكون 3 أحرف على الأقل');
      return false;
    }

    if (!/^[0-9]{11}$/.test(this.editData.phone.trim())) {
      Alerts.error('رقم الهاتف غير صحيح', 'رقم الهاتف يجب أن يكون 11 رقمًا');
      return false;
    }

    if (!/^[0-9]{11}$/.test(this.editData.guardianPhone.trim())) {
      Alerts.error('رقم ولي الأمر غير صحيح', 'رقم ولي الأمر يجب أن يكون 11 رقمًا');
      return false;
    }

    if (!this.editData.studentGrade) {
      Alerts.error('الصف الدراسي مطلوب', 'اختر الصف الدراسي');
      return false;
    }

    if (this.requiresTrack && !this.editData.studentTrack) {
      Alerts.error('الشعبة الدراسية مطلوبة', 'اختر علمي أو أدبي');
      return false;
    }

    return true;
  }

  private revokeLocalPreview() {
    if (this.selectedImage && this.imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(this.imagePreview);
    }
  }

  private resetPasswordForm() {
    this.passwordData = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    };
  }
}
