import { GAME } from '../config.js';
import { EventBus } from './EventBus.js';
import { Bird } from '../entities/Bird.js';
import { Spawner } from '../systems/Spawner.js';
import { Scoring } from '../systems/Scoring.js';
import { birdHitsPipe } from '../systems/Collisions.js';

export const GameState = Object.freeze({
  MENU: 'menu',
  PLAYING: 'playing',
  GAME_OVER: 'gameover',
});

/**
 * Simulation + state machine. Knows nothing about the DOM, canvases, or
 * audio: it advances physics, scores runs, and publishes events
 * ('flap', 'score', 'hit', 'state').
 */
export class Game {
  constructor({
    config = GAME,
    events = new EventBus(),
    highScore = null,
    random = Math.random,
  } = {}) {
    this.config = config;
    this.events = events;
    this.highScore = highScore;
    this.random = random;

    this.state = GameState.MENU;
    this.time = 0;
    this.scrollX = 0;
    this.bird = new Bird(config);
    this.pipes = [];
    this.spawner = new Spawner(config, random);
    this.scorer = new Scoring();
    this.flash = { amount: 0, color: [1, 1, 1] };
    this.lastResult = null;
    this.deathTime = 0;
  }

  get groundTop() {
    return this.config.HEIGHT - this.config.GROUND_HEIGHT;
  }

  start() {
    this.bird = new Bird(this.config);
    this.pipes = [];
    this.scorer.reset();
    this.spawner.reset(0);
    this.lastResult = null;
    this.setState(GameState.PLAYING);
  }

  /** Flap (ignored unless playing). */
  flap() {
    if (this.state !== GameState.PLAYING) return;
    this.bird.flap();
    this.events.emit('flap');
  }

  /** Guard so the tap that killed the player does not instantly restart. */
  canRestart() {
    return this.state === GameState.GAME_OVER && this.time - this.deathTime > 0.7;
  }

  update(dt) {
    this.time += dt;
    this.flash.amount *= Math.exp(-4 * dt);
    if (this.flash.amount < 0.002) this.flash.amount = 0;

    if (this.state === GameState.MENU) {
      this.scrollX += this.config.MENU_SCROLL * dt;
      this.bird.y = this.config.BIRD.BOB_Y + Math.sin(this.time * 2.6) * 10;
      this.bird.vy = 0;
      return;
    }

    if (this.state === GameState.GAME_OVER) {
      // Let the dead bird tumble to the ground, then rest it there.
      this.bird.update(dt);
      if (this.bird.y + this.bird.radius >= this.groundTop) {
        this.bird.y = this.groundTop - this.bird.radius;
        this.bird.vy = 0;
      }
      return;
    }

    // --- Playing
    this.scrollX += this.config.PIPES.SPEED * dt;
    this.spawner.update(dt, this.pipes);
    for (const pipe of this.pipes) pipe.update(dt);
    this.pipes = this.pipes.filter((pipe) => !pipe.isOffscreen());

    this.bird.update(dt);
    this.clampCeiling();

    // Score pipes whose right edge passed the bird.
    for (const pipe of this.pipes) {
      if (!pipe.passed && pipe.x + pipe.width < this.bird.x) {
        pipe.passed = true;
        this.scorer.add();
        this.flash = { amount: 0.16, color: [1, 1, 0.85] };
        this.events.emit('score', { score: this.scorer.score });
      }
    }

    const hitPipe = this.pipes.some((pipe) => birdHitsPipe(this.bird, pipe));
    const hitGround = this.bird.y + this.bird.radius >= this.groundTop;
    if (hitPipe || hitGround) this.die();
  }

  setState(state) {
    this.state = state;
    this.events.emit('state', { state, result: this.lastResult });
  }

  die() {
    this.state = GameState.GAME_OVER;
    this.deathTime = this.time;
    this.bird.dead = true;
    this.bird.y = Math.min(this.bird.y, this.groundTop - this.bird.radius);
    this.flash = { amount: 0.5, color: [1, 0.35, 0.25] };
    const result = this.highScore ? this.highScore.submit(this.scorer.score) : null;
    this.lastResult = result;
    if (this.highScore) this.highScore.recordPlay();
    this.events.emit('hit', { score: this.scorer.score, result });
    this.events.emit('state', { state: this.state, result });
  }

  clampCeiling() {
    const min = this.bird.radius;
    if (this.bird.y < min) {
      this.bird.y = min;
      if (this.bird.vy < 0) this.bird.vy = 0;
    }
  }
}
