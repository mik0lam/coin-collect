import "./style.css";

function required<T>(value: T | null | undefined, name: string): T {
  if (value == null) {
    throw new Error(`${name} not found`);
  }

  return value;
}

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App element not found");
}

app.innerHTML = `
  <div id="menu" class="menu">
    <div class="menu-content">
      <h1 class="menu-title">Coin Collect</h1>
      <p class="menu-tagline">Grab the gold. Dodge the snake.</p>
      <div class="menu-coin" aria-hidden="true"></div>
      <button id="play-btn" class="menu-btn" type="button">Play</button>
      <p class="menu-controls">Move with <kbd>WASD</kbd> or <kbd>Arrow keys</kbd><br />Attack with <kbd>Space</kbd></p>
    </div>
  </div>
  <canvas id="game" class="hidden" width="800" height="500"></canvas>
  <div id="game-over" class="menu hidden">
    <div class="menu-content">
      <h1 class="game-over-title">Game Over</h1>
      <p class="game-over-message">The snake got you!</p>
      <p class="game-over-score">Score: <span id="final-score">0</span></p>
      <button id="menu-btn" class="menu-btn" type="button">Main Menu</button>
    </div>
  </div>
`;

const menuEl = required(document.querySelector<HTMLDivElement>("#menu"), "Menu");
const playBtn = required(
  document.querySelector<HTMLButtonElement>("#play-btn"),
  "Play button",
);
const canvas = required(document.querySelector<HTMLCanvasElement>("#game"), "Canvas");
const ctx = required(canvas.getContext("2d"), "Canvas context");
const gameOverEl = required(document.querySelector<HTMLDivElement>("#game-over"), "Game over screen");
const menuBtn = required(
  document.querySelector<HTMLButtonElement>("#menu-btn"),
  "Menu button",
);
const finalScoreEl = required(
  document.querySelector<HTMLSpanElement>("#final-score"),
  "Final score",
);

type GameState = "menu" | "playing" | "gameover";
type Direction = "north" | "south" | "east" | "west";

interface SnakeConfig {
  segments: { x: number; y: number }[];
  size: number;
  speed: number;
}

interface Room {
  id: string;
  name: string;
  background: string;
  exits: Partial<Record<Direction, string>>;
  coin: { x: number; y: number };
  snake: SnakeConfig;
}

const HUD_HEIGHT = 72;
const PLAY_WIDTH = canvas.width;
const PLAY_HEIGHT = canvas.height - HUD_HEIGHT;

const rooms: Record<string, Room> = {
  courtyard: {
    id: "courtyard",
    name: "Courtyard",
    background: "#0d1a0d",
    exits: { east: "east-hall", south: "south-garden" },
    coin: { x: 220, y: 160 },
    snake: {
      segments: [
        { x: 520, y: 280 },
        { x: 550, y: 280 },
        { x: 580, y: 280 },
      ],
      size: 24,
      speed: 2,
    },
  },
  "east-hall": {
    id: "east-hall",
    name: "East Hall",
    background: "#1a0d1a",
    exits: { west: "courtyard", south: "vault" },
    coin: { x: 380, y: 200 },
    snake: {
      segments: [
        { x: 180, y: 120 },
        { x: 210, y: 120 },
        { x: 240, y: 120 },
        { x: 270, y: 120 },
      ],
      size: 24,
      speed: 2.5,
    },
  },
  "south-garden": {
    id: "south-garden",
    name: "South Garden",
    background: "#0d1a1a",
    exits: { north: "courtyard", east: "vault" },
    coin: { x: 300, y: 250 },
    snake: {
      segments: [
        { x: 600, y: 100 },
        { x: 630, y: 100 },
        { x: 660, y: 100 },
      ],
      size: 24,
      speed: 2.25,
    },
  },
  vault: {
    id: "vault",
    name: "Treasure Vault",
    background: "#1a1a0d",
    exits: { north: "east-hall", west: "south-garden" },
    coin: { x: 400, y: 180 },
    snake: {
      segments: [
        { x: 200, y: 320 },
        { x: 230, y: 320 },
        { x: 260, y: 320 },
        { x: 290, y: 320 },
        { x: 320, y: 320 },
      ],
      size: 24,
      speed: 3,
    },
  },
};

let state: GameState = "menu";
let currentRoomId = "courtyard";

const player = {
  x: 100,
  y: 100,
  size: 30,
  speed: 4,
};

const coin = {
  x: 300,
  y: 200,
  size: 20,
};

const snake = {
  segments: [] as { x: number; y: number }[],
  size: 24,
  speed: 2,
};

let snakeDeadUntil = 0;
const SNAKE_RESPAWN_MS = 4000;

let playerFacing: Direction = "east";

const weapon = {
  range: 44,
  width: 38,
  durationMs: 160,
  cooldownMs: 480,
  activeUntil: 0,
  lastAttackAt: 0,
};

let score = 0;

const hp = {
  max: 100,
  current: 100,
  damage: 34,
  invincibilityMs: 1000,
};

let invincibleUntil = 0;

const keys = new Set<string>();

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  keys.add(key);

  if (key === " " && state === "playing") {
    event.preventDefault();
    tryAttack();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

function getCurrentRoom(): Room {
  return rooms[currentRoomId];
}

function loadRoom(roomId: string) {
  const room = rooms[roomId];
  currentRoomId = roomId;
  coin.x = room.coin.x;
  coin.y = room.coin.y;
  snake.segments = room.snake.segments.map((segment) => ({ ...segment }));
  snake.size = room.snake.size;
  snake.speed = room.snake.speed;
  snakeDeadUntil = 0;
  weapon.activeUntil = 0;
  weapon.lastAttackAt = 0;
}

function spawnFromDirection(direction: Direction) {
  const margin = 8;

  switch (direction) {
    case "east":
      player.x = PLAY_WIDTH - player.size - margin;
      break;
    case "west":
      player.x = margin;
      break;
    case "south":
      player.y = PLAY_HEIGHT - player.size - margin;
      break;
    case "north":
      player.y = margin;
      break;
  }
}

function changeRoom(roomId: string, enteredFrom: Direction) {
  loadRoom(roomId);
  spawnFromDirection(enteredFrom);
}

function resetGame() {
  score = 0;
  hp.current = hp.max;
  invincibleUntil = 0;
  playerFacing = "east";
  player.x = 100;
  player.y = 100;
  loadRoom("courtyard");
  keys.clear();
}

function isSnakeAlive() {
  return snake.segments.length > 0;
}

function boxesOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function getSwingHitbox() {
  const centerX = player.x + player.size / 2;
  const centerY = player.y + player.size / 2;

  switch (playerFacing) {
    case "east":
      return {
        x: player.x + player.size,
        y: centerY - weapon.width / 2,
        w: weapon.range,
        h: weapon.width,
      };
    case "west":
      return {
        x: player.x - weapon.range,
        y: centerY - weapon.width / 2,
        w: weapon.range,
        h: weapon.width,
      };
    case "north":
      return {
        x: centerX - weapon.width / 2,
        y: player.y - weapon.range,
        w: weapon.width,
        h: weapon.range,
      };
    case "south":
      return {
        x: centerX - weapon.width / 2,
        y: player.y + player.size,
        w: weapon.width,
        h: weapon.range,
      };
  }
}

function slaySnake() {
  snake.segments = [];
  snakeDeadUntil = performance.now() + SNAKE_RESPAWN_MS;
  score += 3;
}

function tryAttack() {
  const now = performance.now();

  if (now < weapon.lastAttackAt + weapon.cooldownMs || !isSnakeAlive()) {
    return;
  }

  weapon.lastAttackAt = now;
  weapon.activeUntil = now + weapon.durationMs;
  checkWeaponHits();
}

function checkWeaponHits() {
  if (!isSnakeAlive()) {
    return;
  }

  const hitbox = getSwingHitbox();

  for (const segment of snake.segments) {
    if (
      boxesOverlap(hitbox, {
        x: segment.x,
        y: segment.y,
        w: snake.size,
        h: snake.size,
      })
    ) {
      slaySnake();
      return;
    }
  }
}

function updateSnakeRespawn() {
  if (isSnakeAlive() || performance.now() < snakeDeadUntil) {
    return;
  }

  const room = getCurrentRoom();
  snake.segments = room.snake.segments.map((segment) => ({ ...segment }));
  snake.size = room.snake.size;
  snake.speed = room.snake.speed;
}

function updateFacing() {
  if (keys.has("w") || keys.has("arrowup")) {
    playerFacing = "north";
  } else if (keys.has("s") || keys.has("arrowdown")) {
    playerFacing = "south";
  } else if (keys.has("a") || keys.has("arrowleft")) {
    playerFacing = "west";
  } else if (keys.has("d") || keys.has("arrowright")) {
    playerFacing = "east";
  }
}

function showMenu() {
  state = "menu";
  keys.clear();

  gameOverEl.classList.add("hidden");
  canvas.classList.add("hidden");
  menuEl.classList.remove("hidden");
}

function startGame() {
  state = "playing";
  resetGame();

  gameOverEl.classList.add("hidden");
  menuEl.classList.add("hidden");
  canvas.classList.remove("hidden");
  gameLoop();
}

function endGame() {
  state = "gameover";
  keys.clear();
  finalScoreEl.textContent = String(score);

  canvas.classList.add("hidden");
  gameOverEl.classList.remove("hidden");
}

function tryChangeRoom() {
  const room = getCurrentRoom();

  if (player.x < 0 && room.exits.west) {
    changeRoom(room.exits.west, "east");
    return;
  }

  if (player.x + player.size > PLAY_WIDTH && room.exits.east) {
    changeRoom(room.exits.east, "west");
    return;
  }

  if (player.y < 0 && room.exits.north) {
    changeRoom(room.exits.north, "south");
    return;
  }

  if (player.y + player.size > PLAY_HEIGHT && room.exits.south) {
    changeRoom(room.exits.south, "north");
  }
}

function movePlayer() {
  if (keys.has("w") || keys.has("arrowup")) {
    player.y -= player.speed;
  }

  if (keys.has("s") || keys.has("arrowdown")) {
    player.y += player.speed;
  }

  if (keys.has("a") || keys.has("arrowleft")) {
    player.x -= player.speed;
  }

  if (keys.has("d") || keys.has("arrowright")) {
    player.x += player.speed;
  }

  updateFacing();
  tryChangeRoom();

  player.x = Math.max(0, Math.min(PLAY_WIDTH - player.size, player.x));
  player.y = Math.max(0, Math.min(PLAY_HEIGHT - player.size, player.y));
}

function isCoinColliding() {
  return (
    player.x < coin.x + coin.size &&
    player.x + player.size > coin.x &&
    player.y < coin.y + coin.size &&
    player.y + player.size > coin.y
  );
}

function isPlayerInvincible() {
  return performance.now() < invincibleUntil;
}

function takeDamage() {
  if (isPlayerInvincible()) {
    return;
  }

  hp.current = Math.max(0, hp.current - hp.damage);
  invincibleUntil = performance.now() + hp.invincibilityMs;

  if (hp.current <= 0) {
    endGame();
  }
}

function isPlayerHitBySnake() {
  if (!isSnakeAlive()) {
    return false;
  }

  for (const segment of snake.segments) {
    if (
      player.x < segment.x + snake.size &&
      player.x + player.size > segment.x &&
      player.y < segment.y + snake.size &&
      player.y + player.size > segment.y
    ) {
      return true;
    }
  }

  return false;
}

function moveCoin() {
  coin.x = Math.random() * (PLAY_WIDTH - coin.size);
  coin.y = Math.random() * (PLAY_HEIGHT - coin.size);
}

function moveSnake() {
  if (!isSnakeAlive()) {
    return;
  }

  const head = snake.segments[0];

  const dx = player.x - head.x;
  const dy = player.y - head.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance > 0) {
    head.x += (dx / distance) * snake.speed;
    head.y += (dy / distance) * snake.speed;
  }

  for (let i = 1; i < snake.segments.length; i++) {
    const previous = snake.segments[i - 1];
    const current = snake.segments[i];

    const followDx = previous.x - current.x;
    const followDy = previous.y - current.y;
    const followDistance = Math.sqrt(followDx * followDx + followDy * followDy);

    const spacing = snake.size + 4;

    if (followDistance > spacing) {
      current.x += (followDx / followDistance) * snake.speed;
      current.y += (followDy / followDistance) * snake.speed;
    }
  }
}

function updateWeapon() {
  if (performance.now() < weapon.activeUntil) {
    checkWeaponHits();
  }
}

function update() {
  movePlayer();
  updateSnakeRespawn();
  moveSnake();
  updateWeapon();

  if (isPlayerHitBySnake()) {
    takeDamage();
  }

  if (isCoinColliding()) {
    score += 1;
    moveCoin();
  }
}

function drawHpBar(x: number, y: number, width: number, height: number) {
  const fillRatio = hp.current / hp.max;

  ctx.fillStyle = "#333";
  ctx.fillRect(x, y, width, height);

  if (fillRatio > 0.5) {
    ctx.fillStyle = "#44ff44";
  } else if (fillRatio > 0.25) {
    ctx.fillStyle = "#ffaa00";
  } else {
    ctx.fillStyle = "#ff4444";
  }

  ctx.fillRect(x, y, width * fillRatio, height);

  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
}

function drawHud() {
  const room = getCurrentRoom();

  ctx.fillStyle = "#141414";
  ctx.fillRect(0, 0, canvas.width, HUD_HEIGHT);

  ctx.strokeStyle = "#444";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, HUD_HEIGHT);
  ctx.lineTo(canvas.width, HUD_HEIGHT);
  ctx.stroke();

  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.textAlign = "left";
  ctx.fillText(`Score: ${score}`, 20, 30);

  ctx.textAlign = "right";
  ctx.fillStyle = "#ccc";
  ctx.font = "18px Arial";
  ctx.fillText(room.name, canvas.width - 20, 30);

  ctx.textAlign = "left";
  ctx.fillStyle = "white";
  ctx.font = "16px Arial";
  ctx.fillText("HP", 20, 58);
  drawHpBar(48, 44, 160, 18);

  const cooldownReady = performance.now() >= weapon.lastAttackAt + weapon.cooldownMs;
  ctx.fillStyle = cooldownReady ? "#ff8844" : "#555";
  ctx.font = "14px Arial";
  ctx.textAlign = "right";
  ctx.fillText(cooldownReady ? "Sword ready" : "Sword cooling...", canvas.width - 20, 58);
  ctx.textAlign = "left";
}

function drawDoors(room: Room) {
  const doorThickness = 10;
  const doorLength = 60;
  const centerX = PLAY_WIDTH / 2 - doorLength / 2;
  const centerY = HUD_HEIGHT + PLAY_HEIGHT / 2 - doorLength / 2;

  ctx.fillStyle = "rgba(255, 215, 0, 0.45)";

  if (room.exits.north) {
    ctx.fillRect(centerX, HUD_HEIGHT, doorLength, doorThickness);
  }

  if (room.exits.south) {
    ctx.fillRect(centerX, HUD_HEIGHT + PLAY_HEIGHT - doorThickness, doorLength, doorThickness);
  }

  if (room.exits.west) {
    ctx.fillRect(0, centerY, doorThickness, doorLength);
  }

  if (room.exits.east) {
    ctx.fillRect(PLAY_WIDTH - doorThickness, centerY, doorThickness, doorLength);
  }
}

function draw() {
  const room = getCurrentRoom();

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = room.background;
  ctx.fillRect(0, HUD_HEIGHT, PLAY_WIDTH, PLAY_HEIGHT);

  drawDoors(room);
  drawHud();

  const invincible = isPlayerInvincible();
  const showPlayer = !invincible || Math.floor(performance.now() / 100) % 2 === 0;

  if (showPlayer) {
    ctx.fillStyle = invincible ? "#ff6666" : "cyan";
    ctx.fillRect(player.x, player.y + HUD_HEIGHT, player.size, player.size);
  }

  ctx.fillStyle = "gold";
  ctx.fillRect(coin.x, coin.y + HUD_HEIGHT, coin.size, coin.size);

  ctx.fillStyle = "lime";

  for (const segment of snake.segments) {
    ctx.fillRect(segment.x, segment.y + HUD_HEIGHT, snake.size, snake.size);
  }
}

function gameLoop() {
  if (state !== "playing") {
    return;
  }

  update();
  draw();
  requestAnimationFrame(gameLoop);
}

playBtn.addEventListener("click", startGame);
menuBtn.addEventListener("click", showMenu);
