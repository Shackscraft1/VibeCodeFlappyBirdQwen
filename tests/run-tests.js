// Headless test suite for the Flappy Bird core.
// Run with: node tests/run-tests.js   (or `npm test`)

import {
  test, assert, assertClose, summary,
  FakeLocalStorage, make2DCanvas, makeGL, makeGLCanvas, makeAudioContext,
} from './harness.js';
import { GAME } from '../js/config.js';
import { EventBus } from '../js/core/EventBus.js';
import { Game, GameState } from '../js/core/Game.js';
import { Bird } from '../js/entities/Bird.js';
import { PipePair } from '../js/entities/PipePair.js';
import { Spawner } from '../js/systems/Spawner.js';
import { HighScore } from '../js/systems/HighScore.js';
import { Storage } from '../js/storage/Storage.js';
import { circleRectCollide } from '../js/systems/Collisions.js';
import { SoundSystem } from '../js/audio/SoundSystem.js';
import { Renderer2D } from '../js/rendering/Renderer2D.js';
import { ShaderLayer } from '../js/rendering/ShaderLayer.js';

function makeGame(overrides = {}) {
  const events = new EventBus();
  const storage = new Storage(new FakeLocalStorage());
  const highScore = new HighScore(storage);
  const game = new Game({
    config: GAME,
    events,
    highScore,
    random: overrides.random ?? Math.random,
  });
  return { game, events, highScore };
}

// ---------- Bird ----------

test('bird falls under gravity', () => {
  const bird = new Bird(GAME);
  const startY = bird.y;
  bird.update(0.1);
  assertClose(bird.vy, GAME.BIRD.GRAVITY * 0.1, 0.001);
  assert(bird.y > startY, 'bird should fall');
});

test('bird flap resets velocity to the flap impulse', () => {
  const bird = new Bird(GAME);
  bird.vy = 300;
  bird.flap();
  assert(bird.vy === GAME.BIRD.FLAP);
});

test('bird velocity is clamped to terminal speed', () => {
  const bird = new Bird(GAME);
  bird.vy = 1e9;
  bird.update(0.016);
  assert(bird.vy === GAME.BIRD.MAX_FALL);
});

// ---------- Pipes & spawner ----------

test('spawner places gaps within the playable bounds', () => {
  const spawner = new Spawner(GAME, () => 0.5);
  const pipe = spawner.makePipe();
  const min = GAME.PIPES.TOP_MARGIN + GAME.PIPES.GAP / 2;
  const max = (GAME.HEIGHT - GAME.GROUND_HEIGHT) - GAME.PIPES.TOP_MARGIN - GAME.PIPES.GAP / 2;
  assert(pipe.gapY >= min && pipe.gapY <= max, `gapY ${pipe.gapY} out of [${min}, ${max}]`);
});

test('pipes move left each tick and report when offscreen', () => {
  const pipe = new PipePair(GAME, 100, 300);
  pipe.update(1);
  assertClose(pipe.x, 100 - GAME.PIPES.SPEED, 0.001);
  pipe.x = -100;
  assert(pipe.isOffscreen());
});

test('circle/rect collision only fires when touching', () => {
  const rect = { x: 0, y: 0, w: 10, h: 10 };
  assert(circleRectCollide(5, 5, 2, rect), 'circle inside rect should collide');
  assert(circleRectCollide(12, 5, 2, rect), 'circle touching rect edge should collide');
  assert(!circleRectCollide(50, 50, 2, rect), 'far circle should not collide');
});

// ---------- Game flow ----------

test('scoring awards a point when a pipe passes the bird', () => {
  const { game, events } = makeGame({ random: () => 0.5 });
  const scores = [];
  events.on('score', (p) => scores.push(p.score));

  game.start();
  game.pipes.length = 0;
  game.pipes.push(new PipePair(GAME, 30, game.bird.y)); // already left of the bird
  game.update(1 / 60);

  assert(game.scorer.score === 1, `score should be 1, got ${game.scorer.score}`);
  assert(scores.length === 1 && scores[0] === 1, `expected one score event of 1, got ${scores}`);
});

test('bird dies when it hits a pipe', () => {
  const { game, events } = makeGame({ random: () => 0.5 });
  const hits = [];
  events.on('hit', (p) => hits.push(p));

  game.start();
  game.pipes.length = 0;
  game.bird.y = 80; // inside the top pipe region
  game.pipes.push(new PipePair(GAME, 60, 460)); // gap far below the bird
  game.update(1 / 60);

  assert(game.state === GameState.GAME_OVER, 'state should be game over');
  assert(hits.length === 1, 'expected exactly one hit event');
  assert(hits[0].result.isRecord === false, 'score 0 must not be a record');
});

test('bird dies when it lands on the ground', () => {
  const { game } = makeGame({ random: () => 0.5 });
  game.start();
  game.pipes.length = 0;
  game.bird.y = game.groundTop - game.bird.radius + 2;
  game.bird.vy = 100;
  game.update(1 / 60);
  assert(game.state === GameState.GAME_OVER);
});

test('game works without a high-score service', () => {
  const events = new EventBus();
  const game = new Game({ config: GAME, events });
  game.start();
  game.pipes.length = 0;
  game.bird.y = 80;
  game.pipes.push(new PipePair(GAME, 60, 460));
  game.update(1 / 60);
  assert(game.state === GameState.GAME_OVER);
  assert(game.lastResult === null);
});

test('a deterministic bot survives and racks up points (60s sim)', () => {
  const { game } = makeGame({ random: () => 0.5 });
  // random 0.5 → constant gap center: 144 + 0.5 * (416 - 144) = 280
  const target = 280;
  const dt = 1 / 60;
  game.start();
  for (let i = 0; i < 60 * 60; i++) {
    if (game.state !== GameState.PLAYING) break;
    if (game.bird.y > target + 6 && game.bird.vy > -40) game.flap();
    game.update(dt);
  }
  assert(game.state === GameState.PLAYING, `bot survived, score ${game.scorer.score}`);
  assert(game.scorer.score >= 10, `expected score >= 10 after 60s, got ${game.scorer.score}`);
});

// ---------- High score & storage ----------

test('high score persists a new best and ignores lower runs', () => {
  const local = new FakeLocalStorage();
  const hs = new HighScore(new Storage(local));
  const first = hs.submit(7);
  assert(first.isRecord && first.best === 7);
  const second = hs.submit(3);
  assert(!second.isRecord && second.best === 7);
  assert(local.getItem('flappy.best') === '7', 'best should be persisted');
});

test('high score counts finished runs', () => {
  const hs = new HighScore(new Storage(new FakeLocalStorage()));
  hs.recordPlay();
  hs.recordPlay();
  assert(hs.plays === 2);
});

test('storage falls back on missing or invalid values', () => {
  const storage = new Storage(new FakeLocalStorage());
  assert(storage.getNumber('missing', 42) === 42);
  storage.backend.setItem('bad', 'nope');
  assert(storage.getNumber('bad', 42) === 42);
  storage.setNumber('ok', 5);
  assert(storage.getNumber('ok', 0) === 5);
});

// ---------- Sound ----------

test('sound system schedules synthesized effects', () => {
  const { ctx, counts } = makeAudioContext();
  const sound = new SoundSystem({ context: ctx });
  sound.flap();
  const afterFlap = counts.oscillator;
  assert(afterFlap === 1, `flap should schedule 1 oscillator, got ${afterFlap}`);
  sound.score();
  assert(counts.oscillator === afterFlap + 2, 'score should schedule 2 oscillators');
  sound.hit();
  assert(counts.buffer === 1, 'hit should schedule one noise buffer');
});

test('muted sound system stays silent', () => {
  const { ctx, counts } = makeAudioContext();
  const sound = new SoundSystem({ context: ctx, muted: true });
  sound.flap();
  sound.score();
  sound.hit();
  assert(counts.oscillator === 0, 'muted system must not schedule oscillators');
  assert(counts.buffer === 0, 'muted system must not schedule noise');
});

// ---------- Rendering ----------

test('2D renderer draws a full frame without errors', () => {
  const { canvas, calls } = make2DCanvas();
  const renderer = new Renderer2D(canvas, GAME);
  renderer.setViewport(1);
  renderer.draw({
    bird: new Bird(GAME),
    pipes: [new PipePair(GAME, 200, 300)],
    state: 'playing',
    time: 1.2,
  });
  const c = calls();
  assert((c.fill ?? 0) > 0, 'expected fill calls');
  assert((c.fillRect ?? 0) > 0, 'expected fillRect calls for pipe bodies');
});

test('shader layer renders both passes over a WebGL context', () => {
  const { gl, calls } = makeGL();
  const layer = new ShaderLayer(makeGLCanvas(gl));
  assert(layer.active, 'expected the fake WebGL context to be accepted');
  layer.setViewport(1, GAME.WIDTH, GAME.HEIGHT);
  layer.render({ time: 0.5, scroll: 123, flash: { amount: 0.3, color: [1, 0.3, 0.2] } });
  assert(calls.useProgram >= 2, 'expected two program passes (sky + overlay)');
  assert(calls.drawArrays === 2, 'expected two drawArrays calls');
});

summary();
