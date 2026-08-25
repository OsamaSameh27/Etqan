import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Sidebar } from '../../components/sidebar/sidebar';
import { TopNavbar } from '../../components/top-navbar/top-navbar';

@Component({
  selector: 'app-stdashboard',
  imports: [Sidebar, TopNavbar, RouterOutlet],
  templateUrl: './stdashboard.html',
  styleUrl: './stdashboard.scss',
})
export class Stdashboard {}
