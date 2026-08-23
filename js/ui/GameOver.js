/**
 * Post-run panel: final score, best score, record badge, restart button.
 */
export class GameOverPanel {
  constructor(container, { onPlayAgain }) {
    const panel = document.createElement('section');
    panel.className = 'panel over-panel';
    panel.innerHTML = `
      <h2 class="over-title">Game Over</h2>
      <div class="record-badge hidden">★ New Record! ★</div>
      <div class="score-grid">
        <div class="score-cell"><span>Score</span><b data-field="score">0</b></div>
        <div class="score-cell"><span>Best</span><b data-field="best">0</b></div>
      </div>
      <button class="btn primary" data-action="again">Play Again</button>
    `;
    container.appendChild(panel);
    this.panel = panel;

    panel.addEventListener('pointerdown', (e) => e.stopPropagation());
    panel.querySelector('[data-action="again"]').addEventListener('click', (e) => {
      e.stopPropagation();
      onPlayAgain();
    });
  }

  show({ score, best, isRecord }) {
    this.panel.querySelector('[data-field="score"]').textContent = String(score);
    this.panel.querySelector('[data-field="best"]').textContent = String(best);
    this.panel.querySelector('.record-badge').classList.toggle('hidden', !isRecord);
  }

  setVisible(visible) {
    this.panel.classList.toggle('hidden', !visible);
  }
}
