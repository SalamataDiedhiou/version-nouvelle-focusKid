import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SessionConfig, DEFAULT_CONFIG } from '../models/session-config.model';

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private readonly STORAGE_KEY = 'focuskid_config';
  private config: SessionConfig = { ...DEFAULT_CONFIG };
  public config$ = new BehaviorSubject<SessionConfig>(this.config);

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        this.config = { ...DEFAULT_CONFIG, ...parsed };
        this.config$.next(this.config);
      } catch (e) {
        console.error('Failed to parse stored config', e);
      }
    }
  }

  private saveToStorage(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.config));
  }

  getConfig(): SessionConfig {
    return this.config;
  }

  updateConfig(config: SessionConfig): void {
    this.config = { ...config };
    this.saveToStorage();
    this.config$.next(this.config);
  }
}
