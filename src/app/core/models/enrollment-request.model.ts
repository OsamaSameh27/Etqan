import { Timestamp } from 'firebase/firestore';

export type EnrollmentRequestStatus = 'pending' | 'approved' | 'rejected';
export type EnrollmentPaymentMethod = 'cash-wallet' | 'instapay';

export interface EnrollmentRequest {
  id?: string;
  studentId: string;
  teacherId: string;
  teacherName?: string;
  courseId: string;
  groupId: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  courseTitle: string;
  groupName: string;
  amount: number;
  paymentMethod: EnrollmentPaymentMethod;
  receiptUrl: string;
  receiptPublicId: string;
  status: EnrollmentRequestStatus;
  createdAt: Timestamp;
  reviewedAt?: Timestamp;
  rejectionReason?: string;
}
