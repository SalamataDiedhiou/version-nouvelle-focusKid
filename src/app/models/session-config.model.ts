export type FormeType = 'circle' | 'square' | 'triangle' | 'star' | 'diamond' | 'pentagon';
export type ColorName = 'rouge' | 'bleu' | 'jaune' | 'vert' | 'violet' | 'orange' | 'rose';
export type PaletteKey = 'apaisantes' | 'stimulantes' | 'chaudes' | 'froides' | 'contrasteEleve';
export type ShapePaletteKey = 'basiques' | 'completes' | 'symetriques' | 'complexes';

export type QuantiteFormes = 'petit' | 'moyen' | 'beaucoup';
export type TailleFormes = 'petite' | 'moyenne' | 'grande' | 'varie';
export type ModeSelection = 'multiple' | 'unique';
export type GameMode = 'libre' | 'progressif' | 'etape1' | 'etape2' | 'etape3' | 'etape4';


export interface SessionConfig {
  niveau: 'niveau1' | 'niveau-intermediaire' | 'niveau2' ;
  mode: GameMode;
  activerTempsReponse: boolean;
  tempsReponse: number;
  dureePartie: number;
  nbParties: number;
  formesActives: FormeType[];
  selectedShapePalette: ShapePaletteKey;
  couleursActives: ColorName[];
  selectedPalette: PaletteKey;
  vitesse: 'lente' | 'moyenne' | 'rapide';
  audioConsigne: boolean;
  sonSucces: boolean;
  sonErreur: boolean;
  volumeGeneral: number;
  grandePolice: boolean;
  fortContraste: boolean;
  animationsReduites: boolean;
  
  // Nouveaux réglages
  quantiteFormes: QuantiteFormes;
  modeCouleur: ModeSelection;
  couleurUnique: ColorName;
  modeForme: ModeSelection;
  formeUnique: FormeType;
  tailleFormes: TailleFormes;
}

export interface FormeOption {
  type: FormeType;
  label: string;
  emoji: string;
  svgPath: string;
}

export interface CouleurOption {
  name: ColorName;
  label: string;
  hex: string;
}

export const FORMES_DISPONIBLES: FormeOption[] = [
  { type: 'circle',   label: 'Cercle',    emoji: '●', svgPath: 'circle' },
  { type: 'square',   label: 'Carré',     emoji: '■', svgPath: 'square' },
  { type: 'triangle', label: 'Triangle',  emoji: '▲', svgPath: 'triangle' },
  { type: 'star',     label: 'Étoile',    emoji: '★', svgPath: 'star' },
  { type: 'diamond',  label: 'Losange',   emoji: '◆', svgPath: 'diamond' },
  { type: 'pentagon', label: 'Pentagone', emoji: '⬠', svgPath: 'pentagon' },
];

export const COULEURS_DISPONIBLES: CouleurOption[] = [
  { name: 'rouge',  label: 'Rouge',  hex: '#f04438' },
  { name: 'bleu',   label: 'Bleu',   hex: '#3b82f6' },
  { name: 'jaune',  label: 'Jaune',  hex: '#fbbf24' },
  { name: 'vert',   label: 'Vert',   hex: '#22c55e' },
  { name: 'violet', label: 'Violet', hex: '#a855f7' },
  { name: 'orange', label: 'Orange', hex: '#f97316' },
  { name: 'rose',   label: 'Rose',   hex: '#ec4899' },
];

// ── Palettes de couleurs uniques ──────────────────────────────────
export const PALETTE_KEYS: PaletteKey[] = [
  'apaisantes',
  'stimulantes',
  'chaudes',
  'froides',
  'contrasteEleve'
];

export const PALETTE_LABELS: Record<PaletteKey, string> = {
  apaisantes: '😌 Apaisantes',
  stimulantes: '⚡ Stimulantes',
  chaudes: '🔥 Chaudes',
  froides: '❄️ Froides',
  contrasteEleve: '⭕ Contraste élevé'
};

export const COLOR_PALETTES: Record<PaletteKey, ColorName[]> = {
  apaisantes: ['bleu', 'vert', 'violet', 'rose'],
  stimulantes: ['rouge', 'jaune', 'orange', 'bleu'],
  chaudes: ['rouge', 'orange', 'jaune', 'rose'],
  froides: ['bleu', 'vert', 'violet'],
  contrasteEleve: ['rouge', 'jaune', 'bleu', 'rose']
};

export const COLORS: Record<ColorName, string> = {
  rouge: '#f04438',
  bleu: '#3b82f6',
  jaune: '#fbbf24',
  vert: '#22c55e',
  violet: '#a855f7',
  orange: '#f97316',
  rose: '#ec4899'
};

// ── Palettes de formes uniques ───────────────────────────────────
export const SHAPE_PALETTE_KEYS: ShapePaletteKey[] = [
  'basiques',
  'completes',
  'symetriques',
  'complexes'
];

export const SHAPE_PALETTE_LABELS: Record<ShapePaletteKey, string> = {
  basiques:    '🔷 Basiques',
  completes:   '🎨 Complètes',
  symetriques: '⭐ Symétriques',
  complexes:   '🌟 Complexes',
};

export const SHAPE_PALETTES: Record<ShapePaletteKey, FormeType[]> = {
  basiques:    ['circle', 'square', 'triangle'],
  completes:   ['circle', 'square', 'triangle', 'star', 'diamond', 'pentagon'],
  symetriques: ['circle', 'square', 'diamond'],
  complexes:   ['star', 'diamond', 'pentagon'],
};

export const DEFAULT_CONFIG: SessionConfig = {
  niveau: 'niveau1',
  mode: 'libre',
  activerTempsReponse: true,
  tempsReponse: 10,
  dureePartie: 5,
  nbParties: 3,
  formesActives: ['circle', 'square', 'triangle'],
  selectedShapePalette: 'basiques',
  couleursActives: ['rouge', 'bleu', 'jaune', 'vert', 'violet', 'orange', 'rose'],
  selectedPalette: 'apaisantes',
  vitesse: 'moyenne',
  audioConsigne: true,
  sonSucces: true,
  sonErreur: false,
  volumeGeneral: 70,
  grandePolice: true,
  fortContraste: false,
  animationsReduites: false,

  quantiteFormes: 'moyen',
  modeCouleur: 'multiple',
  couleurUnique: 'rouge',
  modeForme: 'multiple',
  formeUnique: 'circle',
  tailleFormes: 'moyenne'
};