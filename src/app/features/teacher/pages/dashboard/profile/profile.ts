import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { AuthServices } from '../../../../auth/services/auth.services';
import { User } from '../../../../../core/models/user.model';
import { FormsModule, NgModel } from '@angular/forms';
import { Alerts } from '../../../../../core/utils/alerts';
import { Course } from '../../../../../core/models/course.model';
import { AddcourseService } from '../../../services/addcourseservice';
import { Addgroupservice } from '../../../services/addgroupservice';
import { Group } from '../../../../../core/models/group.model';
import { CloudinaryService } from '../../../../auth/services/cloudinary.service';

@Component({
  selector: 'app-profile',
  imports: [FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile {
  private authService = inject(AuthServices);
  private cloudinaryService = inject(CloudinaryService);
  selectedImage: File | null = null;
  imagePreview = '';
  isSaving = false;

  user: User | null = null;
  courses: Course[] = [];
  groups: Group[] = [];

  private addCourseService = inject(AddcourseService);
  private addGroupService = inject(Addgroupservice);

  isEditing = false;
  private cdr = inject(ChangeDetectorRef);

  editData = {
    name: '',
    phone: '',
    experienceYears: 0,
    image: '',
  };
  startEditing() {
    if (!this.user) return;

    this.editData = {
      name: this.user.name,
      phone: this.user.phone,
      experienceYears: this.user.experienceYears ?? 0,
      image: this.user.image ?? '',
    };
    this.selectedImage = null;
    this.imagePreview = this.user.image ?? '';
    this.isEditing = true;
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      Alerts.error('ملف غير صالح', 'يرجى اختيار صورة فقط');
      input.value = '';
      return;
    }

    this.selectedImage = file;
    this.imagePreview = URL.createObjectURL(file);
  }

  async loadCourses() {
    const user = await this.authService.getCurrentUser();

    if (!user) return;

    const snapshot = await this.addCourseService.getTeacherCourses(user.uid);

    this.courses = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...(doc.data() as Course),
    }));
    this.cdr.detectChanges();
  }

  async loadGroups() {
    const user = await this.authService.getCurrentUser();

    if (!user) return;

    const snapshot = await this.addGroupService.getTeacherGroups(user.uid);

    this.groups = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...(doc.data() as Group),
    }));
    this.cdr.detectChanges();
  }

  async saveChanges() {
    if (!this.user || this.isSaving) return;
    this.isSaving = true;

    try {
      const fireBaseUser = await this.authService.getCurrentUser();
      if (!fireBaseUser) {
        return;
      }

      let imageUrl = this.editData.image;

      // إذا اختار المستخدم صورة جديدة، نرفعها ونأخذ الرابط الجديد
      if (this.selectedImage) {
        imageUrl = await this.cloudinaryService.uploadImage(this.selectedImage);
      }
      const updatedUser: User = {
        ...this.user,
        name: this.editData.name,
        phone: this.editData.phone,
        experienceYears: this.editData.experienceYears,
        image: imageUrl,
      };

      await this.authService.saveUserData(fireBaseUser.uid, updatedUser);
      this.user = updatedUser;
      Alerts.success('تم تحديث البيانت بنجاح ', 'تم تحديث بيانتك بنجاح');
      this.isEditing = false;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  }

  async ngOnInit() {
    const fireBaseUser = await this.authService.getCurrentUser();
    if (!fireBaseUser) {
      return;
    }
    this.loadCourses();
    this.loadGroups();

    this.user = await this.authService.getUserData(fireBaseUser.uid);
    this.cdr.detectChanges();
  }
}
