/** Running score for the current run. */
export class Scoring {
  constructor() {
    this.score = 0;
  }

  add(points = 1) {
    this.score += points;
  }

  reset() {
    this.score = 0;
  }
}
