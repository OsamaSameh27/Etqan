import { Component } from '@angular/core';

import { Contact } from '../../components/contact/contact';
import { Faq } from '../../components/faq/faq';
import { FeaturesSection } from '../../components/features/features';
import { Hero } from '../../components/hero/hero';
import { HowItWorks } from '../../components/how-it-works/how-it-works';
import { Teachers } from '../../components/teachers/teachers';
import { Courses } from '../../components/courses/courses';

@Component({
  selector: 'app-landing-page',
  imports: [
    Hero,
    FeaturesSection,
    HowItWorks,
    Teachers,
    Faq,
    Contact,
    Courses,
  ],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.scss',
})
export class LandingPage {}
