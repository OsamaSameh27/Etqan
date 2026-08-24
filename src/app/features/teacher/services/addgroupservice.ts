import { Service } from '@angular/core';
import { addDoc, collection, doc, getDoc, getDocs, query, where, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../core/firebase';
import { Group } from '../../../core/models/group.model';

@Service()
export class Addgroupservice {
  private courseCollection = collection(db, 'Groups');

  addGroup(group: Group) {
    return addDoc(this.courseCollection, group);
  }

  updateGroup(id: string, group: Partial<Group>) {
    const groupDoc = doc(db, 'Groups', id);
    return updateDoc(groupDoc, group);
  }

  async getTeacherGroups(teacherId: string) {
    const q = query(this.courseCollection, where('teacherId', '==', teacherId));
    return await getDocs(q);
  }

  async getCourseGroups(courseId: string) {
    const courseGroupsQuery = query(
      this.courseCollection,
      where('courseId', '==', courseId),
    );

    return await getDocs(courseGroupsQuery);
  }

  getGroupById(groupId: string) {
    const groupRef = doc(db, 'Groups', groupId);
    return getDoc(groupRef);
  }

  deleteGroup(id: string) {
    const GroupDoc = doc(db, 'Groups', id);
    return deleteDoc(GroupDoc)
  }
}
