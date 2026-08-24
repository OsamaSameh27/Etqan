import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Unsubscribe } from 'firebase/firestore';

import {
  EnrollmentRequest,
  EnrollmentRequestStatus,
} from '../../../../core/models/enrollment-request.model';
import { AuthServices } from '../../../auth/services/auth.services';
import { EnrollmentService } from '../../services/enrollment.service';

type RequestFilter = 'all' | EnrollmentRequestStatus;

@Component({
  selector: 'app-enrollment-requests',
  imports: [RouterLink],
  templateUrl: './enrollment-requests.html',
  styleUrl: './enrollment-requests.scss',
})
export class EnrollmentRequests {
  private authService = inject(AuthServices);
  private enrollmentService = inject(EnrollmentService);
  private cdr = inject(ChangeDetectorRef);
  private unsubscribeRequests?: Unsubscribe;

  requests: EnrollmentRequest[] = [];
  activeFilter: RequestFilter = 'all';
  isLoading = true;
  loadFailed = false;

  async ngOnInit() {
    try {
      const firebaseUser = await this.authService.getCurrentUser();
      if (!firebaseUser) {
        this.loadFailed = true;
        return;
      }

      this.unsubscribeRequests = this.enrollmentService.listenToStudentRequests(
        firebaseUser.uid,
        (requests) => {
          this.requests = requests;
          this.isLoading = false;
          this.loadFailed = false;
          this.cdr.detectChanges();
        },
        (error) => {
          console.error('Error listening to student enrollment requests:', error);
          this.isLoading = false;
          this.loadFailed = true;
          this.cdr.detectChanges();
        },
      );
    } catch (error) {
      console.error('Error loading student enrollment requests:', error);
      this.loadFailed = true;
      this.isLoading = false;
    } finally {
      this.cdr.detectChanges();
    }
  }

  ngOnDestroy() {
    this.unsubscribeRequests?.();
  }

  setFilter(filter: RequestFilter) {
    this.activeFilter = filter;
  }

  get filteredRequests() {
    if (this.activeFilter === 'all') return this.requests;
    return this.requests.filter((request) => request.status === this.activeFilter);
  }

  countByStatus(status: EnrollmentRequestStatus) {
    return this.requests.filter((request) => request.status === status).length;
  }

  statusLabel(status: EnrollmentRequestStatus) {
    const labels: Record<EnrollmentRequestStatus, string> = {
      pending: 'قيد المراجعة',
      approved: 'تم القبول',
      rejected: 'مرفوض',
    };

    return labels[status];
  }

  paymentMethodLabel(request: EnrollmentRequest) {
    return request.paymentMethod === 'instapay' ? 'InstaPay' : 'محفظة كاش';
  }

  requestDate(request: EnrollmentRequest) {
    if (!request.createdAt?.toDate) return 'تاريخ غير متاح';

    return new Intl.DateTimeFormat('ar-EG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(request.createdAt.toDate());
  }
}
