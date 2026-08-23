/**
 * The big score counter shown while playing.
 */
export class HUD {
  constructor(container) {
    this.scoreEl = document.createElement('div');
    this.scoreEl.className = 'hud-score';
    this.scoreEl.textContent = '0';
    container.appendChild(this.scoreEl);
  }

  setScore(score) {
    this.scoreEl.textContent = String(score);
  }

  setVisible(visible) {
    this.scoreEl.classList.toggle('hidden', !visible);
  }
}
