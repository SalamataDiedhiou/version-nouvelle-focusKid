import { Injectable } from '@angular/core';
import { SeanceRecord } from '../models/stats.model';

/**
 * StatsService — gère les statistiques par patient.
 *
 * Logique :
 *  - À la première visite, on génère 14 séances mock fixes → sauvegardées en localStorage.
 *  - Au rafraîchissement : on relit juste le localStorage, SANS ajouter de séance.
 *  - Quand une vraie partie se termine : on appelle `addSeance()` → la vraie séance s'ajoute.
 *  - Le score Dashboard est recalculé depuis ces séances via `getScoreMoyen()`.
 */

export interface SeanceComplete extends SeanceRecord {
  erreursDblClic: number;
}

type NiveauKey = 'N1' | 'NI' | 'N2';

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly STORAGE_PREFIX = 'focuskid_stats_';

  /**
   * Retourne les séances du patient.
   * - Si aucune donnée en localStorage → génère 14 séances mock et les sauvegarde.
   * - Sinon → retourne simplement ce qui est stocké (sans rien ajouter).
   */
  getSeances(patientId: string): SeanceComplete[] {
    const key = this.STORAGE_PREFIX + patientId;
    const stored = localStorage.getItem(key);

    if (!stored) {
      // Première visite : on génère l'historique mock initial
      const seances = this.generateHistory(14);
      localStorage.setItem(key, JSON.stringify(seances));
      return seances;
    }

    return JSON.parse(stored);
  }

  /**
   * Ajoute une vraie séance jouée à l'historique du patient.
   * À appeler depuis le composant de jeu quand la partie se termine.
   */
  addSeance(patientId: string, seance: Omit<SeanceComplete, 'id'>): void {
    const seances = this.getSeances(patientId);
    const newSeance: SeanceComplete = { ...seance, id: seances.length + 1 };
    seances.push(newSeance);
    // On garde les 30 dernières séances max
    const trimmed = seances.slice(-30).map((s, i) => ({ ...s, id: i + 1 }));
    localStorage.setItem(this.STORAGE_PREFIX + patientId, JSON.stringify(trimmed));
  }

  /** Score moyen calculé depuis l'historique → utilisé par le Dashboard.
   *  Appelle getSeances() pour garantir que les données sont générées si nécessaire,
   *  garantissant ainsi le même score entre Dashboard et page Stats.
   */
  getScoreMoyen(patientId: string): number {
    const seances = this.getSeances(patientId);
    if (seances.length === 0) return 0;
    return Math.round(seances.reduce((sum, s) => sum + s.score, 0) / seances.length);
  }

  /** Erreurs moyennes par séance → utilisé par le Dashboard. */
  getErreursMoyennes(patientId: string): number {
    const seances = this.getSeances(patientId);
    if (seances.length === 0) return 0;
    return Math.round(seances.reduce((sum, s) => sum + s.erreurs, 0) / seances.length);
  }

  /** Nombre total de séances jouées → utilisé par le Dashboard. */
  getNbSeances(patientId: string): number {
    return this.getSeances(patientId).length;
  }

  /** Date de la dernière séance → utilisé par le Dashboard. */
  getDerniereSeance(patientId: string): string {
    const seances = this.getSeances(patientId);
    if (seances.length === 0) return '—';
    return seances[seances.length - 1].date;
  }

  // ── Génération des mocks initiaux ────────────────────────────────────────────

  private generateHistory(n: number): SeanceComplete[] {
    const seances: SeanceComplete[] = [];
    let prev: SeanceComplete | null = null;
    for (let i = 0; i < n; i++) {
      const s = this.generateOneSeance(i + 1, prev);
      seances.push(s);
      prev = s;
    }
    return seances;
  }

  private generateOneSeance(id: number, prev: SeanceComplete | null): SeanceComplete {
    const baseScore = prev
      ? Math.min(100, Math.max(20, prev.score + 2 + (Math.random() - 0.35) * 12))
      : 45 + Math.random() * 15;
    const score = Math.round(baseScore);

    const baseErreurs = prev
      ? Math.max(0, prev.erreurs + (Math.random() - 0.6) * 4)
      : 8 + Math.random() * 5;
    const erreurs = Math.round(baseErreurs);

    const erreursDblClic = Math.max(0, Math.round((Math.random() - 0.4) * 4));
    const tempsMoyen = +(Math.max(1.5, 5 - id * 0.05 + (Math.random() - 0.5) * 1.2)).toFixed(1);
    const durees = [8, 10, 12, 15];
    const duree = durees[Math.floor(Math.random() * durees.length)];
    const niveaux = this.pickNiveaux(id);
    const niveau = niveaux[Math.floor(Math.random() * niveaux.length)];
    const date = this.generateDate(id, 14);

    return { id, date, niveau, duree, score, erreurs, erreursDblClic, tempsMoyen };
  }

  private pickNiveaux(i: number): NiveauKey[] {
    if (i <= 4) return ['N1'];
    if (i <= 8) return ['N1', 'NI'];
    return ['N1', 'NI', 'N2'];
  }

  private generateDate(i: number, total: number): string {
    const now = new Date();
    const daysAgo = (total - i) * 2;
    const d = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  // ── Calculs pour la page Stats ───────────────────────────────────────────────

  getLevelsProgress(seances: SeanceComplete[]): { name: string; done: number; total: number; color: string; pct: number }[] {
    const totalParNiveau: Record<NiveauKey, number> = { N1: 14, NI: 14, N2: 14 };
    const doneParNiveau: Record<NiveauKey, number> = { N1: 0, NI: 0, N2: 0 };
    seances.forEach(s => {
      const k = s.niveau as NiveauKey;
      if (doneParNiveau[k] !== undefined) doneParNiveau[k]++;
    });
    return [
      { name: 'Niveau 1 — Clic ciblé',               done: doneParNiveau['N1'], total: totalParNiveau['N1'], color: '#0891b2', pct: Math.round((doneParNiveau['N1'] / totalParNiveau['N1']) * 100) },
      { name: 'Niveau Intermédiaire — Formes mobiles', done: doneParNiveau['NI'], total: totalParNiveau['NI'], color: '#c8874a', pct: Math.round((doneParNiveau['NI'] / totalParNiveau['NI']) * 100) },
      { name: 'Niveau 2 — Séquence',                  done: doneParNiveau['N2'], total: totalParNiveau['N2'], color: '#7c3aed', pct: Math.round((doneParNiveau['N2'] / totalParNiveau['N2']) * 100) },
    ];
  }

  getDonutData(seances: SeanceComplete[]): { label: string; value: number; color: string }[] {
    const totalErreurs = seances.reduce((sum, s) => sum + s.erreurs, 0);
    const totalDblClic = seances.reduce((sum, s) => sum + s.erreursDblClic, 0);
    return [
      { label: 'Erreur de couleur', value: Math.max(1, Math.round(totalErreurs * 0.40)), color: '#f87171' },
      { label: 'Erreur de taille',  value: Math.max(1, Math.round(totalErreurs * 0.28)), color: '#fbbf24' },
      { label: 'Lenteur',           value: Math.max(1, Math.round(totalErreurs * 0.18)), color: '#a78bfa' },
      { label: 'Double-clic',       value: Math.max(1, totalDblClic),                    color: '#fb923c' },
    ];
  }
}