import { Routes } from '@angular/router';
import { authGuard } from '../../core/Guards/auth-guard-guard';
import { roleGuard } from '../../core/Guards/role-guard';
import { MyCourses } from './pages/my-courses/my-courses';

export const studentRoutes: Routes = [
  {
    path: '',
    title: 'لوحة تحكم الطالب | إتقان',
    canActivate: [authGuard, roleGuard('student')],
    loadComponent: () => import('./pages/stdashboard/stdashboard').then((m) => m.Stdashboard),
    children: [
      {
        path: 'my-courses',
        title: 'دوراتي | إتقان',
        loadComponent: () => import('./pages/my-courses/my-courses').then((m) => m.MyCourses),
      },
    ],
  },
];
