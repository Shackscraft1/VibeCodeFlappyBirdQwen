/**
 * Score bookkeeping on top of a Storage backend.
 * Pure logic — no DOM, no network.
 *
 * Data layout (localStorage keys):
 *   flappy.best    — highest score ever (number)
 *   flappy.plays   — finished runs (number)
 *   flappy.scores  — top-N named leaderboard (JSON array of {n, s, t})
 *   flappy.name    — last name used, for convenient prefill (string)
 */

/** Maximum number of leaderboard entries kept. */
export const SCORE_LIMIT = 10;
/** Maximum length of a player name. */
export const NAME_MAX = 16;
/** Used when a submitted name is empty or fully stripped away. */
export const DEFAULT_NAME = 'Player';

/**
 * Validate a player-supplied name before it is ever stored or shown.
 *
 * Defence in depth:
 *  - allowlist: only letters, digits, spaces, and hyphens survive — quotes,
 *    semicolons, angle brackets, slashes, backslashes, and every other symbol
 *    are dropped, which removes the raw material of SQL-injection payloads,
 *    HTML/script injection, and path tricks;
 *  - control characters, zero-width characters, and bidi-override characters
 *    are stripped, so the name cannot break rendering or fool UI text;
 *  - hard length cap;
 *  - callers render the result with textContent (never innerHTML), so the
 *    browser can never execute it as markup.
 *
 * There is no database in this project (everything stays in the visitor's
 * localStorage), so there is no SQL surface at all — the allowlist exists so
 * a name can never become a problem even if a backend is added later (use
 * parameterized queries there too).
 */
export function sanitizeName(raw) {
  if (typeof raw !== 'string') return DEFAULT_NAME;
  const cleaned = raw
    // Control chars, soft hyphen, zero-width / bidi-override / format chars.
    .replace(/[\u0000-\u001f\u007f\u00ad\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]+/gu, '')
    // Allowlist: letters, digits, spaces, hyphens — nothing else.
    .replace(/[^\p{L}\p{N} -]/gu, '')
    // Collapse runs of spaces and trim the ends.
    .replace(/\s+/g, ' ')
    .trim();
  const name = cleaned.slice(0, NAME_MAX).trim();
  return name === '' ? DEFAULT_NAME : name;
}

export class HighScore {
  constructor(storage, keys = {}) {
    this.storage = storage;
    this.bestKey = keys.best ?? 'flappy.best';
    this.playsKey = keys.plays ?? 'flappy.plays';
    this.scoresKey = keys.scores ?? 'flappy.scores';
    this.nameKey = keys.name ?? 'flappy.name';
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

  /**
   * Save a finished run to the named leaderboard.
   * @returns {{name: string, score: number}} the stored (sanitized) pair.
   */
  save({ score, name }) {
    const safeName = sanitizeName(name);
    const safeScore = Number.isFinite(score) && score >= 0 ? Math.floor(score) : 0;
    const list = this.top();
    list.push({ n: safeName, s: safeScore, t: Date.now() });
    list.sort((a, b) => b.s - a.s);
    this.storage.setJson(this.scoresKey, list.slice(0, SCORE_LIMIT));
    this.storage.setNumber(this.nameKey, safeName);
    if (safeScore > this.best) this.storage.setNumber(this.bestKey, safeScore);
    return { name: safeName, score: safeScore };
  }

  /** The stored leaderboard, highest score first. */
  top() {
    const raw = this.storage.getJson(this.scoresKey, []);
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((e) => e && Number.isFinite(e.s) && typeof e.n === 'string')
      .map((e) => ({ n: sanitizeName(e.n), s: Math.max(0, Math.floor(e.s)), t: e.t ?? 0 }))
      .sort((a, b) => b.s - a.s)
      .slice(0, SCORE_LIMIT);
  }

  /** Last saved name (sanitized again on read), or null if never set. */
  get lastName() {
    if (!this.storage.backend) return null;
    const raw = this.storage.backend.getItem(this.nameKey);
    return raw == null ? null : sanitizeName(raw);
  }
}
