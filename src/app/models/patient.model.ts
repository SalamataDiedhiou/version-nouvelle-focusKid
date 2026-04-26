export interface Patient {
  id: string;
  prenom: string;
  nom: string;
  age: number;
  classe: string;
  profil: 'Inattention' | 'Hyperactivité' | 'Mixte';
  objectif: string;
  seances: number;
  score: number;
  erreurs: number;
  derniereSeance: string;
}
