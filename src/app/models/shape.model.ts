export const SHAPES = [
    'circle',
    'square',
    'triangle',
    'star',
    'diamond',
    'pentagon'
];

/* ─────────────────────────────────────────
   Couleurs de base disponibles
───────────────────────────────────────── */

export const COLORS: Record<string, string> = {
    rouge: '#f04438',
    bleu: '#3b82f6',
    jaune: '#fbbf24',
    vert: '#22c55e',
    violet: '#a855f7',
    orange: '#f97316',
    rose: '#ec4899',
    blanc: '#ffffff',
    noir: '#111827',
    beige: '#f5f5dc'
};

export const COLOR_NAMES = Object.keys(COLORS);

/* ─────────────────────────────────────────
   Palettes visuelles (NOUVEAU)
───────────────────────────────────────── */

export const COLOR_PALETTES: Record<string, string[]> = {
    apaisantes: [
        'bleu',
        'vert',
        'violet',
        'beige'
    ],

    stimulantes: [
        'rouge',
        'jaune',
        'orange',
        'bleu'
    ],

    chaudes: [
        'rouge',
        'orange',
        'jaune',
        'rose'
    ],

    froides: [
        'bleu',
        'vert',
        'violet'
    ],

    contrasteEleve: [
        'noir',
        'blanc',
        'jaune',
        'bleu'
    ]
};

/* ─────────────────────────────────────────
   Labels affichés UI
───────────────────────────────────────── */

export const PALETTE_LABELS: Record<string, string> = {
    apaisantes: 'Couleurs apaisantes',
    stimulantes: 'Couleurs stimulantes',
    chaudes: 'Couleurs chaudes',
    froides: 'Couleurs froides',
    contrasteEleve: 'Contraste élevé'
};

export const SHAPE_LABELS: Record<string, string> = {
    circle: 'cercle',
    square: 'carré',
    triangle: 'triangle',
    star: 'étoile',
    diamond: 'losange',
    pentagon: 'pentagone'
};

/* ─────────────────────────────────────────
   Progression difficulté
───────────────────────────────────────── */

export const STAGES = [
    { minRound: 0, count: 3, size: 120, spread: 0.70 },
    { minRound: 3, count: 5, size: 100, spread: 0.78 },
    { minRound: 6, count: 7, size: 82, spread: 0.88 },
    { minRound: 9, count: 10, size: 65, spread: 1.00 }
];