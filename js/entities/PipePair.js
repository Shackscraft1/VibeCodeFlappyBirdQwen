/**
 * One top/bottom pipe pair with a gap centered at `gapY`.
 * Pure data + movement; collision and drawing live elsewhere.
 */
export class PipePair {
  constructor(config, x, gapY) {
    this.config = config;
    this.x = x;
    this.gapY = gapY;
    this.passed = false;
  }

  get width() { return this.config.PIPES.WIDTH; }
  get gap() { return this.config.PIPES.GAP; }
  get groundTop() { return this.config.HEIGHT - this.config.GROUND_HEIGHT; }
  get topHeight() { return this.gapY - this.gap / 2; }
  get bottomY() { return this.gapY + this.gap / 2; }

  update(dt) {
    this.x -= this.config.PIPES.SPEED * dt;
  }

  isOffscreen() {
    return this.x + this.width < -8;
  }
}
