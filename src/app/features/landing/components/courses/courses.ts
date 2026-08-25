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
  showingLatestCourses = false;
  isLoading = true;
  loadError = false;

  private cdr = inject(ChangeDetectorRef);
  teacherNames: { [key: string]: string } = {};

  ngOnInit(): void {
    void this.loadCourses();
  }

  async loadCourses(): Promise<void> {
    this.isLoading = true;
    this.loadError = false;

    try {
      const snapshot = await this.coursesServices.getAllCourses();

      const allCourses = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Course),
      }));

      const popularCourses = allCourses
        .filter((course) => (course.requestCount ?? 0) > 0)
        .sort((first, second) => (second.requestCount ?? 0) - (first.requestCount ?? 0));

      this.showingLatestCourses = popularCourses.length === 0;
      this.courses = this.showingLatestCourses
        ? allCourses
            .sort((first, second) => second.createdAt.toMillis() - first.createdAt.toMillis())
            .slice(0, 5)
        : popularCourses.slice(0, 6);

      const teacherIds = [
        ...new Set(
          this.courses
            .map((course) => course.teacherId)
            .filter((teacherId): teacherId is string => Boolean(teacherId)),
        ),
      ];

      const teachers = await Promise.all(
        teacherIds.map((teacherId) => this.authService.getPublicTeacherProfile(teacherId)),
      );

      this.teacherNames = Object.fromEntries(
        teacherIds.map((teacherId, index) => [teacherId, teachers[index]?.name ?? 'مدرس الدورة']),
      );
    } catch (error) {
      console.error('Error loading landing courses:', error);
      this.courses = [];
      this.loadError = true;
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
}
