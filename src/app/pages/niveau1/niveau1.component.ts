import { Component, OnDestroy, OnInit, HostBinding, ViewChild } from '@angular/core';
import { FeedbackBoxComponent } from '../../components/feedback-box/feedback-box.component';
import { Router } from '@angular/router';
import { ConfigService } from '../../services/config.service';
import { AudioService } from '../../services/audio.service';
import { GameEngineService, Level1Difficulty } from '../../services/game-engine.service';
import { SessionConfig, FormeType } from '../../models/session-config.model';
import { StatsService } from '../../services/stats.service';

type ShapeType = FormeType;
type ColorName = 'rouge' | 'bleu' | 'jaune' | 'vert' | 'violet' | 'orange' | 'rose';

interface ShapeItem {
    id: number;
    shape: ShapeType;
    color: ColorName;
    size: number;
    x: number;
    y: number;
    isTarget: boolean;
}

@Component({
    selector: 'app-niveau1',
    templateUrl: './niveau1.component.html',
    styleUrls: ['./niveau1.component.scss'],
})
export class Niveau1Component implements OnInit, OnDestroy {
    @HostBinding('style.opacity') opacity = '0';
    @HostBinding('style.transition') transition = 'opacity 0.4s ease-out';

    @ViewChild(FeedbackBoxComponent) feedbackBox!: FeedbackBoxComponent;

    config!: SessionConfig;

    score = 0;
    correct = 0;
    wrong = 0;
    wrongDoubleClick = 0;
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
    speedDelay = 1800;
    showInterParty = false;

    stage = 0;
    roundCount = 0;
    wrongThisRound = 0;

    currentTarget!: { shape: ShapeType; color: ColorName };
    phase: 'play' | 'end' = 'play';
    shapes: ShapeItem[] = [];

    isNoGo = false;
    noGoActive = false;
    roundLocked = false;

    // Action requise pour ce tour : 'click' | 'dblclick' | 'rightclick'
    actionRequired: 'click' | 'dblclick' | 'rightclick' = 'click';

    // Flag pour éviter le faux 'erreur' lors d'un double-clic
    private pendingDblClick = false;

    showPause = false;
    currentTargetSizeLabel: string = '';

    private timerInterval: ReturnType<typeof setInterval> | null = null;
    private globalTimerInterval: ReturnType<typeof setInterval> | null = null;
    private nextTimer: ReturnType<typeof setTimeout> | null = null;

    readonly shapeTypes: ShapeType[] = ['circle', 'square', 'triangle', 'star', 'diamond', 'pentagon'];
    shapeTypesActive: ShapeType[] = ['circle', 'square', 'triangle', 'star', 'diamond', 'pentagon'];
    colorNames: ColorName[] = ['rouge', 'bleu', 'jaune', 'vert', 'violet', 'orange', 'rose'];

    readonly colors: Record<ColorName, string> = {
        rouge: '#f04438',
        bleu: '#3b82f6',
        jaune: '#fbbf24',
        vert: '#22c55e',
        violet: '#a855f7',
        orange: '#f97316',
        rose: '#ec4899',
    };

    readonly shapeLabels: Record<ShapeType, string> = {
        circle: 'cercle',
        square: 'carré',
        triangle: 'triangle',
        star: 'étoile',
        diamond: 'losange',
        pentagon: 'pentagone',
    };

    pauseMessages = [
        {
            icon: '🏆',
            title: 'Un champion mérite une pause !',
            sub: "Les plus grands sportifs s'arrêtent pour mieux repartir. C'est ce que tu fais là 💪",
        },
        {
            icon: '🧠',
            title: 'Ton cerveau travaille dur !',
            sub: "Donner du repos à ton cerveau, c'est le secret des gens intelligents 🌟",
        },
        {
            icon: '🚀',
            title: 'Les astronautes font des pauses aussi !',
            sub: "Même en mission, on s'arrête pour être au top 🌍",
        },
    ];

    pauseMessageIndex = 0;

    constructor(
        private router: Router,
        private configService: ConfigService,
        private audioService: AudioService,
        private gameEngine: GameEngineService,
        private statsService: StatsService
    ) {
        this.config = this.configService.getConfig();
    }

    ngOnInit(): void {
        this.audioService.setVolume(this.config.volumeGeneral);

        if (this.config.modeCouleur === 'unique') {
            this.colorNames = [this.config.couleurUnique];
        } else {
            this.colorNames = this.config.couleursActives;
        }

        if (this.config.modeForme === 'unique') {
            this.shapeTypesActive = [this.config.formeUnique];
        } else {
            this.shapeTypesActive = this.config.formesActives as ShapeType[];
        }

        this.timerMax = this.config.tempsReponse;
        this.totalTimeSeconds = this.config.dureePartie * 60;

        this.speedDelay = 1800;

        this.startGlobalTimer();
        this.newRound();

        setTimeout(() => { this.opacity = '1'; }, 100);
    }

    ngOnDestroy(): void {
        this.clearTimers();
    }

    get targetText(): string {
        const shape = this.currentTarget.shape;
        const color = this.currentTarget.color;
        const isFem = (shape === 'star');

        const shapeLabel = this.shapeLabels[shape];
        let colorLabel: string = color;

        if (isFem) {
            if (color === 'bleu') colorLabel = 'bleue';
            if (color === 'vert') colorLabel = 'verte';
            if (color === 'violet') colorLabel = 'violette';
        }

        let article = isFem ? 'une' : 'un';
        let shapePart = `${article} ${shapeLabel} ${colorLabel}`;

        if (this.currentTargetSizeLabel) {
            const sizeLabel = this.currentTargetSizeLabel === 'petit'
                ? (isFem ? 'petite' : 'petit')
                : (isFem ? 'grande' : 'grand');
            const article = isFem ? 'la' : 'le';
            shapePart = `${article} ${sizeLabel} ${shapeLabel} ${colorLabel}`;
        }

        if (this.actionRequired === 'dblclick') {
            return `Double-clique sur ${shapePart}`;
        } else if (this.actionRequired === 'rightclick') {
            return `Clique droit sur ${shapePart}`;
        }
        return `Clique sur ${shapePart}`;
    }

    get pauseRemaining(): number {
        return Math.max(0, this.autoPauseEvery - this.correctSinceLastPause);
    }

    get pauseMessage() {
        return this.pauseMessages[this.pauseMessageIndex % this.pauseMessages.length];
    }

    computeDifficulty(): Level1Difficulty {
        return this.gameEngine.getLevel1Difficulty(this.correct, this.streak, this.config);
    }

    newRound(): void {
        if (this.showPause || this.phase === 'end') return;

        this.clearTimers();

        if (this.correct >= this.totalRounds || this.elapsedTime >= this.totalTimeSeconds) {
            this.handleEndSession();
            return;
        }

        this.roundLocked = false;
        const diff = this.computeDifficulty();
        this.stage = diff.stage;
        this.timerMax = diff.timerMax;
        this.timerVisible = this.config.activerTempsReponse;

        this.roundCount++;
        this.wrongThisRound = 0;

        this.resolveTarget();

        // MODE DÉMO : Séquence exacte demandée
        // 1. Simple, 2. Grand, 3. Petit, 4. Superposé, 5. Absent (No-Go), 6. Double-clic, 7. Clic droit
        const demoCase = this.roundCount <= 7 ? this.roundCount : (Math.floor(Math.random() * 7) + 1);

        this.isNoGo = (demoCase === 5);
        this.noGoActive = true;
        this.currentTargetSizeLabel = '';
        this.actionRequired = 'click';
        this.pendingDblClick = false;

        if (demoCase === 2) this.currentTargetSizeLabel = 'grand';
        if (demoCase === 3) this.currentTargetSizeLabel = 'petit';
        if (demoCase === 6) this.actionRequired = 'dblclick';
        if (demoCase === 7) this.actionRequired = 'rightclick';

        this.shapes = this.generateShapes(diff.shapeCount, diff.size, demoCase);

        if (this.config.audioConsigne) {
            let msg = `${this.targetText}`;
            if (this.isNoGo) {
                msg += ". Si tu ne la trouves pas, clique sur le bouton rouge.";
            }
            this.audioService.speak(msg);
        }

        if (this.config.activerTempsReponse) {
            this.startTimer();
        }
    }

    resolveTarget(): void {
        this.currentTarget = {
            shape: this.randomShape(),
            color: this.randomColor(),
        };
    }

    generateShapes(count: number, size: number, demoCase: number): ShapeItem[] {
        const result: ShapeItem[] = [];
        const targetIndex = this.isNoGo ? -1 : Math.floor(Math.random() * count);

        // Mode Démo : On force la superposition au tour n°4
        const allowTargetOverlap = !this.isNoGo && (demoCase === 4);

        for (let i = 0; i < count; i++) {
            if (i === targetIndex) continue;

            let item: { shape: ShapeType; color: ColorName };
            let itemSize: number;

            if (this.currentTargetSizeLabel && i === 0) {
                item = { shape: this.currentTarget.shape, color: this.currentTarget.color };
                itemSize = this.currentTargetSizeLabel === 'petit' ? 140 : 60;
            } else {
                item = this.generateDistractor();
                itemSize = this.config.tailleFormes === 'varie' ? this.getRandomSize() : size;
            }

            let x = 0, y = 0, attempts = 0;
            do {
                x = Math.floor(Math.random() * 80) + 4;
                y = Math.floor(Math.random() * 66) + 6;
                attempts++;
            } while (attempts < 50 && this.isOverlapping(x, y, itemSize, result));

            result.push({
                id: i,
                shape: item.shape,
                color: item.color,
                size: itemSize,
                x, y,
                isTarget: false,
            });
        }

        if (targetIndex !== -1) {
            let itemSize = this.config.tailleFormes === 'varie' ? this.getRandomSize() : size;

            if (this.currentTargetSizeLabel === 'petit') itemSize = 60;
            if (this.currentTargetSizeLabel === 'grand') itemSize = 140;

            let x = 0, y = 0;

            if (allowTargetOverlap && result.length > 0) {
                const baseShape = result[Math.floor(Math.random() * result.length)];
                const offset = (itemSize / 1000) * 100 * 0.4;
                x = baseShape.x + (Math.random() > 0.5 ? offset : -offset);
                y = baseShape.y + (Math.random() > 0.5 ? offset : -offset);
                x = Math.max(4, Math.min(84, x));
                y = Math.max(6, Math.min(72, y));
            } else {
                let attempts = 0;
                do {
                    x = Math.floor(Math.random() * 80) + 4;
                    y = Math.floor(Math.random() * 66) + 6;
                    attempts++;
                } while (attempts < 50 && this.isOverlapping(x, y, itemSize, result));
            }

            result.push({
                id: targetIndex,
                shape: this.currentTarget.shape,
                color: this.currentTarget.color,
                size: itemSize,
                x, y,
                isTarget: true,
            });
        }

        // Sécurité : Tout ce qui correspond à la consigne est considéré comme une cible
        result.forEach(s => {
            const matchShape = s.shape === this.currentTarget.shape;
            const matchColor = s.color === this.currentTarget.color;
            let matchSize = true;
            if (this.currentTargetSizeLabel === 'petit') matchSize = (s.size === 60);
            if (this.currentTargetSizeLabel === 'grand') matchSize = (s.size === 140);

            if (matchShape && matchColor && matchSize) {
                s.isTarget = true;
            }
        });

        return result;
    }

    generateDistractor(): { shape: ShapeType; color: ColorName } {
        let item: { shape: ShapeType; color: ColorName };
        let attempts = 0;

        do {
            item = {
                shape: this.randomShape(),
                color: this.randomColor(),
            };
            attempts++;
        } while (
            attempts < 10 &&
            item.shape === this.currentTarget.shape &&
            item.color === this.currentTarget.color
            );

        return item;
    }

    onShapeClick(shape: ShapeItem): void {
        if (this.roundLocked || this.showPause) return;

        // Si ce tour demande un double-clic → on ignore le(s) click(s) simples.
        // Le navigateur émet click, click, dblclick : on les ignore tous sans sanctionner.
        if (this.actionRequired === 'dblclick') {
            this.pendingDblClick = true;
            return;
        }

        // Si ce tour demande un clic droit → un clic gauche simple est une erreur
        if (this.actionRequired === 'rightclick') {
            this.wrongDoubleClick++;
            this.wrong++;
            this.streak = 0;
            if (this.config.sonErreur) this.audioService.playError();
            this.showFeedback('go-error');
            return;
        }

        // On vérifie si la forme cliquée correspond à la consigne (Forme + Couleur)
        const matchShape = shape.shape === this.currentTarget.shape;
        const matchColor = shape.color === this.currentTarget.color;
        let matchSize = true;
        if (this.currentTargetSizeLabel === 'petit') matchSize = (shape.size === 60);
        if (this.currentTargetSizeLabel === 'grand') matchSize = (shape.size === 140);

        if (matchShape && matchColor && matchSize) {
            this.onCorrect();
        } else {
            this.onWrong();
        }
    }
    onShapeDoubleClick(shape: ShapeItem): void {
        if (this.roundLocked || this.showPause) return;

        if (this.actionRequired === 'dblclick') {
            // Double-clic demandé → vérification normale
            const matchShape = shape.shape === this.currentTarget.shape;
            const matchColor = shape.color === this.currentTarget.color;
            let matchSize = true;
            if (this.currentTargetSizeLabel === 'petit') matchSize = (shape.size === 60);
            if (this.currentTargetSizeLabel === 'grand') matchSize = (shape.size === 140);
            if (matchShape && matchColor && matchSize) {
                this.onCorrect();
            } else {
                this.onWrong();
            }
        } else {
            // Double-clic alors qu'un simple clic était attendu → erreur comptabilisée
            this.wrongDoubleClick++;
            this.wrong++;
            this.streak = 0;
            if (this.config.sonErreur) this.audioService.playError();
            this.showFeedback('go-error');
        }
    }

    onShapeRightClick(event: MouseEvent, shape: ShapeItem): void {
        event.preventDefault(); // Empêche le menu contextuel
        if (this.roundLocked || this.showPause) return;

        if (this.actionRequired === 'rightclick') {
            const matchShape = shape.shape === this.currentTarget.shape;
            const matchColor = shape.color === this.currentTarget.color;
            let matchSize = true;
            if (this.currentTargetSizeLabel === 'petit') matchSize = (shape.size === 60);
            if (this.currentTargetSizeLabel === 'grand') matchSize = (shape.size === 140);
            if (matchShape && matchColor && matchSize) {
                this.onCorrect();
            } else {
                this.onWrong();
            }
        } else {
            this.onWrong();
        }
    }

    onCorrect(): void {
        this.roundLocked = true;
        this.clearTimerOnly();
        this.noGoActive = false;

        this.correct++;
        this.streak++;
        this.correctSinceLastPause++;
        this.bestStreak = Math.max(this.bestStreak, this.streak);

        this.score += this.timerVisible ? 10 + this.timerVal : 10;

        if (this.config.sonSucces) {
            this.audioService.playSuccess();
        }

        this.showFeedback('go-success');

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
        this.wrongThisRound++;
        this.streak = 0;

        // Aide ultime à la 3ème erreur : on déplace la cible dans un endroit dégagé
        if (this.wrongThisRound >= 3) {
            const target = this.shapes.find(s => s.isTarget);
            if (target) {
                let nx = 0, ny = 0, attempts = 0;
                // On cherche une place sans AUCUNE superposition pour l'aide ultime
                do {
                    nx = Math.floor(Math.random() * 70) + 15;
                    ny = Math.floor(Math.random() * 50) + 15;
                    attempts++;
                } while (attempts < 100 && this.isOverlapping(nx, ny, target.size, this.shapes.filter(s => !s.isTarget)));

                target.x = nx;
                target.y = ny;
            }
        }

        if (this.config.sonErreur) {
            this.audioService.playError();
        }

        this.showFeedback('go-error');
    }

    onNoGoClick(): void {
        if (!this.noGoActive || this.showPause || this.roundLocked) return;

        if (this.isNoGo) {
            this.roundLocked = true;
            this.clearTimerOnly();
            this.noGoActive = false;

            this.correct++;
            this.streak++;
            this.correctSinceLastPause++;
            this.bestStreak = Math.max(this.bestStreak, this.streak);
            this.score += 15;

            if (this.config.sonSucces) {
                this.audioService.playSuccess();
            }

            this.showFeedback('nogo-success');

            this.nextTimer = setTimeout(() => {
                if (this.correct >= this.totalRounds || this.elapsedTime >= this.totalTimeSeconds) {
                    this.handleEndSession();
                } else if (this.correctSinceLastPause >= this.autoPauseEvery) {
                    this.triggerPause();
                } else {
                    this.newRound();
                }
            }, this.speedDelay);
        } else {
            this.wrong++;
            this.streak = 0;
            if (this.config.sonErreur) {
                this.audioService.playError();
            }
            this.showFeedback('nogo-error');
        }
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
                this.showFeedback('go-error');

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
        this.clearTimers();
        if (this.globalTimerInterval) {
            clearInterval(this.globalTimerInterval);
            this.globalTimerInterval = null;
        }

        if (this.currentParty < this.config.nbParties) {
            this.triggerInterParty();
        } else {
            this.showEndScreen();
        }
    }

    triggerInterParty(): void {
        this.clearTimers();
        this.showInterParty = true;
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
        this.clearTimers();
        this.correctSinceLastPause = 0;
        this.showPause = true;
    }

    resumeFromPause(): void {
        this.showPause = false;
        this.pauseMessageIndex++;
        this.newRound();
    }

    showEndScreen(): void {
        this.clearTimers();
        if (this.globalTimerInterval) {
            clearInterval(this.globalTimerInterval);
            this.globalTimerInterval = null;
        }

        // ✅ Enregistrement automatique de la séance dans les stats
        const total = this.correct + this.wrong;
        const scoreCalc = total > 0 ? Math.round((this.correct / total) * 100) : 0;
        const dureeMin = Math.round(this.config.dureePartie * this.config.nbParties);
        this.statsService.addSeance('default', {
            date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
            niveau: 'N1',
            duree: dureeMin,
            score: scoreCalc,
            erreurs: this.wrong,
            erreursDblClic: this.wrongDoubleClick,
            tempsMoyen: total > 0 ? +(this.config.dureePartie * 60 / Math.max(1, total)).toFixed(1) : 0,
        });

        this.phase = 'end';
    }

    replay(): void {
        this.clearTimers();

        this.score = 0;
        this.correct = 0;
        this.wrong = 0;
        this.wrongDoubleClick = 0;
        this.streak = 0;
        this.bestStreak = 0;
        this.currentParty = 1;
        this.elapsedTime = 0;
        this.correctSinceLastPause = 0;
        this.stage = 0;
        this.roundCount = 0;
        this.wrongThisRound = 0;
        this.pauseMessageIndex = 0;
        this.showPause = false;
        this.showInterParty = false;
        this.phase = 'play';

        this.startGlobalTimer();
        this.newRound();
    }

    goBack(): void {
        this.router.navigate(['/configuration']);
    }

    showFeedback(type: 'go-success' | 'go-error' | 'nogo-success' | 'nogo-error'): void {
        this.feedbackBox?.show(type);

        if (this.config.audioConsigne) {
            const labels: Record<string, string> = {
                'go-success': 'Bravo, tu as trouvé !',
                'go-error': this.actionRequired === 'dblclick'
                    ? 'Il faut double-cliquer !'
                    : this.actionRequired === 'rightclick'
                        ? 'Il faut cliquer droit !'
                        : 'Essaie encore !',
                'nogo-success': 'Super contrôle !',
                'nogo-error': 'Regarde bien avant de cliquer !',
            };
            this.audioService.speak(labels[type]);
        }
    }

    randomShape(): ShapeType {
        return this.shapeTypesActive[Math.floor(Math.random() * this.shapeTypesActive.length)];
    }

    randomColor(): ColorName {
        return this.colorNames[Math.floor(Math.random() * this.colorNames.length)];
    }

    getRandomSize(): number {
        const sizes = [60, 100, 140];
        return sizes[Math.floor(Math.random() * sizes.length)];
    }

    isOverlapping(x: number, y: number, size: number, others: ShapeItem[]): boolean {
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

    clearTimers(): void {
        this.clearTimerOnly();
        if (this.nextTimer) {
            clearTimeout(this.nextTimer);
            this.nextTimer = null;
        }
    }

    clearTimerOnly(): void {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
}