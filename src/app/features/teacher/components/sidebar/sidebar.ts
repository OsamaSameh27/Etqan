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
      Alerts.success('Logout', 'You have been logged out successfully.');
      await this.authService.checkAuthState();
      this.router.navigate(['/login']);
    } catch (error) {
      Alerts.error('Logout Failed', 'An error occurred while logging out. Please try again.');
    }
  }
}
