const BOARD_SIZE = 4;
const STORAGE_KEYS = {
  best: "vibelabs2048-best-score",
  theme: "vibelabs2048-theme",
};

const state = {
  board: Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0)),
  score: 0,
  best: Number(localStorage.getItem(STORAGE_KEYS.best) || 0),
  won: false,
  over: false,
  touchStart: null,
};

const boardEl = document.getElementById("board");
const scoreEl = document.getElementById("score");
const bestScoreEl = document.getElementById("best-score");
const statusEl = document.getElementById("status");
const overlayEl = document.getElementById("overlay");
const overlayTextEl = document.getElementById("overlay-text");
const themeToggleEl = document.getElementById("theme-toggle");
const modalEl = document.getElementById("game-modal");
const openGameEl = document.getElementById("open-game");
const closeGameEl = document.getElementById("close-game");
const newGameEl = document.getElementById("new-game");
const overlayButtonEl = document.getElementById("overlay-button");

function applyTheme(theme) {
  const resolved = theme === "light" ? "light" : "dark";
  document.body.classList.toggle("light", resolved === "light");
  themeToggleEl.textContent = `mode: ${resolved}`;
  localStorage.setItem(STORAGE_KEYS.theme, resolved);
}

function randomEmptyCell() {
  const emptyCells = [];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (state.board[row][col] === 0) {
        emptyCells.push([row, col]);
      }
    }
  }
  if (emptyCells.length === 0) {
    return null;
  }
  return emptyCells[Math.floor(Math.random() * emptyCells.length)];
}

function addRandomTile() {
  const cell = randomEmptyCell();
  if (!cell) {
    return;
  }
  const [row, col] = cell;
  state.board[row][col] = Math.random() < 0.9 ? 2 : 4;
}

function updateBest() {
  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem(STORAGE_KEYS.best, String(state.best));
  }
}

function renderBoard() {
  boardEl.innerHTML = "";
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const value = state.board[row][col];
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.dataset.value = String(value);
      tile.textContent = value === 0 ? "." : String(value);
      boardEl.appendChild(tile);
    }
  }
  scoreEl.textContent = String(state.score);
  bestScoreEl.textContent = String(state.best);
}

function showOverlay(message, buttonText) {
  overlayTextEl.textContent = message;
  document.getElementById("overlay-button").textContent = buttonText;
  overlayEl.classList.remove("hidden");
}

function hideOverlay() {
  overlayEl.classList.add("hidden");
}

function openModal() {
  modalEl.classList.remove("hidden");
  document.body.classList.add("modal-open");
}

function closeModal() {
  modalEl.classList.add("hidden");
  document.body.classList.remove("modal-open");
}

function resetGame() {
  state.board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
  state.score = 0;
  state.won = false;
  state.over = false;
  addRandomTile();
  addRandomTile();
  hideOverlay();
  statusEl.textContent = "merge tiles. reach 2048 or keep going.";
  renderBoard();
}

function slideAndMerge(line) {
  const compact = line.filter((value) => value !== 0);
  const merged = [];
  let gained = 0;

  for (let index = 0; index < compact.length; index += 1) {
    if (compact[index] !== 0 && compact[index] === compact[index + 1]) {
      const value = compact[index] * 2;
      merged.push(value);
      gained += value;
      if (value === 2048) {
        state.won = true;
      }
      index += 1;
    } else {
      merged.push(compact[index]);
    }
  }

  while (merged.length < BOARD_SIZE) {
    merged.push(0);
  }

  return { line: merged, gained };
}

function boardsEqual(a, b) {
  return a.every((row, rowIndex) => row.every((value, colIndex) => value === b[rowIndex][colIndex]));
}

function cloneBoard(board) {
  return board.map((row) => [...row]);
}

function canMove() {
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const value = state.board[row][col];
      if (value === 0) {
        return true;
      }
      if (col + 1 < BOARD_SIZE && value === state.board[row][col + 1]) {
        return true;
      }
      if (row + 1 < BOARD_SIZE && value === state.board[row + 1][col]) {
        return true;
      }
    }
  }
  return false;
}

function moveLeft() {
  const next = cloneBoard(state.board);
  let gained = 0;
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    const result = slideAndMerge(next[row]);
    next[row] = result.line;
    gained += result.gained;
  }
  return { next, gained };
}

function reverseRows(board) {
  return board.map((row) => [...row].reverse());
}

function transpose(board) {
  return board[0].map((_, col) => board.map((row) => row[col]));
}

function move(direction) {
  if (state.over) {
    return;
  }

  const original = cloneBoard(state.board);
  let working = cloneBoard(state.board);

  if (direction === "right") {
    working = reverseRows(working);
  } else if (direction === "up") {
    working = transpose(working);
  } else if (direction === "down") {
    working = reverseRows(transpose(working));
  }

  const previousBoard = state.board;
  state.board = working;
  const { next, gained } = moveLeft();
  state.board = next;

  if (direction === "right") {
    state.board = reverseRows(state.board);
  } else if (direction === "up") {
    state.board = transpose(state.board);
  } else if (direction === "down") {
    state.board = transpose(reverseRows(state.board));
  }

  if (boardsEqual(original, state.board)) {
    state.board = previousBoard;
    return;
  }

  state.score += gained;
  updateBest();
  addRandomTile();

  if (!canMove()) {
    state.over = true;
    statusEl.textContent = "game over. no more valid moves.";
    showOverlay("game over", "try again");
  } else if (state.won) {
    statusEl.textContent = "2048 reached. keep going if you want.";
    showOverlay("2048 reached", "keep going");
    state.won = false;
  } else {
    statusEl.textContent = `score updated: ${state.score}`;
  }

  renderBoard();
}

function keyToDirection(key) {
  const mapping = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowUp: "up",
    ArrowDown: "down",
    h: "left",
    l: "right",
    k: "up",
    j: "down",
  };
  return mapping[key];
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modalEl.classList.contains("hidden")) {
    closeModal();
    return;
  }

  if (modalEl.classList.contains("hidden")) {
    return;
  }

  const direction = keyToDirection(event.key);
  if (!direction) {
    return;
  }
  event.preventDefault();
  move(direction);
});

boardEl.addEventListener("touchstart", (event) => {
  const touch = event.changedTouches[0];
  state.touchStart = { x: touch.clientX, y: touch.clientY };
}, { passive: true });

boardEl.addEventListener("touchend", (event) => {
  if (!state.touchStart) {
    return;
  }
  const touch = event.changedTouches[0];
  const deltaX = touch.clientX - state.touchStart.x;
  const deltaY = touch.clientY - state.touchStart.y;
  state.touchStart = null;

  if (Math.abs(deltaX) < 20 && Math.abs(deltaY) < 20) {
    return;
  }

  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    move(deltaX > 0 ? "right" : "left");
  } else {
    move(deltaY > 0 ? "down" : "up");
  }
}, { passive: true });

newGameEl.addEventListener("click", resetGame);
overlayButtonEl.addEventListener("click", () => {
  hideOverlay();
  if (state.over) {
    resetGame();
  } else {
    statusEl.textContent = "continuing past 2048.";
  }
});

openGameEl.addEventListener("click", openModal);
closeGameEl.addEventListener("click", closeModal);

modalEl.addEventListener("click", (event) => {
  if (event.target === modalEl) {
    closeModal();
  }
});

themeToggleEl.addEventListener("click", () => {
  applyTheme(document.body.classList.contains("light") ? "dark" : "light");
});

applyTheme(localStorage.getItem(STORAGE_KEYS.theme) || "dark");
resetGame();
renderBoard();
