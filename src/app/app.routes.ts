import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layouts/main-layout/main-layout').then((m) => m.MainLayout),

    children: [
      {
        path: '',
        loadChildren: () =>
          import('./features/landing/landing.routes').then((m) => m.landingRoutes),
      },
    ],
  },

  {
    path: '',
    loadComponent: () => import('./layouts/auth-layout/auth-layout').then((m) => m.AuthLayout),

    children: [
      {
        path: '',
        loadChildren: () => import('./features/auth/auth.routes').then((m) => m.authRoutes),
      },
    ],
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./layouts/dashboard-layout/dashboard-layout').then((m) => m.DashboardLayout),

    children: [
      {
        path: 'student',
        loadChildren: () =>
          import('./features/student/student.routes').then((m) => m.studentRoutes),
      },
      {
        path: 'teacher',
        loadChildren: () =>
          import('./features/teacher/teacher.routes').then((m) => m.teacherRoutes),
      },
    ],
  },

  {
    path: '**',
    title: 'الصفحة غير موجودة | إتقان',
    loadComponent: () => import('./core/shared/not-found/not-found').then((m) => m.NotFound),
  },
];
