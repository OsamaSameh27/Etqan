import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AddcourseService } from '../../../teacher/services/addcourseservice';
import { AuthServices } from '../../../auth/services/auth.services';
import { Course } from '../../../../core/models/course.model';
import { Breadcrumbs } from '../../../../core/shared/breadcrumbs/breadcrumbs';
import { BreadcrumbsServise } from '../../../../core/shared/services/breadcrumbs-servise';


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

  course: Course | null = null;
  teacherName = '';

  async ngOnInit() {
    const courseId = this.route.snapshot.paramMap.get('id');

    if (!courseId) {
      return;
    }

    const snapshot = await this.courseService.getCourseById(courseId);

    if (!snapshot.exists()) {
      return;
    }

    this.course = {
      id: snapshot.id,
      ...(snapshot.data() as Course),
    };
    this.breadcrumbsService.setCourseName(this.course.title);

    if (this.course.teacherId) {
      const teacher = await this.authService.getUserData(this.course.teacherId);

      if (teacher) {
        this.teacherName = teacher.name;
      }
    }

    this.cdr.detectChanges();
  }
}
