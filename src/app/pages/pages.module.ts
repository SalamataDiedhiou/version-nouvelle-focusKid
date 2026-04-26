import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { ComponentsModule } from '../components/components.module';

import { LoginComponent } from './login/login-component/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ConfigurationComponent } from './configuration/configuration.component';
import { StatsComponent } from './stats/stats.component';
import { Niveau1Component } from './niveau1/niveau1.component';
import { NiveauIntermediareComponent } from './niveau-intermediaire/niveau-intermediaire.component';
import { Niveau2Component } from './niveau2/niveau2.component';

@NgModule({
  declarations: [
    LoginComponent,
    DashboardComponent,
    ConfigurationComponent,
    StatsComponent,
    Niveau1Component,
    NiveauIntermediareComponent,
    Niveau2Component,
  ],
  imports: [SharedModule, ComponentsModule],
})
export class PagesModule {}
