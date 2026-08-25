import { Service } from '@angular/core';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../../../core/firebase';
import { Course } from '../../../core/models/course.model';
import { EnrollmentRequest } from '../../../core/models/enrollment-request.model';

@Service()
export class AddcourseService {
  private courseCollection = collection(db, 'courses');

  addCourse(course: Course) {
    return addDoc(this.courseCollection, course);
  }

  updateCourse(id: string, course: Partial<Course>) {
    const courseDoc = doc(db, 'courses', id);
    return updateDoc(courseDoc, course);
  }

  async getTeacherCourses(teacherId: string) {
    const q = query(this.courseCollection, where('teacherId', '==', teacherId));
    return await getDocs(q);
  }

  deleteCourse(id: string) {
    const courseDoc = doc(db, 'courses', id);
    return deleteDoc(courseDoc);
  }

  async deleteAllTeacherCourses(teacherId: string) {
    const snapshot = await this.getTeacherCourses(teacherId);
    await Promise.all(snapshot.docs.map((courseDoc) => deleteDoc(courseDoc.ref)));
  }

  async getAllCourses() {
    return await getDocs(this.courseCollection);
  }

  async syncRequestCounts(requests: EnrollmentRequest[]) {
    const counts = requests.reduce<Record<string, number>>((courseCounts, request) => {
      courseCounts[request.courseId] = (courseCounts[request.courseId] ?? 0) + 1;
      return courseCounts;
    }, {});

    await Promise.all(
      Object.entries(counts).map(([courseId, requestCount]) =>
        updateDoc(doc(db, 'courses', courseId), { requestCount }),
      ),
    );
  }
  async getCourseById(id: string) {
    const courseRef = doc(db, 'courses', id);

    return await getDoc(courseRef);
  }
}
