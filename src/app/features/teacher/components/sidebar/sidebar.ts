import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthServices } from '../../../auth/services/auth.services';
import { Alerts } from '../../../../core/utils/alerts';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterLink,RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  isOpen = false;
  private authService = inject(AuthServices);
  private router = inject(Router);

  toggle() {
    this.isOpen = !this.isOpen;
  }

  close() {
    this.isOpen = false;
  }

  async logout() {
    try {
      await this.authService.logout();
      Alerts.success('تم تسجيل الخروج', 'تم تسجيل خروجك بنجاح.');
      await this.authService.checkAuthState();
      this.router.navigate(['/login']);
    } catch (error) {
      Alerts.error('تعذر تسجيل الخروج', 'حدث خطأ أثناء تسجيل الخروج، يرجى المحاولة مرة أخرى.');
    }
  }
}
