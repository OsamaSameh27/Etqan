import { Component, inject } from '@angular/core';
import { UserService } from '../../../../core/services/user-service';
import { AuthServices } from '../../../auth/services/auth.services';
import { Router, RouterOutlet } from '@angular/router';
import { Alerts } from '../../../../core/utils/alerts';

import { Sidebar } from '../../components/sidebar/sidebar';
import { TopNavbar } from '../../components/top-navbar/top-navbar';

@Component({
  selector: 'app-stdashboard',
  imports: [Sidebar, TopNavbar, RouterOutlet],
  templateUrl: './stdashboard.html',
  styleUrl: './stdashboard.scss',
})
export class Stdashboard {}
