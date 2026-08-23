/**
 * Best-score bookkeeping on top of a Storage backend.
 * Pure logic — no DOM, no network.
 */
export class HighScore {
  constructor(storage, keys = {}) {
    this.storage = storage;
    this.bestKey = keys.best ?? 'flappy.best';
    this.playsKey = keys.plays ?? 'flappy.plays';
  }

  get best() { return this.storage.getNumber(this.bestKey, 0); }
  get plays() { return this.storage.getNumber(this.playsKey, 0); }

  recordPlay() {
    this.storage.setNumber(this.playsKey, this.plays + 1);
  }

  /** Persist a finished run and report whether it is a new record. */
  submit(score) {
    const prevBest = this.best;
    const isRecord = score > prevBest;
    if (score > prevBest) this.storage.setNumber(this.bestKey, score);
    return { score, prevBest, best: Math.max(prevBest, score), isRecord };
  }
}
