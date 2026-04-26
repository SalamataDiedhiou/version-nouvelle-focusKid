import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private audioCtx: AudioContext | null = null;
  private volume = 0.7;

  constructor() {
    // Warm up speech synthesis
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
    }
  }

  private initAudioContext() {
    if (typeof window === 'undefined') return;
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  setVolume(v: number) {
    const vol = typeof v === 'number' ? v : 70;
    this.volume = Math.max(0, Math.min(1, vol / 100));
  }

  speak(text: string) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    
    // Some browsers get stuck in a paused state
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Use a small timeout to ensure the cancel has taken effect in some browsers
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.volume = this.volume;
      utterance.rate = 0.9;
      
      // Handle potential errors
      utterance.onerror = (e) => {
        console.error('SpeechSynthesis error:', e);
      };

      window.speechSynthesis.speak(utterance);
    }, 50);
  }

  playSuccess() {
    this.initAudioContext();
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    // Harmonious major third
    this.playTone(523.25, 0.1, 'sine', now); // C5
    this.playTone(659.25, 0.2, 'sine', now + 0.1); // E5
  }

  playError() {
    this.initAudioContext();
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    // Lower dissonant tone
    this.playTone(220, 0.15, 'square', now); // A3
    this.playTone(185, 0.2, 'square', now + 0.1); // F#3
  }

  private playTone(freq: number, duration: number, type: OscillatorType, startTime: number) {
    if (!this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(this.volume * 0.5, startTime); // Scale down to avoid clipping
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }
}
