export interface User {
  name: string;
  email: string;
  phone: string;
  role: 'student' | 'teacher';
  image?: string;

  // Teacher data
  subject?: string;
  bio?: string;
  experienceYears?: number;
  grades?: string[];
}
