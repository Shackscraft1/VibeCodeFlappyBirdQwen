/**
 * In-game overlay UI: the big score counter, a pause button, and a pause
 * panel (resume / main menu / sound settings) while the run is paused.
 */
export class HUD {
  constructor(container, {
    onTogglePause,
    onMenu,
    onToggleMute,
    onVolume,
    muted = false,
    volume = 1,
  }) {
    this.score = 0;

    this.scoreEl = document.createElement('div');
    this.scoreEl.className = 'hud-score';
    this.scoreEl.textContent = '0';
    container.appendChild(this.scoreEl);

    this.pauseBtn = document.createElement('button');
    this.pauseBtn.className = 'hud-pause';
    this.pauseBtn.textContent = '⏸';
    this.pauseBtn.setAttribute('aria-label', 'Pause');
    this.pauseBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.pauseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      onTogglePause();
    });
    container.appendChild(this.pauseBtn);

    this.panel = document.createElement('section');
    this.panel.className = 'panel pause-panel hidden';
    this.panel.innerHTML = `
      <h2 class="over-title">Paused</h2>
      <button class="btn" data-action="mute">${muted ? 'Sound: Off' : 'Sound: On'}</button>
      <div class="volume-row">
        <span class="volume-label">Volume</span>
        <input class="vol" type="range" min="0" max="100" step="1"
               value="${Math.round(volume * 100)}" aria-label="Volume" />
      </div>
      <button class="btn primary" data-action="resume">Resume</button>
      <button class="btn" data-action="menu">Main Menu</button>
    `;
    container.appendChild(this.panel);

    // The panel floats over the field but must not count as "tapping to play".
    this.panel.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.panel.querySelector('[data-action="mute"]').addEventListener('click', (e) => {
      e.stopPropagation();
      onToggleMute();
    });
    this.panel.querySelector('[data-action="resume"]').addEventListener('click', (e) => {
      e.stopPropagation();
      onTogglePause();
    });
    this.panel.querySelector('[data-action="menu"]').addEventListener('click', (e) => {
      e.stopPropagation();
      onMenu();
    });
    this.volumeInput = this.panel.querySelector('.vol');
    this.volumeInput.addEventListener('input', (e) => {
      e.stopPropagation();
      onVolume(Number(e.target.value) / 100);
    });

    this.muteButton = this.panel.querySelector('[data-action="mute"]');
  }

  setScore(score) {
    this.score = score;
    this.scoreEl.textContent = String(score);
  }

  setVisible(visible) {
    this.scoreEl.classList.toggle('hidden', !visible);
    this.pauseBtn.classList.toggle('hidden', !visible);
    if (!visible) this.panel.classList.add('hidden');
  }

  /** Show the pause panel and swap the button to a resume control. */
  showPauseState(isPaused) {
    this.panel.classList.toggle('hidden', !isPaused);
    this.pauseBtn.classList.toggle('hidden', !isPaused);
    this.pauseBtn.textContent = isPaused ? '▶' : '⏸';
    this.pauseBtn.setAttribute('aria-label', isPaused ? 'Resume' : 'Pause');
  }

  setMutedLabel(muted) {
    if (this.muteButton) {
      this.muteButton.textContent = muted ? 'Sound: Off' : 'Sound: On';
    }
  }

  setVolume(value01) {
    if (this.volumeInput) {
      this.volumeInput.value = String(Math.round(value01 * 100));
    }
  }
}
