import { PipePair } from '../entities/PipePair.js';

/**
 * Spawns pipe pairs on a fixed cadence with a random gap position.
 * `random` is injectable so tests can drive deterministic layouts.
 */
export class Spawner {
  constructor(config, random = Math.random) {
    this.config = config;
    this.random = random;
    this.timer = 0;
  }

  reset(firstPipeDelay = 0) {
    this.timer = firstPipeDelay;
  }

  update(dt, pipes) {
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer += this.config.PIPES.SPAWN_EVERY;
    pipes.push(this.makePipe());
  }

  makePipe() {
    const { PIPES, WIDTH, HEIGHT, GROUND_HEIGHT } = this.config;
    const playHeight = HEIGHT - GROUND_HEIGHT;
    const min = PIPES.TOP_MARGIN + PIPES.GAP / 2;
    const max = playHeight - PIPES.TOP_MARGIN - PIPES.GAP / 2;
    const gapY = min + this.random() * (max - min);
    return new PipePair(this.config, WIDTH, gapY);
  }
}
