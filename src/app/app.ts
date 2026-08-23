import { Component, inject, OnInit } from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterOutlet,
} from '@angular/router';
import AOS from 'aos';
import { AuthServices } from './features/auth/services/auth.services';
import { LoadingSpinnerServicess } from './core/shared/services/loading-spinner';
import { Loading } from './core/shared/loading/loading';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Loading],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private authServices = inject(AuthServices);

  loadingService = inject(LoadingSpinnerServicess);

  private router = inject(Router);

  private loadingTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        if (event.url.includes('#')) {
          return;
        }

        clearTimeout(this.loadingTimer);

        this.loadingTimer = setTimeout(() => {
          this.loadingService.show();
        }, 150);
      }

      if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        clearTimeout(this.loadingTimer);
        this.loadingService.hide();
      }
    });
  }

  ngOnInit(): void {
    this.authServices.checkAuthState();

    AOS.init({
      duration: 900,
      easing: 'ease-in-out',
      once: true,
      offset: 100,
    });
  }
}
