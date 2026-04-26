import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { PatientService } from '../../services/patient.service';
import { StatsService, SeanceComplete } from '../../services/stats.service';
import { Patient } from '../../models/patient.model';
import { StatsData } from '../../models/stats.model';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-stats',
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.scss'],
})
export class StatsComponent implements OnInit, AfterViewInit, OnDestroy {
  patient: Patient | null = null;
  activePeriod = 7;
  private sub!: Subscription;

  /** Toutes les séances générées pour ce patient */
  private allSeances: SeanceComplete[] = [];

  kpiScore = '—'; kpiErreurs = '—'; kpiSeances = '—'; kpiProgress = '—';
  kpiProgressColor = '#0891b2';

  tableRows: SeanceComplete[] = [];

  donutSegs: { label: string; value: number; color: string }[] = [];
  donutMain = { pct: 0, label: '' };

  levels: { name: string; done: number; total: number; color: string; pct: number }[] = [];

  constructor(
    private patientService: PatientService,
    private statsService: StatsService,
  ) {}

  ngOnInit(): void {
    this.sub = this.patientService.selectedPatient$.subscribe(p => {
      this.patient = p;
      if (p) {
        this.allSeances = this.statsService.getSeances(p.id);
        this.donutSegs = this.statsService.getDonutData(this.allSeances);
        this.levels = this.statsService.getLevelsProgress(this.allSeances);
        this.updateDonutMain();
      }
      this.render(this.activePeriod);
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.render(this.activePeriod), 100);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  getInitials(p: Patient): string {
    return (p.prenom[0] + p.nom[0]).toUpperCase();
  }

  setPeriod(period: number): void {
    this.activePeriod = period;
    this.render(period);
  }

  private slice(n: number): { seances: SeanceComplete[]; data: StatsData } {
    const k = Math.min(n, this.allSeances.length);
    const seances = this.allSeances.slice(-k);
    return {
      seances,
      data: {
        scores: seances.map(s => s.score),
        errors: seances.map(s => s.erreurs),
        times: seances.map(s => s.tempsMoyen),
        dates: seances.map(s => s.date),
      },
    };
  }

  render(period: number): void {
    if (this.allSeances.length === 0) return;
    const { seances, data } = this.slice(period);
    this.updateKPIs(data, seances);
    this.tableRows = [...seances].reverse();
    setTimeout(() => {
      this.drawLine('canvasScore', data.dates, [
        { data: data.scores, color: '#0891b2', fill: true },
        { data: Array(data.scores.length).fill(75), color: '#94a3b8', dash: true },
      ], 0, 100);
      this.drawBars('canvasErreurs', data.dates, data.errors, '#dc2626');
      this.drawBars('canvasTemps', data.dates, data.times, '#2563eb');
      this.drawDonut();
    }, 0);
  }

  private avg(a: number[]): number {
    if (a.length === 0) return 0;
    return Math.round(a.reduce((x, y) => x + y, 0) / a.length);
  }

  private updateKPIs(data: StatsData, seances: SeanceComplete[]): void {
    // ✅ Score moyen calculé sur TOUTES les séances → identique au Dashboard
    const scoreMoyenTotal = this.patient
      ? this.statsService.getScoreMoyen(this.patient.id)
      : this.avg(this.allSeances.map(s => s.score));

    // Erreurs moyennes et progression restent sur la période sélectionnée
    const ae = this.avg(data.errors);
    const prevSeances = this.allSeances.slice(-this.activePeriod * 2, -this.activePeriod);
    const prevScores = prevSeances.map(s => s.score);
    const currentAvg = this.avg(data.scores);
    const delta = currentAvg - (prevScores.length ? this.avg(prevScores) : currentAvg);

    this.kpiScore = scoreMoyenTotal + '%';
    this.kpiErreurs = String(ae);
    this.kpiSeances = String(this.allSeances.length);
    this.kpiProgress = (delta >= 0 ? '+' : '') + delta + '%';
    this.kpiProgressColor = delta >= 0 ? '#0891b2' : '#dc2626';
  }

  private updateDonutMain(): void {
    if (this.donutSegs.length === 0) return;
    const total = this.donutSegs.reduce((a, b) => a + b.value, 0);
    const biggest = this.donutSegs.reduce((a, b) => a.value > b.value ? a : b);
    this.donutMain = { pct: Math.round(biggest.value / (total || 1) * 100), label: biggest.label };
  }

  getBadgeClass(score: number): string {
    if (score >= 80) return 'badge-excellent';
    if (score >= 65) return 'badge-bien';
    if (score >= 50) return 'badge-moyen';
    return 'badge-difficile';
  }

  getBadgeLabel(score: number): string {
    if (score >= 80) return 'Excellent';
    if (score >= 65) return 'Bien';
    if (score >= 50) return 'Moyen';
    return 'Difficile';
  }

  getScoreColor(score: number): string {
    if (score >= 70) return '#16a34a';
    if (score >= 50) return '#d97706';
    return '#dc2626';
  }

  // ── Canvas drawing ──────────────────────────────────────────────────────────

  private getCanvas(id: string): { ctx: CanvasRenderingContext2D; w: number; h: number } | null {
    const c = document.getElementById(id) as HTMLCanvasElement;
    if (!c) return null;
    const dpr = window.devicePixelRatio || 1;
    const w = c.parentElement!.clientWidth || 300;
    const h = c.parentElement!.clientHeight || 180;
    c.width = w * dpr; c.height = h * dpr;
    c.style.width = w + 'px'; c.style.height = h + 'px';
    const ctx = c.getContext('2d')!;
    ctx.scale(dpr, dpr);
    return { ctx, w, h };
  }

  drawLine(id: string, labels: string[], datasets: any[], yMin: number, yMax: number): void {
    const r = this.getCanvas(id); if (!r) return;
    const { ctx, w, h } = r;
    const pd = { t: 16, r: 16, b: 36, l: 40 };
    const cw = w - pd.l - pd.r, ch = h - pd.t - pd.b;
    const yr = yMax - yMin || 1;
    const xs = (i: number) => pd.l + i * (cw / Math.max(labels.length - 1, 1));
    const ys = (v: number) => pd.t + ch * (1 - (v - yMin) / yr);
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pd.t + (ch / 4) * i;
      ctx.beginPath(); ctx.moveTo(pd.l, y); ctx.lineTo(pd.l + cw, y); ctx.stroke();
    }
    ctx.fillStyle = '#9ca3af'; ctx.font = "10px 'Nunito',sans-serif"; ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      ctx.fillText(String(Math.round(yMin + (yr / 4) * (4 - i))), pd.l - 6, pd.t + (ch / 4) * i + 3);
    }
    ctx.textAlign = 'center'; ctx.fillStyle = '#9ca3af';
    labels.forEach((l, i) => { if (labels.length <= 10 || i % 2 === 0) ctx.fillText(l, xs(i), h - pd.b + 16); });
    datasets.forEach(ds => {
      if (ds.fill) {
        ctx.beginPath();
        ctx.moveTo(xs(0), ys(ds.data[0]));
        ds.data.forEach((v: number, i: number) => { if (i > 0) ctx.lineTo(xs(i), ys(v)); });
        ctx.lineTo(xs(ds.data.length - 1), pd.t + ch);
        ctx.lineTo(xs(0), pd.t + ch); ctx.closePath();
        const g = ctx.createLinearGradient(0, pd.t, 0, pd.t + ch);
        g.addColorStop(0, ds.color + '30'); g.addColorStop(1, ds.color + '00');
        ctx.fillStyle = g; ctx.fill();
      }
      ctx.beginPath();
      ctx.strokeStyle = ds.color; ctx.lineWidth = ds.dash ? 1.5 : 2;
      ctx.setLineDash(ds.dash ? [5, 4] : []);
      ctx.lineJoin = 'round';
      ds.data.forEach((v: number, i: number) => i === 0 ? ctx.moveTo(xs(i), ys(v)) : ctx.lineTo(xs(i), ys(v)));
      ctx.stroke(); ctx.setLineDash([]);
      if (!ds.dash) {
        ds.data.forEach((v: number, i: number) => {
          ctx.beginPath(); ctx.arc(xs(i), ys(v), 3.5, 0, Math.PI * 2);
          ctx.fillStyle = ds.color; ctx.fill();
          ctx.strokeStyle = 'white'; ctx.lineWidth = 1.5; ctx.stroke();
        });
      }
    });
  }

  drawBars(id: string, labels: string[], data: number[], color: string): void {
    const r = this.getCanvas(id); if (!r) return;
    const { ctx, w, h } = r;
    const pd = { t: 16, r: 16, b: 36, l: 40 };
    const cw = w - pd.l - pd.r, ch = h - pd.t - pd.b;
    const max = Math.max(...data) || 1;
    const bw = Math.max(6, (cw / data.length) * 0.5);
    const step = cw / data.length;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) { const y = pd.t + (ch / 4) * i; ctx.beginPath(); ctx.moveTo(pd.l, y); ctx.lineTo(pd.l + cw, y); ctx.stroke(); }
    ctx.fillStyle = '#9ca3af'; ctx.font = "10px 'Nunito',sans-serif"; ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) ctx.fillText(String(Math.round(max * (4 - i) / 4)), pd.l - 6, pd.t + (ch / 4) * i + 3);
    data.forEach((v, i) => {
      const bh = (v / max) * ch, x = pd.l + step * i + (step - bw) / 2, y = pd.t + ch - bh;
      const g = ctx.createLinearGradient(0, y, 0, y + bh);
      g.addColorStop(0, color + 'dd'); g.addColorStop(1, color + '66');
      ctx.fillStyle = g;
      const rr = Math.min(4, bw / 2);
      ctx.beginPath();
      ctx.moveTo(x + rr, y); ctx.lineTo(x + bw - rr, y);
      ctx.quadraticCurveTo(x + bw, y, x + bw, y + rr);
      ctx.lineTo(x + bw, y + bh); ctx.lineTo(x, y + bh); ctx.lineTo(x, y + rr);
      ctx.quadraticCurveTo(x, y, x + rr, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#9ca3af'; ctx.textAlign = 'center';
      if (labels.length <= 10 || i % 2 === 0) ctx.fillText(labels[i], x + bw / 2, h - pd.b + 16);
    });
  }

  drawDonut(): void {
    const c = document.getElementById('canvasDonut') as HTMLCanvasElement;
    if (!c) return;
    const sz = 150, dpr = window.devicePixelRatio || 1;
    c.width = sz * dpr; c.height = sz * dpr;
    c.style.width = sz + 'px'; c.style.height = sz + 'px';
    const ctx = c.getContext('2d')!; ctx.scale(dpr, dpr);
    const cx = sz / 2, cy = sz / 2, outerR = 60, innerR = 38;
    let angle = -Math.PI / 2;
    const total = this.donutSegs.reduce((a, b) => a + b.value, 0) || 1;
    this.donutSegs.forEach(s => {
      const sl = (s.value / total) * Math.PI * 2;
      ctx.beginPath(); ctx.arc(cx, cy, outerR, angle, angle + sl);
      ctx.arc(cx, cy, innerR, angle + sl, angle, true);
      ctx.closePath(); ctx.fillStyle = s.color; ctx.fill();
      angle += sl;
    });
    ctx.beginPath(); ctx.arc(cx, cy, innerR - 2, 0, Math.PI * 2); ctx.fillStyle = 'white'; ctx.fill();
    this.updateDonutMain();
  }
}