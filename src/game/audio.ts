/**
 * Procedural Web Audio API sound synthesis engine for RogueMarket: Bull Run.
 * No external audio files or mp3s required. All sounds are mathematically generated.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted: boolean = false;

  constructor() {
    // Read persisted mute setting if available
    try {
      this.muted = localStorage.getItem('roguemarket_muted') === 'true';
    } catch {
      this.muted = false;
    }
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.6, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
        this.generateNoiseBuffer();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private generateNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 1.5; // 1.5 seconds of white noise
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  }

  public getIsMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem('roguemarket_muted', String(this.muted));
    } catch {}

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.6, this.ctx.currentTime);
    }
    return this.muted;
  }

  public setMasterVolume(val: number) {
    const clamped = Math.max(0, Math.min(1, val));
    this.initCtx();
    if (this.masterGain && this.ctx && !this.muted) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setValueAtTime(clamped * 0.7, this.ctx.currentTime);
    }
  }

  /**
   * Snappy laser bark with slight pitch randomization.
   */
  public playLaser(isBullRun: boolean = false) {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Waveform
    osc.type = isBullRun ? 'sawtooth' : 'triangle';

    // Pitch variation ±6%
    const detune = (Math.random() - 0.5) * 60;
    const startFreq = isBullRun ? 920 : 780;
    const endFreq = isBullRun ? 180 : 140;

    osc.frequency.setValueAtTime(startFreq, t);
    osc.detune.setValueAtTime(detune, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + (isBullRun ? 0.09 : 0.12));

    // Fast volume envelope
    const maxGain = isBullRun ? 0.16 : 0.13;
    gain.gain.setValueAtTime(maxGain, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (isBullRun ? 0.09 : 0.12));

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.13);
  }

  /**
   * Retro pickup chime with pentatonic stepping for collect streaks.
   */
  public playPickup(streak: number = 0) {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Pentatonic scale frequencies [C5, D5, E5, G5, A5, C6, D6, E6]
    const notes = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.5];
    const note = notes[streak % notes.length];

    osc.type = 'sine';
    osc.frequency.setValueAtTime(note, t);
    osc.frequency.exponentialRampToValueAtTime(note * 1.5, t + 0.14);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.18);
  }

  /**
   * Deep bass explosion drop + filtered crunch.
   */
  public playExplosion(weight: 'light' | 'heavy' = 'light') {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const duration = weight === 'heavy' ? 0.45 : 0.28;

    // 1. Bass sub drop
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(weight === 'heavy' ? 110 : 80, t);
    subOsc.frequency.exponentialRampToValueAtTime(24, t + duration);

    subGain.gain.setValueAtTime(weight === 'heavy' ? 0.35 : 0.22, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(t);
    subOsc.stop(t + duration);

    // 2. White noise burst
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(weight === 'heavy' ? 1200 : 800, t);
      filter.frequency.exponentialRampToValueAtTime(100, t + duration * 0.8);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(weight === 'heavy' ? 0.28 : 0.18, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + duration * 0.8);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      noise.start(t);
      noise.stop(t + duration);
    }
  }

  /**
   * Market shift alert tone.
   */
  public playMarketShift(sentiment: 'BULL_RUN' | 'BEAR_CRASH') {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;

    if (sentiment === 'BULL_RUN') {
      // Ascending euphoric synth chords
      const freqs = [330, 440, 554, 659];
      freqs.forEach((freq, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        const start = t + idx * 0.08;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.18, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(start);
        osc.stop(start + 0.38);
      });
    } else {
      // Ominous descending alarm klaxon
      const freqs = [500, 420, 360, 240];
      freqs.forEach((freq, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        const start = t + idx * 0.09;
        osc.frequency.setValueAtTime(freq, start);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.7, start + 0.2);
        gain.gain.setValueAtTime(0.2, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(start);
        osc.stop(start + 0.28);
      });
    }
  }

  /**
   * Telegraphed warning ping for falling liquidation candles.
   */
  public playWarningPing() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1050, t);
    osc.frequency.setValueAtTime(880, t + 0.06);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.16);
  }

  /**
   * Liquidation candle ground strike slam.
   */
  public playCandleImpact() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(20, t + 0.4);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.45);
  }

  /**
   * Player taking damage buzz / crunch.
   */
  public playPlayerHit() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.2);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.22);
  }
}

export const audio = new SoundEngine();
