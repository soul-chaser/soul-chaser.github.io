"use strict";

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector("#site-nav");
navToggle?.addEventListener("click", () => {
  const isOpen = siteNav.classList.toggle("is-open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
});
siteNav?.addEventListener("click", (event) => {
  if (event.target.matches("a")) {
    siteNav.classList.remove("is-open");
    navToggle?.setAttribute("aria-expanded", "false");
  }
});

const board = document.querySelector("#game-board");
const scoreLabel = document.querySelector("#game-score");
const bestLabel = document.querySelector("#game-best");
const statusLabel = document.querySelector("#game-status");
const startButton = document.querySelector("#game-start");
const pauseButton = document.querySelector("#game-pause");
const restartButton = document.querySelector("#game-restart");
const columns = 20;
const rows = 16;
const playerSpeed = 1;
const enemySpeed = 1.2;
const directions = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
let gameTimer = null;
let game = null;

function readBestScore() {
  try {
    return Number.parseInt(localStorage.getItem("soul-chaser-best-score") || "0", 10) || 0;
  } catch {
    return 0;
  }
}

function saveBestScore(score) {
  try {
    localStorage.setItem("soul-chaser-best-score", String(score));
  } catch {
    // 저장소를 사용할 수 없어도 현재 게임은 계속한다.
  }
}

function sameCell(first, second) {
  return first.x === second.x && first.y === second.y;
}

function inside(cell) {
  return cell.x >= 0 && cell.x < columns && cell.y >= 0 && cell.y < rows;
}

function occupied(cell) {
  return game.snake.some((part) => sameCell(part, cell))
    || game.enemies.some((enemy) => sameCell(enemy, cell));
}

function randomCell() {
  const available = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const cell = { x, y };
      if (!occupied(cell) && (!game.food || !sameCell(game.food, cell))) available.push(cell);
    }
  }
  return available[Math.floor(Math.random() * available.length)] || { x: 1, y: 1 };
}

function resetGame() {
  stopTimer();
  game = {
    status: "READY",
    snake: [{ x: 10, y: 8 }, { x: 9, y: 8 }, { x: 8, y: 8 }],
    direction: directions.right,
    queuedDirection: directions.right,
    food: null,
    enemies: [],
    score: 0,
    best: readBestScore(),
    enemyBudget: 0,
  };
  for (let index = 0; index < 5; index += 1) game.enemies.push(randomCell());
  game.food = randomCell();
  renderGame();
}

function startTimer() {
  if (gameTimer !== null) return;
  gameTimer = window.setInterval(tick, 200 / playerSpeed);
}

function stopTimer() {
  if (gameTimer === null) return;
  window.clearInterval(gameTimer);
  gameTimer = null;
}

function setDirection(directionName) {
  const next = directions[directionName];
  if (!next || !game || game.status === "GAME_OVER") return;
  if (next.x + game.queuedDirection.x === 0 && next.y + game.queuedDirection.y === 0) return;
  game.queuedDirection = next;
  if (game.status === "READY") startGame();
}

function startGame() {
  if (game.status === "GAME_OVER") resetGame();
  if (game.status === "RUNNING") return;
  game.status = "RUNNING";
  startTimer();
  renderGame();
}

function togglePause() {
  if (game.status === "RUNNING") {
    game.status = "PAUSED";
    stopTimer();
  } else if (game.status === "PAUSED") {
    game.status = "RUNNING";
    startTimer();
  }
  renderGame();
}

function restartGame() {
  resetGame();
  startGame();
}

function endGame() {
  game.status = "GAME_OVER";
  stopTimer();
  if (game.score > game.best) {
    game.best = game.score;
    saveBestScore(game.best);
  }
  renderGame();
}

function moveEnemies() {
  game.enemyBudget += enemySpeed;
  while (game.enemyBudget >= 1) {
    game.enemyBudget -= 1;
    game.enemies = game.enemies.map((enemy) => {
      const options = Object.values(directions)
        .map((direction) => ({ x: enemy.x + direction.x, y: enemy.y + direction.y }))
        .filter((candidate) => inside(candidate) && !game.snake.some((part) => sameCell(part, candidate)));
      return options[Math.floor(Math.random() * options.length)] || enemy;
    });
  }
}

function tick() {
  if (!game || game.status !== "RUNNING") return;
  game.direction = game.queuedDirection;
  const head = game.snake[0];
  const nextHead = { x: head.x + game.direction.x, y: head.y + game.direction.y };
  if (!inside(nextHead)) return endGame();
  const eatsFood = sameCell(nextHead, game.food);
  const bodyToCheck = eatsFood ? game.snake : game.snake.slice(0, -1);
  if (bodyToCheck.some((part) => sameCell(part, nextHead))) return endGame();
  game.snake.unshift(nextHead);
  if (eatsFood) {
    game.score += 1;
    game.food = randomCell();
  } else {
    game.snake.pop();
  }
  moveEnemies();
  if (game.enemies.some((enemy) => sameCell(enemy, nextHead))) return endGame();
  renderGame();
}

function renderGame() {
  if (!game || !board) return;
  const cells = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const cell = document.createElement("span");
      const position = { x, y };
      cell.className = "game-cell";
      if (game.food && sameCell(game.food, position)) cell.classList.add("food");
      if (game.enemies.some((enemy) => sameCell(enemy, position))) cell.classList.add("enemy");
      const snakeIndex = game.snake.findIndex((part) => sameCell(part, position));
      if (snakeIndex >= 0) cell.classList.add(snakeIndex === 0 ? "snake-head" : "snake");
      cells.push(cell);
    }
  }
  board.replaceChildren(...cells);
  scoreLabel.textContent = String(game.score);
  bestLabel.textContent = String(Math.max(game.best, game.score));
  statusLabel.textContent = { READY: "시작 준비", RUNNING: "플레이 중", PAUSED: "일시정지", GAME_OVER: "게임 오버" }[game.status];
  pauseButton.disabled = !["RUNNING", "PAUSED"].includes(game.status);
  pauseButton.textContent = game.status === "PAUSED" ? "계속하기" : "일시정지";
  startButton.disabled = game.status === "RUNNING";
}

document.addEventListener("keydown", (event) => {
  const keyDirections = { ArrowUp: "up", w: "up", W: "up", ArrowDown: "down", s: "down", S: "down", ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right" };
  if (keyDirections[event.key]) {
    event.preventDefault();
    setDirection(keyDirections[event.key]);
  } else if (event.key === " ") {
    event.preventDefault();
    togglePause();
  }
});
document.querySelectorAll("[data-direction]").forEach((button) => {
  button.addEventListener("click", () => setDirection(button.dataset.direction));
});
startButton.addEventListener("click", startGame);
pauseButton.addEventListener("click", togglePause);
restartButton.addEventListener("click", restartGame);
resetGame();
