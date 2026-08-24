import { Timestamp } from 'firebase/firestore';

export interface Group {
  id?: string;
  name: string;
  courseId: string;
  teacherId: string;
  maxStudents: number;
  currentStudents?: number;
  schedule: string;
  time?: string;
  location: string;
  createdAt: Timestamp;
}
