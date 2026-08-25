import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Alerts } from '../../../../core/utils/alerts';
import { AuthServices } from '../../services/auth.services';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPassword {
  private fb = inject(NonNullableFormBuilder);
  private authService = inject(AuthServices);
  private cdr = inject(ChangeDetectorRef);

  isSubmitting = false;
  emailSent = false;
  sentEmail = '';

  forgotPasswordForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  async sendResetLink() {
    if (this.forgotPasswordForm.invalid || this.isSubmitting) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    try {
      const email = this.forgotPasswordForm.controls.email.value.trim().toLowerCase();
      await this.authService.sendPasswordResetLink(email);
      this.sentEmail = email;
      this.emailSent = true;
      this.isSubmitting = false;
      this.cdr.detectChanges();
      Alerts.success(
        'تم استلام طلبك',
        'إذا كان البريد مرتبطًا بحساب، ستصلك رسالة الاستعادة خلال دقائق',
      );
    } catch (error: any) {
      switch (error?.code) {
        case 'auth/invalid-email':
          Alerts.error('البريد غير صحيح', 'اكتب بريدًا إلكترونيًا صحيحًا');
          break;
        case 'auth/too-many-requests':
          Alerts.error('محاولات كثيرة', 'انتظر قليلًا قبل طلب رابط جديد');
          break;
        case 'auth/network-request-failed':
          Alerts.error('مشكلة في الإنترنت', 'تحقق من اتصالك بالإنترنت وحاول مرة أخرى');
          break;
        default:
          Alerts.error('تعذر إرسال الرابط', 'حدث خطأ غير متوقع، حاول مرة أخرى');
      }
    } finally {
      this.isSubmitting = false;
      this.cdr.detectChanges();
    }
  }

  useAnotherEmail() {
    this.emailSent = false;
    this.sentEmail = '';
    this.forgotPasswordForm.reset();
  }
}
