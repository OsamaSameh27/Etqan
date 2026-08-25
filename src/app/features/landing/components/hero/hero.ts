import { NgOptimizedImage } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UserService } from '../../../../core/services/user-service';

@Component({
  selector: 'app-hero',
  imports: [NgOptimizedImage, RouterLink],
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
})
export class Hero {
  private userService = inject(UserService);
  user = this.userService.user;
}
