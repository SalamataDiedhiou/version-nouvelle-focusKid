export interface SeanceRecord {
  id: number;
  date: string;
  niveau: string;
  duree: number;
  score: number;
  erreurs: number;
  erreursDblClic: number;
  tempsMoyen: number;
}

export interface StatsData {
  scores: number[];
  errors: number[];
  times: number[];
  dates: string[];
}
