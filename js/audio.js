/**
 * VIRAMAYAK'26 - Audio Engine
 * Handles realistic page turning sound effects & ethereal concert ambient background
 */

class ViramayakAudioManager {
  constructor() {
    this.soundEnabled = localStorage.getItem('viramayak_sound_enabled') !== 'false';
    this.ambienceEnabled = false;
    this.audioCtx = null;
    this.pageTurnAudio = null;
    this.ambienceGain = null;
    this.ambienceOscillators = [];
    this.isInitialized = false;

    this.initAudioElements();
  }

  initAudioElements() {
    try {
      this.pageTurnAudio = new Audio('assets/audio/page-flip.wav');
      this.pageTurnAudio.preload = 'auto';
      this.pageTurnAudio.volume = 0.75;
    } catch (e) {
      console.warn('HTML5 Audio init fallback to Web Audio synth:', e);
    }
  }

  ensureAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  // Realistic paper turn sound (Web Audio fallback or enhancement)
  playPageTurn() {
    if (!this.soundEnabled) return;

    // Try HTML5 Audio element first
    if (this.pageTurnAudio) {
      this.pageTurnAudio.currentTime = 0;
      this.pageTurnAudio.play().catch(() => {
        // Fallback to real-time Web Audio API synthesized paper flutter
        this.synthesizePaperTurn();
      });
    } else {
      this.synthesizePaperTurn();
    }
  }

  // High-fidelity synthesized paper flutter using Web Audio API
  synthesizePaperTurn() {
    try {
      this.ensureAudioContext();
      if (!this.audioCtx) return;

      const duration = 0.32;
      const bufferSize = Math.floor(this.audioCtx.sampleRate * duration);
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const output = buffer.getChannelData(0);

      // Generate filtered white noise burst with flutter envelope
      for (let i = 0; i < bufferSize; i++) {
        const t = i / this.audioCtx.sampleRate;
        let env = Math.exp(-t * 12);
        if (t < 0.02) env = t / 0.02;
        const flutter = 1.0 + 0.3 * Math.sin(2 * Math.PI * 50 * t);
        output[i] = (Math.random() * 2 - 1) * env * flutter;
      }

      const whiteNoise = this.audioCtx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2400, this.audioCtx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(700, this.audioCtx.currentTime + duration);
      filter.Q.setValueAtTime(1.8, this.audioCtx.currentTime);

      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(0.5, this.audioCtx.currentTime);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioCtx.destination);

      whiteNoise.start();
    } catch (e) {
      console.warn('Synthesizer error:', e);
    }
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    localStorage.setItem('viramayak_sound_enabled', this.soundEnabled ? 'true' : 'false');
    if (this.soundEnabled) {
      this.playPageTurn();
    }
    return this.soundEnabled;
  }

  // Ethereal Concert Hall Ambience (Strings / Pad in D minor / A pentatonic)
  toggleAmbience() {
    this.ambienceEnabled = !this.ambienceEnabled;
    if (this.ambienceEnabled) {
      this.startAmbience();
    } else {
      this.stopAmbience();
    }
    return this.ambienceEnabled;
  }

  startAmbience() {
    try {
      this.ensureAudioContext();
      if (!this.audioCtx) return;

      // Stop existing if any
      this.stopAmbience();

      const now = this.audioCtx.currentTime;
      this.ambienceGain = this.audioCtx.createGain();
      this.ambienceGain.gain.setValueAtTime(0, now);
      this.ambienceGain.gain.linearRampToValueAtTime(0.22, now + 3.0); // Gentle 3s fade in

      // Master lowpass filter to create warm orchestral hall resonance
      const masterFilter = this.audioCtx.createBiquadFilter();
      masterFilter.type = 'lowpass';
      masterFilter.frequency.setValueAtTime(850, now);

      // Concert notes: D3 (146.83Hz), A3 (220.00Hz), D4 (293.66Hz), F4 (349.23Hz), A4 (440.00Hz)
      const freqs = [146.83, 220.00, 293.66, 349.23, 440.00];

      this.ambienceOscillators = freqs.map((freq, idx) => {
        const osc = this.audioCtx.createOscillator();
        const oscGain = this.audioCtx.createGain();

        // Subtle detuning for lush concert chorus effect
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq + (Math.random() - 0.5) * 1.5, now);

        // Slow LFO for organic breathing volume
        const lfo = this.audioCtx.createOscillator();
        const lfoGain = this.audioCtx.createGain();
        lfo.frequency.setValueAtTime(0.1 + idx * 0.03, now);
        lfoGain.gain.setValueAtTime(0.08, now);
        lfo.connect(lfoGain.gain);
        lfo.start();

        oscGain.gain.setValueAtTime(0.15 / freqs.length, now);

        osc.connect(oscGain);
        oscGain.connect(masterFilter);
        osc.start();

        return { osc, lfo };
      });

      masterFilter.connect(this.ambienceGain);
      this.ambienceGain.connect(this.audioCtx.destination);
    } catch (e) {
      console.warn('Ambience sound error:', e);
    }
  }

  stopAmbience() {
    if (this.ambienceGain && this.audioCtx) {
      const now = this.audioCtx.currentTime;
      this.ambienceGain.gain.linearRampToValueAtTime(0, now + 1.5);
      setTimeout(() => {
        if (this.ambienceOscillators) {
          this.ambienceOscillators.forEach(({ osc, lfo }) => {
            try { osc.stop(); osc.disconnect(); } catch (e) {}
            try { lfo.stop(); lfo.disconnect(); } catch (e) {}
          });
          this.ambienceOscillators = [];
        }
      }, 1600);
    }
  }
}

window.ViramayakAudioManager = ViramayakAudioManager;

