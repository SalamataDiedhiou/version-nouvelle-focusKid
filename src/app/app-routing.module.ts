import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginComponent } from './pages/login/login-component/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { StatsComponent } from './pages/stats/stats.component';
import { ConfigurationComponent } from './pages/configuration/configuration.component';
import { Niveau1Component } from './pages/niveau1/niveau1.component';
import { NiveauIntermediareComponent } from './pages/niveau-intermediaire/niveau-intermediaire.component';
import { Niveau2Component } from './pages/niveau2/niveau2.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'stats', component: StatsComponent },
  { path: 'configuration', component: ConfigurationComponent },
  { path: 'niveau1', component: Niveau1Component },
  { path: 'niveau-intermediaire', component: NiveauIntermediareComponent },
  { path: 'niveau2', component: Niveau2Component },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
