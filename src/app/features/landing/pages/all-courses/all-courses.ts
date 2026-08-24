import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Course } from '../../../../core/models/course.model';
import { AuthServices } from '../../../auth/services/auth.services';
import { AddcourseService } from '../../../teacher/services/addcourseservice';

@Component({
  selector: 'app-all-courses',
  imports: [RouterLink, FormsModule],
  templateUrl: './all-courses.html',
  styleUrl: './all-courses.scss',
})
export class AllCourses implements OnInit {
  private coursesService = inject(AddcourseService);
  private authService = inject(AuthServices);
  private cdr = inject(ChangeDetectorRef);

  courses: Course[] = [];
  filteredCourses: Course[] = [];

  teacherNames: Record<string, string> = {};

  subjects: string[] = [];
  grades: string[] = [];

  searchTerm = '';
  selectedSubject = 'الكل';
  selectedGrade = 'الكل';

  isLoading = true;
  errorMessage = '';

  async ngOnInit() {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      const snapshot = await this.coursesService.getAllCourses();

      this.courses = snapshot.docs
        .map((courseDocument) => ({
          id: courseDocument.id,
          ...(courseDocument.data() as Course),
        }))
        .sort(
          (firstCourse, secondCourse) =>
            (secondCourse.createdAt?.toMillis() ?? 0) -
            (firstCourse.createdAt?.toMillis() ?? 0),
        );

      this.subjects = [
        ...new Set(
          this.courses
            .map((course) => course.subject)
            .filter(Boolean),
        ),
      ];

      this.grades = [
        ...new Set(
          this.courses
            .map((course) => course.grade)
            .filter(Boolean),
        ),
      ];

      await this.loadTeacherNames();

      this.applyFilters();
    } catch (error) {
      console.error('Error loading courses:', error);
      this.errorMessage = 'حدث خطأ أثناء تحميل الدورات، حاول مرة أخرى.';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async loadCourses() {
    await this.ngOnInit();
  }

  private async loadTeacherNames() {
    const teacherIds = [
      ...new Set(
        this.courses
          .map((course) => course.teacherId)
          .filter((teacherId): teacherId is string => Boolean(teacherId)),
      ),
    ];

    const teachers = await Promise.all(
      teacherIds.map(async (teacherId) => {
        const teacher = await this.authService.getUserData(teacherId);

        return [
          teacherId,
          teacher?.name ?? 'مدرس الدورة',
        ] as const;
      }),
    );

    this.teacherNames = Object.fromEntries(teachers);
  }

  applyFilters() {
    const searchValue = this.searchTerm.trim().toLowerCase();

    this.filteredCourses = this.courses.filter((course) => {
      const teacherName = this.teacherNames[course.teacherId] ?? '';

      const matchesSearch =
        !searchValue ||
        course.title.toLowerCase().includes(searchValue) ||
        course.description.toLowerCase().includes(searchValue) ||
        course.subject.toLowerCase().includes(searchValue) ||
        teacherName.toLowerCase().includes(searchValue);

      const matchesSubject =
        this.selectedSubject === 'الكل' ||
        course.subject === this.selectedSubject;

      const matchesGrade =
        this.selectedGrade === 'الكل' ||
        course.grade === this.selectedGrade;

      return matchesSearch && matchesSubject && matchesGrade;
    });
  }

  selectSubject(subject: string) {
    this.selectedSubject = subject;
    this.applyFilters();
  }

  selectGrade(grade: string) {
    this.selectedGrade = grade;
    this.applyFilters();
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedSubject = 'الكل';
    this.selectedGrade = 'الكل';
    this.applyFilters();
  }

  get hasActiveFilters() {
    return (
      Boolean(this.searchTerm.trim()) ||
      this.selectedSubject !== 'الكل' ||
      this.selectedGrade !== 'الكل'
    );
  }
}
