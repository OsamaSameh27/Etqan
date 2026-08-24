import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Course } from '../../../../../core/models/course.model';
import { Group } from '../../../../../core/models/group.model';
import { User } from '../../../../../core/models/user.model';
import { UserService } from '../../../../../core/services/user-service';
import { Alerts } from '../../../../../core/utils/alerts';
import { AuthServices } from '../../../../auth/services/auth.services';
import { CloudinaryService } from '../../../../auth/services/cloudinary.service';
import { AddcourseService } from '../../../services/addcourseservice';
import { Addgroupservice } from '../../../services/addgroupservice';

@Component({
  selector: 'app-profile',
  imports: [FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile {
  private authService = inject(AuthServices);
  private cloudinaryService = inject(CloudinaryService);
  private addCourseService = inject(AddcourseService);
  private addGroupService = inject(Addgroupservice);
  private userService = inject(UserService);
  private cdr = inject(ChangeDetectorRef);

  user: User | null = null;
  courses: Course[] = [];
  groups: Group[] = [];
  isLoading = true;
  isEditing = false;
  isSaving = false;
  selectedImage: File | null = null;
  imagePreview = '';

  editData = {
    name: '',
    phone: '',
    experienceYears: 0,
    bio: '',
    image: '',
  };

  async ngOnInit() {
    try {
      const firebaseUser = await this.authService.getCurrentUser();
      if (!firebaseUser) return;

      const [userData, coursesSnapshot, groupsSnapshot] = await Promise.all([
        this.authService.getUserData(firebaseUser.uid),
        this.addCourseService.getTeacherCourses(firebaseUser.uid),
        this.addGroupService.getTeacherGroups(firebaseUser.uid),
      ]);

      this.user = userData;
      this.courses = coursesSnapshot.docs.map((courseDocument) => ({
        id: courseDocument.id,
        ...(courseDocument.data() as Course),
      }));
      this.groups = groupsSnapshot.docs.map((groupDocument) => ({
        id: groupDocument.id,
        ...(groupDocument.data() as Group),
      }));
    } catch (error) {
      console.error('Error loading teacher profile:', error);
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
      experienceYears: this.user.experienceYears ?? 0,
      bio: this.user.bio ?? '',
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
        experienceYears: Number(this.editData.experienceYears),
        bio: this.editData.bio.trim(),
        image: imageUrl,
      };

      await this.authService.saveUserData(firebaseUser.uid, updatedUser);
      this.user = updatedUser;
      this.userService.user.set(updatedUser);
      this.revokeLocalPreview();
      this.selectedImage = null;
      this.imagePreview = '';
      this.isEditing = false;
      Alerts.success('تم تحديث البيانات', 'تم حفظ بيانات ملفك الشخصي بنجاح');
    } catch (error) {
      console.error('Error updating teacher profile:', error);
      Alerts.error('تعذر حفظ البيانات', 'حاول مرة أخرى بعد قليل');
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  get profileImage() {
    return this.isEditing && this.imagePreview ? this.imagePreview : (this.user?.image ?? '');
  }

  get gradesLabel() {
    const labels: Record<string, string> = {
      'الاول الثانوي': 'الأول الثانوي',
      'الثاني الثانوي': 'الثاني الثانوي',
      'الثالث الثانوي': 'الثالث الثانوي',
    };

    return this.user?.grades?.map((grade) => labels[grade] ?? grade).join('، ') || 'غير محددة';
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

    if (Number(this.editData.experienceYears) < 0) {
      Alerts.error('سنوات الخبرة غير صحيحة', 'سنوات الخبرة لا يمكن أن تكون قيمة سالبة');
      return false;
    }

    if (this.editData.bio.trim().length < 10) {
      Alerts.error('النبذة قصيرة', 'النبذة يجب أن تكون 10 أحرف على الأقل');
      return false;
    }

    return true;
  }

  private revokeLocalPreview() {
    if (this.selectedImage && this.imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(this.imagePreview);
    }
  }
}
