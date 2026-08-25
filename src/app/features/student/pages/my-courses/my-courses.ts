import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Unsubscribe } from 'firebase/firestore';

import { Enrollment } from '../../../../core/models/enrollment.model';
import { Group } from '../../../../core/models/group.model';
import { getGroupScheduleParts } from '../../../../core/utils/group-schedule';
import { AuthServices } from '../../../auth/services/auth.services';
import { EnrollmentService } from '../../services/enrollment.service';

@Component({
  selector: 'app-my-courses',
  imports: [RouterLink],
  templateUrl: './my-courses.html',
  styleUrl: './my-courses.scss',
})
export class MyCourses {
  private authService = inject(AuthServices);
  private enrollmentService = inject(EnrollmentService);
  private cdr = inject(ChangeDetectorRef);
  private unsubscribeEnrollments?: Unsubscribe;

  enrollments: Enrollment[] = [];
  groups: Record<string, Group> = {};
  isLoading = true;
  loadFailed = false;

  ngOnInit(): void {
    void this.loadCourses();
  }

  ngOnDestroy(): void {
    this.unsubscribeEnrollments?.();
  }

  async loadCourses() {
    this.unsubscribeEnrollments?.();
    this.isLoading = true;
    this.loadFailed = false;

    const firebaseUser = await this.authService.getCurrentUser();
    if (!firebaseUser) {
      this.isLoading = false;
      this.loadFailed = true;
      return;
    }

    this.unsubscribeEnrollments = this.enrollmentService.listenToStudentEnrollments(
      firebaseUser.uid,
      (enrollments) => {
        this.enrollments = enrollments;
        this.isLoading = false;
        void this.loadGroups(enrollments);
        this.cdr.detectChanges();
      },
      (error) => {
        console.error('Error loading student courses:', error);
        this.isLoading = false;
        this.loadFailed = true;
        this.cdr.detectChanges();
      },
    );
  }

  scheduleDays(enrollment: Enrollment) {
    const group = this.groups[enrollment.groupId];
    return group ? getGroupScheduleParts(group).days : 'الموعد غير متاح';
  }

  scheduleTime(enrollment: Enrollment) {
    const group = this.groups[enrollment.groupId];
    return group ? getGroupScheduleParts(group).time : 'تواصل مع المدرس';
  }

  joinedDate(enrollment: Enrollment) {
    if (!enrollment.joinedAt?.toDate) return 'تاريخ غير متاح';
    return new Intl.DateTimeFormat('ar-EG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(enrollment.joinedAt.toDate());
  }

  private async loadGroups(enrollments: Enrollment[]) {
    try {
      this.groups = await this.enrollmentService.getEnrollmentGroups(
        enrollments.map((enrollment) => enrollment.groupId),
      );
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading enrolled groups:', error);
    }
  }
}
