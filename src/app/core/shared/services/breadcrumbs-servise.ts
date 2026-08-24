import { inject, Service, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

export interface Breadcrumb {
  label: string;
  url: string;
}

@Service()
export class BreadcrumbsServise {
  private router = inject(Router);

  breadcrumbs = signal<Breadcrumb[]>([]);

  constructor() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.updateBreadcrumbs());

    this.updateBreadcrumbs();
  }

  private updateBreadcrumbs(): void {
    const currentPath = this.router.url.split('?')[0].split('#')[0];
    const segments = currentPath.split('/').filter(Boolean);

    if (segments[0] === 'course-details') {
      this.breadcrumbs.set([
        { label: 'الرئيسية', url: '/' },
        { label: 'كل الكورسات', url: '/all-courses' },
        { label: 'تفاصيل الكورس', url: currentPath },
      ]);
      return;
    }

    const breadcrumbs: Breadcrumb[] = [
      {
        label: 'الرئيسية',
        url: '/',
      },
    ];

    let currentUrl = '';

    for (const segment of segments) {
      currentUrl += `/${segment}`;

      breadcrumbs.push({
        label: this.getLabel(segment),
        url: currentUrl,
      });
    }

    this.breadcrumbs.set(breadcrumbs);
  }

  private getLabel(segment: string): string {
    const labels: Record<string, string> = {
      dashboard: 'لوحة التحكم',
      teacher: 'المدرس',
      student: 'الطالب',
      courses: 'الكورسات',
      'all-courses': 'كل الكورسات',
      'course-details': 'تفاصيل الكورس',
      profile: 'الملف الشخصي',
      login: 'تسجيل الدخول',
      register: 'إنشاء حساب',
    };

    return labels[segment] ?? segment;
  }
  setCourseName(name: string): void {
    this.breadcrumbs.update((items) =>
      items.map((item, index) =>
        index === items.length - 1
          ? {
              ...item,
              label: name,
            }
          : item,
      ),
    );
  }
}
