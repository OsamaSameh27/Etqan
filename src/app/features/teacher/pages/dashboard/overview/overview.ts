import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Unsubscribe } from 'firebase/firestore';

import { Course } from '../../../../../core/models/course.model';
import { Enrollment } from '../../../../../core/models/enrollment.model';
import {
  EnrollmentRequest,
  EnrollmentRequestStatus,
} from '../../../../../core/models/enrollment-request.model';
import { Group } from '../../../../../core/models/group.model';
import { UserService } from '../../../../../core/services/user-service';
import { AuthServices } from '../../../../auth/services/auth.services';
import { AddcourseService } from '../../../services/addcourseservice';
import { Addgroupservice } from '../../../services/addgroupservice';
import { TeacherEnrollmentService } from '../../../services/teacher-enrollment.service';

@Component({
  selector: 'app-teacher-overview',
  imports: [RouterLink],
  templateUrl: './overview.html',
})
export class TeacherOverview {
  private authService = inject(AuthServices);
  private courseService = inject(AddcourseService);
  private groupService = inject(Addgroupservice);
  private enrollmentService = inject(TeacherEnrollmentService);
  private userService = inject(UserService);
  private cdr = inject(ChangeDetectorRef);
  private unsubscribeRequests?: Unsubscribe;
  private unsubscribeEnrollments?: Unsubscribe;

  user = this.userService.user;
  courses: Course[] = [];
  groups: Group[] = [];
  requests: EnrollmentRequest[] = [];
  enrollments: Enrollment[] = [];
  isLoadingBase = true;
  isLoadingRequests = true;
  isLoadingEnrollments = true;
  loadFailed = false;
  readonly greeting = new Date().getHours() < 12 ? 'صباح الخير' : 'مساء الخير';
  readonly today = new Intl.DateTimeFormat('ar-EG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  async ngOnInit() {
    const firebaseUser = await this.authService.getCurrentUser();
    if (!firebaseUser) {
      this.finishWithError();
      return;
    }

    void this.loadCoursesAndGroups(firebaseUser.uid);

    this.unsubscribeRequests = this.enrollmentService.listenToTeacherRequests(
      firebaseUser.uid,
      (requests) => {
        this.requests = requests;
        this.isLoadingRequests = false;
        this.cdr.detectChanges();
      },
      (error) => {
        console.error('Error loading teacher dashboard requests:', error);
        this.isLoadingRequests = false;
        this.loadFailed = true;
        this.cdr.detectChanges();
      },
    );

    this.unsubscribeEnrollments = this.enrollmentService.listenToTeacherEnrollments(
      firebaseUser.uid,
      (enrollments) => {
        this.enrollments = enrollments;
        this.isLoadingEnrollments = false;
        this.cdr.detectChanges();
      },
      (error) => {
        console.error('Error loading teacher dashboard enrollments:', error);
        this.isLoadingEnrollments = false;
        this.loadFailed = true;
        this.cdr.detectChanges();
      },
    );
  }

  ngOnDestroy() {
    this.unsubscribeRequests?.();
    this.unsubscribeEnrollments?.();
  }

  get isLoading() {
    return this.isLoadingBase;
  }

  get uniqueStudentsCount() {
    return new Set(this.enrollments.map((enrollment) => enrollment.studentId)).size;
  }

  get recentPendingRequests() {
    return this.requests.filter((request) => request.status === 'pending').slice(0, 4);
  }

  get groupsByOccupancy() {
    return [...this.groups]
      .sort((first, second) => this.occupancyPercentage(second) - this.occupancyPercentage(first))
      .slice(0, 5);
  }

  countRequests(status: EnrollmentRequestStatus) {
    return this.requests.filter((request) => request.status === status).length;
  }

  statusPercentage(status: EnrollmentRequestStatus) {
    if (!this.requests.length) return 0;
    return Math.round((this.countRequests(status) / this.requests.length) * 100);
  }

  occupancyPercentage(group: Group) {
    if (!group.maxStudents) return 0;
    return Math.min(Math.round(((group.currentStudents ?? 0) / group.maxStudents) * 100), 100);
  }

  remainingPlaces(group: Group) {
    return Math.max(group.maxStudents - (group.currentStudents ?? 0), 0);
  }

  courseTitle(group: Group) {
    return this.courses.find((course) => course.id === group.courseId)?.title ?? 'كورس غير متاح';
  }

  requestDate(request: EnrollmentRequest) {
    if (!request.createdAt?.toDate) return 'تاريخ غير متاح';
    return new Intl.DateTimeFormat('ar-EG', {
      day: 'numeric',
      month: 'short',
    }).format(request.createdAt.toDate());
  }

  private async loadCoursesAndGroups(teacherId: string) {
    try {
      const [coursesSnapshot, groupsSnapshot] = await Promise.all([
        this.courseService.getTeacherCourses(teacherId),
        this.groupService.getTeacherGroups(teacherId),
      ]);

      this.courses = coursesSnapshot.docs.map((courseDocument) => ({
        id: courseDocument.id,
        ...(courseDocument.data() as Course),
      }));
      this.groups = groupsSnapshot.docs.map((groupDocument) => ({
        id: groupDocument.id,
        ...(groupDocument.data() as Group),
      }));
    } catch (error) {
      console.error('Error loading teacher dashboard courses and groups:', error);
      this.loadFailed = true;
    } finally {
      this.isLoadingBase = false;
      this.cdr.detectChanges();
    }
  }

  private finishWithError() {
    this.isLoadingBase = false;
    this.isLoadingRequests = false;
    this.isLoadingEnrollments = false;
    this.loadFailed = true;
    this.cdr.detectChanges();
  }
}
