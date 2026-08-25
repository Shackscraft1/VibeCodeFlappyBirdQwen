/**
 * Start menu panel: title, Play, High Score window, sound + volume settings.
 *
 * While visible, the whole menu layer absorbs pointer events, so clicking
 * anywhere here can never accidentally start the game — the Play button (or
 * the keyboard shortcut) is the only way in. When hidden the layer is
 * display:none, so it never blocks in-game taps.
 */
export class Menu {
  constructor(container, { onPlay, onHighScore, onToggleMute, onVolume, volume = 1 }) {
    const panel = document.createElement('section');
    panel.className = 'panel menu-panel';
    panel.innerHTML = `
      <h1 class="title">Flappy&nbsp;<span>Bird</span></h1>
      <p class="tagline">a tiny shader-powered arcade</p>
      <button class="btn primary" data-action="play">Play</button>
      <div class="menu-row">
        <button class="btn" data-action="highscore">High Scores</button>
        <button class="btn" data-action="mute">Sound: On</button>
      </div>
      <div class="menu-row volume-row">
        <span class="volume-label">Volume</span>
        <input class="vol" type="range" min="0" max="100" step="1" value="${Math.round(volume * 100)}" aria-label="Volume" />
      </div>
      <p class="hint">Play to start · Space / ↑ / click to flap · P pauses</p>
    `;
    container.appendChild(panel);
    this.container = container;
    this.panel = panel;

    // Swallow taps anywhere in the menu layer so it can't start the game;
    // the buttons below still receive their clicks.
    container.addEventListener('pointerdown', (e) => e.stopPropagation());

    panel.querySelector('[data-action="play"]').addEventListener('click', (e) => {
      e.stopPropagation();
      onPlay();
    });
    panel.querySelector('[data-action="highscore"]').addEventListener('click', (e) => {
      e.stopPropagation();
      onHighScore();
    });
    this.muteButton = panel.querySelector('[data-action="mute"]');
    this.muteButton.addEventListener('click', (e) => {
      e.stopPropagation();
      onToggleMute();
    });
    this.volumeInput = panel.querySelector('.vol');
    this.volumeInput.addEventListener('input', (e) => {
      e.stopPropagation();
      onVolume(Number(e.target.value) / 100);
    });
  }

  setMutedLabel(muted) {
    if (this.muteButton) this.muteButton.textContent = muted ? 'Sound: Off' : 'Sound: On';
  }

  setVolume(value01) {
    if (this.volumeInput) this.volumeInput.value = String(Math.round(value01 * 100));
  }

  setVisible(visible) {
    // Hide the whole layer so it never blocks in-game input.
    this.container.classList.toggle('hidden', !visible);
  }
}
