import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Unsubscribe } from 'firebase/firestore';

import {
  EnrollmentRequest,
  EnrollmentRequestStatus,
} from '../../../../../core/models/enrollment-request.model';
import { Group } from '../../../../../core/models/group.model';
import { Alerts } from '../../../../../core/utils/alerts';
import { AuthServices } from '../../../../auth/services/auth.services';
import { Addgroupservice } from '../../../services/addgroupservice';
import {
  TeacherEnrollmentError,
  TeacherEnrollmentService,
} from '../../../services/teacher-enrollment.service';

type RequestFilter = 'all' | EnrollmentRequestStatus;
type GroupAvailability = { currentStudents: number; maxStudents: number };

@Component({
  selector: 'app-teacher-enrollment-requests',
  imports: [FormsModule],
  templateUrl: './enrollment-requests.html',
  styleUrl: './enrollment-requests.scss',
})
export class TeacherEnrollmentRequests {
  private authService = inject(AuthServices);
  private enrollmentService = inject(TeacherEnrollmentService);
  private groupService = inject(Addgroupservice);
  private cdr = inject(ChangeDetectorRef);
  private unsubscribeRequests?: Unsubscribe;
  private teacherUid = '';

  requests: EnrollmentRequest[] = [];
  groupAvailability: Record<string, GroupAvailability> = {};
  activeFilter: RequestFilter = 'pending';
  isLoading = true;
  loadFailed = false;
  processingRequestId = '';
  rejectingRequestId = '';
  rejectionReason = '';

  async ngOnInit() {
    try {
      const firebaseUser = await this.authService.getCurrentUser();
      if (!firebaseUser) {
        this.loadFailed = true;
        return;
      }

      this.teacherUid = firebaseUser.uid;
      this.unsubscribeRequests = this.enrollmentService.listenToTeacherRequests(
        firebaseUser.uid,
        (requests) => {
          this.requests = requests;
          this.isLoading = false;
          this.loadFailed = false;
          void this.loadGroupsAvailability(requests);
          this.cdr.detectChanges();
        },
        (error) => {
          console.error('Error listening to teacher enrollment requests:', error);
          this.isLoading = false;
          this.loadFailed = true;
          this.cdr.detectChanges();
        },
      );
    } catch (error) {
      console.error('Error loading teacher enrollment requests:', error);
      this.isLoading = false;
      this.loadFailed = true;
    } finally {
      this.cdr.detectChanges();
    }
  }

  ngOnDestroy() {
    this.unsubscribeRequests?.();
  }

  setFilter(filter: RequestFilter) {
    this.activeFilter = filter;
    this.closeRejectForm();
  }

  get filteredRequests() {
    if (this.activeFilter === 'all') return this.requests;
    return this.requests.filter((request) => request.status === this.activeFilter);
  }

  countByStatus(status: EnrollmentRequestStatus) {
    return this.requests.filter((request) => request.status === status).length;
  }

  async approveRequest(request: EnrollmentRequest) {
    if (!request.id || this.processingRequestId) return;

    const confirmed = await Alerts.confirmAction(
      'قبول طلب الاشتراك؟',
      `سيتم إضافة ${request.studentName} إلى مجموعة ${request.groupName}.`,
      'نعم، قبول الطلب',
    );
    if (!confirmed) return;

    this.processingRequestId = request.id;
    this.closeRejectForm();

    try {
      await this.enrollmentService.approveRequest(request.id, this.teacherUid);
      Alerts.success('تم قبول الطلب', 'تم إضافة الطالب إلى المجموعة بنجاح.');
    } catch (error) {
      this.handleRequestError(error);
    } finally {
      this.processingRequestId = '';
      this.cdr.detectChanges();
    }
  }

  openRejectForm(requestId: string) {
    if (this.processingRequestId) return;
    this.rejectingRequestId = requestId;
    this.rejectionReason = '';
  }

  closeRejectForm() {
    this.rejectingRequestId = '';
    this.rejectionReason = '';
  }

  async rejectRequest(request: EnrollmentRequest) {
    if (!request.id || this.processingRequestId) return;

    const reason = this.rejectionReason.trim() || 'لم يتم توضيح سبب الرفض.';
    this.processingRequestId = request.id;

    try {
      await this.enrollmentService.rejectRequest(request.id, this.teacherUid, reason);
      this.closeRejectForm();
      Alerts.success('تم رفض الطلب', 'تم تحديث حالة الطلب وإبلاغ الطالب بالسبب.');
    } catch (error) {
      this.handleRequestError(error);
    } finally {
      this.processingRequestId = '';
      this.cdr.detectChanges();
    }
  }

  isProcessing(request: EnrollmentRequest) {
    return this.processingRequestId === request.id;
  }

  remainingPlaces(request: EnrollmentRequest) {
    const availability = this.groupAvailability[request.groupId];
    if (!availability) return null;
    return Math.max(availability.maxStudents - availability.currentStudents, 0);
  }

  statusLabel(status: EnrollmentRequestStatus) {
    return {
      pending: 'قيد المراجعة',
      approved: 'تم القبول',
      rejected: 'مرفوض',
    }[status];
  }

  paymentMethodLabel(request: EnrollmentRequest) {
    return request.paymentMethod === 'instapay' ? 'InstaPay' : 'محفظة كاش';
  }

  requestDate(request: EnrollmentRequest) {
    if (!request.createdAt?.toDate) return 'تاريخ غير متاح';
    return new Intl.DateTimeFormat('ar-EG', {
      day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit',
    }).format(request.createdAt.toDate());
  }

  private async loadGroupsAvailability(requests: EnrollmentRequest[]) {
    const groupIds = [...new Set(requests.map((request) => request.groupId))];

    const availabilityEntries = await Promise.all(
      groupIds.map(async (groupId) => {
        const groupSnapshot = await this.groupService.getGroupById(groupId);
        if (!groupSnapshot.exists()) return null;

        const group = groupSnapshot.data() as Group;
        return [
          groupId,
          { currentStudents: group.currentStudents ?? 0, maxStudents: group.maxStudents },
        ] as const;
      }),
    );

    this.groupAvailability = Object.fromEntries(
      availabilityEntries.filter((entry): entry is NonNullable<typeof entry> => entry !== null),
    );
    this.cdr.detectChanges();
  }

  private handleRequestError(error: unknown) {
    if (error instanceof TeacherEnrollmentError) {
      const messages: Record<string, string> = {
        'request-not-found': 'الطلب لم يعد موجودًا.',
        'not-authorized': 'ليس لديك صلاحية لتعديل هذا الطلب.',
        'request-not-pending': 'تمت مراجعة هذا الطلب بالفعل.',
        'group-not-found': 'المجموعة المرتبطة بالطلب غير موجودة.',
        'group-full': 'المجموعة مكتملة ولا يمكن إضافة طالب جديد.',
      };
      Alerts.error('تعذر تحديث الطلب', messages[error.code]);
      return;
    }

    console.error('Error reviewing enrollment request:', error);
    const errorCode = (error as { code?: string }).code;
    const message =
      errorCode === 'permission-denied'
        ? 'قواعد Firestore تمنع تنفيذ العملية. تأكد من نشر صلاحيات enrollments.'
        : 'حدث خطأ غير متوقع. حاول مرة أخرى.';
    Alerts.error('تعذر تحديث الطلب', message);
  }
}
