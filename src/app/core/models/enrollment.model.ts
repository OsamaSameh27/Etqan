import { Timestamp } from 'firebase/firestore';

export interface Enrollment {
  id?: string;
  studentId: string;
  teacherId: string;
  courseId: string;
  groupId: string;
  studentName: string;
  studentPhone: string;
  courseTitle: string;
  groupName: string;
  status: 'active';
  joinedAt: Timestamp;
}
