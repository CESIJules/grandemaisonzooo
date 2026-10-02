/**
 * audio.js — Moteur Audio Procédural Web Audio API pour Scanner Compagnon ARG
 * Effets sonores tactiques, scanning spectral, ambiance et révélation dramatique
 * 100% synthétisé : aucune dépendance de fichier externe, latence zéro, fail-safe
 */
(function (global) {
  'use strict';

  class ARGAudioEngine {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.analyser = null;
      this.ambientGain = null;
      this.ambientOscs = [];
      this.isAmbientPlaying = false;
      this.muted = false;
      this.unlocked = false;

      // Déverrouillage automatique dès la première interaction utilisateur
      this._bindUnlock();
    }

    _bindUnlock() {
      if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
      const unlock = () => {
        this.init();
        if (this.ctx) {
          if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
          }
          // iOS Safari : jouer un échantillon silencieux pour forcer l'autorisation matérielle
          try {
            const buf = this.ctx.createBuffer(1, 1, 22050);
            const src = this.ctx.createBufferSource();
            src.buffer = buf;
            src.connect(this.ctx.destination);
            src.start(0);
          } catch (e) {}
        }
        this.unlocked = true;
        if (typeof window.removeEventListener === 'function') {
          window.removeEventListener('pointerdown', unlock);
          window.removeEventListener('keydown', unlock);
          window.removeEventListener('touchstart', unlock);
        }
      };
      window.addEventListener('pointerdown', unlock, { once: true });
      window.addEventListener('keydown', unlock, { once: true });
      window.addEventListener('touchstart', unlock, { once: true });
    }

    init() {
      if (this.ctx) return;
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        this.ctx = new AudioCtx();

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.85, this.ctx.currentTime);

        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 64;
        this.analyser.smoothingTimeConstant = 0.8;

        this.masterGain.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);
      } catch (err) {
        console.warn('Web Audio non supporté ou bloqué:', err);
      }
    }

    getFrequencyData(array) {
      if (this.analyser && this.ctx && this.ctx.state === 'running' && !this.muted) {
        this.analyser.getByteFrequencyData(array);
        return true;
      }
      return false;
    }

    setMuted(muted) {
      this.muted = !!muted;
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.85, this.ctx.currentTime, 0.05);
      }
      return this.muted;
    }

    toggleMute() {
      return this.setMuted(!this.muted);
    }

    _ensureCtx() {
      if (!this.ctx) this.init();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx && !this.muted;
    }

    // ── Bip UI simple ────────────────────────────────────────────────────────
    playBeep(freq = 880, duration = 0.06, type = 'sine') {
      if (!this._ensureCtx()) return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.onended = () => {
          try { osc.disconnect(); gain.disconnect(); } catch (e) {}
        };

        osc.start(now);
        osc.stop(now + duration);
      } catch (e) {}
    }

    // ── Son de verrouillage de mire (Lock-On Chime) ───────────────────────────
    playLockTone() {
      if (!this._ensureCtx()) return;
      try {
        const now = this.ctx.currentTime;
        
        [
          { f: 587.33, t: 0, d: 0.08 },
          { f: 880.00, t: 0.07, d: 0.16 }
        ].forEach(tone => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(tone.f, now + tone.t);

          gain.gain.setValueAtTime(0.001, now + tone.t);
          gain.gain.linearRampToValueAtTime(0.28, now + tone.t + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, now + tone.t + tone.d);

          osc.connect(gain);
          gain.connect(this.masterGain);

          osc.onended = () => {
            try { osc.disconnect(); gain.disconnect(); } catch (e) {}
          };

          osc.start(now + tone.t);
          osc.stop(now + tone.t + tone.d);
        });
      } catch (e) {}
    }

    // ── Impulsion de scan (Geiger / Radar spectral) ───────────────────────────
    playScanningPulse(progress = 0) {
      if (!this._ensureCtx()) return;
      try {
        const now = this.ctx.currentTime;
        const freq = 400 + Math.min(progress, 1) * 800; // 400Hz -> 1200Hz
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.04);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(freq, now);
        filter.Q.setValueAtTime(5, now);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.onended = () => {
          try { osc.disconnect(); filter.disconnect(); gain.disconnect(); } catch (e) {}
        };

        osc.start(now);
        osc.stop(now + 0.05);
      } catch (e) {}
    }

    // ── Déclenchement Obscurateur / Flash Spectral ───────────────────────────
    playShutter() {
      if (!this._ensureCtx()) return;
      try {
        const now = this.ctx.currentTime;
        
        // 1. Noise click
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.06);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.35, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        // 2. Sub impulse
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);
        oscGain.gain.setValueAtTime(0.4, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        noise.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        osc.connect(oscGain);
        oscGain.connect(this.masterGain);

        noise.onended = () => {
          try { noise.disconnect(); noiseGain.disconnect(); } catch (e) {}
        };
        osc.onended = () => {
          try { osc.disconnect(); oscGain.disconnect(); } catch (e) {}
        };

        noise.start(now);
        osc.start(now);
        osc.stop(now + 0.09);
      } catch (e) {}
    }

    // ── Clic de décryptage matriciel (Tick caractère) ─────────────────────────
    playDecryptionTick(pitchMultiplier = 1) {
      if (!this._ensureCtx()) return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        const baseFreq = 1600 * (0.8 + Math.random() * 0.5) * pitchMultiplier;
        osc.type = 'square';
        osc.frequency.setValueAtTime(baseFreq, now);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.onended = () => {
          try { osc.disconnect(); gain.disconnect(); } catch (e) {}
        };

        osc.start(now);
        osc.stop(now + 0.022);
      } catch (e) {}
    }

    // ── Révélation Spectrale ARG (Sub Boom + Accord Mystique + Chime) ─────────
    playRevelationBoom() {
      if (!this._ensureCtx()) return;
      try {
        const now = this.ctx.currentTime;

        // 1. Sub Bass Drop (Impact)
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(80, now);
        sub.frequency.exponentialRampToValueAtTime(26, now + 0.8);

        subGain.gain.setValueAtTime(0.7, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        sub.connect(subGain);
        subGain.connect(this.masterGain);

        sub.onended = () => {
          try { sub.disconnect(); subGain.disconnect(); } catch (e) {}
        };

        sub.start(now);
        sub.stop(now + 1.25);

        // 2. Accord Spectral Mystérieux (D-minor add9 : Ré, Fa, La, Mi)
        const freqs = [146.83, 174.61, 220.00, 329.63, 440.00];
        freqs.forEach((f, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const filter = this.ctx.createBiquadFilter();

          osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(f, now);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(300, now);
          filter.frequency.exponentialRampToValueAtTime(2400, now + 0.4);
          filter.frequency.exponentialRampToValueAtTime(400, now + 2.4);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.18 / (idx + 1), now + 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.masterGain);

          osc.onended = () => {
            try { osc.disconnect(); filter.disconnect(); gain.disconnect(); } catch (e) {}
          };

          osc.start(now);
          osc.stop(now + 2.6);
        });

        // 3. Shimmer Chime aigu
        const chime = this.ctx.createOscillator();
        const chimeGain = this.ctx.createGain();
        chime.type = 'sine';
        chime.frequency.setValueAtTime(1760, now + 0.05);
        chime.frequency.exponentialRampToValueAtTime(3520, now + 0.8);

        chimeGain.gain.setValueAtTime(0.001, now + 0.05);
        chimeGain.gain.linearRampToValueAtTime(0.12, now + 0.12);
        chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

        chime.connect(chimeGain);
        chimeGain.connect(this.masterGain);

        chime.onended = () => {
          try { chime.disconnect(); chimeGain.disconnect(); } catch (e) {}
        };

        chime.start(now + 0.05);
        chime.stop(now + 1.85);

      } catch (e) {
        console.warn('Erreur lecture révélation audio:', e);
      }
    }

    // ── Ambiance Eerie Drone Room 45 ──────────────────────────────────────────
    startAmbientDrone() {
      if (this.isAmbientPlaying || !this._ensureCtx()) return;
      try {
        const now = this.ctx.currentTime;
        this.ambientGain = this.ctx.createGain();
        this.ambientGain.gain.setValueAtTime(0.001, now);
        this.ambientGain.gain.linearRampToValueAtTime(0.22, now + 2.0);
        this.ambientGain.connect(this.masterGain);

        // Deux oscillateurs à battement lent (55.0Hz et 55.45Hz -> battement à 0.45Hz)
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const oscSub = this.ctx.createOscillator();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(55.0, now); // A1

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(55.45, now);

        oscSub.type = 'triangle';
        oscSub.frequency.setValueAtTime(110.0, now); // A2 harmonie

        const lowpass = this.ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(180, now);

        osc1.connect(lowpass);
        osc2.connect(lowpass);
        oscSub.connect(lowpass);
        lowpass.connect(this.ambientGain);

        osc1.start(now);
        osc2.start(now);
        oscSub.start(now);

        this.ambientOscs = [osc1, osc2, oscSub, lowpass];
        this.isAmbientPlaying = true;
      } catch (e) {}
    }

    stopAmbientDrone() {
      if (!this.isAmbientPlaying || !this.ctx || !this.ambientGain) return;
      try {
        const now = this.ctx.currentTime;
        this.ambientGain.gain.linearRampToValueAtTime(0.001, now + 0.6);
        setTimeout(() => {
          this.ambientOscs.forEach(o => {
            try { if (o.stop) o.stop(); o.disconnect(); } catch (e) {}
          });
          if (this.ambientGain) {
            try { this.ambientGain.disconnect(); } catch (e) {}
          }
          this.ambientOscs = [];
          this.isAmbientPlaying = false;
        }, 700);
      } catch (e) {
        this.isAmbientPlaying = false;
      }
    }

    toggleAmbient() {
      if (this.isAmbientPlaying) {
        this.stopAmbientDrone();
        return false;
      } else {
        this.startAmbientDrone();
        return true;
      }
    }
  }

  global.ARGAudio = new ARGAudioEngine();
})(typeof window !== 'undefined' ? window : this);
