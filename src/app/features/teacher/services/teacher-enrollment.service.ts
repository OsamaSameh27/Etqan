import { Service } from '@angular/core';
import {
  collection,
  deleteField,
  doc,
  onSnapshot,
  query,
  runTransaction,
  Timestamp,
  where,
} from 'firebase/firestore';

import { db } from '../../../core/firebase';
import { Enrollment } from '../../../core/models/enrollment.model';
import { EnrollmentRequest } from '../../../core/models/enrollment-request.model';
import { Group } from '../../../core/models/group.model';

export type TeacherEnrollmentErrorCode =
  | 'request-not-found'
  | 'not-authorized'
  | 'request-not-pending'
  | 'group-not-found'
  | 'group-full';

export class TeacherEnrollmentError extends Error {
  constructor(readonly code: TeacherEnrollmentErrorCode) {
    super(code);
    this.name = 'TeacherEnrollmentError';
  }
}

@Service()
export class TeacherEnrollmentService {
  private requestsCollection = collection(db, 'enrollmentRequests');
  private enrollmentsCollection = collection(db, 'enrollments');

  listenToTeacherRequests(
    teacherId: string,
    onRequestsChanged: (requests: EnrollmentRequest[]) => void,
    onError: (error: Error) => void,
  ) {
    const teacherRequestsQuery = query(
      this.requestsCollection,
      where('teacherId', '==', teacherId),
    );

    return onSnapshot(
      teacherRequestsQuery,
      (snapshot) => {
        const requests = snapshot.docs
          .map((requestDocument) => ({
            id: requestDocument.id,
            ...(requestDocument.data() as EnrollmentRequest),
          }))
          .sort((first, second) => second.createdAt.toMillis() - first.createdAt.toMillis());

        onRequestsChanged(requests);
      },
      onError,
    );
  }

  listenToTeacherEnrollments(
    teacherId: string,
    onEnrollmentsChanged: (enrollments: Enrollment[]) => void,
    onError: (error: Error) => void,
  ) {
    const teacherEnrollmentsQuery = query(
      this.enrollmentsCollection,
      where('teacherId', '==', teacherId),
    );

    return onSnapshot(
      teacherEnrollmentsQuery,
      (snapshot) => {
        const enrollments = snapshot.docs
          .map((enrollmentDocument) => ({
            id: enrollmentDocument.id,
            ...(enrollmentDocument.data() as Enrollment),
          }))
          .sort((first, second) => second.joinedAt.toMillis() - first.joinedAt.toMillis());

        onEnrollmentsChanged(enrollments);
      },
      onError,
    );
  }

  async approveRequest(requestId: string, teacherId: string) {
    const requestRef = doc(db, 'enrollmentRequests', requestId);

    await runTransaction(db, async (transaction) => {
      const requestSnapshot = await transaction.get(requestRef);
      if (!requestSnapshot.exists()) throw new TeacherEnrollmentError('request-not-found');

      const request = requestSnapshot.data() as EnrollmentRequest;
      if (request.teacherId !== teacherId) throw new TeacherEnrollmentError('not-authorized');
      if (request.status !== 'pending') throw new TeacherEnrollmentError('request-not-pending');

      const groupRef = doc(db, 'Groups', request.groupId);
      const enrollmentRef = doc(db, 'enrollments', `${request.studentId}_${request.courseId}`);
      const groupSnapshot = await transaction.get(groupRef);

      if (!groupSnapshot.exists()) throw new TeacherEnrollmentError('group-not-found');

      const group = groupSnapshot.data() as Group;
      if (group.teacherId !== teacherId || group.courseId !== request.courseId) {
        throw new TeacherEnrollmentError('not-authorized');
      }

      const currentStudents = group.currentStudents ?? 0;
      if (currentStudents >= group.maxStudents) throw new TeacherEnrollmentError('group-full');

      const enrollment: Enrollment = {
        studentId: request.studentId,
        teacherId: request.teacherId,
        courseId: request.courseId,
        groupId: request.groupId,
        studentName: request.studentName,
        studentPhone: request.studentPhone,
        courseTitle: request.courseTitle,
        groupName: request.groupName,
        status: 'active',
        joinedAt: Timestamp.now(),
      };

      transaction.set(enrollmentRef, enrollment);
      transaction.update(groupRef, { currentStudents: currentStudents + 1 });
      transaction.update(requestRef, {
        status: 'approved',
        reviewedAt: Timestamp.now(),
        rejectionReason: deleteField(),
      });
    });
  }

  async rejectRequest(requestId: string, teacherId: string, rejectionReason: string) {
    const requestRef = doc(db, 'enrollmentRequests', requestId);

    await runTransaction(db, async (transaction) => {
      const requestSnapshot = await transaction.get(requestRef);
      if (!requestSnapshot.exists()) throw new TeacherEnrollmentError('request-not-found');

      const request = requestSnapshot.data() as EnrollmentRequest;
      if (request.teacherId !== teacherId) throw new TeacherEnrollmentError('not-authorized');
      if (request.status !== 'pending') throw new TeacherEnrollmentError('request-not-pending');

      transaction.update(requestRef, {
        status: 'rejected',
        reviewedAt: Timestamp.now(),
        rejectionReason: rejectionReason.trim(),
      });
    });
  }
}
