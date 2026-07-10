/**
 * Minesweeper Logic for Windows XP Theme
 */

window.Minesweeper = {
  rows: 9,
  cols: 9,
  mines: 10,
  grid: [],
  revealed: [],
  flagged: [],
  status: "waiting", // waiting, playing, won, lost
  timer: 0,
  timerInterval: null,

  init() {
    this.setupUI();
    this.reset();
  },

  setupUI() {
    const startBtn = document.getElementById("start-minesweeper");
    const taskBtn = document.getElementById("minesweeper-task-btn");
    const windowEl = document.getElementById("minesweeper-window");
    const closeBtn = document.getElementById("minesweeper-close");
    const resetBtn = document.getElementById("ms-reset-btn");
    const gameMenuBtn = document.getElementById("ms-game-menu");
    const gameDropdown = document.getElementById("ms-game-dropdown");
    const newGameBtn = document.getElementById("ms-new-game-btn");
    const exitBtn = document.getElementById("ms-exit-btn");
    const helpBtn = document.getElementById("ms-help-menu");

    if (!windowEl || !taskBtn) return;

    const open = () => {
      windowEl.classList.remove("hidden");
      taskBtn.classList.remove("hidden");
      taskBtn.classList.add("active");
      windowEl.style.left = "150px";
      windowEl.style.top = "100px";
      windowEl.style.transform = "none";
      document.getElementById("start-menu")?.classList.add("hidden");
      if (this.status === "waiting") this.reset();
    };

    const close = () => {
      windowEl.classList.add("hidden");
      taskBtn.classList.remove("active");
      taskBtn.classList.add("hidden");
      gameDropdown?.classList.add("hidden");
    };

    startBtn?.addEventListener("click", open);
    taskBtn.addEventListener("click", () => {
      if (windowEl.classList.contains("hidden")) {
        open();
      } else {
        windowEl.classList.add("hidden");
        taskBtn.classList.remove("active");
      }
    });
    closeBtn.addEventListener("click", close);
    resetBtn.addEventListener("click", () => this.reset());

    gameMenuBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      gameDropdown?.classList.toggle("hidden");
    });

    newGameBtn?.addEventListener("click", () => {
      this.reset();
      gameDropdown?.classList.add("hidden");
    });

    exitBtn?.addEventListener("click", close);

    helpBtn?.addEventListener("click", () => {
      alert("Minesweeper\n\nLeft click to reveal.\nRight click to flag.");
    });

    document.addEventListener("click", (e) => {
      if (!gameDropdown?.contains(e.target) && e.target !== gameMenuBtn) {
        gameDropdown?.classList.add("hidden");
      }
    });

    // Make window draggable
    if (window.App && App.makeWindowDraggable) {
      App.makeWindowDraggable(windowEl);
    }
  },

  reset() {
    this.status = "waiting";
    this.timer = 0;
    this.clearInterval();
    this.updateTimerDisplay();
    this.updateMineCountDisplay(this.mines);

    const resetBtn = document.getElementById("ms-reset-btn");
    resetBtn.className = "ms-smiley-btn";

    this.grid = Array(this.rows * this.cols).fill(0);
    this.revealed = Array(this.rows * this.cols).fill(false);
    this.flagged = Array(this.rows * this.cols).fill(false);

    this.render();
  },

  start(firstClickIndex) {
    this.status = "playing";
    this.placeMines(firstClickIndex);
    this.calculateNumbers();
    this.startTimer();
  },

  placeMines(safeIndex) {
    let placed = 0;
    while (placed < this.mines) {
      const idx = Math.floor(Math.random() * this.grid.length);
      // Don't place mine on the first click or if there's already a mine
      if (idx !== safeIndex && this.grid[idx] !== -1) {
        this.grid[idx] = -1;
        placed++;
      }
    }
  },

  calculateNumbers() {
    for (let i = 0; i < this.grid.length; i++) {
      if (this.grid[i] === -1) continue;
      let count = 0;
      const neighbors = this.getNeighbors(i);
      neighbors.forEach((n) => {
        if (this.grid[n] === -1) count++;
      });
      this.grid[i] = count;
    }
  },

  getNeighbors(index) {
    const neighbors = [];
    const r = Math.floor(index / this.cols);
    const c = index % this.cols;

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
          neighbors.push(nr * this.cols + nc);
        }
      }
    }
    return neighbors;
  },

  reveal(index) {
    if (
      this.status === "lost" ||
      this.status === "won" ||
      this.revealed[index] ||
      this.flagged[index]
    )
      return;

    if (this.status === "waiting") {
      this.start(index);
    }

    this._recursiveReveal(index);
    this.render();
    this.checkWin();
  },

  _recursiveReveal(index) {
    if (this.revealed[index] || this.flagged[index]) return;

    this.revealed[index] = true;

    if (this.grid[index] === 0) {
      const neighbors = this.getNeighbors(index);
      neighbors.forEach((n) => this._recursiveReveal(n));
    } else if (this.grid[index] === -1) {
      this.gameOver(false);
    }
  },

  toggleFlag(index) {
    if (this.status === "lost" || this.status === "won" || this.revealed[index])
      return;
    this.flagged[index] = !this.flagged[index];

    const flaggedCount = this.flagged.filter((f) => f).length;
    this.updateMineCountDisplay(this.mines - flaggedCount);

    this.render();
  },

  gameOver(won) {
    this.status = won ? "won" : "lost";
    this.clearInterval();
    const resetBtn = document.getElementById("ms-reset-btn");
    resetBtn.className = "ms-smiley-btn " + (won ? "win" : "dead");

    if (!won) {
      // Reveal all mines
      for (let i = 0; i < this.grid.length; i++) {
        if (this.grid[i] === -1) this.revealed[i] = true;
      }
    }
    this.render();
  },

  checkWin() {
    const unrevealedCount = this.revealed.filter((r) => !r).length;
    if (unrevealedCount === this.mines && this.status === "playing") {
      this.gameOver(true);
    }
  },

  startTimer() {
    this.clearInterval();
    this.timerInterval = setInterval(() => {
      this.timer++;
      if (this.timer > 999) this.timer = 999;
      this.updateTimerDisplay();
    }, 1000);
  },

  clearInterval() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  },

  updateTimerDisplay() {
    const el = document.getElementById("ms-timer");
    if (el) el.textContent = this.timer.toString().padStart(3, "0");
  },

  updateMineCountDisplay(count) {
    const el = document.getElementById("ms-mine-count");
    if (!el) return;
    if (count < 0) {
      el.textContent = "-" + Math.abs(count).toString().padStart(2, "0");
    } else {
      el.textContent = count.toString().padStart(3, "0");
    }
  },

  render() {
    const gridEl = document.getElementById("ms-grid");
    if (!gridEl) return;

    gridEl.innerHTML = "";
    gridEl.style.gridTemplateColumns = `repeat(${this.cols}, 16px)`;
    gridEl.style.gridTemplateRows = `repeat(${this.rows}, 16px)`;

    for (let i = 0; i < this.grid.length; i++) {
      const cell = document.createElement("div");
      cell.className = "ms-cell";

      if (this.revealed[i]) {
        cell.classList.add("revealed");
        if (this.grid[i] === -1) {
          cell.classList.add("mine");
        } else if (this.grid[i] > 0) {
          cell.textContent = this.grid[i];
          cell.setAttribute("data-value", this.grid[i]);
        }
      } else if (this.flagged[i]) {
        cell.classList.add("flagged");
      }

      cell.addEventListener("mousedown", (e) => {
        if (this.status === "lost" || this.status === "won") return;
        if (e.button === 0) {
          // Left click
          const resetBtn = document.getElementById("ms-reset-btn");
          resetBtn.classList.add("shock");
        }
      });

      cell.addEventListener("mouseup", (e) => {
        const resetBtn = document.getElementById("ms-reset-btn");
        resetBtn.classList.remove("shock");

        if (e.button === 0) {
          this.reveal(i);
        } else if (e.button === 2) {
          this.toggleFlag(i);
        }
      });

      cell.addEventListener("contextmenu", (e) => e.preventDefault());

      gridEl.appendChild(cell);
    }
  },
};

// Initialize when the script is loaded or called from app.js
if (typeof App !== "undefined") {
  // We'll call Minesweeper.init() from App.init()
}
