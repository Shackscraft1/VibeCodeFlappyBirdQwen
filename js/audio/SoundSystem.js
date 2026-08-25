/**
 * All sound effects are synthesized with the Web Audio API — no assets.
 * The audio context is created lazily on the first user gesture, as
 * as required by browser autoplay policies.
 */

function clamp01(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 1;
}

// ---------------------------------------------------------------------------
// Music — an original loop synthesized on the fly: 8 bars, A minor, 112 BPM.
// A driving square bass ostinato under a sparse triangle lead. A lookahead
// scheduler (50 ms interval) keeps a short queue of Web Audio nodes ahead of
// the playhead, so the tempo stays rock-solid without touching the game loop.
// ---------------------------------------------------------------------------
const MUSIC_BPM = 112;
const MUSIC_STEP = 60 / MUSIC_BPM / 2; // one 8th note, in seconds
const MUSIC_STEPS = 64; // 8 bars x 8 eighths
const MUSIC_BASS = [110.0, 110.0, 87.31, 82.41, 110.0, 87.31, 73.42, 82.41]; // bar roots (Hz)
const MUSIC_BASS_PAT = [1, 1, 2, 1, 1, 2, 1, 1]; // root / root-octave pattern
const MUSIC_LEAD = [
  [329.63, 440.0, 329.63, 523.25],
  [293.66, 349.23, 440.0, 349.23],
  [261.63, 349.23, 523.25, 440.0],
  [246.94, 329.63, 493.88, 392.0],
  [329.63, 440.0, 587.33, 440.0],
  [349.23, 440.0, 523.25, 349.23],
  [293.66, 440.0, 587.33, 493.88],
  [329.63, 415.30, 493.88, 659.25],
]; // quarter notes per bar

export class SoundSystem {
  /** Overall level (0..1) applied on top of the per-effect gains. */
  static BASE_LEVEL = 0.9;

  constructor({ context = null, muted = false, volume = 1 } = {}) {
    this.ctx = context ?? null;
    this.master = null;
    this.muted = muted;
    this.volume = clamp01(volume);
    this.musicTimer = null;
    this.musicStep = 0;
    this.nextStepTime = 0;
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

  /** Freeze the whole audio clock (pause screen); unlock() thaws it. */
  suspend() {
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend();
  }

  setMuted(muted) {
    this.muted = muted;
  }

  /** Set master volume (0..1); applies immediately if the graph exists. */
  setVolume(volume) {
    this.volume = clamp01(volume);
    if (this.master) this.master.gain.value = SoundSystem.BASE_LEVEL * this.volume;
  }

  ensureMaster() {
    if (!this.ctx || this.muted) return null;
    if (!this.master) {
      this.master = this.ctx.createGain();
      this.master.gain.value = SoundSystem.BASE_LEVEL * this.volume;
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

  /** Start the looping track (no-op while already running). */
  startMusic() {
    if (this.musicTimer) return;
    this.musicStep = 0;
    this.nextStepTime = this.ctx ? this.ctx.currentTime + 0.12 : 0;
    const tick = () => {
      if (!this.ctx) return;
      // Re-sync after a suspend: never try to "catch up" on missed steps.
      if (this.nextStepTime < this.ctx.currentTime) {
        this.nextStepTime = this.ctx.currentTime + 0.05;
      }
      const horizon = this.ctx.currentTime + 0.18;
      while (this.nextStepTime < horizon) {
        this.scheduleMusicStep(this.musicStep, this.nextStepTime);
        this.musicStep = (this.musicStep + 1) % MUSIC_STEPS;
        this.nextStepTime += MUSIC_STEP;
      }
    };
    this.musicTimer = setInterval(tick, 50);
    tick();
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  /** Schedule one 8th note of the loop at an absolute context time. */
  scheduleMusicStep(step, when) {
    const bar = Math.floor(step / 8);
    const idx = step % 8;
    const delay = Math.max(0, when - this.ctx.currentTime);
    this.tone({
      freq: MUSIC_BASS[bar] * MUSIC_BASS_PAT[idx],
      type: 'square',
      duration: MUSIC_STEP * 0.85,
      volume: 0.15,
      delay,
    });
    const note = MUSIC_LEAD[bar][Math.floor(idx / 2)];
    if (note) {
      this.tone({ freq: note, type: 'triangle', duration: MUSIC_STEP * 1.7, volume: 0.13, delay });
    }
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
