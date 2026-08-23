/**
 * Start menu panel: title, Play, High Score window toggle, mute toggle.
 */
export class Menu {
  constructor(container, { onPlay, onHighScore, onToggleMute }) {
    const panel = document.createElement('section');
    panel.className = 'panel menu-panel';
    panel.innerHTML = `
      <h1 class="title">Flappy&nbsp;<span>Bird</span></h1>
      <p class="tagline">a tiny shader-powered arcade</p>
      <button class="btn primary" data-action="play">Play</button>
      <div class="menu-row">
        <button class="btn" data-action="highscore">High Score</button>
        <button class="btn" data-action="mute">Sound: On</button>
      </div>
      <p class="hint">Space / ↑ / click to flap</p>
    `;
    container.appendChild(panel);
    this.panel = panel;

    // Let taps on the panel reach the UI without flapping the bird.
    panel.addEventListener('pointerdown', (e) => e.stopPropagation());
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
  }

  setMutedLabel(muted) {
    if (this.muteButton) this.muteButton.textContent = muted ? 'Sound: Off' : 'Sound: On';
  }

  setVisible(visible) {
    this.panel.classList.toggle('hidden', !visible);
  }
}
