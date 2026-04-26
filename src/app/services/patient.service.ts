import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Patient } from '../models/patient.model';
import { PATIENTS_LIST } from '../mocks/patients.mock';

@Injectable({ providedIn: 'root' })
export class PatientService {
  private readonly STORAGE_KEY = 'focuskid_patients';
  private patients: Patient[] = [];
  public patients$ = new BehaviorSubject<Patient[]>([]);
  public selectedPatient$ = new BehaviorSubject<Patient | null>(null);

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      this.patients = JSON.parse(stored);
    } else {
      this.patients = [...PATIENTS_LIST];
      this.saveToStorage();
    }
    this.patients$.next(this.patients);
  }

  private saveToStorage(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.patients));
  }

  getPatients(): Patient[] {
    return this.patients;
  }

  selectPatient(patient: Patient): void {
    this.selectedPatient$.next(patient);
  }

  addPatient(patient: Patient): void {
    this.patients = [...this.patients, patient];
    this.saveToStorage();
    this.patients$.next(this.patients);
  }

  updatePatient(updated: Patient): void {
    this.patients = this.patients.map(p => p.id === updated.id ? updated : p);
    this.saveToStorage();
    this.patients$.next(this.patients);
  }

  deletePatient(id: string): void {
    this.patients = this.patients.filter(p => p.id !== id);
    this.saveToStorage();
    this.patients$.next(this.patients);
  }

  generateId(): string {
    return Date.now().toString() + Math.floor(Math.random() * 1000);
  }
}
