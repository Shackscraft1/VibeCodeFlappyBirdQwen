hello

# Flappy Bird — Modular Mini-Game

A dependency-free Flappy Bird built with vanilla ES modules. Features a
procedural WebGL shader background, a second shader pass for vignette / grain /
flash, fully synthesized Web Audio sound effects, and persistent high scores —
no image or audio assets required.

## Run it

```bash
npm start            # → http://localhost:3000   (PORT=xxxx to change)
```

ES modules require `http://`, so serve the folder rather than opening
`index.html` via `file://`.

## Play

- **Click / tap / Space / ↑** — flap (also starts and restarts the game)
- Pass pipes to score; the **High Score** window keeps your best, your last
  run, and your total runs (stored in `localStorage`)
- The menu's sound button mutes/unmutes the synthesized sound system

## Architecture

| Module | Responsibility |
|---|---|
| `js/core/Game.js` | State machine + physics step (DOM-free, fully unit-testable) |
| `js/core/EventBus.js` | Pub/sub that decouples sim from sound/UI |
| `js/entities/Bird.js`, `PipePair.js` | Data + kinematics only |
| `js/systems/Spawner.js`, `Scoring.js`, `Collisions.js`, `HighScore.js` | Focused game rules |
| `js/storage/Storage.js` | Failure-tolerant localStorage wrapper |
| `js/audio/SoundSystem.js` | Synthesized SFX (flap / score / hit / die / click) |
| `js/rendering/Renderer2D.js` | Bird & pipes on a transparent 2D canvas |
| `js/rendering/ShaderLayer.js` | WebGL passes (graceful CSS fallback without WebGL) |
| `js/rendering/shaders/sky.js` | Fragment shader: sky, sun, parallax clouds, hills, scrolling ground |
| `js/rendering/shaders/overlay.js` | Fragment shader: vignette, grain, score/death flash |
| `js/ui/Menu.js`, `HUD.js`, `GameOver.js`, `HighScoreWindow.js` | All UI panels |
| `js/main.js` | Composition root: wires sim, renderers, UI, input, main loop |

The simulation core (`Game`) knows nothing about canvases or the DOM: it
advances physics, scores runs, and publishes events — which is what makes the
headless test suite possible.

## Test

```bash
npm test             # node tests/run-tests.js
```

The suite (`tests/`) drives the real game core headlessly using stubbed
canvas / WebGL / Web Audio / localStorage: physics, spawning, scoring,
collision & death, high-score persistence, sound scheduling, and a 60-second
deterministic bot run that must survive and score.

```bash
npm run verify       # node tests/check-server.mjs
```

End-to-end localhost check without a browser: syntax-checks every JS file,
walks the real ESM import graph from `js/main.js`, then boots `server.mjs`
and HTTP-GETs every asset the page loads, asserting 200 + content type.
