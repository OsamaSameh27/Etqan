import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Unsubscribe } from 'firebase/firestore';

import { Enrollment } from '../../../../core/models/enrollment.model';
import {
  EnrollmentRequest,
  EnrollmentRequestStatus,
} from '../../../../core/models/enrollment-request.model';
import { Group } from '../../../../core/models/group.model';
import { UserService } from '../../../../core/services/user-service';
import { getGroupScheduleParts } from '../../../../core/utils/group-schedule';
import { AuthServices } from '../../../auth/services/auth.services';
import { EnrollmentService } from '../../services/enrollment.service';

@Component({
  selector: 'app-student-overview',
  imports: [RouterLink],
  templateUrl: './overview.html',
})
export class StudentOverview {
  private authService = inject(AuthServices);
  private enrollmentService = inject(EnrollmentService);
  private userService = inject(UserService);
  private cdr = inject(ChangeDetectorRef);
  private unsubscribeRequests?: Unsubscribe;
  private unsubscribeEnrollments?: Unsubscribe;

  user = this.userService.user;
  requests: EnrollmentRequest[] = [];
  enrollments: Enrollment[] = [];
  groups: Record<string, Group> = {};
  isLoadingRequests = true;
  isLoadingEnrollments = true;
  loadFailed = false;
  readonly today = new Intl.DateTimeFormat('ar-EG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  async ngOnInit() {
    const firebaseUser = await this.authService.getCurrentUser();
    if (!firebaseUser) {
      this.isLoadingRequests = false;
      this.isLoadingEnrollments = false;
      this.loadFailed = true;
      return;
    }

    this.unsubscribeRequests = this.enrollmentService.listenToStudentRequests(
      firebaseUser.uid,
      (requests) => {
        this.requests = requests;
        this.isLoadingRequests = false;
        this.cdr.detectChanges();
      },
      (error) => {
        console.error('Error loading student dashboard requests:', error);
        this.isLoadingRequests = false;
        this.loadFailed = true;
        this.cdr.detectChanges();
      },
    );

    this.unsubscribeEnrollments = this.enrollmentService.listenToStudentEnrollments(
      firebaseUser.uid,
      (enrollments) => {
        this.enrollments = enrollments;
        this.isLoadingEnrollments = false;
        void this.loadGroups(enrollments);
        this.cdr.detectChanges();
      },
      (error) => {
        console.error('Error loading student dashboard enrollments:', error);
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
    return this.isLoadingRequests || this.isLoadingEnrollments;
  }

  get recentRequests() {
    return this.requests.slice(0, 4);
  }

  countRequests(status: EnrollmentRequestStatus) {
    return this.requests.filter((request) => request.status === status).length;
  }

  statusLabel(status: EnrollmentRequestStatus) {
    return {
      pending: 'قيد المراجعة',
      approved: 'تم القبول',
      rejected: 'مرفوض',
    }[status];
  }

  scheduleDays(enrollment: Enrollment) {
    const group = this.groups[enrollment.groupId];
    return group ? getGroupScheduleParts(group).days : 'الموعد غير متاح';
  }

  scheduleTime(enrollment: Enrollment) {
    const group = this.groups[enrollment.groupId];
    return group ? getGroupScheduleParts(group).time : 'تواصل مع المدرس';
  }

  requestDate(request: EnrollmentRequest) {
    if (!request.createdAt?.toDate) return 'تاريخ غير متاح';
    return new Intl.DateTimeFormat('ar-EG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(request.createdAt.toDate());
  }

  private async loadGroups(enrollments: Enrollment[]) {
    try {
      this.groups = await this.enrollmentService.getEnrollmentGroups(
        enrollments.map((enrollment) => enrollment.groupId),
      );
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading student dashboard groups:', error);
    }
  }
}
