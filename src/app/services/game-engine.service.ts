import { Injectable, ElementRef } from '@angular/core';
import { SessionConfig, FormeType, ColorName } from '../models/session-config.model';

export const SHAPES: FormeType[] = ['circle', 'square', 'triangle', 'star', 'diamond', 'pentagon'];

export const COLORS: Record<ColorName, string> = {
    rouge: '#f04438',
    bleu: '#3b82f6',
    jaune: '#fbbf24',
    vert: '#22c55e',
    violet: '#a855f7',
    orange: '#f97316',
    rose: '#ec4899',
};

export const COLOR_NAMES = Object.keys(COLORS) as ColorName[];

export interface Level1Difficulty {
    shapeCount: number;
    size: number;
    timerMax: number;
    timerVisible: boolean;
    noGoFrequency: number;
    stage: number;
}

export interface Level2Difficulty {
    seqLen: number;
    gapCount: number;
    memorizeMs: number;
    mode: 'gaps' | 'multi-choice' | 'reconstruct';
    scoreBase: number;
    stage: number;
}

@Injectable({
    providedIn: 'root'
})
export class GameEngineService {

    getLevel1Difficulty(correct: number, streak: number, config: SessionConfig): Level1Difficulty {
        const isProgressive = config.mode === 'progressif';

        // Base values
        let shapeCount = 3;
        let size = 110;
        let timerMax = config.tempsReponse;
        let timerVisible = false;
        let noGoFrequency = 0; // 0 means disabled
        let stage = 0;

        // Scaling logic
        const progress = isProgressive ? correct : 0;

        // In Libre mode, timer is always visible if set.
        // In Progressif mode, it appears after some progress.
        timerVisible = !isProgressive || progress >= 15;

        // Base counts based on quantity config
        let baseCount = 3;
        let maxCount = 7;
        
        switch (config.quantiteFormes) {
            case 'petit':
                baseCount = 5;
                maxCount = 5;
                break;
            case 'moyen':
                baseCount = 8;
                maxCount = 8;
                break;
            case 'beaucoup':
                baseCount = 12;
                maxCount = 12;
                break;
        }

        // Base sizes based on size config
        let baseSize = 110;
        let minSize = 65;

        switch (config.tailleFormes) {
            case 'petite':
                baseSize = 60;
                minSize = 40;
                break;
            case 'moyenne':
                baseSize = 100;
                minSize = 70;
                break;
            case 'grande':
                baseSize = 140;
                minSize = 110;
                break;
        }

        if (progress >= 30) {
            stage = 3;
            shapeCount = maxCount;
            size = minSize;
            noGoFrequency = 2;
        } else if (progress >= 20) {
            stage = 2;
            shapeCount = Math.floor(baseCount + (maxCount - baseCount) * 0.6);
            size = Math.floor(baseSize - (baseSize - minSize) * 0.6);
            noGoFrequency = 3;
        } else if (progress >= 10) {
            stage = 1;
            shapeCount = Math.floor(baseCount + (maxCount - baseCount) * 0.3);
            size = Math.floor(baseSize - (baseSize - minSize) * 0.3);
            noGoFrequency = 5;
        } else {
            stage = 0;
            shapeCount = baseCount;
            size = baseSize;
            noGoFrequency = 0;
        }

        return { shapeCount, size, timerMax, timerVisible, noGoFrequency, stage };
    }


    getLevel2Difficulty(correct: number, streak: number, config: SessionConfig): Level2Difficulty {
        // Niveau 2 contient toujours 4 étapes :
        // 0-2 bonnes réponses  => étape 1
        // 3-5 bonnes réponses  => étape 2
        // 6-8 bonnes réponses  => étape 3
        // 9+ bonnes réponses   => étape 4
        // Avant, en mode libre, progress valait toujours 0, donc le niveau restait bloqué à l'étape 1.
        let progress = correct;
        
        if (config.mode === 'etape1') progress = 0;
        else if (config.mode === 'etape2') progress = 3;
        else if (config.mode === 'etape3') progress = 6;
        else if (config.mode === 'etape4') progress = 9;
        else if (config.mode === 'libre')  progress = 0; // Sécurité si l'ancien mode est resté

        let seqLen = 3;
        let gapCount = 1;
        let memorizeMs = 8000;
        let mode: 'gaps' | 'multi-choice' | 'reconstruct' = 'gaps';
        let scoreBase = 10;
        let stage = 0;

        if (progress >= 9) {
            stage = 3;
            seqLen = 4;
            gapCount = 0;
            memorizeMs = 10000;
            mode = 'reconstruct';
            scoreBase = 25;
        } else if (progress >= 6) {
            stage = 2;
            seqLen = 4;
            gapCount = 0;
            memorizeMs = 10000;
            mode = 'multi-choice';
            scoreBase = 20;
        } else if (progress >= 3) {
            stage = 1;
            seqLen = 4;
            gapCount = 2;
            memorizeMs = 9000;
            mode = 'gaps';
            scoreBase = 15;
        }


        const timeFactor = config.tempsReponse / 10;
        memorizeMs *= timeFactor;

        switch(config.vitesse) {
            case 'rapide': memorizeMs *= 0.7; break;
            case 'lente': memorizeMs *= 1.3; break;
        }

        return { seqLen, gapCount, memorizeMs, mode, scoreBase, stage };
    }


}