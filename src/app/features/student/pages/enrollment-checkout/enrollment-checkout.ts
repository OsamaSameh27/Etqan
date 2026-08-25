import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { Course } from '../../../../core/models/course.model';
import { Group } from '../../../../core/models/group.model';
import { User } from '../../../../core/models/user.model';
import { PublicTeacherProfile } from '../../../../core/models/public-teacher-profile.model';
import {
  EnrollmentPaymentMethod,
  EnrollmentRequest,
} from '../../../../core/models/enrollment-request.model';
import { Alerts } from '../../../../core/utils/alerts';
import { getGroupScheduleParts } from '../../../../core/utils/group-schedule';
import { AuthServices } from '../../../auth/services/auth.services';
import { CloudinaryService } from '../../../auth/services/cloudinary.service';
import { AddcourseService } from '../../../teacher/services/addcourseservice';
import { Addgroupservice } from '../../../teacher/services/addgroupservice';
import {
  EnrollmentRequestConflictError,
  EnrollmentService,
} from '../../services/enrollment.service';
import { Timestamp } from 'firebase/firestore';


@Component({
  selector: 'app-enrollment-checkout',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './enrollment-checkout.html',
  styleUrl: './enrollment-checkout.scss',
})
export class EnrollmentCheckout {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthServices);
  private courseService = inject(AddcourseService);
  private groupService = inject(Addgroupservice);
  private enrollmentService = inject(EnrollmentService);
  private cloudinaryService = inject(CloudinaryService);
  private fb = inject(NonNullableFormBuilder);
  private cdr = inject(ChangeDetectorRef);

  course: Course | null = null;
  group: Group | null = null;
  student: User | null = null;
  teacher: PublicTeacherProfile | null = null;
  teacherPaymentPhone = '';
  existingRequest: EnrollmentRequest | null = null;

  isLoading = true;
  dataNotFound = false;
  selectedReceipt: File | null = null;
  receiptPreview = '';
  receiptError = '';
  copiedPaymentNumber = false;
  isSubmitting = false;
  private studentUid = '';

  checkoutForm = this.fb.group({
    name: this.fb.control({ value: '', disabled: true }),
    email: this.fb.control({ value: '', disabled: true }),
    phone: this.fb.control({ value: '', disabled: true }),
    paymentMethod: this.fb.control<EnrollmentPaymentMethod>('cash-wallet', Validators.required),
  });

  async ngOnInit() {
    const courseId = this.route.snapshot.paramMap.get('courseId');
    const groupId = this.route.snapshot.paramMap.get('groupId');

    if (!courseId || !groupId) {
      this.finishWithMissingData();
      return;
    }

    try {
      const firebaseUser = await this.authService.getCurrentUser();
      if (!firebaseUser) {
        this.finishWithMissingData();
        return;
      }
      this.studentUid = firebaseUser.uid;

      const [courseSnapshot, groupSnapshot, student, existingRequest] = await Promise.all([
        this.courseService.getCourseById(courseId),
        this.groupService.getGroupById(groupId),
        this.authService.getUserData(firebaseUser.uid),
        this.enrollmentService.getStudentCourseRequest(firebaseUser.uid, courseId),
      ]);

      if (!courseSnapshot.exists() || !groupSnapshot.exists() || !student) {
        this.finishWithMissingData();
        return;
      }

      const course: Course = { id: courseSnapshot.id, ...(courseSnapshot.data() as Course) };
      const group: Group = { id: groupSnapshot.id, ...(groupSnapshot.data() as Group) };

      if (group.courseId !== courseId || group.teacherId !== course.teacherId) {
        this.finishWithMissingData();
        return;
      }

      const [teacher, paymentProfile] = await Promise.all([
        this.authService.getPublicTeacherProfile(course.teacherId),
        this.authService.getTeacherPaymentProfile(course.teacherId),
      ]);
      if (!teacher || !paymentProfile) {
        this.finishWithMissingData();
        return;
      }

      this.course = course;
      this.group = group;
      this.student = student;
      this.teacher = teacher;
      this.teacherPaymentPhone = paymentProfile.paymentPhone;
      this.existingRequest = existingRequest;
      if (existingRequest?.status === 'pending' || existingRequest?.status === 'approved') {
        this.receiptPreview = existingRequest.receiptUrl;
      }
      this.syncPaymentControlState();
      this.checkoutForm.patchValue({
        name: student.name,
        email: student.email,
        phone: student.phone,
      });
    } catch (error) {
      console.error('Error loading enrollment checkout:', error);
      this.dataNotFound = true;
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  onReceiptSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.receiptError = '';

    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.clearReceipt(input);
      this.receiptError = 'ارفع صورة بصيغة JPG أو PNG أو WebP.';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.clearReceipt(input);
      this.receiptError = 'حجم صورة الإيصال يجب ألا يزيد عن 5 ميجابايت.';
      return;
    }

    this.revokeReceiptPreview();
    this.selectedReceipt = file;
    this.receiptPreview = URL.createObjectURL(file);
  }

  removeReceipt(input?: HTMLInputElement) {
    this.revokeReceiptPreview();
    this.selectedReceipt = null;
    this.receiptPreview = '';
    this.receiptError = '';
    if (input) input.value = '';
  }

  async copyPaymentNumber() {
    if (!this.paymentNumber) return;

    try {
      await navigator.clipboard.writeText(this.paymentNumber);
      this.copiedPaymentNumber = true;
      window.setTimeout(() => {
        this.copiedPaymentNumber = false;
        this.cdr.detectChanges();
      }, 1800);
    } catch {
      Alerts.error('تعذر النسخ', 'يمكنك تحديد الرقم ونسخه يدويًا.');
    }
  }

  async prepareEnrollment() {
    if (
      this.isSubmitting ||
      this.requestBlocksSubmission ||
      !this.student ||
      !this.teacher ||
      !this.course?.id ||
      !this.group?.id
    ) {
      return;
    }

    if (!this.selectedReceipt) {
      this.receiptError = 'صورة إيصال التحويل مطلوبة لإكمال الاشتراك.';
      return;
    }

    this.isSubmitting = true;
    this.checkoutForm.controls.paymentMethod.disable({ emitEvent: false });
    this.receiptError = '';

    try {
      const latestRequest = await this.enrollmentService.getStudentCourseRequest(
        this.studentUid,
        this.course.id,
      );

      if (latestRequest?.status === 'pending' || latestRequest?.status === 'approved') {
        this.existingRequest = latestRequest;
        this.syncPaymentControlState();
        throw new EnrollmentRequestConflictError(latestRequest.status);
      }

      const uploadedReceipt = await this.cloudinaryService.uploadPaymentReceipt(
        this.selectedReceipt,
      );

      const request: EnrollmentRequest = {
        studentId: this.studentUid,
        teacherId: this.course.teacherId,
        teacherName: this.teacher.name,
        courseId: this.course.id,
        groupId: this.group.id,
        studentName: this.student.name,
        studentEmail: this.student.email,
        studentPhone: this.student.phone,
        courseTitle: this.course.title,
        groupName: this.group.name,
        amount: this.course.price,
        paymentMethod: this.selectedPaymentMethod,
        receiptUrl: uploadedReceipt.secureUrl,
        receiptPublicId: uploadedReceipt.publicId,
        status: 'pending',
        createdAt: Timestamp.now(),
      };

      const requestId = await this.enrollmentService.createEnrollmentRequest(request);
      this.existingRequest = { id: requestId, ...request };
      this.syncPaymentControlState();
      this.revokeReceiptPreview();
      this.receiptPreview = uploadedReceipt.secureUrl;
      this.selectedReceipt = null;

      Alerts.success('تم إرسال طلب الاشتراك', 'طلبك وصل للمدرس وهو الآن قيد المراجعة.');
    } catch (error) {
      if (error instanceof EnrollmentRequestConflictError) {
        const message =
          error.requestStatus === 'approved'
            ? 'أنت مشترك بالفعل في هذا الكورس.'
            : 'لديك طلب اشتراك قيد مراجعة المدرس بالفعل.';
        Alerts.error('لا يمكن إرسال طلب جديد', message);
      } else {
        console.error('Error creating enrollment request:', error);
        Alerts.error('تعذر إرسال الطلب', 'حدث خطأ أثناء رفع الإيصال أو حفظ الطلب. حاول مرة أخرى.');
      }
    } finally {
      this.isSubmitting = false;
      this.syncPaymentControlState();
      this.cdr.detectChanges();
    }
  }

  ngOnDestroy() {
    this.revokeReceiptPreview();
  }

  get paymentNumber() {
    return this.teacherPaymentPhone;
  }

  get selectedPaymentMethod() {
    return this.checkoutForm.controls.paymentMethod.value;
  }

  get groupDays() {
    return this.group ? getGroupScheduleParts(this.group).days : '';
  }

  get groupTime() {
    return this.group ? getGroupScheduleParts(this.group).time : '';
  }

  get requestBlocksSubmission() {
    return this.existingRequest?.status === 'pending' || this.existingRequest?.status === 'approved';
  }

  private finishWithMissingData() {
    this.dataNotFound = true;
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  private syncPaymentControlState() {
    const paymentControl = this.checkoutForm.controls.paymentMethod;

    if (this.requestBlocksSubmission || this.isSubmitting) {
      paymentControl.disable({ emitEvent: false });
    } else {
      paymentControl.enable({ emitEvent: false });
    }
  }

  private clearReceipt(input: HTMLInputElement) {
    this.removeReceipt(input);
  }

  private revokeReceiptPreview() {
    if (this.receiptPreview.startsWith('blob:')) {
      URL.revokeObjectURL(this.receiptPreview);
    }
  }
}
