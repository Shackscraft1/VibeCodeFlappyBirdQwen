/**
 * A floating window (title bar + close button) showing persistent
 * high-score stats. Open it from the menu, or it pops open on a new record.
 */
export class HighScoreWindow {
  constructor(container, highScore) {
    this.hs = highScore;
    this.lastScore = 0;

    const win = document.createElement('section');
    win.className = 'hs-window hidden';
    win.innerHTML = `
      <header class="hs-titlebar">
        <span>★ High Scores</span>
        <button class="hs-close" data-action="close" aria-label="Close">×</button>
      </header>
      <div class="hs-body">
        <div class="hs-row"><span>Best</span><b data-field="best">0</b></div>
        <div class="hs-row"><span>Last run</span><b data-field="last">0</b></div>
        <div class="hs-row"><span>Runs</span><b data-field="plays">0</b></div>
      </div>
    `;
    container.appendChild(win);
    this.win = win;

    win.addEventListener('pointerdown', (e) => e.stopPropagation());
    win.querySelector('[data-action="close"]').addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
    });
  }

  refresh() {
    this.win.querySelector('[data-field="best"]').textContent = String(this.hs.best);
    this.win.querySelector('[data-field="last"]').textContent = String(this.lastScore);
    this.win.querySelector('[data-field="plays"]').textContent = String(this.hs.plays);
  }

  open() {
    this.refresh();
    this.win.classList.remove('hidden');
  }

  close() {
    this.win.classList.add('hidden');
  }

  toggle() {
    if (this.win.classList.contains('hidden')) this.open();
    else this.close();
  }
}
