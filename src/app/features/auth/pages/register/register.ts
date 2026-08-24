import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { passwordMatchValidator } from '../../../../core/validators/password-match.validator';
import { AuthServices } from '../../services/auth.services';
import { RouterLink, Router } from '@angular/router';
import { Alerts } from '../../../../core/utils/alerts';
import { User } from '../../../../core/models/user.model';
import { Breadcrumbs } from '../../../../core/shared/breadcrumbs/breadcrumbs';
import { CloudinaryService } from '../../services/cloudinary.service';
import { LoadingSpinnerServicess } from '../../../../core/shared/services/loading-spinner';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, Breadcrumbs],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  readonly secondarySubjects = [
    'اللغة العربية',
    'اللغة الإنجليزية',
    'اللغة الفرنسية',
    'اللغة الألمانية',
    'اللغة الإيطالية',
    'اللغة الإسبانية',
    'اللغة الصينية',
    'الرياضيات',
    'العلوم المتكاملة',
    'الفيزياء',
    'الكيمياء',
    'الأحياء',
    'التاريخ',
    'الجغرافيا',
    'الفلسفة والمنطق',
    'علم النفس',
    'الإحصاء',
    'البرمجة والذكاء الاصطناعي',
    'التربية الدينية',
    'التربية الوطنية',
    'التربية الرياضية',
  ];

  showPassword = false;
  showConfirmPassword = false;
  isSubmitting = false;
  selectedImage: File | null = null;
  imagePreview = '';

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  private fb = inject(NonNullableFormBuilder);
  registerForm = this.fb.group(
    {
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]{11}$/)]],
      guardianPhone: ['', [Validators.required, Validators.pattern(/^[0-9]{11}$/)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      role: ['student' as 'student' | 'teacher', Validators.required],
      studentGrade: ['', Validators.required],
      studentTrack: ['' as '' | 'علمي' | 'أدبي'],

      subject: [''],
      bio: ['', Validators.minLength(10)],
      experienceYears: [],
      grades: [[] as string[]],
    },
    {
      validators: passwordMatchValidator(),
    },
  );

  selectRole(role: 'student' | 'teacher') {
    this.registerForm.controls.role.setValue(role);
    this.updateRoleValidators(role);
  }
  private updateRoleValidators(role: 'student' | 'teacher') {
    const subject = this.registerForm.controls.subject;
    const bio = this.registerForm.controls.bio;
    const experienceYears = this.registerForm.controls.experienceYears;
    const grads = this.registerForm.controls.grades;
    const guardianPhone = this.registerForm.controls.guardianPhone;
    const studentGrade = this.registerForm.controls.studentGrade;
    const studentTrack = this.registerForm.controls.studentTrack;

    if (role === 'teacher') {
      subject.setValidators(Validators.required);

      bio.setValidators([Validators.required, Validators.minLength(10)]);

      experienceYears.setValidators([Validators.required, Validators.min(0)]);

      grads.setValidators([Validators.required, Validators.minLength(1)]);
      guardianPhone.clearValidators();
      studentGrade.clearValidators();
      studentTrack.clearValidators();
    } else {
      subject.clearValidators();
      bio.clearValidators();
      experienceYears.clearValidators();
      grads.clearValidators();
      guardianPhone.setValidators([
        Validators.required,
        Validators.pattern(/^[0-9]{11}$/),
      ]);
      studentGrade.setValidators(Validators.required);
      this.updateStudentTrackValidators();
    }

    subject.updateValueAndValidity();
    bio.updateValueAndValidity();
    experienceYears.updateValueAndValidity();
    grads.updateValueAndValidity();
    guardianPhone.updateValueAndValidity();
    studentGrade.updateValueAndValidity();
    studentTrack.updateValueAndValidity();
  }

  onStudentGradeChange() {
    this.updateStudentTrackValidators();
  }

  selectStudentTrack(track: 'علمي' | 'أدبي') {
    this.registerForm.controls.studentTrack.setValue(track);
    this.registerForm.controls.studentTrack.markAsTouched();
  }

  private updateStudentTrackValidators() {
    const grade = this.registerForm.controls.studentGrade.value;
    const studentTrack = this.registerForm.controls.studentTrack;
    const requiresTrack = grade === 'الثاني الثانوي' || grade === 'الثالث الثانوي';

    if (requiresTrack) {
      studentTrack.setValidators(Validators.required);
    } else {
      studentTrack.clearValidators();
      studentTrack.setValue('');
    }

    studentTrack.updateValueAndValidity();
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (this.imagePreview) {
      URL.revokeObjectURL(this.imagePreview);
    }

    this.selectedImage = file;
    this.imagePreview = URL.createObjectURL(file);

    // قيمة مؤقتة لإزالة خطأ required من حقل الصورة
  }

  onGradeChange(grade: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const currentGrades = this.registerForm.controls.grades.value as string[];

    if (checked) {
      this.registerForm.controls.grades.setValue([...currentGrades, grade]);
    } else {
      this.registerForm.controls.grades.setValue(currentGrades.filter((g) => g !== grade));
    }
    this.registerForm.controls.grades.markAsTouched();
  }

  isGradeChecked(grade: string): boolean {
    const currentGrades = this.registerForm.controls.grades.value as string[];
    return currentGrades.includes(grade);
  }

  private authServices = inject(AuthServices);
  private router = inject(Router);
  private cloudinaryService = inject(CloudinaryService);
  private loadingService = inject(LoadingSpinnerServicess);

  async register() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    if (!this.selectedImage) {
      Alerts.error('الصورة مطلوبة', 'يرجى اختيار صورة شخصية');
      return;
    }

    this.isSubmitting = true;
    this.loadingService.show();

    try {
      const formValue = this.registerForm.getRawValue();
      const imageUrl = await this.cloudinaryService.uploadImage(this.selectedImage);
  

      const userCredential = await this.authServices.register(formValue.email, formValue.password);

      const userData: User = {
        name: formValue.name,
        email: formValue.email,
        phone: formValue.phone,
        role: formValue.role as 'student' | 'teacher',
        grades: formValue.grades,
        image: imageUrl,
      };
      if (formValue.role === 'teacher') {
        userData.subject = formValue.subject;
        userData.bio = formValue.bio;
        userData.experienceYears = formValue.experienceYears;
        userData.grades = formValue.grades;
      } else {
        userData.guardianPhone = formValue.guardianPhone;
        userData.studentGrade = formValue.studentGrade;

        if (formValue.studentTrack) {
          userData.studentTrack = formValue.studentTrack;
        }
      }
      await this.authServices.saveUserData(userCredential.user.uid, userData);

      Alerts.success('تم إنشاء الحساب بنجاح', 'تم إنشاء الحساب بنجاح');
      await this.router.navigate(['/login']);
    } catch (error: any) {
      switch (error.code) {
        case 'auth/email-already-in-use':
          Alerts.error('البريد الإلكتروني مستخدم', 'هذا البريد الإلكتروني مستخدم بالفعل.');
          break;

        case 'auth/invalid-email':
          Alerts.error('بريد إلكتروني غير صالح', 'يرجى إدخال بريد إلكتروني صحيح.');
          break;

        case 'auth/weak-password':
          Alerts.error('كلمة المرور ضعيفة', 'يجب أن تكون كلمة المرور 6 أحرف على الأقل.');
          break;

        default:
          Alerts.error('حدث خطأ', error.message);
      }
    } finally {
      this.isSubmitting = false;
      this.loadingService.hide();
    }
  }
}
