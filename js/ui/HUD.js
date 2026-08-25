/**
 * In-game overlay UI: the big score counter and a pause button.
 */
export class HUD {
  /**
   * The big score counter shown while playing or paused.
   */
  constructor(container, { onTogglePause }) {
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
  }

  setScore(score) {
    this.scoreEl.textContent = String(score);
  }

  setVisible(visible) {
    this.scoreEl.classList.toggle('hidden', !visible);
    this.pauseBtn.classList.toggle('hidden', !visible);
  }

  /** Display a pause indicator when the game state is PAUSED */
  showPauseState(isPaused) {
    if (isPaused) {
      this.scoreEl.textContent = 'PAUSED';
      this.pauseBtn.textContent = '▶';
      this.pauseBtn.setAttribute('aria-label', 'Resume');
    } else {
      this.scoreEl.textContent = '0'; // Reset score display on unpause/start
      this.pauseBtn.textContent = '⏸';
      this.pauseBtn.setAttribute('aria-label', 'Pause');
    }
  }
}

  /** Display a pause indicator when the game state is PAUSED */
  showPauseState(isPaused) {
    if (isPaused) {
      this.scoreEl.textContent = 'PAUSED';
      this.pauseBtn.textContent = '▶';
      this.pauseBtn.setAttribute('aria-label', 'Resume');
    } else {
      this.scoreEl.textContent = '0'; // Reset score display on unpause/start
      this.pauseBtn.textContent = '⏸';
      this.pauseBtn.setAttribute('aria-label', 'Pause');
    }
  }
}
}
