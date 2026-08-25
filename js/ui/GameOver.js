/**
 * Post-run panel: final score, best, record badge, a name field to save the
 * run to the leaderboard, and Play Again / Scores / Main Menu buttons.
 */
export class GameOverPanel {
  constructor(container, { onPlayAgain, onHighScore, onMenu, onSave }) {
    const panel = document.createElement('section');
    panel.className = 'panel over-panel';
    panel.innerHTML = `
      <h2 class="over-title">Game Over</h2>
      <div class="record-badge hidden">★ New Record! ★</div>
      <div class="score-grid">
        <div class="score-cell"><span>Score</span><b data-field="score">0</b></div>
        <div class="score-cell"><span>Best</span><b data-field="best">0</b></div>
      </div>
      <div class="name-row">
        <input class="name-input" type="text" maxlength="16" placeholder="Your name"
               autocomplete="off" spellcheck="false" aria-label="Your name" />
        <button class="btn" data-action="save">Save</button>
      </div>
      <button class="btn primary" data-action="again">Play Again</button>
      <div class="menu-row">
        <button class="btn" data-action="scores">Scores</button>
        <button class="btn" data-action="menu">Main Menu</button>
      </div>
    `;
    container.appendChild(panel);
    this.panel = panel;
    this.nameInput = panel.querySelector('.name-input');
    this.saveBtn = panel.querySelector('[data-action="save"]');

    // Let taps on the panel reach the UI without flapping the bird.
    panel.addEventListener('pointerdown', (e) => e.stopPropagation());

    const bind = (selector, handler) => {
      panel.querySelector(selector).addEventListener('click', (e) => {
        e.stopPropagation();
        handler();
      });
    };
    bind('[data-action="again"]', onPlayAgain);
    bind('[data-action="scores"]', onHighScore);
    bind('[data-action="menu"]', onMenu);
    this.saveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      onSave(this.nameInput.value);
    });
  }

  /**
   * @param {object} r
   * @param {number} r.score final score
   * @param {number} r.best best score
   * @param {boolean} r.isRecord whether this run set a record
   * @param {string|null} [r.name] last saved name, to prefill the field
   */
  show({ score, best, isRecord, name = '' }) {
    this.panel.querySelector('[data-field="score"]').textContent = String(score);
    this.panel.querySelector('[data-field="best"]').textContent = String(best);
    this.panel.querySelector('.record-badge').classList.toggle('hidden', !isRecord);

    // Ready the name field for the next save.
    this.nameInput.value = name ?? '';
    this.nameInput.disabled = false;
    this.saveBtn.disabled = false;
    this.saveBtn.textContent = 'Save';
  }

  /** Called after a successful save so the run can't be saved twice. */
  markSaved() {
    this.nameInput.disabled = true;
    this.saveBtn.disabled = true;
    this.saveBtn.textContent = 'Saved ✓';
  }

  setVisible(visible) {
    this.panel.classList.toggle('hidden', !visible);
  }
}
