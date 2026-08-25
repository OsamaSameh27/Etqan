import {
  AfterViewInit,
  Component,
  DestroyRef,
  HostListener,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { UserService } from '../../../../core/services/user-service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar implements AfterViewInit, OnDestroy {
  private userService = inject(UserService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private animationFrameId: number | null = null;

  readonly sectionIds = ['hero', 'courses', 'how-it-works', 'teachers', 'faq', 'contact'] as const;
  readonly activeSection = signal<string | null>(null);
  user = this.userService.user;

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.queueActiveSectionUpdate());
  }

  ngAfterViewInit(): void {
    this.queueActiveSectionUpdate();
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  queueActiveSectionUpdate(): void {
    if (this.animationFrameId !== null) return;

    this.animationFrameId = window.requestAnimationFrame(() => {
      this.animationFrameId = null;
      this.updateActiveSection();
    });
  }

  selectSection(sectionId: string): void {
    this.activeSection.set(sectionId);

    if (window.innerWidth < 992) {
      document.getElementById('navbarNavDropdown')?.classList.remove('show');

      const toggler = document.querySelector<HTMLElement>('[aria-controls="navbarNavDropdown"]');
      toggler?.classList.add('collapsed');
      toggler?.setAttribute('aria-expanded', 'false');
    }
  }

  ngOnDestroy(): void {
    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId);
    }
  }

  private updateActiveSection(): void {
    const currentPath = this.router.url.split(/[?#]/)[0];

    if (currentPath !== '/') {
      this.activeSection.set(null);
      return;
    }

    const sections = this.sectionIds
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null);

    if (!sections.length) {
      this.activeSection.set('hero');
      return;
    }

    const reachedPageEnd =
      window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;

    if (reachedPageEnd) {
      this.activeSection.set(sections.at(-1)?.id ?? 'contact');
      return;
    }

    const activationLine = window.innerHeight * 0.38;
    let currentSection = sections[0].id;

    for (const section of sections) {
      if (section.getBoundingClientRect().top <= activationLine) {
        currentSection = section.id;
      } else {
        break;
      }
    }

    this.activeSection.set(currentSection);
  }
}
