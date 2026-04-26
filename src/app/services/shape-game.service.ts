import { Injectable } from '@angular/core';
import { SHAPES, COLORS, COLOR_NAMES, STAGES } from '../models/shape.model';

export interface ShapeData {
    id: number;
    shape: string;
    colorName: string;
    color: string;
    size: number;
    x: number;
    y: number;
    isTarget: boolean;
    zIndex: string;
    pointerEvents: string;
    classes: string[];
    transform: string;
}

export interface PlaceShapesOptions {
    roundIndex?: number;
    forcedTarget?: { shape: string; color: string } | null;
    distractorMode?: string;
    sizeMin?: number;
    sizeMax?: number;
    targetSize?: number | null;
    allowOcclusion?: boolean;
    forcedCount?: number;
    occlusionChance?: number;
}

export interface PlaceShapesNoGoOptions {
    roundIndex?: number;
    distractorMode?: string;
    sizeMin?: number;
    sizeMax?: number;
    forcedCount?: number;
}

@Injectable({ providedIn: 'root' })
export class ShapeGameService {

    private idCounter = 0;

    // ─── Stage / progression ────────────────────────────────────────────────────

    getStage(roundIndex: number) {
        let stage = STAGES[0];
        for (const s of STAGES) {
            if (roundIndex >= s.minRound) stage = s;
        }
        return stage;
    }

    // ─── Shape placement ────────────────────────────────────────────────────────

    buildShapes(
        containerWidth: number,
        containerHeight: number,
        options: PlaceShapesOptions = {}
    ): { shapes: ShapeData[]; target: { shape: string; color: string } } {

        const {
            roundIndex = 0,
            forcedTarget = null,
            distractorMode = 'random',
            sizeMin = 60,
            sizeMax = 130,
            targetSize = null,
            allowOcclusion = false,
            forcedCount,
            occlusionChance = 0.6,
        } = options;

        const stage = this.getStage(roundIndex);
        const count = forcedCount ?? stage.count;
        const zone = this._zone(containerWidth, containerHeight, stage.spread);

        const targetShape = forcedTarget?.shape ?? SHAPES[Math.floor(Math.random() * SHAPES.length)];
        const targetColorName = forcedTarget?.color ?? COLOR_NAMES[Math.floor(Math.random() * COLOR_NAMES.length)];
        const targetColor = COLORS[targetColorName];

        const used: { x: number; y: number }[] = [];
        const shapes: ShapeData[] = [];
        let targetPlaced = false;
        let twinPlaced = false;

        for (let i = 0; i < count; i++) {
            const forceTarget = (!targetPlaced && i === Math.floor(count / 2)) || (!targetPlaced && i === count - 1);

            let shape: string;
            let colorName: string;
            let color: string;

            if (forceTarget) {
                shape = targetShape; colorName = targetColorName; color = targetColor;
                targetPlaced = true;
            } else if (distractorMode === 'same-shape-same-color' && !twinPlaced) {
                shape = targetShape; colorName = targetColorName; color = targetColor;
                twinPlaced = true;
            } else {
                const mode = distractorMode === 'same-shape-same-color' ? 'random' : distractorMode;
                const d = this.pickDistractor(targetShape, targetColorName, mode);
                shape = d.shape; colorName = d.colorName; color = COLORS[colorName];
            }

            let size: number;
            if (forceTarget) {
                size = targetSize !== null ? targetSize : sizeMax;
            } else if (distractorMode === 'same-shape-same-color' && shape === targetShape && colorName === targetColorName && twinPlaced && !forceTarget) {
                size = targetSize === sizeMax ? sizeMin : sizeMax;
            } else {
                size = Math.random() > 0.5 ? sizeMax : sizeMin;
            }

            const pos = this._findPosition(size, zone, containerWidth, containerHeight, used);
            used.push(pos);

            shapes.push({
                id: ++this.idCounter, shape, colorName, color, size,
                x: pos.x, y: pos.y,
                isTarget: forceTarget,
                zIndex: '2', pointerEvents: 'auto', classes: [], transform: '',
            });
        }

        if (allowOcclusion && Math.random() < occlusionChance) {
            this._applyOcclusion(shapes);
        }

        return { shapes, target: { shape: targetShape, color: targetColorName } };
    }

    buildShapesNoGo(
        containerWidth: number,
        containerHeight: number,
        target: { shape: string; color: string },
        options: PlaceShapesNoGoOptions = {}
    ): ShapeData[] {

        const {
            roundIndex = 0,
            distractorMode = 'random',
            sizeMin = 60,
            sizeMax = 130,
            forcedCount,
        } = options;

        const stage = this.getStage(roundIndex);
        const count = forcedCount ?? stage.count;
        const zone = this._zone(containerWidth, containerHeight, stage.spread);
        const used: { x: number; y: number }[] = [];
        const shapes: ShapeData[] = [];

        for (let i = 0; i < count; i++) {
            let shape: string;
            let colorName: string;
            let tries = 0;

            do {
                const d = this.pickDistractor(target.shape, target.color, distractorMode);
                shape = d.shape; colorName = d.colorName;
                tries++;
            } while (shape === target.shape && colorName === target.color && tries < 20);

            const color = COLORS[colorName];
            const size = Math.random() > 0.5 ? sizeMax : sizeMin;
            const pos = this._findPosition(size, zone, containerWidth, containerHeight, used);
            used.push(pos);

            shapes.push({
                id: ++this.idCounter, shape, colorName, color, size,
                x: pos.x, y: pos.y,
                isTarget: false,
                zIndex: '2', pointerEvents: 'auto', classes: [], transform: '',
            });
        }

        return shapes;
    }

    // ─── Distractor picking ─────────────────────────────────────────────────────

    pickDistractor(targetShape: string, targetColorName: string, mode: string): { shape: string; colorName: string } {
        let shape: string;
        let colorName: string;

        switch (mode) {
            case 'same-shape-same-color':
                return { shape: targetShape, colorName: targetColorName };

            case 'diff-shape-same-color':
                colorName = targetColorName;
                shape = SHAPES.filter(s => s !== targetShape)[Math.floor(Math.random() * (SHAPES.length - 1))];
                return { shape, colorName };

            case 'same-shape-diff-color':
                shape = targetShape;
                colorName = COLOR_NAMES.filter(c => c !== targetColorName)[Math.floor(Math.random() * (COLOR_NAMES.length - 1))];
                return { shape, colorName };

            default: {
                let attempts = 0;
                do {
                    shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
                    colorName = COLOR_NAMES[Math.floor(Math.random() * COLOR_NAMES.length)];
                    attempts++;
                } while (shape === targetShape && colorName === targetColorName && attempts < 20);
                return { shape, colorName };
            }
        }
    }

    // ─── Private helpers ────────────────────────────────────────────────────────

    private _applyOcclusion(shapes: ShapeData[]): void {
        const targetEl = shapes.find(s => s.isTarget);
        const distractors = shapes.filter(s => !s.isTarget);
        if (!targetEl || distractors.length === 0) return;

        const overlap = targetEl.size * 0.45;
        const offsets = [
            { dx: overlap, dy: 0 },
            { dx: -overlap, dy: 0 },
            { dx: 0, dy: overlap },
            { dx: 0, dy: -overlap },
            { dx: overlap * 0.7, dy: overlap * 0.7 },
        ];

        const pick = distractors[Math.floor(Math.random() * distractors.length)];
        const off = offsets[Math.floor(Math.random() * offsets.length)];

        pick.x = targetEl.x + off.dx;
        pick.y = targetEl.y + off.dy;
        pick.zIndex = '4';
        pick.pointerEvents = 'none';
        targetEl.zIndex = '5';
        targetEl.pointerEvents = 'auto';

        setTimeout(() => { pick.pointerEvents = 'auto'; }, 50);
    }

    private _zone(W: number, H: number, spread: number) {
        const zoneW = W * spread;
        const zoneH = H * spread;
        return { x: (W - zoneW) / 2, y: (H - zoneH) / 2, w: zoneW, h: zoneH };
    }

    private _findPosition(
        size: number,
        zone: { x: number; y: number; w: number; h: number },
        W: number,
        H: number,
        used: { x: number; y: number }[]
    ): { x: number; y: number } {
        const pad = 16;
        const left = Math.max(pad, zone.x);
        const top = Math.max(pad, zone.y);
        const right = Math.min(W - size - pad, zone.x + zone.w - size);
        const bottom = Math.min(H - size - pad, zone.y + zone.h - size);

        let x = 0, y = 0, attempts = 0;
        do {
            x = left + Math.random() * Math.max(0, right - left);
            y = top + Math.random() * Math.max(0, bottom - top);
            attempts++;
        } while (
            attempts < 60 &&
            used.some(u => Math.abs(u.x - x) < size + 20 && Math.abs(u.y - y) < size + 20)
        );

        return { x, y };
    }
}