/**
 * A floating window (title bar + close button) showing persistent
 * high-score stats. Open it from the menu, or it pops open on a new record.
 */
export class HighScoreWindow {
  constructor(container, highScore) {
    this.hs = highScore;
    this.lastScore = 0;
    this.win = document.createElement('section');
    this.win.className = 'hs-window hidden';
    this.win.innerHTML = `
      <header class="hs-titlebar">
        <span>★ High Scores</span>
        <button class="hs-close" data-action="close" aria-label="Close">×</button>
      </header>
      <div class="hs-body">
        <div class="hs-row"><span>Best</span><b data-field="best">0</b></div>
        <div class="hs-row"><span>Last run</span><b data-field="last">0</b></div>
        <div class="hs-row"><span>Runs</span><b data-field="plays">0</b></div>
        <div class="hs-leaderboard-container">
          <!-- Leaderboard items injected here -->
        </div>
      </div>
    `;
    container.appendChild(this.win);
    this.win.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.win.querySelector('[data-action="close"]').addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
    });
  }

  refresh() {
    // 1. Update header info
    this.win.querySelector('[data-field="best"]').textContent = String(this.hs.best);
    this.win.querySelector('[data-field="last"]').textContent = String(this.lastScore);
    this.win.querySelector('[data-field="plays"]').textContent = String(this.hs.plays);

    // 2. Update leaderboard. Names are inserted with textContent only, so a
    //    stored string can never be interpreted as markup.
    const leaderboardContainer = this.win.querySelector('.hs-leaderboard-container');
    leaderboardContainer.replaceChildren();
    const topRuns = this.hs.top();

    if (topRuns.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'no-entries';
      empty.textContent = 'No scores recorded yet.';
      leaderboardContainer.appendChild(empty);
    } else {
      topRuns.forEach((run, index) => {
        const entry = document.createElement('div');
        entry.className = 'hs-row leaderboard-entry';
        const rank = document.createElement('span');
        rank.className = 'rank';
        rank.textContent = `${index + 1}.`;
        const name = document.createElement('span');
        name.textContent = run.n;
        const score = document.createElement('b');
        score.textContent = String(run.s);
        entry.append(rank, name, score);
        leaderboardContainer.appendChild(entry);
      });
    }
  }

  isOpen() {
    return !this.win.classList.contains('hidden');
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
