/**
 * Thin, failure-tolerant wrapper over a localStorage-like backend.
 * Accepts any object with getItem/setItem (or null for a no-op backend),
 * so the same code works in browsers, workers, and tests.
 */
export class Storage {
  constructor(backend = null) {
    this.backend = backend;
  }

  getNumber(key, fallback = 0) {
    if (!this.backend) return fallback;
    try {
      const raw = this.backend.getItem(key);
      const n = raw == null ? NaN : Number(raw);
      return Number.isFinite(n) ? n : fallback;
    } catch {
      return fallback;
    }
  }

  setNumber(key, value) {
    if (!this.backend) return false;
    try {
      this.backend.setItem(key, String(value));
      return true;
    } catch {
      return false;
    }
  }
}
