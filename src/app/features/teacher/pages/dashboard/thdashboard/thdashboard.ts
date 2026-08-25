import { Component } from '@angular/core';
import { TopNavbar } from '../../../../student/components/top-navbar/top-navbar';
import { Sidebar } from "../../../components/sidebar/sidebar";
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-thdashboard',
  imports: [TopNavbar, Sidebar, RouterOutlet],
  templateUrl: './thdashboard.html',
  styleUrl: './thdashboard.scss',
})
export class Thdashboard {}
