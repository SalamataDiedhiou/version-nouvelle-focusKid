import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';

export interface BadgeConfig {
    icon: string;
    name: string;
    earned: boolean;
}

@Component({
    selector: 'app-game-sidebar',
    templateUrl: './game-sidebar.component.html',
    styleUrls: ['./game-sidebar.component.scss']
})
export class GameSidebarComponent implements OnChanges {
    // Stars earned total
    @Input() starsEarned: number = 0;
    // Stars before pause
    @Input() correctSinceLastPause: number = 0;
    @Input() pauseStarsRequired: number = 5;
    // Custom badges (optional override)
    @Input() badges: BadgeConfig[] = [];
    // Level-specific context slot
    @Input() levelContext: 'niveau1' | 'niveau-intermediaire' | 'niveau2' = 'niveau1';
    // Speed/stage info for intermediaire
    @Input() stage: number = 0;
    // Events
    @Output() replay = new EventEmitter<void>();
    @Output() goBack = new EventEmitter<void>();

    // Badge popup state
    newBadgeVisible = false;
    newBadgeIcon = '';
    newBadgeName = '';
    private lastStarsEarned = 0;

    // Default badges per level
    defaultBadges: BadgeConfig[] = [];

    stageIcons = ['🐢', '🐇', '🐆', '⚡'];
    stageIconsN1 = ['🌱', '🌿', '🌳', '🔥'];
    stageIconsN2 = ['🌱', '🌿', '🌳', '🔥'];

    get pauseRemaining(): number {
        return Math.max(0, this.pauseStarsRequired - this.correctSinceLastPause);
    }

    get pauseStarsArray(): number[] {
        return Array.from({ length: this.pauseStarsRequired }, (_, i) => i);
    }

    get displayBadges(): BadgeConfig[] {
        return this.badges.length > 0 ? this.badges : this.defaultBadges;
    }

    ngOnChanges(changes: SimpleChanges) {
        // Badge earned notification: every 5 stars
        if (changes['starsEarned']) {
            const newVal = changes['starsEarned'].currentValue as number;
            const oldVal = this.lastStarsEarned;
            // Check if we crossed a multiple of 5
            const oldBadgeCount = Math.floor(oldVal / 5);
            const newBadgeCount = Math.floor(newVal / 5);
            if (newBadgeCount > oldBadgeCount && newVal > 0) {
                this.triggerBadgePopup(newBadgeCount);
            }
            this.lastStarsEarned = newVal;
        }
    }

    private triggerBadgePopup(badgeIndex: number) {
        const badgeSequence = [
            { icon: '🔥', name: 'Premiers pas' },
            { icon: '🎯', name: 'Concentré(e)' },
            { icon: '🌈', name: 'Super étoile !' },
            { icon: '👑', name: 'Champion(ne)' },
        ];
        const badge = badgeSequence[Math.min(badgeIndex - 1, badgeSequence.length - 1)];
        this.newBadgeIcon = badge.icon;
        this.newBadgeName = badge.name;
        this.newBadgeVisible = true;
        setTimeout(() => {
            this.newBadgeVisible = false;
        }, 3000);
    }

    get earnedBadgeCount(): number {
        return Math.floor(this.starsEarned / 5);
    }

    get badgeDefinitions(): { icon: string; name: string; threshold: number }[] {
        return [
            { icon: '🔥', name: 'Premiers pas', threshold: 1 },
            { icon: '🎯', name: 'Concentré(e)', threshold: 2 },
            { icon: '🌈', name: 'Super étoile !', threshold: 3 },
            { icon: '👑', name: 'Champion(ne)', threshold: 4 },
        ];
    }

    get starsDisplayArray(): number[] {
        // Show max 10 stars in sidebar
        return Array.from({ length: 10 }, (_, i) => i);
    }

    onReplay() { this.replay.emit(); }
    onGoBack() { this.goBack.emit(); }
}
