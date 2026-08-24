import { authGuard } from '../../core/Guards/auth-guard-guard';
import { roleGuard } from '../../core/Guards/role-guard';
import { Routes } from '@angular/router';

export const teacherRoutes: Routes = [
  {
    path: '',
    title: 'لوحة تحكم المدرس | إتقان',
    canActivate: [authGuard, roleGuard('teacher')],
    loadComponent: () =>
      import('./pages/dashboard/thdashboard/thdashboard').then((m) => m.Thdashboard),

    children: [
      {
        path: 'add-course',
        title: 'إضافة دورة | إتقان',
        loadComponent: () => import('./components/add-course/add-course').then((m) => m.AddCourse),
      },
      {
        path: 'your-courses',
        title: 'دوراتي | إتقان',
        loadComponent: () =>
          import('./pages/dashboard/your-courses/your-courses').then((m) => m.YourCourses),
      },
      {
        path: 'groups',
        title: 'المجموعات | إتقان',
        loadComponent: () => import('./pages/dashboard/groups/groups').then((m) => m.Groups),
      },
      {
        path: 'requests',
        title: 'طلبات الاشتراك | إتقان',
        loadComponent: () =>
          import('./pages/dashboard/enrollment-requests/enrollment-requests').then(
            (m) => m.TeacherEnrollmentRequests,
          ),
      },
      {
        path: 'profile',
        title: 'الملف الشخصي | إتقان',
        loadComponent: () => import('./pages/dashboard/profile/profile').then((m) => m.Profile),
      },
      {
        path: 'setting',
        title: 'الإعدادات | إتقان',
        loadComponent: () => import('./pages/dashboard/setting/setting').then((m) => m.Setting),
      },
    ],
  },
];
