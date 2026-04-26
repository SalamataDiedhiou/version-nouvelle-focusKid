import { Component, OnDestroy, OnInit, HostBinding, ViewChild } from '@angular/core';
import { FeedbackBoxComponent } from '../../components/feedback-box/feedback-box.component';
import { Router } from '@angular/router';
import { ConfigService } from '../../services/config.service';
import { AudioService } from '../../services/audio.service';
import { SessionConfig, FormeType } from '../../models/session-config.model';
import { COLORS } from '../../services/game-engine.service';
import { StatsService } from '../../services/stats.service';

type ColorName = 'rouge' | 'bleu' | 'jaune' | 'vert' | 'violet' | 'orange' | 'rose';
type ShapeType = FormeType;

export interface MovingShape {
    id: number;
    shape: ShapeType;
    color: ColorName;
    colorHex: string;
    size: number;
    x: number;   // % from left
    y: number;   // % from top
    vx: number;  // velocity % per tick
    vy: number;
    isTarget: boolean;
}

@Component({
    selector: 'app-niveau-intermediaire',
    templateUrl: './niveau-intermediaire.component.html',
    styleUrls: ['./niveau-intermediaire.component.scss'],
})
export class NiveauIntermediareComponent implements OnInit, OnDestroy {
    @HostBinding('style.opacity') opacity = '0';
    @HostBinding('style.transition') transition = 'opacity 0.4s ease-out';

    @ViewChild(FeedbackBoxComponent) feedbackBox!: FeedbackBoxComponent;

    config!: SessionConfig;

    score = 0;
    correct = 0;
    wrong = 0;
    streak = 0;
    bestStreak = 0;

    totalRounds = 40;
    autoPauseEvery = 5;
    correctSinceLastPause = 0;

    timerMax = 20;
    timerVal = 20;
    timerVisible = false;

    currentParty = 1;
    elapsedTime = 0;
    totalTimeSeconds = 300;
    showInterParty = false;

    stage = 0;
    roundCount = 0;

    currentTarget!: { shape: ShapeType; color: ColorName };
    phase: 'play' | 'end' = 'play';
    shapes: MovingShape[] = [];

    showPause = false;
    roundLocked = false;

    pauseMessageIndex = 0;
    pauseMessages = [
        { icon: '🏆', title: 'Un champion mérite une pause !', sub: "Les plus grands sportifs s'arrêtent pour mieux repartir 💪" },
        { icon: '🧠', title: 'Ton cerveau travaille dur !', sub: "Un peu de repos, et tu seras encore plus fort 🌟" },
        { icon: '🚀', title: 'Super concentration !', sub: "Tu suis des formes qui bougent — c'est pas facile ! 🌍" },
    ];

    shapeTypesActive: ShapeType[] = ['circle', 'square', 'triangle', 'star', 'diamond', 'pentagon'];
    colorNames: ColorName[] = ['rouge', 'bleu', 'jaune', 'vert', 'violet', 'orange', 'rose'];

    readonly shapeLabels: Record<ShapeType, string> = {
        circle: 'cercle',
        square: 'carré',
        triangle: 'triangle',
        star: 'étoile',
        diamond: 'losange',
        pentagon: 'pentagone',
    };

    readonly colors = COLORS;

    private moveInterval: ReturnType<typeof setInterval> | null = null;
    private timerInterval: ReturnType<typeof setInterval> | null = null;
    private globalTimerInterval: ReturnType<typeof setInterval> | null = null;
    private nextTimer: ReturnType<typeof setTimeout> | null = null;
    private speedDelay = 1800;

    // speed in % per 16ms tick — increases with stage
    private moveSpeed = 0.25;

    constructor(
        private router: Router,
        private configService: ConfigService,
        private audioService: AudioService,
        private statsService: StatsService
    ) {
        this.config = this.configService.getConfig();
    }

    ngOnInit(): void {
        this.audioService.setVolume(this.config.volumeGeneral);

        // Apply Color mode
        if (this.config.modeCouleur === 'unique') {
            this.colorNames = [this.config.couleurUnique];
        } else {
            this.colorNames = this.config.couleursActives;
        }

        // Apply Shape mode
        if (this.config.modeForme === 'unique') {
            this.shapeTypesActive = [this.config.formeUnique];
        } else {
            this.shapeTypesActive = this.config.formesActives as ShapeType[];
        }

        this.timerMax = this.config.tempsReponse;
        this.totalTimeSeconds = this.config.dureePartie * 60;

        this.startGlobalTimer();
        this.newRound();

        setTimeout(() => { this.opacity = '1'; }, 100);
    }

    ngOnDestroy(): void {
        this.clearAll();
    }

    get targetText(): string {
        return `attrape le ${this.shapeLabels[this.currentTarget.shape]} ${this.currentTarget.color}`;
    }

    get pauseRemaining(): number {
        return Math.max(0, this.autoPauseEvery - this.correctSinceLastPause);
    }

    get timerDashOffset(): number {
        const circumference = 188.5;
        return circumference - (this.timerVal / this.timerMax) * circumference;
    }

    get pauseMessage() {
        return this.pauseMessages[this.pauseMessageIndex % this.pauseMessages.length];
    }

    computeStage(): { shapeCount: number; size: number; stage: number } {
        const progress = this.config.mode === 'progressif' ? this.correct : 0;

        // Base counts based on quantity config
        let baseCount = 4;
        let maxCount = 8;

        switch (this.config.quantiteFormes) {
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
        let baseSize = 100;
        let minSize = 60;

        switch (this.config.tailleFormes) {
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
                minSize = 100;
                break;
        }

        let stage = 0;
        let shapeCount = baseCount;
        let size = baseSize;

        if (progress >= 30) {
            stage = 3;
            shapeCount = maxCount;
            size = minSize;
        } else if (progress >= 20) {
            stage = 2;
            shapeCount = Math.floor(baseCount + (maxCount - baseCount) * 0.6);
            size = Math.floor(baseSize - (baseSize - minSize) * 0.6);
        } else if (progress >= 10) {
            stage = 1;
            shapeCount = Math.floor(baseCount + (maxCount - baseCount) * 0.3);
            size = Math.floor(baseSize - (baseSize - minSize) * 0.3);
        }

        return { shapeCount, size, stage };
    }

    newRound(): void {
        if (this.showPause || this.phase === 'end') return;
        this.clearTimers();
        this.stopMovement();

        if (this.correct >= this.totalRounds || this.elapsedTime >= this.totalTimeSeconds) {
            this.handleEndSession();
            return;
        }

        this.roundLocked = false;
        this.roundCount++;

        const diff = this.computeStage();
        this.stage = diff.stage;

        // Speed grows with stage
        this.moveSpeed = 0.06 + diff.stage * 0.04;

        this.currentTarget = {
            shape: this.shapeTypesActive[Math.floor(Math.random() * this.shapeTypesActive.length)],
            color: this.colorNames[Math.floor(Math.random() * this.colorNames.length)],
        };

        this.shapes = this.generateMovingShapes(diff.shapeCount, diff.size);

        if (this.config.audioConsigne) {
            this.audioService.speak(`Attrape : ${this.targetText}`);
        }

        this.startMovement();

        this.timerVisible = this.config.activerTempsReponse;
        if (this.config.activerTempsReponse) {
            this.startTimer();
        }
    }

    generateMovingShapes(count: number, size: number): MovingShape[] {
        const result: MovingShape[] = [];
        const targetIndex = Math.floor(Math.random() * count);

        for (let i = 0; i < count; i++) {
            // We force the target properties at targetIndex to ensure at least one target exists
            const shape = (i === targetIndex)
                ? this.currentTarget.shape
                : this.shapeTypesActive[Math.floor(Math.random() * this.shapeTypesActive.length)];

            const colorName = (i === targetIndex)
                ? this.currentTarget.color
                : this.colorNames[Math.floor(Math.random() * this.colorNames.length)];

            // A shape is a target if it matches BOTH the shape and the color of the current instruction
            const isTarget = (shape === this.currentTarget.shape && colorName === this.currentTarget.color);

            // random angle for movement
            const angle = Math.random() * Math.PI * 2;

            const itemSize = this.config.tailleFormes === 'varie' ? this.getRandomSize() : size;
            let x = 0;
            let y = 0;
            let attempts = 0;

            do {
                x = 10 + Math.random() * 70;
                y = 10 + Math.random() * 70;
                attempts++;
            } while (attempts < 50 && this.isOverlapping(x, y, itemSize, result));

            result.push({
                id: i,
                shape,
                color: colorName,
                colorHex: this.colors[colorName],
                size: itemSize,
                x,
                y,
                vx: Math.cos(angle) * this.moveSpeed,
                vy: Math.sin(angle) * this.moveSpeed,
                isTarget,
            });
        }
        return result;
    }

    startMovement(): void {
        this.moveInterval = setInterval(() => {
            this.shapes = this.shapes.map(s => {
                let nx = s.x + s.vx;
                let ny = s.y + s.vy;
                let nvx = s.vx;
                let nvy = s.vy;

                const margin = (s.size / window.innerWidth) * 100 + 2;
                if (nx < 1 || nx > 93 - margin) nvx = -nvx;
                if (ny < 1 || ny > 87 - margin) nvy = -nvy;
                nx = Math.max(1, Math.min(93 - margin, nx));
                ny = Math.max(1, Math.min(87 - margin, ny));

                return { ...s, x: nx, y: ny, vx: nvx, vy: nvy };
            });
        }, 16);
    }

    stopMovement(): void {
        if (this.moveInterval) {
            clearInterval(this.moveInterval);
            this.moveInterval = null;
        }
    }

    onShapeClick(shape: MovingShape): void {
        if (this.roundLocked || this.showPause) return;
        if (shape.isTarget) {
            this.onCorrect();
        } else {
            this.onWrong();
        }
    }

    onCorrect(): void {
        this.roundLocked = true;
        this.stopMovement();
        this.clearTimers();

        this.correct++;
        this.streak++;
        this.correctSinceLastPause++;
        this.bestStreak = Math.max(this.bestStreak, this.streak);
        this.score += this.timerVisible ? 10 + this.timerVal : 10;

        if (this.config.sonSucces) this.audioService.playSuccess();
        this.showFeedback('success', '🎉', 'Bravo, tu l\'as attrapé !');

        this.nextTimer = setTimeout(() => {
            if (this.correct >= this.totalRounds || this.elapsedTime >= this.totalTimeSeconds) {
                this.handleEndSession();
            } else if (this.correctSinceLastPause >= this.autoPauseEvery) {
                this.triggerPause();
            } else {
                this.newRound();
            }
        }, this.speedDelay);
    }

    onWrong(): void {
        if (this.roundLocked || this.showPause) return;
        this.wrong++;
        this.streak = 0;
        if (this.config.sonErreur) this.audioService.playError();
        this.showFeedback('error', '😊', 'Regarde bien, elle bouge !');
    }

    startTimer(): void {
        if (!this.config.activerTempsReponse) return;
        this.timerVal = this.timerMax;
        this.timerInterval = setInterval(() => {
            this.timerVal--;
            if (this.timerVal <= 0) {
                this.clearTimerOnly();
                this.wrong++;
                this.streak = 0;
                this.showFeedback('error', '⏰', 'Trop lent ! Essaie encore !');
                this.nextTimer = setTimeout(() => {
                    if (this.elapsedTime >= this.totalTimeSeconds) {
                        this.handleEndSession();
                    } else {
                        this.newRound();
                    }
                }, this.speedDelay);
            }
        }, 1000);
    }

    startGlobalTimer(): void {
        if (this.globalTimerInterval) clearInterval(this.globalTimerInterval);
        this.globalTimerInterval = setInterval(() => {
            this.elapsedTime++;
            if (this.elapsedTime >= this.totalTimeSeconds) {
                this.handleEndSession();
            }
        }, 1000);
    }

    handleEndSession(): void {
        this.clearAll();
        if (this.currentParty < this.config.nbParties) {
            this.showInterParty = true;
        } else {
            // ✅ Enregistrement de la séance dans les stats
            const total = this.correct + this.wrong;
            const scoreCalc = total > 0 ? Math.round((this.correct / total) * 100) : 0;
            const dureeMin = Math.round(this.config.dureePartie * this.config.nbParties);
            this.statsService.addSeance('default', {
                date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
                niveau: 'NI',
                duree: dureeMin,
                score: scoreCalc,
                erreurs: this.wrong,
                erreursDblClic: 0,
                tempsMoyen: total > 0 ? +(this.config.dureePartie * 60 / Math.max(1, total)).toFixed(1) : 0,
            });
            this.phase = 'end';
        }
    }

    nextParty(): void {
        this.showInterParty = false;
        this.currentParty++;
        this.elapsedTime = 0;
        this.correctSinceLastPause = 0;
        this.startGlobalTimer();
        this.newRound();
    }

    triggerPause(): void {
        this.stopMovement();
        this.clearTimers();
        this.correctSinceLastPause = 0;
        this.showPause = true;
    }

    resumeFromPause(): void {
        this.showPause = false;
        this.pauseMessageIndex++;
        this.newRound();
    }

    replay(): void {
        this.clearAll();
        this.score = 0; this.correct = 0; this.wrong = 0;
        this.streak = 0; this.bestStreak = 0;
        this.currentParty = 1; this.elapsedTime = 0;
        this.correctSinceLastPause = 0; this.stage = 0;
        this.roundCount = 0; this.pauseMessageIndex = 0;
        this.showPause = false; this.showInterParty = false;
        this.phase = 'play';
        this.startGlobalTimer();
        this.newRound();
    }

    goBack(): void {
        this.router.navigate(['/configuration']);
    }

    showFeedback(type: 'success' | 'error', icon: string, msg: string): void {
        this.feedbackBox?.show(type === 'success' ? 'go-success' : 'go-error');
        if (this.config.audioConsigne) this.audioService.speak(msg);
    }

    clearTimers(): void {
        this.clearTimerOnly();
        if (this.nextTimer) { clearTimeout(this.nextTimer); this.nextTimer = null; }
    }

    clearTimerOnly(): void {
        if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
    }

    clearAll(): void {
        this.clearTimers();
        this.stopMovement();
        if (this.globalTimerInterval) { clearInterval(this.globalTimerInterval); this.globalTimerInterval = null; }
    }

    getSpeedLabel(): string {
        const labels = ['🐢 Lent', '🐇 Normal', '🐆 Rapide', '⚡ Super rapide'];
        return labels[this.stage] || labels[0];
    }

    getRandomSize(): number {
        const sizes = [60, 100, 140];
        return sizes[Math.floor(Math.random() * sizes.length)];
    }

    isOverlapping(x: number, y: number, size: number, others: MovingShape[]): boolean {
        const sizePct = (size / 1000) * 100;
        for (const other of others) {
            const otherSizePct = (other.size / 1000) * 100;
            const dx = x - other.x;
            const dy = y - other.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDist = (sizePct + otherSizePct) * 0.7;
            if (distance < minDist) return true;
        }
        return false;
    }
}