import { Component, ElementRef } from '@angular/core';
import { ShapeGameService, ShapeData, PlaceShapesOptions, PlaceShapesNoGoOptions } from '../../services/shape-game.service';

@Component({
  selector: 'app-shape-grid',
  host: { 'class': 'game-area', 'id': 'gameArea' },
  templateUrl: './shape-grid.component.html',
  styleUrls: ['./shape-grid.component.scss'],
})
export class ShapeGridComponent {

  shapes: ShapeData[] = [];
  confettis: any[] = [];

  private onCorrectCb: ((s: ShapeData) => void) | null = null;
  private onWrongCb: ((s: ShapeData) => void) | null = null;

  constructor(
    private el: ElementRef,
    private gameService: ShapeGameService,
  ) { }

  // ─── Public API (signatures inchangées) ─────────────────────────────────────

  placeShapes(
    onCorrect: (s: ShapeData) => void,
    onWrong: (s: ShapeData) => void,
    roundIndex: number = 0,
    forcedTarget: any = null,
    distractorMode: string = 'random',
    shapeSize: number | null = null,
    sizeMin: number = 60,
    sizeMax: number = 130,
    targetSize: number | null = null,
    allowOcclusion: boolean = false,
    forcedCount?: number,
    occlusionChance: number = 0.6,
  ): { shape: string; color: string } {

    this.onCorrectCb = onCorrect;
    this.onWrongCb = onWrong;

    const options: PlaceShapesOptions = {
      roundIndex, forcedTarget, distractorMode,
      sizeMin, sizeMax, targetSize,
      allowOcclusion, forcedCount, occlusionChance,
    };

    const { w, h } = this._containerSize();
    const { shapes, target } = this.gameService.buildShapes(w, h, options);
    this.shapes = shapes;
    return target;
  }

  placeShapesNoGo(
    onWrong: (s: ShapeData) => void,
    roundIndex: number = 0,
    target: { shape: string; color: string },
    distractorMode: string = 'random',
    shapeSize: number | null = null,
    sizeMin: number = 60,
    sizeMax: number = 130,
    forcedCount?: number,
  ): void {

    this.onCorrectCb = null;
    this.onWrongCb = onWrong;

    const options: PlaceShapesNoGoOptions = {
      roundIndex, distractorMode, sizeMin, sizeMax, forcedCount,
    };

    const { w, h } = this._containerSize();
    this.shapes = this.gameService.buildShapesNoGo(w, h, target, options);
  }

  // ─── Interaction ─────────────────────────────────────────────────────────────

  onShapeClick(s: ShapeData): void {
    if (s.isTarget) {
      this.shapes.forEach(sh => { if (sh !== s) sh.pointerEvents = 'none'; });
      this.onCorrectCb?.(s);
    } else {
      this.onWrongCb?.(s);
    }
  }

  // ─── Mutations visuelles ─────────────────────────────────────────────────────

  moveTarget(): void {
    const target = this.shapes.find(s => s.isTarget);
    if (!target) return;

    const { w, h } = this._containerSize();
    const pad = 16;
    const right = Math.min(w - target.size - pad, w * 0.90 - target.size);
    const bottom = Math.min(h - target.size - pad, h * 0.90 - target.size);
    const used = this.shapes.filter(s => s !== target).map(s => ({ x: s.x, y: s.y }));

    let x = 0, y = 0, attempts = 0;
    do {
      x = pad + Math.random() * Math.max(0, right - pad);
      y = pad + Math.random() * Math.max(0, bottom - pad);
      attempts++;
    } while (
      attempts < 60 &&
      used.some(u => Math.abs(u.x - x) < target.size + 20 && Math.abs(u.y - y) < target.size + 20)
    );

    target.x = x;
    target.y = y;
    target.zIndex = '5';
  }

  highlightTarget(): void {
    const target = this.shapes.find(s => s.isTarget);
    if (!target) return;

    const { w, h } = this._containerSize();
    target.x = (w - target.size * 1.5) / 2;
    target.y = (h - target.size * 1.5) / 2;
    target.transform = 'scale(1.5)';
    target.zIndex = '10';
    target.classes.push('target-highlight');
  }

  animateCorrect(s: ShapeData): void {
    s.classes.push('correct-flash');
  }

  animateWrong(s: ShapeData): void {
    s.classes.push('wrong-flash');
    setTimeout(() => {
      s.classes = s.classes.filter(c => c !== 'wrong-flash');
    }, 400);
  }

  // ─── Confetti ────────────────────────────────────────────────────────────────

  spawnConfettiOnShape(s: ShapeData): void {
    this._spawnConfetti(s.x + s.size / 2, s.y + s.size / 2);
  }

  spawnConfettiCenter(): void {
    const { w, h } = this._containerSize();
    this._spawnConfetti(w / 2, h / 2);
  }

  private _spawnConfetti(cx: number, cy: number): void {
    const palette = ['#e8635a', '#5a9de8', '#f5c842', '#6dc47a', '#9b72c8', '#f08a3e', '#e87ea8'];
    for (let i = 0; i < 20; i++) {
      const c = {
        id: Math.random(),
        x: cx + (Math.random() - 0.5) * 80,
        y: cy,
        bg: palette[Math.floor(Math.random() * palette.length)],
        dur: (0.6 + Math.random() * 0.8) + 's',
        del: (Math.random() * 0.3) + 's',
        br: Math.random() > 0.5 ? '50%' : '2px',
      };
      this.confettis.push(c);
      setTimeout(() => { this.confettis = this.confettis.filter(cf => cf.id !== c.id); }, 2000);
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private _containerSize(): { w: number; h: number } {
    return {
      w: this.el.nativeElement.clientWidth || 800,
      h: this.el.nativeElement.clientHeight || 500,
    };
  }
}