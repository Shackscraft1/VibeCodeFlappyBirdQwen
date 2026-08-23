import { GAME } from './config.js';
import { EventBus } from './core/EventBus.js';
import { Game, GameState } from './core/Game.js';
import { Storage } from './storage/Storage.js';
import { HighScore } from './systems/HighScore.js';
import { SoundSystem } from './audio/SoundSystem.js';
import { Renderer2D } from './rendering/Renderer2D.js';
import { ShaderLayer } from './rendering/ShaderLayer.js';
import { Menu } from './ui/Menu.js';
import { HUD } from './ui/HUD.js';
import { GameOverPanel } from './ui/GameOver.js';
import { HighScoreWindow } from './ui/HighScoreWindow.js';

function boot() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const bgCanvas = document.getElementById('bg-canvas');
  const gameCanvas = document.getElementById('game-canvas');

  // --- Services (persistence, records, sound)
  let local = null;
  try { local = window.localStorage; } catch { local = null; }
  const storage = new Storage(local);
  const highScore = new HighScore(storage);
  const sound = new SoundSystem({ muted: storage.getNumber('flappy.muted', 0) === 1 });
  const events = new EventBus();

  // --- Simulation core (no DOM knowledge)
  const game = new Game({ config: GAME, events, highScore });

  // --- Render layers
  const renderer = new Renderer2D(gameCanvas, GAME);
  renderer.setViewport(dpr);

  const shaders = new ShaderLayer(bgCanvas);
  if (shaders.active) {
    shaders.setViewport(dpr, GAME.WIDTH, GAME.HEIGHT);
  } else {
    bgCanvas.classList.add('css-fallback');
  }

  // --- UI
  const hud = new HUD(document.getElementById('hud'));
  const hsWindow = new HighScoreWindow(document.getElementById('hs-dock'), highScore);
  const menu = new Menu(document.getElementById('menu'), {
    onPlay: startGame,
    onHighScore: () => { sound.unlock(); sound.click(); hsWindow.toggle(); },
    onToggleMute: () => setMuted(!sound.muted),
  });
  const over = new GameOverPanel(document.getElementById('game-over'), {
    onPlayAgain: startGame,
  });
  menu.setMutedLabel(sound.muted);

  // --- Wire simulation events → sound / UI
  events.on('flap', () => sound.flap());
  events.on('score', ({ score }) => {
    sound.score();
    hud.setScore(score);
  });
  events.on('hit', ({ score, result }) => {
    sound.hit();
    sound.die();
    if (result) {
      hsWindow.lastScore = result.score;
      if (result.isRecord) hsWindow.open();
    }
  });
  events.on('state', ({ state }) => {
    hud.setVisible(state === GameState.PLAYING);
    menu.setVisible(state === GameState.MENU);
    over.setVisible(state === GameState.GAME_OVER);
  });

  // --- Actions
  function startGame() {
    sound.unlock();
    sound.click();
    hud.setScore(0);
    game.start();
  }

  function act() {
    sound.unlock();
    if (game.state === GameState.MENU) {
      startGame();
    } else if (game.state === GameState.PLAYING) {
      game.flap();
    } else if (game.canRestart()) {
      startGame();
    }
  }

  function setMuted(muted) {
    sound.setMuted(muted);
    storage.setNumber('flappy.muted', muted ? 1 : 0);
    menu.setMutedLabel(muted);
  }

  // --- Input: click / tap / keyboard
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      if (!e.repeat) act();
    }
  });
  const root = document.getElementById('game-root');
  root.addEventListener('pointerdown', (e) => {
    if (e.button === undefined || e.button === 0) act();
  });

  // --- Main loop
  let last = performance.now();
  const frame = (now) => {
    const dt = Math.min((now - last) / 1000, 0.033);
    last = now;

    game.update(dt);
    renderer.draw({
      bird: game.bird,
      pipes: game.pipes,
      state: game.state,
      time: game.time,
    });
    if (shaders.active) {
      shaders.render({
        time: game.time,
        scroll: game.scrollX % GAME.WORLD_PERIOD,
        flash: game.flash,
      });
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  // Initial UI state (Game starts in MENU)
  hud.setVisible(false);
  menu.setVisible(true);
  over.setVisible(false);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
