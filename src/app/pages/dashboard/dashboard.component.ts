import { Component, OnInit } from '@angular/core';
import { PatientService } from '../../services/patient.service';
import { StatsService } from '../../services/stats.service';
import { Patient } from '../../models/patient.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  patientList: Patient[] = [];
  filteredList: Patient[] = [];
  searchQuery = '';
  activeFilter = 'all';
  showModal = false;
  editingPatient: Patient | null = null;

  formData = {
    prenom: '',
    nom: '',
    age: null as number | null,
    classe: '',
    profil: 'Inattention' as Patient['profil'],
    objectif: '',
  };

  constructor(
      private patientService: PatientService,
      private statsService: StatsService,
      private router: Router
  ) {}

  ngOnInit(): void {
    this.patientService.patients$.subscribe(patients => {
      this.patientList = patients.map(p => {
        const scoreMoyen = this.statsService.getScoreMoyen(p.id);
        const erreursMoy = this.statsService.getErreursMoyennes(p.id);
        const nbSeances = this.statsService.getNbSeances(p.id);
        const derniereSeance = this.statsService.getDerniereSeance(p.id);

        return {
          ...p,
          score: scoreMoyen > 0 ? scoreMoyen : p.score,
          erreurs: erreursMoy,
          seances: nbSeances,
          derniereSeance: derniereSeance !== '—' ? derniereSeance : p.derniereSeance,
        };
      });

      this.applyFilters();
    });
  }

  logout(): void {
    localStorage.removeItem('isErgoLoggedIn');
    this.router.navigate(['/login']);
  }

  applyFilters(): void {
    let list = this.patientList;

    if (this.activeFilter !== 'all') {
      list = list.filter(p => p.profil === this.activeFilter);
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(p =>
          p.prenom.toLowerCase().includes(q) ||
          p.nom.toLowerCase().includes(q) ||
          p.classe.toLowerCase().includes(q)
      );
    }

    this.filteredList = list;
  }

  setFilter(filter: string): void {
    this.activeFilter = filter;
    this.applyFilters();
  }

  onSearch(query: string): void {
    this.searchQuery = query;
    this.applyFilters();
  }

  openAddModal(): void {
    this.editingPatient = null;
    this.formData = {
      prenom: '',
      nom: '',
      age: null,
      classe: '',
      profil: 'Inattention',
      objectif: '',
    };
    this.showModal = true;
  }

  openEditModal(patient: Patient): void {
    this.editingPatient = patient;
    this.formData = {
      prenom: patient.prenom,
      nom: patient.nom,
      age: patient.age,
      classe: patient.classe,
      profil: patient.profil,
      objectif: patient.objectif,
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  savePatient(): void {
    if (!this.formData.prenom || !this.formData.nom || !this.formData.age || !this.formData.classe) return;

    if (this.editingPatient) {
      this.patientService.updatePatient({
        ...this.editingPatient,
        prenom: this.formData.prenom,
        nom: this.formData.nom,
        age: this.formData.age!,
        classe: this.formData.classe,
        profil: this.formData.profil,
        objectif: this.formData.objectif,
      });
    } else {
      this.patientService.addPatient({
        id: this.patientService.generateId(),
        prenom: this.formData.prenom,
        nom: this.formData.nom,
        age: this.formData.age!,
        classe: this.formData.classe,
        profil: this.formData.profil,
        objectif: this.formData.objectif,
        seances: 0,
        score: 0,
        erreurs: 0,
        derniereSeance: '—',
      });
    }

    this.closeModal();
  }

  deletePatient(id: string): void {
    if (confirm('Supprimer ce patient ?')) {
      this.patientService.deletePatient(id);
    }
  }

  goToStats(patient: Patient): void {
    this.patientService.selectPatient(patient);
    this.router.navigate(['/stats']);
  }

  goToConfig(patient: Patient): void {
    this.patientService.selectPatient(patient);
    this.router.navigate(['/configuration']);
  }

  getInitials(p: Patient): string {
    return (p.prenom[0] + p.nom[0]).toUpperCase();
  }

  getScoreColor(score: number): string {
    if (score >= 80) return '#16a34a';
    if (score >= 60) return '#0891b2';
    if (score >= 40) return '#d97706';
    return '#dc2626';
  }

  getBadgeClass(profil: string): string {
    const map: Record<string, string> = {
      Inattention: 'badge-blue',
      Hyperactivité: 'badge-coral',
      Mixte: 'badge-purple',
    };

    return map[profil] || 'badge-blue';
  }
}