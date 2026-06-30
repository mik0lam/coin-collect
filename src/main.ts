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
      <p class="menu-tagline">Descend the dungeon. Grab gold. Slay snakes.</p>
      <div class="menu-coin" aria-hidden="true"></div>
      <button id="play-btn" class="menu-btn" type="button">Play</button>
      <p class="menu-controls">Move with <kbd>WASD</kbd> or <kbd>Arrow keys</kbd><br />Sword in first room · Press <kbd>M</kbd> for map</p>
    </div>
  </div>
  <div id="game-wrap" class="game-wrap hidden">
    <canvas id="game" width="800" height="500"></canvas>
    <button id="map-btn" type="button" class="map-btn">Map</button>
  </div>
  <div id="game-over" class="menu hidden">
    <div class="menu-content">
      <h1 class="game-over-title">Game Over</h1>
      <p class="game-over-message">The snake got you!</p>
      <p class="game-over-score">Depth <span id="final-depth">1</span> · Score <span id="final-score">0</span></p>
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
const gameWrap = required(document.querySelector<HTMLDivElement>("#game-wrap"), "Game wrap");
const mapBtn = required(document.querySelector<HTMLButtonElement>("#map-btn"), "Map button");
const gameOverEl = required(document.querySelector<HTMLDivElement>("#game-over"), "Game over screen");
const menuBtn = required(
  document.querySelector<HTMLButtonElement>("#menu-btn"),
  "Menu button",
);
const finalScoreEl = required(
  document.querySelector<HTMLSpanElement>("#final-score"),
  "Final score",
);
const finalDepthEl = required(
  document.querySelector<HTMLSpanElement>("#final-depth"),
  "Final depth",
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
  gridX: number;
  gridY: number;
  exits: Partial<Record<Direction, string>>;
  coin: { x: number; y: number };
  snake: SnakeConfig;
  swordPickup?: { x: number; y: number };
  stairsDownTile?: { x: number; y: number };
  stairsUpTile?: { x: number; y: number };
}

interface Floor {
  depth: number;
  rooms: Record<string, Room>;
  startRoomId: string;
  stairsDownRoomId: string;
}

const HUD_HEIGHT = 72;
const PLAY_WIDTH = canvas.width;
const PLAY_HEIGHT = canvas.height - HUD_HEIGHT;

const ROOM_NAME_PARTS = [
  "Chamber",
  "Hall",
  "Crypt",
  "Gallery",
  "Passage",
  "Vault",
  "Cavern",
  "Den",
  "Tunnel",
  "Sanctum",
];

let runSeed = 0;
let currentDepth = 1;
let deepestDepth = 1;
const floors = new Map<number, Floor>();
const visitedRooms = new Set<string>();
let currentRoomId = "";

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

const SWORD_PICKUP_SIZE = 40;
const STAIRS_TILE_SIZE = 52;
const SWORD_START_POSITION = { x: 200, y: 115 };
const SWORD_TUTORIAL_MS = 6000;
const SWORD_MAX_DURABILITY = 25;
const FLOOR_MESSAGE_MS = 2500;
const DESCEND_BONUS = 15;

let hasSword = false;
let swordDurability = 0;
let swordTutorialUntil = 0;
let floorMessageUntil = 0;
let floorMessage = "";
let stairsCooldownUntil = 0;
const STAIRS_COOLDOWN_MS = 900;

const DOOR_THICKNESS = 10;
const DOOR_LENGTH = 60;
const DOOR_HIT_DEPTH = 24;

let mapOpen = false;

let state: GameState = "menu";
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

  if (key === "m" && state === "playing") {
    event.preventDefault();
    toggleMap();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

function createRng(seed: number) {
  let rngState = seed >>> 0;

  return () => {
    rngState = (rngState * 1664525 + 1013904223) >>> 0;
    return rngState / 4294967296;
  };
}

function randomPosition(rng: () => number, margin = 60) {
  const maxX = PLAY_WIDTH - margin - 40;
  const maxY = PLAY_HEIGHT - margin - 40;

  return {
    x: margin + rng() * Math.max(1, maxX - margin),
    y: margin + rng() * Math.max(1, maxY - margin),
  };
}

function backgroundForDepth(depth: number, variant: number) {
  const hue = (205 + depth * 14 + variant * 27) % 360;
  const lightness = Math.max(7, 20 - depth * 1.5);
  return `hsl(${hue}, 38%, ${lightness}%)`;
}

function stairsTilePosition() {
  return {
    x: PLAY_WIDTH / 2 - STAIRS_TILE_SIZE / 2,
    y: PLAY_HEIGHT / 2 - STAIRS_TILE_SIZE / 2,
  };
}

function generateSnake(depth: number, rng: () => number): SnakeConfig {
  const segmentCount = Math.min(8, 2 + depth + Math.floor(rng() * 3));
  const speed = 1.75 + depth * 0.28 + rng() * 0.4;
  const spawn = randomPosition(rng, 100);
  const segments: { x: number; y: number }[] = [];

  for (let i = 0; i < segmentCount; i++) {
    segments.push({ x: spawn.x - i * 28, y: spawn.y });
  }

  return { segments, size: 24, speed };
}

function generateFloor(depth: number, seed: number): Floor {
  const rng = createRng(seed);
  const roomCount = Math.min(8, 4 + Math.floor(depth / 2) + Math.floor(rng() * 2));
  const grid = new Map<string, { id: string; gx: number; gy: number }>();
  const startId = `d${depth}-r0`;

  grid.set("0,0", { id: startId, gx: 0, gy: 0 });

  const directions = [
    { dx: 0, dy: -1, dir: "north" as Direction, opposite: "south" as Direction },
    { dx: 1, dy: 0, dir: "east" as Direction, opposite: "west" as Direction },
    { dx: 0, dy: 1, dir: "south" as Direction, opposite: "north" as Direction },
    { dx: -1, dy: 0, dir: "west" as Direction, opposite: "east" as Direction },
  ];

  while (grid.size < roomCount) {
    const cells = [...grid.values()];
    const parent = cells[Math.floor(rng() * cells.length)];
    const step = directions[Math.floor(rng() * directions.length)];
    const gx = parent.gx + step.dx;
    const gy = parent.gy + step.dy;
    const key = `${gx},${gy}`;

    if (!grid.has(key)) {
      grid.set(key, { id: `d${depth}-r${grid.size}`, gx, gy });
    }
  }

  const rooms: Record<string, Room> = {};
  let farthestRoomId = startId;
  let farthestDistance = 0;

  for (const cell of grid.values()) {
    const exits: Partial<Record<Direction, string>> = {};

    for (const step of directions) {
      const neighbor = grid.get(`${cell.gx + step.dx},${cell.gy + step.dy}`);

      if (neighbor) {
        exits[step.dir] = neighbor.id;
      }
    }

    const distance = Math.abs(cell.gx) + Math.abs(cell.gy);

    if (distance > farthestDistance) {
      farthestDistance = distance;
      farthestRoomId = cell.id;
    }

    const namePart = ROOM_NAME_PARTS[Math.floor(rng() * ROOM_NAME_PARTS.length)];

    rooms[cell.id] = {
      id: cell.id,
      name: `Depth ${depth} · ${namePart}`,
      background: backgroundForDepth(depth, Math.floor(rng() * 5)),
      gridX: cell.gx,
      gridY: cell.gy,
      exits,
      coin: randomPosition(rng),
      snake: generateSnake(depth, rng),
    };
  }

  rooms[farthestRoomId].stairsDownTile = stairsTilePosition();

  if (depth > 1) {
    rooms[startId].stairsUpTile = stairsTilePosition();
  }

  if (depth === 1) {
    rooms[startId].swordPickup = { ...SWORD_START_POSITION };
    rooms[startId].snake = {
      segments: [
        { x: 560, y: 310 },
        { x: 590, y: 310 },
      ],
      size: 24,
      speed: 1.6,
    };
  }

  return {
    depth,
    rooms,
    startRoomId: startId,
    stairsDownRoomId: farthestRoomId,
  };
}

function ensureFloor(depth: number) {
  if (!floors.has(depth)) {
    floors.set(depth, generateFloor(depth, runSeed + depth * 9973));
  }
}

function getCurrentFloor(): Floor {
  return floors.get(currentDepth)!;
}

function getCurrentRoom(): Room {
  return getCurrentFloor().rooms[currentRoomId];
}

function toggleMap() {
  mapOpen = !mapOpen;
  mapBtn.textContent = mapOpen ? "Close" : "Map";
}

function setMapOpen(open: boolean) {
  mapOpen = open;
  mapBtn.textContent = mapOpen ? "Close" : "Map";
}

function showFloorMessage(message: string) {
  floorMessage = message;
  floorMessageUntil = performance.now() + FLOOR_MESSAGE_MS;
}

function applyRoomState(room: Room) {
  coin.x = room.coin.x;
  coin.y = room.coin.y;
  snake.segments = room.snake.segments.map((segment) => ({ ...segment }));
  snake.size = room.snake.size;
  snake.speed = room.snake.speed;
  snakeDeadUntil = 0;
  weapon.activeUntil = 0;
  weapon.lastAttackAt = 0;
}

function roomKey(depth: number, roomId: string) {
  return `${depth}:${roomId}`;
}

function markRoomVisited(depth = currentDepth, roomId = currentRoomId) {
  visitedRooms.add(roomKey(depth, roomId));
}

function isRoomVisited(depth: number, roomId: string) {
  return visitedRooms.has(roomKey(depth, roomId));
}

function hasUsableSword() {
  return hasSword && swordDurability > 0;
}

function consumeSwordDurability(amount: number) {
  swordDurability = Math.max(0, swordDurability - amount);

  if (swordDurability <= 0) {
    hasSword = false;
    showFloorMessage("Your sword broke!");
  }
}

function loadRoom(roomId: string) {
  currentRoomId = roomId;
  markRoomVisited();
  applyRoomState(getCurrentRoom());
}

function getExploredDepths() {
  return [...floors.keys()]
    .filter((depth) =>
      Object.values(floors.get(depth)!.rooms).some((room) => isRoomVisited(depth, room.id)),
    )
    .sort((a, b) => a - b);
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

function spawnAtTile(tile: { x: number; y: number }, below: boolean) {
  player.x = tile.x + STAIRS_TILE_SIZE / 2 - player.size / 2;
  player.y = below ? tile.y + STAIRS_TILE_SIZE + 10 : tile.y - player.size - 10;
  player.x = Math.max(8, Math.min(PLAY_WIDTH - player.size - 8, player.x));
  player.y = Math.max(8, Math.min(PLAY_HEIGHT - player.size - 8, player.y));
}

function descendFloor() {
  currentDepth += 1;
  deepestDepth = Math.max(deepestDepth, currentDepth);
  ensureFloor(currentDepth);

  score += DESCEND_BONUS;
  loadRoom(getCurrentFloor().startRoomId);

  const startRoom = getCurrentRoom();

  if (startRoom.stairsUpTile) {
    spawnAtTile(startRoom.stairsUpTile, true);
  } else {
    spawnFromDirection("north");
  }

  stairsCooldownUntil = performance.now() + STAIRS_COOLDOWN_MS;
  showFloorMessage(`Descended to Depth ${currentDepth}`);
}

function ascendFloor() {
  if (currentDepth <= 1) {
    return;
  }

  currentDepth -= 1;
  loadRoom(getCurrentFloor().stairsDownRoomId);

  const room = getCurrentRoom();

  if (room.stairsDownTile) {
    spawnAtTile(room.stairsDownTile, false);
  } else {
    spawnFromDirection("south");
  }

  stairsCooldownUntil = performance.now() + STAIRS_COOLDOWN_MS;
  showFloorMessage(`Ascended to Depth ${currentDepth}`);
}

function resetGame() {
  score = 0;
  hp.current = hp.max;
  invincibleUntil = 0;
  hasSword = false;
  swordDurability = 0;
  swordTutorialUntil = 0;
  floorMessageUntil = 0;
  floorMessage = "";
  stairsCooldownUntil = 0;
  visitedRooms.clear();
  setMapOpen(false);
  playerFacing = "east";
  player.x = 100;
  player.y = 100;
  currentDepth = 1;
  deepestDepth = 1;
  runSeed = (Math.random() * 2 ** 31) >>> 0;
  floors.clear();
  ensureFloor(1);
  loadRoom(getCurrentFloor().startRoomId);
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
  if (!hasUsableSword()) {
    return;
  }

  const now = performance.now();

  if (now < weapon.lastAttackAt + weapon.cooldownMs || !isSnakeAlive()) {
    return;
  }

  weapon.lastAttackAt = now;
  weapon.activeUntil = now + weapon.durationMs;
  consumeSwordDurability(1);
  checkWeaponHits();
}

function getSwordPickupPosition() {
  return getCurrentRoom().swordPickup;
}

function tryPickupSword() {
  if (hasSword) {
    return;
  }

  const pickup = getSwordPickupPosition();

  if (!pickup) {
    return;
  }

  if (
    boxesOverlap(
      { x: player.x, y: player.y, w: player.size, h: player.size },
      { x: pickup.x, y: pickup.y, w: SWORD_PICKUP_SIZE, h: SWORD_PICKUP_SIZE },
    )
  ) {
    hasSword = true;
    swordDurability = SWORD_MAX_DURABILITY;
    swordTutorialUntil = performance.now() + SWORD_TUTORIAL_MS;
  }
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
  setMapOpen(false);

  gameOverEl.classList.add("hidden");
  gameWrap.classList.add("hidden");
  menuEl.classList.remove("hidden");
}

function startGame() {
  state = "playing";
  resetGame();

  gameOverEl.classList.add("hidden");
  menuEl.classList.add("hidden");
  gameWrap.classList.remove("hidden");
  gameLoop();
}

function endGame() {
  state = "gameover";
  keys.clear();
  setMapOpen(false);
  finalScoreEl.textContent = String(score);
  finalDepthEl.textContent = String(deepestDepth);

  gameWrap.classList.add("hidden");
  gameOverEl.classList.remove("hidden");
}

function tryUseStairs() {
  if (performance.now() < stairsCooldownUntil) {
    return;
  }

  const room = getCurrentRoom();
  const playerBox = { x: player.x, y: player.y, w: player.size, h: player.size };

  if (room.stairsDownTile) {
    const tile = room.stairsDownTile;

    if (
      boxesOverlap(playerBox, {
        x: tile.x,
        y: tile.y,
        w: STAIRS_TILE_SIZE,
        h: STAIRS_TILE_SIZE,
      })
    ) {
      descendFloor();
      return;
    }
  }

  if (room.stairsUpTile) {
    const tile = room.stairsUpTile;

    if (
      boxesOverlap(playerBox, {
        x: tile.x,
        y: tile.y,
        w: STAIRS_TILE_SIZE,
        h: STAIRS_TILE_SIZE,
      })
    ) {
      ascendFloor();
    }
  }
}

function getDoorHitbox(direction: Direction, room: Room) {
  if (!room.exits[direction]) {
    return null;
  }

  const centerX = PLAY_WIDTH / 2 - DOOR_LENGTH / 2;
  const centerY = PLAY_HEIGHT / 2 - DOOR_LENGTH / 2;

  switch (direction) {
    case "north":
      return { x: centerX, y: 0, w: DOOR_LENGTH, h: DOOR_HIT_DEPTH };
    case "south":
      return {
        x: centerX,
        y: PLAY_HEIGHT - DOOR_HIT_DEPTH,
        w: DOOR_LENGTH,
        h: DOOR_HIT_DEPTH,
      };
    case "west":
      return { x: 0, y: centerY, w: DOOR_HIT_DEPTH, h: DOOR_LENGTH };
    case "east":
      return {
        x: PLAY_WIDTH - DOOR_HIT_DEPTH,
        y: centerY,
        w: DOOR_HIT_DEPTH,
        h: DOOR_LENGTH,
      };
  }
}

function tryChangeRoom() {
  const room = getCurrentRoom();
  const playerBox = { x: player.x, y: player.y, w: player.size, h: player.size };

  const attempts: { direction: Direction; moveKeys: string[]; enteredFrom: Direction }[] = [
    { direction: "west", moveKeys: ["a", "arrowleft"], enteredFrom: "east" },
    { direction: "east", moveKeys: ["d", "arrowright"], enteredFrom: "west" },
    { direction: "north", moveKeys: ["w", "arrowup"], enteredFrom: "south" },
    { direction: "south", moveKeys: ["s", "arrowdown"], enteredFrom: "north" },
  ];

  for (const attempt of attempts) {
    const exitId = room.exits[attempt.direction];

    if (!exitId) {
      continue;
    }

    const hitbox = getDoorHitbox(attempt.direction, room);

    if (!hitbox) {
      continue;
    }

    const isMovingOut = attempt.moveKeys.some((key) => keys.has(key));

    if (!isMovingOut || !boxesOverlap(playerBox, hitbox)) {
      continue;
    }

    changeRoom(exitId, attempt.enteredFrom);
    return;
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
  tryUseStairs();

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
  if (mapOpen) {
    return;
  }

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

  tryPickupSword();
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
  ctx.fillText(`Depth ${currentDepth}`, canvas.width - 20, 30);

  ctx.textAlign = "left";
  ctx.fillStyle = "#999";
  ctx.font = "14px Arial";
  ctx.fillText(room.name, 20, 48);

  ctx.fillStyle = "white";
  ctx.font = "16px Arial";
  ctx.fillText("HP", 280, 58);
  drawHpBar(308, 44, 140, 18);

  ctx.font = "14px Arial";
  ctx.textAlign = "right";

  if (hasUsableSword()) {
    const cooldownReady = performance.now() >= weapon.lastAttackAt + weapon.cooldownMs;
    ctx.fillStyle = cooldownReady ? "#ff8844" : "#555";
    ctx.fillText(
      cooldownReady ? `Sword ${swordDurability}/${SWORD_MAX_DURABILITY}` : "Sword cooling...",
      canvas.width - 20,
      58,
    );
    drawDurabilityBar(canvas.width - 148, 62, 128, 8);
  } else {
    ctx.fillStyle = "#666";
    ctx.fillText("No weapon equipped", canvas.width - 20, 58);
  }

  ctx.textAlign = "left";
}

function drawDurabilityBar(x: number, y: number, width: number, height: number) {
  const fillRatio = swordDurability / SWORD_MAX_DURABILITY;

  ctx.fillStyle = "#333";
  ctx.fillRect(x, y, width, height);

  if (fillRatio > 0.5) {
    ctx.fillStyle = "#ff8844";
  } else if (fillRatio > 0.25) {
    ctx.fillStyle = "#ffaa00";
  } else {
    ctx.fillStyle = "#ff4444";
  }

  ctx.fillRect(x, y, width * fillRatio, height);

  ctx.strokeStyle = "#888";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);
}

function getRoomMapCenter(
  room: Room,
  minGridX: number,
  minGridY: number,
  cellSize: number,
  originX: number,
  originY: number,
) {
  return {
    x: originX + (room.gridX - minGridX) * cellSize + cellSize / 2,
    y: originY + (room.gridY - minGridY) * cellSize + cellSize / 2,
  };
}

function drawMapOverlay() {
  const floor = getCurrentFloor();
  const visitedOnFloor = Object.values(floor.rooms).filter((room) =>
    isRoomVisited(currentDepth, room.id),
  );

  if (visitedOnFloor.length === 0) {
    return;
  }

  let minGridX = Infinity;
  let maxGridX = -Infinity;
  let minGridY = Infinity;
  let maxGridY = -Infinity;

  for (const room of visitedOnFloor) {
    minGridX = Math.min(minGridX, room.gridX);
    maxGridX = Math.max(maxGridX, room.gridX);
    minGridY = Math.min(minGridY, room.gridY);
    maxGridY = Math.max(maxGridY, room.gridY);
  }

  const gridWidth = maxGridX - minGridX + 1;
  const gridHeight = maxGridY - minGridY + 1;
  const cellSize = Math.min(58, 360 / Math.max(gridWidth, gridHeight));
  const mapWidth = gridWidth * cellSize;
  const mapHeight = gridHeight * cellSize;
  const originX = (PLAY_WIDTH - mapWidth) / 2;
  const originY = HUD_HEIGHT + (PLAY_HEIGHT - mapHeight) / 2 - 24;

  ctx.fillStyle = "rgba(0, 0, 0, 0.82)";
  ctx.fillRect(0, HUD_HEIGHT, PLAY_WIDTH, PLAY_HEIGHT);

  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(originX - 20, originY - 52, mapWidth + 40, mapHeight + 88);
  ctx.strokeStyle = "#666";
  ctx.lineWidth = 2;
  ctx.strokeRect(originX - 20, originY - 52, mapWidth + 40, mapHeight + 88);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`Map — Depth ${currentDepth}`, PLAY_WIDTH / 2, originY - 28);

  ctx.font = "13px Arial";
  ctx.fillStyle = "#aaa";
  ctx.fillText("Only rooms you have explored are shown", PLAY_WIDTH / 2, originY - 10);

  ctx.strokeStyle = "#555";
  ctx.lineWidth = 2;

  for (const room of visitedOnFloor) {
    for (const [direction, neighborId] of Object.entries(room.exits)) {
      if (!neighborId || direction === "south" || direction === "east") {
        continue;
      }

      if (!isRoomVisited(currentDepth, neighborId)) {
        continue;
      }

      const neighbor = floor.rooms[neighborId];

      if (!neighbor) {
        continue;
      }

      const from = getRoomMapCenter(room, minGridX, minGridY, cellSize, originX, originY);
      const to = getRoomMapCenter(neighbor, minGridX, minGridY, cellSize, originX, originY);

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }
  }

  for (const room of visitedOnFloor) {
    const x = originX + (room.gridX - minGridX) * cellSize;
    const y = originY + (room.gridY - minGridY) * cellSize;
    const isCurrent = room.id === currentRoomId;
    const isStart = room.id === floor.startRoomId;
    const isStairsDown = room.id === floor.stairsDownRoomId;

    if (isStairsDown) {
      ctx.fillStyle = "rgba(180, 90, 255, 0.55)";
    } else if (isStart) {
      ctx.fillStyle = "rgba(80, 180, 100, 0.45)";
    } else {
      ctx.fillStyle = "#2a2a2a";
    }

    ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);

    ctx.strokeStyle = isCurrent ? "#00ffff" : "#888";
    ctx.lineWidth = isCurrent ? 3 : 1;
    ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);

    if (room.stairsDownTile) {
      ctx.fillStyle = "#e0b0ff";
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "center";
      ctx.fillText("▼", x + cellSize / 2, y + cellSize / 2 + 4);
    }

    if (room.stairsUpTile) {
      ctx.fillStyle = "#b0e0ff";
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "center";
      ctx.fillText("▲", x + cellSize / 2, y + cellSize / 2 + 4);
    }

    if (isCurrent) {
      ctx.fillStyle = "#00ffff";
      ctx.beginPath();
      ctx.arc(x + cellSize / 2, y + cellSize / 2, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const exploredDepths = getExploredDepths();
  const depthListX = originX + mapWidth + 28;
  let depthListY = originY;

  ctx.textAlign = "left";
  ctx.fillStyle = "#ccc";
  ctx.font = "bold 13px Arial";
  ctx.fillText("Floors", depthListX, depthListY);
  depthListY += 18;

  ctx.font = "12px Arial";

  for (const depth of exploredDepths) {
    const isCurrentDepth = depth === currentDepth;

    ctx.fillStyle = isCurrentDepth ? "#00ffff" : "#888";
    ctx.fillText(isCurrentDepth ? `▸ Depth ${depth}` : `  Depth ${depth}`, depthListX, depthListY);
    depthListY += 16;
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#888";
  ctx.font = "13px Arial";
  ctx.fillText("Press M or Map to close", PLAY_WIDTH / 2, originY + mapHeight + 24);
  ctx.textAlign = "left";
}

function drawDoors(room: Room) {
  const centerX = PLAY_WIDTH / 2 - DOOR_LENGTH / 2;
  const centerY = HUD_HEIGHT + PLAY_HEIGHT / 2 - DOOR_LENGTH / 2;

  ctx.fillStyle = "rgba(255, 215, 0, 0.45)";

  if (room.exits.north) {
    ctx.fillRect(centerX, HUD_HEIGHT, DOOR_LENGTH, DOOR_THICKNESS);
  }

  if (room.exits.south) {
    ctx.fillRect(
      centerX,
      HUD_HEIGHT + PLAY_HEIGHT - DOOR_THICKNESS,
      DOOR_LENGTH,
      DOOR_THICKNESS,
    );
  }

  if (room.exits.west) {
    ctx.fillRect(0, centerY, DOOR_THICKNESS, DOOR_LENGTH);
  }

  if (room.exits.east) {
    ctx.fillRect(PLAY_WIDTH - DOOR_THICKNESS, centerY, DOOR_THICKNESS, DOOR_LENGTH);
  }
}

function drawStairsTiles(room: Room) {
  if (room.stairsDownTile) {
    const tile = room.stairsDownTile;
    const screenY = tile.y + HUD_HEIGHT;

    ctx.fillStyle = "rgba(180, 90, 255, 0.55)";
    ctx.fillRect(tile.x, screenY, STAIRS_TILE_SIZE, STAIRS_TILE_SIZE);
    ctx.strokeStyle = "#e0b0ff";
    ctx.lineWidth = 2;
    ctx.strokeRect(tile.x, screenY, STAIRS_TILE_SIZE, STAIRS_TILE_SIZE);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.fillText("▼", tile.x + STAIRS_TILE_SIZE / 2, screenY + STAIRS_TILE_SIZE / 2 + 5);
    ctx.font = "11px Arial";
    ctx.fillText("Down", tile.x + STAIRS_TILE_SIZE / 2, screenY + STAIRS_TILE_SIZE + 14);
    ctx.textAlign = "left";
  }

  if (room.stairsUpTile) {
    const tile = room.stairsUpTile;
    const screenY = tile.y + HUD_HEIGHT;

    ctx.fillStyle = "rgba(120, 200, 255, 0.55)";
    ctx.fillRect(tile.x, screenY, STAIRS_TILE_SIZE, STAIRS_TILE_SIZE);
    ctx.strokeStyle = "#b0e0ff";
    ctx.lineWidth = 2;
    ctx.strokeRect(tile.x, screenY, STAIRS_TILE_SIZE, STAIRS_TILE_SIZE);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.fillText("▲", tile.x + STAIRS_TILE_SIZE / 2, screenY + STAIRS_TILE_SIZE / 2 + 5);
    ctx.font = "11px Arial";
    ctx.fillText("Up", tile.x + STAIRS_TILE_SIZE / 2, screenY + STAIRS_TILE_SIZE + 14);
    ctx.textAlign = "left";
  }
}

function drawFacingIndicator(screenX: number, screenY: number) {
  const nubSize = 10;
  const offset = 2;

  ctx.fillStyle = "#ffffff";

  switch (playerFacing) {
    case "east":
      ctx.fillRect(
        screenX + player.size + offset,
        screenY + player.size / 2 - nubSize / 2,
        nubSize,
        nubSize,
      );
      break;
    case "west":
      ctx.fillRect(
        screenX - offset - nubSize,
        screenY + player.size / 2 - nubSize / 2,
        nubSize,
        nubSize,
      );
      break;
    case "north":
      ctx.fillRect(
        screenX + player.size / 2 - nubSize / 2,
        screenY - offset - nubSize,
        nubSize,
        nubSize,
      );
      break;
    case "south":
      ctx.fillRect(
        screenX + player.size / 2 - nubSize / 2,
        screenY + player.size + offset,
        nubSize,
        nubSize,
      );
      break;
  }
}

function drawSwordPickup() {
  const pickup = getSwordPickupPosition();

  if (!pickup || hasSword) {
    return;
  }

  const screenX = pickup.x;
  const screenY = pickup.y + HUD_HEIGHT;
  const pulse = Math.sin(performance.now() / 200) * 3;

  ctx.fillStyle = "rgba(255, 136, 68, 0.25)";
  ctx.fillRect(screenX - 6, screenY - 6 + pulse, SWORD_PICKUP_SIZE + 12, SWORD_PICKUP_SIZE + 12);

  ctx.fillStyle = "#d0d0d0";
  ctx.fillRect(screenX + 10, screenY + 2 + pulse, 8, 20);
  ctx.fillStyle = "#8b4513";
  ctx.fillRect(screenX + 6, screenY + 18 + pulse, 16, 6);

  ctx.fillStyle = "#ff8844";
  ctx.font = "13px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Sword — walk over to pick up", screenX + SWORD_PICKUP_SIZE / 2, screenY - 8 + pulse);
  ctx.textAlign = "left";
}

function drawSwordTutorial() {
  if (!hasSword || performance.now() >= swordTutorialUntil) {
    return;
  }

  const bannerX = 60;
  const bannerY = HUD_HEIGHT + 16;
  const bannerWidth = PLAY_WIDTH - 120;
  const bannerHeight = 64;

  ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
  ctx.fillRect(bannerX, bannerY, bannerWidth, bannerHeight);

  ctx.strokeStyle = "#ff8844";
  ctx.lineWidth = 2;
  ctx.strokeRect(bannerX, bannerY, bannerWidth, bannerHeight);

  ctx.fillStyle = "#ff8844";
  ctx.font = "bold 20px Arial";
  ctx.textAlign = "center";
  ctx.fillText("You found a sword!", PLAY_WIDTH / 2, bannerY + 26);

  ctx.fillStyle = "#ffffff";
  ctx.font = "16px Arial";
  ctx.fillText(
    "Press SPACE to swing. Each swing uses durability.",
    PLAY_WIDTH / 2,
    bannerY + 50,
  );
  ctx.textAlign = "left";
}

function drawFloorMessage() {
  if (performance.now() >= floorMessageUntil) {
    return;
  }

  const bannerX = 140;
  const bannerY = HUD_HEIGHT + PLAY_HEIGHT / 2 - 24;
  const bannerWidth = PLAY_WIDTH - 280;
  const bannerHeight = 48;

  ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
  ctx.fillRect(bannerX, bannerY, bannerWidth, bannerHeight);

  ctx.strokeStyle = "#b45cff";
  ctx.lineWidth = 2;
  ctx.strokeRect(bannerX, bannerY, bannerWidth, bannerHeight);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px Arial";
  ctx.textAlign = "center";
  ctx.fillText(floorMessage, PLAY_WIDTH / 2, bannerY + 30);
  ctx.textAlign = "left";
}

function drawEquippedSwordIcon(screenX: number, screenY: number) {
  if (!hasUsableSword()) {
    return;
  }

  const iconX = screenX + player.size - 10;
  const iconY = screenY + 4;

  ctx.fillStyle = "#d0d0d0";
  ctx.fillRect(iconX, iconY, 4, 12);
  ctx.fillStyle = "#8b4513";
  ctx.fillRect(iconX - 2, iconY + 10, 8, 3);
}

function drawWeaponSwing() {
  if (!hasUsableSword()) {
    return;
  }

  const now = performance.now();

  if (now >= weapon.activeUntil) {
    return;
  }

  const hitbox = getSwingHitbox();

  ctx.fillStyle = "rgba(255, 120, 40, 0.8)";
  ctx.fillRect(hitbox.x, hitbox.y + HUD_HEIGHT, hitbox.w, hitbox.h);

  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.strokeRect(hitbox.x, hitbox.y + HUD_HEIGHT, hitbox.w, hitbox.h);
}

function draw() {
  const room = getCurrentRoom();

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = room.background;
  ctx.fillRect(0, HUD_HEIGHT, PLAY_WIDTH, PLAY_HEIGHT);

  drawDoors(room);
  drawStairsTiles(room);
  drawSwordPickup();
  drawHud();

  const playerScreenX = player.x;
  const playerScreenY = player.y + HUD_HEIGHT;
  const invincible = isPlayerInvincible();
  const showPlayer = !invincible || Math.floor(performance.now() / 100) % 2 === 0;

  if (showPlayer) {
    ctx.fillStyle = invincible ? "#ff6666" : "cyan";
    ctx.fillRect(playerScreenX, playerScreenY, player.size, player.size);
    drawFacingIndicator(playerScreenX, playerScreenY);
    drawEquippedSwordIcon(playerScreenX, playerScreenY);
  }

  drawWeaponSwing();
  drawSwordTutorial();
  drawFloorMessage();

  ctx.fillStyle = "gold";
  ctx.fillRect(coin.x, coin.y + HUD_HEIGHT, coin.size, coin.size);

  if (isSnakeAlive()) {
    ctx.fillStyle = "lime";

    for (const segment of snake.segments) {
      ctx.fillRect(segment.x, segment.y + HUD_HEIGHT, snake.size, snake.size);
    }
  } else if (performance.now() < snakeDeadUntil) {
    ctx.fillStyle = "white";
    ctx.font = "18px Arial";
    ctx.textAlign = "center";
    const secondsLeft = Math.ceil((snakeDeadUntil - performance.now()) / 1000);
    ctx.fillText(
      `Snake respawns in ${secondsLeft}s`,
      PLAY_WIDTH / 2,
      HUD_HEIGHT + PLAY_HEIGHT / 2,
    );
    ctx.textAlign = "left";
  }

  if (mapOpen) {
    drawMapOverlay();
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
mapBtn.addEventListener("click", toggleMap);
