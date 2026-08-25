import { inject, Service } from '@angular/core';
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth';
import { auth, db } from '../../../core/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { User } from '../../../core/models/user.model';
import { PublicTeacherProfile } from '../../../core/models/public-teacher-profile.model';
import { TeacherPaymentProfile } from '../../../core/models/teacher-payment-profile.model';
import { UserService } from '../../../core/services/user-service';

@Service({})
export class AuthServices {


  saveUserData(uid: string, userData: User) {
    const userRef = doc(db, 'users', uid);
    return setDoc(userRef, userData);
  }

  savePublicTeacherProfile(uid: string, profile: PublicTeacherProfile) {
    const profileRef = doc(db, 'publicTeacherProfiles', uid);
    return setDoc(profileRef, profile, { merge: true });
  }

  async getPublicTeacherProfile(uid: string): Promise<PublicTeacherProfile | null> {
    const profileRef = doc(db, 'publicTeacherProfiles', uid);
    const snapshot = await getDoc(profileRef);
    return snapshot.exists() ? (snapshot.data() as PublicTeacherProfile) : null;
  }

  saveTeacherPaymentProfile(uid: string, profile: TeacherPaymentProfile) {
    const paymentRef = doc(db, 'teacherPaymentProfiles', uid);
    return setDoc(paymentRef, profile, { merge: true });
  }

  async getTeacherPaymentProfile(uid: string): Promise<TeacherPaymentProfile | null> {
    const paymentRef = doc(db, 'teacherPaymentProfiles', uid);
    const snapshot = await getDoc(paymentRef);
    return snapshot.exists() ? (snapshot.data() as TeacherPaymentProfile) : null;
  }

  register(email: string, password: string) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  login(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async changeCurrentUserPassword(currentPassword: string, newPassword: string) {
    const currentUser = auth.currentUser;

    if (!currentUser?.email) {
      throw new Error('auth/user-not-found');
    }

    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);
    await updatePassword(currentUser, newPassword);
  }

  sendPasswordResetLink(email: string) {
    auth.languageCode = 'ar';
    return sendPasswordResetEmail(auth, email);
  }

  async getUserData(uid: string): Promise<User | null> {
    const userRef = doc(db, 'users', uid);
    const userSnapshot = await getDoc(userRef);
    if (!userSnapshot.exists()) {
      return null;
    }

    return userSnapshot.data() as User;
  }

  private userService = inject(UserService);

  checkAuthState() {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        this.userService.user.set(null);
        return;
      }

      const userData = await this.getUserData(user.uid);

      this.userService.user.set(userData);
    });
  }

  logout() {
    return signOut(auth);
  }

  getCurrentUser(): Promise<import('firebase/auth').User | null> {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user);
      });
    });
  }

}
