import { Service, signal } from '@angular/core';
import { User } from '../../../core/models/user.model';
import { collection, doc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../core/firebase';

@Service()
export class TeachersService {
  teachers = signal<User[]>([]);

  async getTeachers() {
    const userRef = collection(db, 'users');

    const q = query(userRef, where('role', '==', 'teacher'));

    const snapshot = await getDocs(q);

    const teachers = snapshot.docs.map((teacherDoc) => {
      const teacher = teacherDoc.data() as User;

      return {
        ...teacher,
        grades: Array.isArray(teacher.grades) ? teacher.grades : [],
      };
    });
    this.teachers.set(teachers);
  }
}
