import { Routes } from '@angular/router';

export const landingRoutes: Routes = [
  {
    path: '',
    title: 'إتقان | منصة تعليمية لإدارة الدورات',
    loadComponent: () => import('./pages/landing-page/landing-page').then((m) => m.LandingPage),
  },
  {
    path: 'course-details/:id',
    title: 'تفاصيل الدورة | إتقان',
    loadComponent: () =>
      import('./components/course-details/course-details').then((m) => m.CourseDetails),
  },
  {
    path: 'all-courses',
    title: ' جميع الدورات | إتقان',
    loadComponent: () =>
      import('./pages/all-courses/all-courses').then((m) => m.AllCourses),
  },
];
