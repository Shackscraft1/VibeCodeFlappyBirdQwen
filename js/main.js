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
  const sound = new SoundSystem({
    muted: storage.getNumber('flappy.muted', 0) === 1,
    volume: storage.getNumber('flappy.volume', 1),
  });
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
  const hsWindow = new HighScoreWindow(document.getElementById('hs-dock'), highScore);

  const hud = new HUD(document.getElementById('hud'), {
    onTogglePause: togglePause,
    onMenu: goToMenu,
    onToggleMute: () => setMuted(!sound.muted),
    onVolume: setVolume,
    muted: sound.muted,
    volume: sound.volume,
  });

  const menu = new Menu(document.getElementById('menu'), {
    onPlay: startGame,
    onHighScore: openHighScores,
    onToggleMute: () => setMuted(!sound.muted),
    onVolume: setVolume,
    volume: sound.volume,
  });
  menu.setMutedLabel(sound.muted);

  const over = new GameOverPanel(document.getElementById('game-over'), {
    onPlayAgain: startGame,
    onHighScore: openHighScores,
    onMenu: goToMenu,
    onSave: handleSave,
  });

  // --- Wire simulation events → sound / UI
  events.on('flap', () => sound.flap());
  events.on('score', ({ score }) => {
    sound.score();
    hud.setScore(score);
  });
  events.on('hit', ({ score, result }) => {
    sound.hit();
    sound.die();
    hsWindow.lastScore = score;
    over.show({
      score: result ? result.score : score,
      best: result ? result.best : highScore.best,
      isRecord: result ? result.isRecord : false,
      name: highScore.lastName ?? '',
    });
    if (result && result.isRecord) hsWindow.open();
  });
  events.on('state', ({ state }) => {
    const inRun = state === GameState.PLAYING || state === GameState.PAUSED;
    hud.setVisible(inRun);
    hud.showPauseState(state === GameState.PAUSED);
    menu.setVisible(state === GameState.MENU);
    over.setVisible(state === GameState.GAME_OVER);

    if (state === GameState.PAUSED) {
      sound.suspend(); // freezes music and clock; unlock() on resume thaws
    } else if (state === GameState.MENU || state === GameState.GAME_OVER) {
      sound.stopMusic();
    }
  });

  // --- Actions
  function startGame() {
    sound.unlock();
    sound.click();
    hud.setScore(0);
    hud.showPauseState(false);
    hsWindow.close();
    sound.startMusic();
    game.start();
  }

  function togglePause() {
    sound.unlock();
    if (game.state === GameState.PLAYING) {
      sound.click();
      game.pause();
    } else if (game.state === GameState.PAUSED) {
      sound.click();
      game.resume();
    }
  }

  function goToMenu() {
    sound.click();
    hsWindow.close();
    game.toMenu();
  }

  function openHighScores() {
    sound.unlock();
    sound.click();
    hsWindow.toggle();
  }

  function setMuted(muted) {
    sound.setMuted(muted);
    storage.setNumber('flappy.muted', muted ? 1 : 0);
    menu.setMutedLabel(muted);
    hud.setMutedLabel(muted);
  }

  function setVolume(v01) {
    sound.setVolume(v01);
    storage.setNumber('flappy.volume', v01);
    menu.setVolume(v01);
    hud.setVolume(v01);
  }

  /** Save the finished run to the leaderboard under a sanitized name. */
  function handleSave(name) {
    const score = game.lastResult ? game.lastResult.score : 0;
    const saved = highScore.save({ score, name });
    sound.click();
    over.markSaved();
    over.nameInput.value = saved.name; // show the sanitized form back
    if (hsWindow.isOpen()) hsWindow.open(); // refresh if it is open
  }

  // --- Input: click / tap / keyboard
  function act() {
    sound.unlock();
    if (game.state === GameState.MENU) {
      startGame();
    } else if (game.state === GameState.PLAYING) {
      game.flap();
    } else if (game.state === GameState.PAUSED) {
      game.resume();
    } else if (game.canRestart()) {
      startGame();
    }
  }

  window.addEventListener('keydown', (e) => {
    const target = e.target;
    const typing = target instanceof HTMLInputElement;

    if (e.code === 'Enter' && target === over.nameInput) {
      e.preventDefault();
      handleSave(over.nameInput.value);
      return;
    }
    if (typing) return; // let text fields / sliders behave natively
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      if (!e.repeat) act();
    } else if (e.code === 'KeyP' || e.code === 'Escape') {
      e.preventDefault();
      togglePause();
    }
  });

  const root = document.getElementById('game-root');
  root.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    // On the start menu, plain clicks do NOTHING: only the Play button
    // (handled inside Menu.js) or the Space key starts a run. This is
    // checked before any target detection, so it holds no matter what the
    // tap landed on — panel, button, slider, or empty space.
    if (game.state === GameState.MENU) return;
    // A tap on UI never flaps or restarts: game-over panel, the scores
    // window, buttons and inputs are all off-limits. Anything else counts
    // as a game tap (flap in flight, resume from pause).
    const t = e.target;
    if (t instanceof Element && t.closest('button, input, .panel, #hs-dock')) return;
    act();
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
      night: game.night,
    });
    if (shaders.active) {
      shaders.render({
        time: game.time,
        scroll: game.scrollX % GAME.WORLD_PERIOD,
        flash: game.flash,
        night: game.night,
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
