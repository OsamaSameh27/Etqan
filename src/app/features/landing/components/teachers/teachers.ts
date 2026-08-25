import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { TeachersService } from '../../../teacher/services/teachers-service';

@Component({
  selector: 'app-teachers',
  imports: [],
  templateUrl: './teachers.html',
  styleUrl: './teachers.scss',
})
export class Teachers {
  private teachersService = inject(TeachersService);
  private cdr = inject(ChangeDetectorRef);
  teachers = this.teachersService.teachers;
  isLoading = true;
  loadError = false;

  ngOnInit(): void {
    void this.loadTeachers();
  }

  async loadTeachers(): Promise<void> {
    this.isLoading = true;
    this.loadError = false;

    try {
      await this.teachersService.getTeachers();
    } catch (error) {
      console.error('Error loading landing teachers:', error);
      this.loadError = true;
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
}
