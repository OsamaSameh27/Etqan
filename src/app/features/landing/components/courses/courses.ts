import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { AddcourseService } from '../../../teacher/services/addcourseservice';
import { Course } from '../../../../core/models/course.model';
import { AuthServices } from '../../../auth/services/auth.services';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-courses',
  imports: [RouterLink],
  templateUrl: './courses.html',
  styleUrl: './courses.scss',
})
export class Courses {
  coursesServices = inject(AddcourseService);
  private authService = inject(AuthServices);

  courses: Course[] = [];

  private cdr = inject(ChangeDetectorRef);
  teacherNames: { [key: string]: string } = {};

  async ngOnInit() {
    const snapshot = await this.coursesServices.getAllCourses();

    this.courses = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Course),
    }));

    const teacherIds = [
      ...new Set(
        this.courses
          .map((course) => course.teacherId)
          .filter((teacherId): teacherId is string => Boolean(teacherId)),
      ),
    ];

    const teachers = await Promise.all(
      teacherIds.map((teacherId) => this.authService.getUserData(teacherId)),
    );

    this.teacherNames = Object.fromEntries(
      teacherIds.map((teacherId, index) => [teacherId, teachers[index]?.name ?? 'مدرس الدورة']),
    );

    this.cdr.detectChanges();
  }
}
