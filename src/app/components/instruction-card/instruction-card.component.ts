import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';

const STAGE_NAMES = [
  'Niveau facile 🌱',
  'Un peu plus dur 🌿',
  "C'est du sport ! 🌳",
  'Expert(e) 🚀',
];

@Component({
  selector: 'app-instruction-card',
  template: `
    <div class="sidebar">
      <ng-content></ng-content>

      <!-- Barre avant la pause -->
      <div class="sidebar-section pause-progress-section">
        <div class="sidebar-title">⏸ Avant la pause</div>
        <div class="pause-stars-row" id="pauseStarsRow">
          <span *ngFor="let s of pauseStarsArray; let i = index" 
                class="pause-star" [ngClass]="{'filled': i < (correctSinceLastPause || 0)}">
            {{ i < (correctSinceLastPause || 0) ? '⭐' : '☆' }}
          </span>
        </div>
        <div class="pause-progress-hint">
          Plus que <strong>{{ remainingBeforePause }}</strong> étoile(s) !
        </div>
      </div>

      <!-- Étoiles totales -->
      <div class="sidebar-section">
        <div class="sidebar-title">⭐ Mes étoiles</div>
        <div class="stars-row" id="starsRow">
          <span *ngFor="let s of [0,1,2,3,4,5,6,7,8,9]; let i = index" 
                class="star" [ngClass]="{'earned': i < starsEarned}">
            ⭐
          </span>
        </div>
      </div>

      <!-- Progression -->
      <div class="sidebar-section">
        <div class="sidebar-title">📈 Progression</div>
        <div class="progress-label">
          <span id="stageLabel">{{ stageLabel }}</span>
          <span id="progressLabel">{{ progress }} / {{ totalRounds }}</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" [style.width.%]="progressPercent"></div>
        </div>
        <div class="stage-dots">
          <span *ngFor="let d of [0,1,2,3]; let i = index" 
                class="stage-dot" [ngClass]="{'active': i <= (stage || 0)}"></span>
        </div>
      </div>

      <!-- Badges -->
      <div class="sidebar-section">
        <div class="sidebar-title">🏅 Badges</div>
        <div class="badges-grid">
          <div class="badge" [ngClass]="{'earned-badge': hasFirstBadge}">
            <div class="badge-icon">🔥</div>
            <div class="badge-name">Premiers pas</div>
          </div>
          <div class="badge" [ngClass]="{'earned-badge': hasFocusBadge}">
            <div class="badge-icon">🎯</div>
            <div class="badge-name">Concentré(e)</div>
          </div>
          <div class="badge" [ngClass]="{'earned-badge': hasStreakBadge}">
            <div class="badge-icon">🌈</div>
            <div class="badge-name">Série x3</div>
          </div>
          <div class="badge" [ngClass]="{'earned-badge': hasMasterBadge}">
            <div class="badge-icon">👑</div>
            <div class="badge-name">Champion(ne)</div>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div class="sidebar-section">
        <div class="sidebar-title">📊 Mon score</div>
        <div class="stats-row">
          <div class="stat-item highlight-stat">
            <span>✅ Réussites</span>
            <span class="stat-val">{{ correct }}</span>
          </div>
          <div class="stat-item">
            <span>🔁 Série</span>
            <span class="stat-val">{{ streak }}</span>
          </div>
          <div class="stat-item soft-stat">
            <span>Essais manqués</span>
            <span class="stat-val soft">{{ wrong }}</span>
          </div>
        </div>
      </div>

      <button class="btn-new" (click)="onNewGame.emit()">🔄 Recommencer</button>
    </div>
  `,
  styleUrls: ['./instruction-card.component.scss']
})
export class InstructionCardComponent implements OnChanges {
  @Input() state: any = {};
  @Output() onNewGame = new EventEmitter<void>();

  correct: number = 0;
  streak: number = 0;
  wrong: number = 0;

  correctSinceLastPause: number = 0;
  autoPauseEvery: number = 5;
  remainingBeforePause: number = 5;
  pauseStarsArray: number[] = [];

  progress: number = 0;
  totalRounds: number = 40;
  progressPercent: number = 0;

  stage: number = 0;
  stageLabel: string = STAGE_NAMES[0];
  starsEarned: number = 0;

  hasFirstBadge: boolean = false;
  hasFocusBadge: boolean = false;
  hasStreakBadge: boolean = false;
  hasMasterBadge: boolean = false;

  ngOnChanges() {
    this.correct = this.state.correct || 0;
    this.streak = this.state.streak || 0;
    this.wrong = this.state.wrong || 0;

    this.correctSinceLastPause = this.state.correctSinceLastPause || 0;
    this.autoPauseEvery = this.state.autoPauseEvery || 5;
    this.remainingBeforePause = Math.max(0, this.autoPauseEvery - this.correctSinceLastPause);
    this.pauseStarsArray = Array(this.autoPauseEvery).fill(0);

    this.progress = Math.min(this.state.progress || 0, this.state.totalRounds || 40);
    this.totalRounds = this.state.totalRounds || 40;
    this.progressPercent = (this.progress / this.totalRounds) * 100;

    this.stage = this.state.stage || 0;
    this.stageLabel = STAGE_NAMES[Math.min(this.stage, 3)];
    this.starsEarned = Math.min(this.correct, 10);

    this.hasFirstBadge = this.correct >= 1;
    this.hasFocusBadge = this.correct >= 5;
    this.hasStreakBadge = this.streak >= 3;
    this.hasMasterBadge = this.correct >= 12;
  }
}
