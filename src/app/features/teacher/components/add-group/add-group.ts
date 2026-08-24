import { Component, inject, input, output } from '@angular/core';
import { Group } from '../../../../core/models/group.model';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Timestamp } from 'firebase/firestore';
import { Addgroupservice } from '../../services/addgroupservice';
import { AuthServices } from '../../../auth/services/auth.services';
import { Groups } from '../../pages/dashboard/groups/groups';
import { AddcourseService } from '../../services/addcourseservice';
import { Course } from '../../../../core/models/course.model';
import { Alerts } from '../../../../core/utils/alerts';

@Component({
  selector: 'app-add-group',
  imports: [ReactiveFormsModule],
  templateUrl: './add-group.html',
  styleUrl: './add-group.scss',
})
export class AddGroup {
  closeModal = output<void>();
  groups = input<Group | null>(null);
  courses = input<Course[]>([]);
  private groupsPage = inject(Groups);

  close() {
    this.closeModal.emit();
  }

  private fb = inject(NonNullableFormBuilder);
  groupform = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    courseId: ['', [Validators.required]],
    teacherId: [''],
    maxStudents: [0, [Validators.required, Validators.min(1)]],
    schedule: ['', [Validators.required]],
    time: ['', [Validators.required]],
    location: ['', [Validators.required]],
    createdAt: [Timestamp.now()],
  });

  private addGroupService = inject(Addgroupservice);
  private authServises = inject(AuthServices);

  ngOnInit() {
    if (this.groups()) {
      this.groupform.patchValue({
        courseId: this.groups()!.courseId,
        name: this.groups()!.name,
        maxStudents: this.groups()!.maxStudents,
        schedule: this.groups()!.schedule,
        time: this.groups()!.time ?? '',
        location: this.groups()!.location,
      });
    }
  }

  async saveGroup() {
    if (this.groupform.invalid) {
      this.groupform.markAllAsTouched();
      return;
    }

    try {
      const formValue = this.groupform.getRawValue();
      const firebaseUser = await this.authServises.getCurrentUser();

      if (!firebaseUser) {
        Alerts.error('تعذر الحفظ', 'يجب تسجيل الدخول أولًا.');
        return;
      }

      const groupData = {
        name: formValue.name,
        maxStudents: formValue.maxStudents,
        schedule: formValue.schedule,
        time: formValue.time,
        location: formValue.location,
        courseId: formValue.courseId,
      };

      const currentGroup = this.groups();

      if (currentGroup?.id) {
        await this.addGroupService.updateGroup(currentGroup.id, groupData);
        Alerts.success('تم تعديل المجموعة بنجاح', 'تم حفظ التعديلات بنجاح');
      } else {
        const newGroup: Group = {
          ...groupData,
          createdAt: Timestamp.now(),
          teacherId: firebaseUser.uid,
        };

        await this.addGroupService.addGroup(newGroup);
        Alerts.success('تم إنشاء المجموعة بنجاح', 'تم إنشاء المجموعة بنجاح');
      }

      await this.groupsPage.loadGroup();
      this.closeModal.emit();
    } catch (error) {
      console.error('Error saving group:', error);
      Alerts.error('تعذر الحفظ', 'حدث خطأ أثناء حفظ المجموعة. حاول مرة أخرى.');
    }
  }
}
