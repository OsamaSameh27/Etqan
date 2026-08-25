import { Component, inject, input, output } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AddcourseService } from '../../services/addcourseservice';
import { Timestamp } from 'firebase/firestore';
import { Course } from '../../../../core/models/course.model';
import { Alerts } from '../../../../core/utils/alerts';
import { AuthServices } from '../../../auth/services/auth.services';
import { YourCourses } from '../../pages/dashboard/your-courses/your-courses';

@Component({
  selector: 'app-add-course',
  imports: [ReactiveFormsModule],
  templateUrl: './add-course.html',
  styleUrl: './add-course.scss',
})
export class AddCourse {
  closeModal = output<void>();
  course = input<Course | null>(null);

  async ngOnInit() {
    const currentCourse = this.course();

    if (currentCourse) {
      this.courseForm.patchValue({
        title: currentCourse.title,
        description: currentCourse.description,
        price: currentCourse.price,
        grade: currentCourse.grade,
      });
    }

    const firebaseUser = await this.authServices.getCurrentUser();

    if (!firebaseUser) {
      return;
    }

    const teacherData = await this.authServices.getUserData(firebaseUser.uid);
    this.courseForm.controls.subject.setValue(teacherData?.subject ?? currentCourse?.subject ?? '');
  }

  close() {
    this.closeModal.emit();
  }

  private fb = inject(NonNullableFormBuilder);

  courseForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(4)]],
    description: ['', [Validators.required, Validators.minLength(10)]],
    price: [1, [Validators.required, Validators.min(1)]],
    subject: ['', [Validators.required]],
    createdAt: [Timestamp.now()],
    teacherId: [''],
    grade: ['', [Validators.required]],
  });

  private addCourseService = inject(AddcourseService);
  private authServices = inject(AuthServices);
  private yourCourses = inject(YourCourses);

  async saveCourse() {
    if (this.courseForm.invalid) {
      this.courseForm.markAllAsTouched();
      return;
    }

    try {
      const formValue = this.courseForm.getRawValue();
      const firebaseUser = await this.authServices.getCurrentUser();

      if (!firebaseUser) {
        Alerts.error('تعذر الحفظ', 'يجب تسجيل الدخول أولًا.');
        return;
      }

      const teacherData = await this.authServices.getUserData(firebaseUser.uid);

      if (teacherData?.role !== 'teacher' || !teacherData.subject) {
        Alerts.error('تعذر الحفظ', 'لم يتم العثور على مادة التخصص في حساب المدرس.');
        return;
      }

      const courseData = {
        title: formValue.title,
        description: formValue.description,
        price: formValue.price,
        subject: teacherData.subject,
        grade: formValue.grade,
      };

      const currentCourse = this.course();

      if (currentCourse?.id) {
        await this.addCourseService.updateCourse(currentCourse.id, courseData);
        Alerts.success('تم تعديل الكورس بنجاح', 'تم حفظ التعديلات بنجاح');
      } else {
        const newCourse: Course = {
          ...courseData,
          requestCount: 0,
          createdAt: Timestamp.now(),
          teacherId: firebaseUser.uid,
        };

        await this.addCourseService.addCourse(newCourse);
        Alerts.success('تم إنشاء الكورس بنجاح', 'تم إنشاء الكورس بنجاح');
      }

      await this.yourCourses.loadCourses();
      this.closeModal.emit();
    } catch (error) {
      console.error('Error adding course:', error);
      Alerts.error('تعذر الحفظ', 'حدث خطأ أثناء حفظ الدورة. حاول مرة أخرى.');
    }
  }
}
