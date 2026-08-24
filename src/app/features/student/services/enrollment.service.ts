import { Service } from '@angular/core';
import { collection, doc, getDoc, onSnapshot, query, runTransaction, where } from 'firebase/firestore';

import { db } from '../../../core/firebase';
import {
  EnrollmentRequest,
  EnrollmentRequestStatus,
} from '../../../core/models/enrollment-request.model';

export class EnrollmentRequestConflictError extends Error {
  constructor(readonly requestStatus: Extract<EnrollmentRequestStatus, 'pending' | 'approved'>) {
    super(`Enrollment request is already ${requestStatus}`);
    this.name = 'EnrollmentRequestConflictError';
  }
}

@Service()
export class EnrollmentService {
  private requestsCollection = collection(db, 'enrollmentRequests');

  async getStudentCourseRequest(studentId: string, courseId: string) {
    const requestRef = doc(db, 'enrollmentRequests', this.requestId(studentId, courseId));
    const requestSnapshot = await getDoc(requestRef);

    if (!requestSnapshot.exists()) return null;

    return {
      id: requestSnapshot.id,
      ...(requestSnapshot.data() as EnrollmentRequest),
    };
  }

  async createEnrollmentRequest(request: EnrollmentRequest) {
    const requestId = this.requestId(request.studentId, request.courseId);
    const requestRef = doc(db, 'enrollmentRequests', requestId);

    await runTransaction(db, async (transaction) => {
      const currentRequest = await transaction.get(requestRef);

      if (currentRequest.exists()) {
        const status = (currentRequest.data() as EnrollmentRequest).status;
        if (status === 'pending' || status === 'approved') {
          throw new EnrollmentRequestConflictError(status);
        }
      }

      transaction.set(requestRef, request);
    });

    return requestId;
  }

  listenToStudentRequests(
    studentId: string,
    onRequestsChanged: (requests: EnrollmentRequest[]) => void,
    onError: (error: Error) => void,
  ) {
    const studentRequestsQuery = query(
      this.requestsCollection,
      where('studentId', '==', studentId),
    );

    return onSnapshot(
      studentRequestsQuery,
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

  private requestId(studentId: string, courseId: string) {
    return `${studentId}_${courseId}`;
  }
}
