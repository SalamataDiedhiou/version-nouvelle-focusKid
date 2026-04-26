import { Component, OnDestroy, OnInit, HostBinding, ViewChild } from '@angular/core';
import { FeedbackBoxComponent } from '../../components/feedback-box/feedback-box.component';
import { Router } from '@angular/router';
import { ConfigService } from '../../services/config.service';
import { AudioService } from '../../services/audio.service';
import { GameEngineService, Level2Difficulty } from '../../services/game-engine.service';
import { SessionConfig, FormeType } from '../../models/session-config.model';
import { StatsService } from '../../services/stats.service';

type ShapeType = FormeType;
type ColorName = 'rouge' | 'bleu' | 'jaune' | 'vert' | 'violet' | 'orange' | 'rose';
type Mode = 'gaps' | 'multi-choice' | 'reconstruct';
type Phase = 'memorize' | 'answer' | 'end';

interface ShapeItem {
    shape: ShapeType;
    color: ColorName;
}

interface StepConfig {
    id: number;
    icon: string;
    label: string;
    seqLen: number;
    gapCount: number;
    memorizeMs: number;
    scoreBase: number;
    mode: Mode;
}

@Component({
    selector: 'app-niveau2',
    templateUrl: './niveau2.component.html',
    styleUrls: ['./niveau2.component.scss'],
})
export class Niveau2Component implements OnInit, OnDestroy {
    @HostBinding('style.opacity') opacity = '0';
    @HostBinding('style.transition') transition = 'opacity 0.4s ease-out';

    @ViewChild(FeedbackBoxComponent) feedbackBox!: FeedbackBoxComponent;

    config!: SessionConfig;
    phase: Phase = 'memorize';

    score = 0;
    correct = 0;
    wrong = 0;
    streak = 0;
    bestStreak = 0;

    step = 0;
    correctThisStep = 0;
    correctSinceLastPause = 0;

    roundsPerStep = 3;
    autoPauseEvery = 5;
    totalRounds = 12;

    currentParty = 1;
    elapsedTime = 0;
    totalTimeSeconds = 300;
    speedDelay = 1800;

    sequence: ShapeItem[] = [];
    gapIndices: number[] = [];
    filledGaps: Record<number, boolean> = {};

    choices: ShapeItem[] = [];
    multiOptions: { seq: ShapeItem[]; correct: boolean; selected?: boolean; wrong?: boolean }[] = [];

    bankOrder: number[] = [];
    slotContents: (number | null)[] = [];
    selectedPieceIdx: number | null = null;
    pieceUsed: boolean[] = [];

    currentRoundDiff!: Level2Difficulty;
    roundLocked = false;

    showPause = false;

    countdownPercent = 100;
    countdownText = 'Mémorise bien !';
    countdownSecondsLeft = 0;
    readyEnabled = false;

    private countdownTimer: ReturnType<typeof setInterval> | null = null;
    private responseTimer: ReturnType<typeof setInterval> | null = null;
    private readyTimer: ReturnType<typeof setTimeout> | null = null;
    private nextRoundTimer: ReturnType<typeof setTimeout> | null = null;
    private globalTimerInterval: ReturnType<typeof setInterval> | null = null;

    showInterParty = false;

    readonly steps: StepConfig[] = [
        {
            id: 1,
            icon: '🕵️',
            label: 'Étape 1 — Une forme manquante',
            seqLen: 3,
            gapCount: 1,
            memorizeMs: 8000,
            scoreBase: 10,
            mode: 'gaps',
        },
        {
            id: 2,
            icon: '🔎',
            label: 'Étape 2 — Deux formes manquantes',
            seqLen: 4,
            gapCount: 2,
            memorizeMs: 9000,
            scoreBase: 15,
            mode: 'gaps',
        },
        {
            id: 3,
            icon: '🎯',
            label: 'Étape 3 — Reconnais la séquence',
            seqLen: 4,
            gapCount: 0,
            memorizeMs: 10000,
            scoreBase: 20,
            mode: 'multi-choice',
        },
        {
            id: 4,
            icon: '🏗️',
            label: 'Étape 4 — Reconstruis la séquence',
            seqLen: 4,
            gapCount: 0,
            memorizeMs: 10000,
            scoreBase: 25,
            mode: 'reconstruct',
        },
    ];

    readonly colors: Record<ColorName, string> = {
        rouge: '#e8635a',
        bleu: '#5a9de8',
        jaune: '#f5c842',
        vert: '#6dc47a',
        violet: '#9b72c8',
        orange: '#f08a3e',
        rose: '#e87ea8',
    };

    readonly shapeLabels: Record<ShapeType, string> = {
        circle: 'cercle',
        square: 'carré',
        triangle: 'triangle',
        star: 'étoile',
        diamond: 'losange',
        pentagon: 'pentagone',
    };

    readonly pauseMessages = [
        {
            icon: '🏆',
            title: 'Un champion mérite une pause !',
            sub: "Les plus grands sportifs s'arrêtent pour mieux repartir 💪",
        },
        {
            icon: '🧠',
            title: 'Ton cerveau travaille dur !',
            sub: "Donner du repos à ta mémoire, c'est le secret des gens intelligents 🌟",
        },
        {
            icon: '🚀',
            title: 'Recharge tes super-pouvoirs !',
            sub: 'Chaque héros recharge son énergie avant de reprendre 🦸',
        },
    ];

    pauseMessageIndex = 0;

    shapeTypesActive: ShapeType[] = ['circle', 'square', 'triangle', 'star', 'diamond', 'pentagon'];
    colorNames: ColorName[] = ['rouge', 'bleu', 'jaune', 'vert', 'violet', 'orange', 'rose'];

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

        this.totalTimeSeconds = this.config.dureePartie * 60;

        switch (this.config.vitesse) {
            case 'lente':
                this.speedDelay = 2500;
                break;
            case 'moyenne':
                this.speedDelay = 1800;
                break;
            case 'rapide':
                this.speedDelay = 1000;
                break;
        }

        this.startGlobalTimer();
        this.startRound();

        setTimeout(() => {
            this.opacity = '1';
        }, 100);
    }

    ngOnDestroy(): void {
        this.clearTimers();

        if (this.globalTimerInterval) {
            clearInterval(this.globalTimerInterval);
            this.globalTimerInterval = null;
        }
    }

    get currentDiff(): Level2Difficulty {
        return this.currentRoundDiff ?? this.gameEngine.getLevel2Difficulty(this.correct, this.streak, this.config);
    }

    get pauseRemaining(): number {
        return Math.max(0, this.autoPauseEvery - this.correctSinceLastPause);
    }

    get infoBarText(): string {
        if (this.phase === 'memorize') return 'Regarde bien la séquence !';
        if (this.currentDiff.mode === 'gaps') return this.currentDiff.gapCount === 1 ? 'Quelle forme manque ?' : 'Quelles formes manquent ?';
        if (this.currentDiff.mode === 'multi-choice') return 'Quelle est la bonne séquence ?';
        return 'Replace les formes dans le bon ordre !';
    }

    startRound(): void {
        this.clearTimers();

        if (this.correct >= this.totalRounds || this.elapsedTime >= this.totalTimeSeconds) {
            this.handleEndSession();
            return;
        }

        const diff = this.gameEngine.getLevel2Difficulty(this.correct, this.streak, this.config);
        this.currentRoundDiff = diff;
        this.step = diff.stage;

        this.phase = 'memorize';
        this.roundLocked = false;
        this.readyEnabled = false;
        this.countdownPercent = 100;
        this.countdownText = 'Mémorise bien !';
        this.countdownSecondsLeft = Math.ceil(diff.memorizeMs / 1000);

        this.sequence = this.makeSequence(diff.seqLen);
        this.gapIndices = [];
        this.filledGaps = {};
        this.choices = [];
        this.multiOptions = [];
        this.bankOrder = [];
        this.slotContents = new Array(diff.seqLen).fill(null);
        this.selectedPieceIdx = null;
        this.pieceUsed = new Array(diff.seqLen).fill(false);

        this.readyTimer = setTimeout(() => {
            this.readyEnabled = true;
        }, this.config.activerTempsReponse ? 2000 : 0);

        if (this.config.audioConsigne) {
            this.audioService.speak('Mémorise bien la séquence !');
        }

        this.startCountdown(diff);
    }

    startCountdown(diff: Level2Difficulty): void {
        // Si le timer est désactivé, le joueur clique lui-même sur "Je suis prêt"
        if (!this.config.activerTempsReponse) {
            this.countdownPercent = 100;
            this.countdownSecondsLeft = 0;
            this.countdownText = 'Prends ton temps !';
            return;
        }

        let elapsed = 0;

        this.countdownTimer = setInterval(() => {
            elapsed += 100;

            const pct = Math.max(0, 1 - elapsed / diff.memorizeMs);
            const secondsLeft = Math.ceil((diff.memorizeMs - elapsed) / 1000);

            this.countdownPercent = pct * 100;
            this.countdownSecondsLeft = Math.max(0, secondsLeft);
            this.countdownText = secondsLeft > 0 ? `${secondsLeft}s...` : "C'est parti !";

            if (elapsed >= diff.memorizeMs) {
                this.showAnswerPhase();
            }
        }, 100);
    }

    showAnswerPhase(): void {
        this.clearCountdownOnly();

        this.phase = 'answer';
        if (this.config.activerTempsReponse) {
            this.startResponseTimer();
        } else {
            this.countdownSecondsLeft = 0;
        }

        const diff = this.currentDiff;

        if (diff.mode === 'gaps') {
            this.buildGapsMode(diff);
        }

        if (diff.mode === 'multi-choice') {
            this.buildMultiChoiceMode();
        }

        if (diff.mode === 'reconstruct') {
            this.buildReconstructMode(diff);
        }

        if (this.config.audioConsigne) {
            if (diff.mode === 'gaps') {
                this.audioService.speak(diff.gapCount === 1 ? 'Quelle forme manque ?' : 'Quelles formes manquent ?');
            } else if (diff.mode === 'multi-choice') {
                this.audioService.speak('Quelle est la bonne séquence ?');
            } else if (diff.mode === 'reconstruct') {
                this.audioService.speak('Replace les formes dans le bon ordre !');
            }
        }
    }

    buildGapsMode(diff: Level2Difficulty): void {
        const allIndices = Array.from({ length: diff.seqLen }, (_, i) => i);

        this.gapIndices = this.shuffle(allIndices)
            .slice(0, diff.gapCount)
            .sort((a, b) => a - b);

        this.filledGaps = {};

        const correctItems = this.gapIndices.map(i => this.sequence[i]);
        this.choices = this.buildChoicePool(correctItems);
    }

    onGapChoiceClick(item: ShapeItem): void {
        if (this.roundLocked) return;

        const matchIndex = this.gapIndices.find(index => {
            return !this.filledGaps[index] && this.sameShape(this.sequence[index], item);
        });

        if (matchIndex !== undefined) {
            this.filledGaps[matchIndex] = true;

            const allFilled = this.gapIndices.every(index => this.filledGaps[index]);

            if (allFilled) {
                this.roundSuccess();
            } else {
                this.showFeedback('partial');
            }
        } else {
            this.roundFail();
        }
    }

    buildChoicePool(correctItems: ShapeItem[]): ShapeItem[] {
        const pool: ShapeItem[] = [];

        correctItems.forEach(item => {
            if (!pool.some(p => this.sameShape(p, item))) {
                pool.push({ ...item });
            }
        });

        let attempts = 0;
        while (pool.length < Math.min(correctItems.length + 3, 6) && attempts < 20) {
            const candidate: ShapeItem = {
                shape: this.randomShape(),
                color: this.randomColor(),
            };

            if (!pool.some(p => this.sameShape(p, candidate))) {
                pool.push(candidate);
            }
            attempts++;
        }

        return this.shuffle(pool);
    }

    buildMultiChoiceMode(): void {
        const ref = this.sequence.map(item => ({ ...item }));

        this.multiOptions = this.shuffle([
            { seq: ref, correct: true },
            { seq: this.makeDifferentSequence(ref), correct: false },
            { seq: this.makeDifferentSequence(ref), correct: false },
            { seq: this.makeDifferentSequence(ref), correct: false },
        ]);
    }

    onMultiChoice(option: { seq: ShapeItem[]; correct: boolean; selected?: boolean; wrong?: boolean }): void {
        if (this.roundLocked || option.wrong) return;

        option.selected = true;

        if (option.correct) {
            this.roundSuccess();
        } else {
            option.wrong = true;
            this.roundFail();
        }
    }

    buildReconstructMode(diff: Level2Difficulty): void {
        this.bankOrder = this.shuffle(Array.from({ length: diff.seqLen }, (_, i) => i));
        this.slotContents = new Array(diff.seqLen).fill(null);
        this.pieceUsed = new Array(diff.seqLen).fill(false);
        this.selectedPieceIdx = null;
    }

    selectBankPiece(seqIdx: number): void {
        if (this.roundLocked || this.pieceUsed[seqIdx]) return;

        this.selectedPieceIdx = this.selectedPieceIdx === seqIdx ? null : seqIdx;
    }

    selectSlot(slotIdx: number): void {
        if (this.roundLocked) return;

        if (this.selectedPieceIdx !== null) {
            const selected = this.selectedPieceIdx;

            if (this.slotContents[slotIdx] !== null) {
                const old = this.slotContents[slotIdx] as number;
                this.pieceUsed[old] = false;
            }

            this.slotContents[slotIdx] = selected;
            this.pieceUsed[selected] = true;
            this.selectedPieceIdx = null;
            return;
        }

        if (this.slotContents[slotIdx] !== null) {
            const old = this.slotContents[slotIdx] as number;
            this.pieceUsed[old] = false;
            this.slotContents[slotIdx] = null;
        }
    }

    validateReconstruct(): void {
        if (this.roundLocked) return;

        const ok = this.slotContents.every((seqIdx, slotIdx) => seqIdx === slotIdx);

        if (ok) {
            this.roundSuccess();
        } else {
            this.roundFail();
        }
    }

    roundSuccess(): void {
        if (this.roundLocked) return;
        this.clearResponseTimerOnly();
        this.roundLocked = true;

        const diff = this.currentDiff;
        this.correct++;
        this.streak++;
        this.correctThisStep++;
        this.correctSinceLastPause++;
        this.bestStreak = Math.max(this.bestStreak, this.streak);

        this.score += diff.scoreBase + (this.streak > 1 ? this.streak * 2 : 0);

        if (this.config.sonSucces) {
            this.audioService.playSuccess();
        }

        this.showFeedback('success');

        this.nextRoundTimer = setTimeout(() => {
            if (this.correct >= this.totalRounds || this.elapsedTime >= this.totalTimeSeconds) {
                this.handleEndSession();
            } else if (this.correctSinceLastPause >= this.autoPauseEvery) {
                this.triggerPause();
            } else {
                this.startRound();
            }
        }, this.speedDelay);
    }

    roundFail(): void {
        this.clearResponseTimerOnly();
        this.wrong++;
        this.streak = 0;

        if (this.config.sonErreur) {
            this.audioService.playError();
        }

        this.showFeedback('error');
    }

    startResponseTimer(): void {
        if (!this.config.activerTempsReponse) return;
        this.clearResponseTimerOnly();
        this.countdownSecondsLeft = this.config.tempsReponse;
        this.responseTimer = setInterval(() => {
            this.countdownSecondsLeft--;
            if (this.countdownSecondsLeft <= 0) {
                this.clearResponseTimerOnly();
                this.roundLocked = true;
                this.wrong++;
                this.streak = 0;
                if (this.config.sonErreur) this.audioService.playError();
                this.showFeedback('error');
                this.nextRoundTimer = setTimeout(() => {
                    if (this.elapsedTime >= this.totalTimeSeconds) this.handleEndSession();
                    else this.startRound();
                }, this.speedDelay);
            }
        }, 1000);
    }

    triggerPause(): void {
        this.correctSinceLastPause = 0;
        this.showPause = true;
    }

    resumeFromPause(): void {
        this.showPause = false;
        this.pauseMessageIndex++;
        this.startRound();
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
        this.startRound();
    }

    showEndScreen(): void {
        this.clearTimers();

        if (this.globalTimerInterval) {
            clearInterval(this.globalTimerInterval);
            this.globalTimerInterval = null;
        }

        // ✅ Enregistrement de la séance dans les stats
        const total = this.correct + this.wrong;
        const scoreCalc = total > 0 ? Math.round((this.correct / total) * 100) : 0;
        const dureeMin = Math.round(this.config.dureePartie * this.config.nbParties);
        this.statsService.addSeance('default', {
            date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
            niveau: 'N2',
            duree: dureeMin,
            score: scoreCalc,
            erreurs: this.wrong,
            erreursDblClic: 0,
            tempsMoyen: total > 0 ? +(this.config.dureePartie * 60 / Math.max(1, total)).toFixed(1) : 0,
        });

        this.phase = 'end';
    }

    replay(): void {
        this.clearTimers();

        this.score = 0;
        this.correct = 0;
        this.wrong = 0;
        this.streak = 0;
        this.bestStreak = 0;
        this.step = 0;
        this.correctThisStep = 0;
        this.correctSinceLastPause = 0;
        this.currentParty = 1;
        this.elapsedTime = 0;
        this.pauseMessageIndex = 0;
        this.showPause = false;
        this.showInterParty = false;
        this.phase = 'memorize';

        this.startGlobalTimer();
        this.startRound();
    }

    goBack(): void {
        this.router.navigate(['/configuration']);
    }

    showFeedback(type: 'success' | 'error' | 'partial'): void {
        const typeMap: Record<string, string> = {
            success: 'go-success',
            partial: 'go-success',
            error: 'go-error',
        };

        this.feedbackBox?.show(typeMap[type] ?? 'go-success');

        if (this.config.audioConsigne) {
            const labels: Record<string, string> = {
                success: 'Bravo, bonne mémoire !',
                partial: 'Bien ! Continue…',
                error: 'Presque… essaie encore !',
            };

            this.audioService.speak(labels[type]);
        }
    }

    makeSequence(length: number): ShapeItem[] {
        const seq: ShapeItem[] = [];

        for (let i = 0; i < length; i++) {
            let item: ShapeItem;
            let attempts = 0;

            do {
                item = {
                    shape: this.randomShape(),
                    color: this.randomColor(),
                };
                attempts++;
            } while (attempts < 10 && i > 0 && this.sameShape(seq[i - 1], item));

            seq.push(item);
        }

        return seq;
    }

    makeDifferentSequence(ref: ShapeItem[]): ShapeItem[] {
        const copy = ref.map(item => ({ ...item }));

        const i = Math.floor(Math.random() * copy.length);

        let newItem: ShapeItem;
        let attempts = 0;

        do {
            newItem = {
                shape: this.randomShape(),
                color: this.randomColor(),
            };
            attempts++;
        } while (attempts < 10 && this.sameShape(newItem, copy[i]));

        copy[i] = newItem;

        return copy;
    }

    randomShape(): ShapeType {
        return this.shapeTypesActive[Math.floor(Math.random() * this.shapeTypesActive.length)];
    }

    randomColor(): ColorName {
        return this.colorNames[Math.floor(Math.random() * this.colorNames.length)];
    }

    sameShape(a: ShapeItem, b: ShapeItem): boolean {
        return a.shape === b.shape && a.color === b.color;
    }

    shuffle<T>(array: T[]): T[] {
        const copy = [...array];

        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }

        return copy;
    }

    isGap(index: number): boolean {
        return this.gapIndices.includes(index);
    }

    allSlotsFilled(): boolean {
        return this.slotContents.every(slot => slot !== null);
    }

    get pauseMessage() {
        return this.pauseMessages[this.pauseMessageIndex % this.pauseMessages.length];
    }

    clearTimers(): void {
        this.clearCountdownOnly();
        this.clearResponseTimerOnly();

        if (this.nextRoundTimer) {
            clearTimeout(this.nextRoundTimer);
            this.nextRoundTimer = null;
        }
    }

    clearResponseTimerOnly(): void {
        if (this.responseTimer) {
            clearInterval(this.responseTimer);
            this.responseTimer = null;
        }
    }

    clearCountdownOnly(): void {
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
        }

        if (this.readyTimer) {
            clearTimeout(this.readyTimer);
            this.readyTimer = null;
        }
    }
}