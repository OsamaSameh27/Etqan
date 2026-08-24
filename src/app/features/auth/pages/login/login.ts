import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthServices } from '../../services/auth.services';
import { UserService } from '../../../../core/services/user-service';
import { Alerts } from '../../../../core/utils/alerts';
import { Breadcrumbs } from "../../../../core/shared/breadcrumbs/breadcrumbs";
import { LoadingSpinnerServicess } from '../../../../core/shared/services/loading-spinner';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, Breadcrumbs],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  showPassword = false;
  isSubmitting = false;

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  private fb = inject(NonNullableFormBuilder);
  private authServices = inject(AuthServices);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private userService = inject(UserService);
  private loadingService = inject(LoadingSpinnerServicess);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  async login() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.loadingService.show();

    try {
      const formValue = this.loginForm.getRawValue();

      const userCredential = await this.authServices.login(formValue.email, formValue.password);

      const user = await this.authServices.getUserData(userCredential.user.uid);
      if (!user) {
        throw new Error('User not found');
      }

      this.userService.user.set(user);

      if (user.role === 'student') {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const enrollmentUrl = returnUrl?.startsWith('/dashboard/student/enroll/')
          ? returnUrl
          : null;

        if (enrollmentUrl) {
          await this.router.navigateByUrl(enrollmentUrl);
        } else {
          await this.router.navigate(['/']);
        }
        Alerts.success('مرحبًا', `مرحبًا بك مجددًا ${user.name}`);
      }

      if (user.role === 'teacher') {
        await this.router.navigate(['/']);
        Alerts.success('مرحبًا', `أستاذ/ ${user.name}، مرحبًا بك مجددًا `);
      }
    } catch (error: any) {
      switch (error.code) {
        case 'auth/invalid-credential':
          Alerts.error('بيانات غير صحيحة', 'البريد الإلكتروني أو كلمة المرور غير صحيحة.');
          break;

        case 'auth/user-disabled':
          Alerts.error('الحساب معطل', 'تم تعطيل هذا الحساب، تواصل مع الإدارة.');
          break;

        case 'auth/too-many-requests':
          Alerts.error(
            'محاولات كثيرة',
            'تم حظر تسجيل الدخول مؤقتًا بسبب كثرة المحاولات. حاول مرة أخرى لاحقًا.',
          );
          break;

        case 'auth/network-request-failed':
          Alerts.error('مشكلة في الإنترنت', 'تحقق من اتصال الإنترنت ثم حاول مرة أخرى.');
          break;

        default:
          Alerts.error('حدث خطأ', 'حدث خطأ غير متوقع، حاول مرة أخرى.');
      }
    } finally {
      this.isSubmitting = false;
      this.loadingService.hide();
    }
  }
}
