import { Service, signal } from '@angular/core';
import { PublicTeacherProfile } from '../../../core/models/public-teacher-profile.model';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../core/firebase';

@Service()
export class TeachersService {
  teachers = signal<PublicTeacherProfile[]>([]);

  async getTeachers() {
    const teachersRef = collection(db, 'publicTeacherProfiles');
    const snapshot = await getDocs(teachersRef);

    const teachers = snapshot.docs.map((teacherDoc) => {
      const teacher = teacherDoc.data() as PublicTeacherProfile;

      return {
        id: teacherDoc.id,
        ...teacher,
        grades: Array.isArray(teacher.grades) ? teacher.grades : [],
      };
    });
    const randomTeachers = [...teachers]
      .sort(() => Math.random() - 0.5)
      .slice(0, 5);

    this.teachers.set(randomTeachers);
  }
}
