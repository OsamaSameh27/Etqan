import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { AddCourse } from '../../../components/add-course/add-course';
import { AddcourseService } from '../../../services/addcourseservice';
import { AuthServices } from '../../../../auth/services/auth.services';
import { Course } from '../../../../../core/models/course.model';
import { Alerts } from '../../../../../core/utils/alerts';

@Component({
  selector: 'app-your-courses',
  imports: [ AddCourse],
  templateUrl: './your-courses.html',
  styleUrl: './your-courses.scss',
})
export class YourCourses {
  selectedCourse: Course | null = null;
  isAddCourseOpen = false;
  isDeletingAll = false;

  private addCourseService = inject(AddcourseService);
  private authService = inject(AuthServices);

  courses: Course[] = [];
  async ngOnInit() {
    await this.loadCourses();
  }

  private cdr = inject(ChangeDetectorRef);

  async loadCourses() {
    const user = await this.authService.getCurrentUser();

    if (!user) return;

    const snapshot = await this.addCourseService.getTeacherCourses(user.uid);

    this.courses = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Course),
    }));
    this.cdr.detectChanges();
  }

  async deleteCourse(course: Course) {
    if (!course.id) {
      return;
    }
    await this.addCourseService.deleteCourse(course.id);
    this.courses = this.courses.filter((c) => c.id !== course.id);
    await this.loadCourses();
    Alerts.success('تم الحذف', 'تم حذف الكورس بنجاح');
  }

  async deleteAllCourses() {
    if (this.courses.length === 0 || this.isDeletingAll) {
      return;
    }

    const confirmed = await Alerts.confirm(
      'حذف كل الدورات؟',
      `سيتم حذف دوراتك كلها وعددها ${this.courses.length}. لا يمكن التراجع عن الحذف، ولن تُحذف المجموعات المرتبطة بها.`,
    );

    if (!confirmed) {
      return;
    }

    const user = await this.authService.getCurrentUser();

    if (!user) {
      Alerts.error('تعذر الحذف', 'يجب تسجيل الدخول أولًا.');
      return;
    }

    this.isDeletingAll = true;

    try {
      await this.addCourseService.deleteAllTeacherCourses(user.uid);
      this.courses = [];
      Alerts.success('تم الحذف', 'تم حذف جميع دوراتك بنجاح.');
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error deleting all courses:', error);
      Alerts.error('تعذر الحذف', 'حدث خطأ أثناء حذف الدورات. حاول مرة أخرى.');
    } finally {
      this.isDeletingAll = false;
      this.cdr.detectChanges();
    }
  }

  openAddCourse() {
    this.selectedCourse = null;
    this.isAddCourseOpen = true;
  }

  closeCourseModal() {
    this.isAddCourseOpen = false;
    this.selectedCourse = null;
  }

  editCourse(course: Course) {
    this.selectedCourse = course;
    this.isAddCourseOpen = true;
  }
}
