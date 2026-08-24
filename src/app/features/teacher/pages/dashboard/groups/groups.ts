import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { AddGroup } from '../../../components/add-group/add-group';
import { Course } from '../../../../../core/models/course.model';
import { AddcourseService } from '../../../services/addcourseservice';
import { AuthServices } from '../../../../auth/services/auth.services';
import { Group } from '../../../../../core/models/group.model';
import { Addgroupservice } from '../../../services/addgroupservice';
import { Alerts } from '../../../../../core/utils/alerts';

@Component({
  selector: 'app-groups',
  imports: [AddGroup],
  templateUrl: './groups.html',
  styleUrl: './groups.scss',
})
export class Groups {
  isAddGroupOpen = false;
  courses: Course[] = [];
  groups: Group[] = [];

  private addCourseService = inject(AddcourseService);
  private authService = inject(AuthServices);
  private addGroupService = inject(Addgroupservice);
  async ngOnInit() {
    this.loadGroup();
    const user = await this.authService.getCurrentUser();

    if (!user) return;

    const snapshot = await this.addCourseService.getTeacherCourses(user.uid);

    this.courses = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Course),
    }));
    const groupSnapshot = await this.addGroupService.getTeacherGroups(user.uid);

    this.groups = groupSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Group),
    }));
  }
  private cdr = inject(ChangeDetectorRef);

  async loadGroup() {
    const user = await this.authService.getCurrentUser();

    if (!user) return;

    const snapshot = await this.addGroupService.getTeacherGroups(user.uid);

    this.groups = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Group),
    }));
    this.cdr.detectChanges();
  }
  selectedGroup: Group | null = null;
  openAddGroup() {
    this.selectedGroup = null;
    this.isAddGroupOpen = true;
  }

  closeGroupModal() {
    this.isAddGroupOpen = false;
    this.selectedGroup = null;
  }

  async deleteGroup(group: Group) {
    if (!group.id) {
      return;
    }
    await this.addGroupService.deleteGroup(group.id);
    this.groups = this.groups.filter((item) => item.id !== group.id);
    await this.loadGroup();
    Alerts.success('تم الحذف', 'تم حذف المجموعة بنجاح');
  }
  editgroup(group: Group) {
    this.selectedGroup = group;
    this.isAddGroupOpen = true;
  }
}
