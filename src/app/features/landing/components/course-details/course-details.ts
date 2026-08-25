import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AddcourseService } from '../../../teacher/services/addcourseservice';
import { AuthServices } from '../../../auth/services/auth.services';
import { Course } from '../../../../core/models/course.model';
import { Breadcrumbs } from '../../../../core/shared/breadcrumbs/breadcrumbs';
import { BreadcrumbsServise } from '../../../../core/shared/services/breadcrumbs-servise';
import { Addgroupservice } from '../../../teacher/services/addgroupservice';
import { Group } from '../../../../core/models/group.model';
import { getGroupScheduleParts } from '../../../../core/utils/group-schedule';
import { Alerts } from '../../../../core/utils/alerts';


@Component({
  selector: 'app-course-details',
  imports: [RouterModule, Breadcrumbs],
  templateUrl: './course-details.html',
  styleUrl: './course-details.scss',
})
export class CourseDetails {
  private route = inject(ActivatedRoute);
  private courseService = inject(AddcourseService);
  private authService = inject(AuthServices);
  private cdr = inject(ChangeDetectorRef);
  private breadcrumbsService = inject(BreadcrumbsServise);
  private groupService = inject(Addgroupservice);
  private router = inject(Router);

  course: Course | null = null;
  teacherName = '';
  isLoading = true;
  courseNotFound = false;
  groups: Group[] = [];
  groupsLoading = true;
  groupsLoadFailed = false;

  async ngOnInit() {
    try {
      const courseId = this.route.snapshot.paramMap.get('id');

      if (!courseId) {
        this.courseNotFound = true;
        return;
      }

      const snapshot = await this.courseService.getCourseById(courseId);

      if (!snapshot.exists()) {
        this.courseNotFound = true;
        return;
      }

      this.course = {
        id: snapshot.id,
        ...(snapshot.data() as Course),
      };
      this.breadcrumbsService.setCourseName(this.course.title);

      try {
        const groupsSnapshot = await this.groupService.getCourseGroups(courseId);
        this.groups = groupsSnapshot.docs.map((groupDocument) => ({
          id: groupDocument.id,
          ...(groupDocument.data() as Group),
        }));
      } catch (error) {
        console.error('Error loading course groups:', error);
        this.groupsLoadFailed = true;
      } finally {
        this.groupsLoading = false;
      }

      if (this.course.teacherId) {
        const teacher = await this.authService.getPublicTeacherProfile(this.course.teacherId);

        if (teacher) {
          this.teacherName = teacher.name;
        }
      }
    } catch (error) {
      console.error('Error loading course details:', error);
      this.courseNotFound = true;
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  scrollToGroups() {
    document.getElementById('course-groups')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  groupDays(group: Group) {
    return getGroupScheduleParts(group).days;
  }

  groupTime(group: Group) {
    return getGroupScheduleParts(group).time;
  }

  async chooseGroup(group: Group) {
    if (!this.course?.id || !group.id) return;

    const enrollmentUrl = `/dashboard/student/enroll/${this.course.id}/${group.id}`;
    const firebaseUser = await this.authService.getCurrentUser();

    if (!firebaseUser) {
      await this.router.navigate(['/login'], {
        queryParams: { returnUrl: enrollmentUrl },
      });
      return;
    }

    const user = await this.authService.getUserData(firebaseUser.uid);

    if (user?.role === 'teacher') {
      Alerts.error(
        'الاشتراك متاح للطلاب فقط',
        'حساب المدرس لا يمكنه الاشتراك في الكورسات. يمكنك متابعة إدارة كورساتك من لوحة التحكم.',
      );
      return;
    }

    if (user?.role === 'student') {
      await this.router.navigateByUrl(enrollmentUrl);
      return;
    }

    await this.router.navigate(['/login'], {
      queryParams: { returnUrl: enrollmentUrl },
    });
  }
}
