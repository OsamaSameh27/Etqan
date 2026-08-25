import { Timestamp } from 'firebase/firestore';

export interface Course {
  id?: string;
  title: string;
  description: string;
  price: number;
  subject: string;
  createdAt: Timestamp;
  teacherId: string;
  grade: string;
  requestCount?: number;
}


