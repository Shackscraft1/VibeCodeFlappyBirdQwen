/**
 * All sound effects are synthesized with the Web Audio API — no assets.
 * The audio context is created lazily on the first user gesture, as
 * required by browser autoplay policies.
 */
export class SoundSystem {
  constructor({ context = null, muted = false } = {}) {
    this.ctx = context ?? null;
    this.master = null;
    this.muted = muted;
  }

  /** Must be called from a user gesture before audio can play. */
  unlock() {
    if (!this.ctx) {
      const AC = typeof window !== 'undefined'
        ? window.AudioContext ?? window.webkitAudioContext
        : null;
      if (!AC) return;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(muted) {
    this.muted = muted;
  }

  ensureMaster() {
    if (!this.ctx || this.muted) return null;
    if (!this.master) {
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
    }
    return this.master;
  }

  tone({ freq = 440, end = null, type = 'sine', duration = 0.1, volume = 0.3, delay = 0 }) {
    const master = this.ensureMaster();
    if (!master) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (end != null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(end, 1), t0 + duration);
    }
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  /** Short burst of decaying white noise. */
  noise({ duration = 0.2, volume = 0.4, delay = 0 }) {
    const master = this.ensureMaster();
    if (!master) return;
    const t0 = this.ctx.currentTime + delay;
    const length = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  flap() {
    this.tone({ freq: 520, end: 880, type: 'triangle', duration: 0.09, volume: 0.22 });
  }

  score() {
    this.tone({ freq: 660, type: 'sine', duration: 0.09, volume: 0.25 });
    this.tone({ freq: 990, type: 'sine', duration: 0.14, volume: 0.22, delay: 0.08 });
  }

  hit() {
    this.noise({ duration: 0.16, volume: 0.5 });
    this.tone({ freq: 200, end: 60, type: 'sawtooth', duration: 0.28, volume: 0.4 });
  }

  die() {
    this.tone({ freq: 440, end: 110, type: 'square', duration: 0.5, volume: 0.18, delay: 0.18 });
  }

  click() {
    this.tone({ freq: 500, duration: 0.05, volume: 0.18 });
  }
}
