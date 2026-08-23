import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TeachersService } from '../../../teacher/services/teachers-service';

@Component({
  selector: 'app-teachers',
  imports: [RouterLink],
  templateUrl: './teachers.html',
  styleUrl: './teachers.scss',
})
export class Teachers {
  private teachersService = inject(TeachersService);
  teachers = this.teachersService.teachers;

  async ngOnInit() {
    await this.teachersService.getTeachers();
  }
}
