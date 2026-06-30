import "./style.css";
import { SPRITES, drawSprite, drawSpriteCentered, drawTintedSprite, getWeaponSprite } from "./sprites";
import {
  findLayoutPosition,
  layoutToObstacles,
  pickRoomLayout,
  ROOM_LAYOUTS,
} from "./roomLayouts";

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
    <div class="menu-scene" aria-hidden="true">
      <div class="menu-glow menu-glow-left"></div>
      <div class="menu-glow menu-glow-right"></div>
      <div class="menu-vignette"></div>
    </div>
    <div class="menu-content">
      <p class="menu-eyebrow">Pixel dungeon descent</p>
      <h1 class="menu-title">
        <span class="menu-title-line">Cavern</span>
        <span class="menu-title-line menu-title-accent">Crawler</span>
      </h1>
      <p class="menu-tagline">Loot chests · Slay mobs · Delve deeper</p>
      <canvas id="menu-art" class="menu-art" width="360" height="128" aria-hidden="true"></canvas>
      <div class="menu-actions">
        <button id="play-btn" class="menu-btn menu-btn-primary" type="button">Enter the Cavern</button>
        <button id="help-btn" class="menu-btn menu-btn-secondary" type="button">Controls</button>
      </div>
    </div>
    <div id="menu-help" class="menu-help hidden">
      <h2 class="menu-help-title">Controls</h2>
      <dl class="menu-help-list">
        <div><dt>Move</dt><dd><kbd>WASD</kbd> or <kbd>Arrow keys</kbd></dd></div>
        <div><dt>Attack</dt><dd><kbd>Space</kbd></dd></div>
        <div><dt>Map</dt><dd><kbd>M</kbd></dd></div>
        <div><dt>Inventory</dt><dd><kbd>I</kbd> · drag items to rearrange</dd></div>
        <div><dt>Potions</dt><dd><kbd>1</kbd> health · <kbd>2</kbd> strong</dd></div>
        <div><dt>Weapons</dt><dd><kbd>3</kbd>–<kbd>8</kbd> select active slot</dd></div>
      </dl>
      <button id="help-close-btn" class="menu-btn menu-btn-secondary" type="button">Back</button>
    </div>
  </div>
  <div id="game-wrap" class="game-wrap hidden">
    <header id="game-hud" class="game-hud">
      <div class="hud-group hud-stats">
        <span class="hud-label">Score</span>
        <strong id="hud-score" class="hud-value">0</strong>
        <span class="hud-divider" aria-hidden="true"></span>
        <span class="hud-label">Depth</span>
        <strong id="hud-depth" class="hud-value">1</strong>
      </div>
      <div class="hud-group hud-room-wrap">
        <span id="hud-room" class="hud-room">Depth 1</span>
        <span id="hud-items" class="hud-items">0/6 items</span>
      </div>
      <div class="hud-group hud-bars">
        <div class="hud-hp">
          <span class="hud-label">HP</span>
          <div class="hud-bar hp-bar" aria-hidden="true">
            <div id="hud-hp-fill" class="hud-bar-fill hp-fill"></div>
          </div>
          <span id="hud-hp-text" class="hud-bar-text">100</span>
        </div>
        <div class="hud-weapon">
          <span id="hud-weapon-name" class="hud-weapon-name">Rusty Sword</span>
          <div class="hud-bar dur-bar" aria-hidden="true">
            <div id="hud-dur-fill" class="hud-bar-fill dur-fill"></div>
          </div>
        </div>
      </div>
      <div class="hud-group hud-actions">
        <button id="map-btn" type="button" class="hud-btn">Map</button>
        <button id="inv-btn" type="button" class="hud-btn hud-btn-accent">Inv</button>
      </div>
    </header>
    <canvas id="game" width="800" height="444"></canvas>
    <p class="game-hint">WASD move · Space attack · 1/2 potions · 3–8 weapon slots · drag items in inventory · M map · I inventory</p>
  </div>
  <div id="game-over" class="menu menu-game-over hidden">
    <div class="menu-scene" aria-hidden="true">
      <div class="menu-glow menu-glow-left"></div>
      <div class="menu-glow menu-glow-danger"></div>
      <div class="menu-vignette"></div>
    </div>
    <div class="menu-content">
      <p class="menu-eyebrow menu-eyebrow-danger">Cavern Crawler</p>
      <h1 class="game-over-title">Game Over</h1>
      <p class="game-over-message">The depths claimed another crawler.</p>
      <p class="game-over-score">Depth <span id="final-depth">1</span> · Score <span id="final-score">0</span></p>
      <button id="menu-btn" class="menu-btn menu-btn-secondary" type="button">Return to Surface</button>
    </div>
  </div>
`;

const menuEl = required(document.querySelector<HTMLDivElement>("#menu"), "Menu");
const menuHelpEl = required(document.querySelector<HTMLDivElement>("#menu-help"), "Menu help");
const playBtn = required(
  document.querySelector<HTMLButtonElement>("#play-btn"),
  "Play button",
);
const helpBtn = required(document.querySelector<HTMLButtonElement>("#help-btn"), "Help button");
const helpCloseBtn = required(
  document.querySelector<HTMLButtonElement>("#help-close-btn"),
  "Help close button",
);
const canvas = required(document.querySelector<HTMLCanvasElement>("#game"), "Canvas");
const ctx = required(canvas.getContext("2d"), "Canvas context");
const gameWrap = required(document.querySelector<HTMLDivElement>("#game-wrap"), "Game wrap");
const mapBtn = required(document.querySelector<HTMLButtonElement>("#map-btn"), "Map button");
const invBtn = required(document.querySelector<HTMLButtonElement>("#inv-btn"), "Inventory button");
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
const hudScoreEl = required(document.querySelector<HTMLElement>("#hud-score"), "HUD score");
const hudDepthEl = required(document.querySelector<HTMLElement>("#hud-depth"), "HUD depth");
const hudRoomEl = required(document.querySelector<HTMLElement>("#hud-room"), "HUD room");
const hudItemsEl = required(document.querySelector<HTMLElement>("#hud-items"), "HUD items");
const hudHpFillEl = required(document.querySelector<HTMLElement>("#hud-hp-fill"), "HUD HP fill");
const hudHpTextEl = required(document.querySelector<HTMLElement>("#hud-hp-text"), "HUD HP text");
const hudWeaponNameEl = required(
  document.querySelector<HTMLElement>("#hud-weapon-name"),
  "HUD weapon name",
);
const hudDurFillEl = required(document.querySelector<HTMLElement>("#hud-dur-fill"), "HUD durability fill");

type GameState = "menu" | "playing" | "gameover";
type Direction = "north" | "south" | "east" | "west";
type MobType = "snake" | "slime" | "wraith" | "brute";
type WeaponId = "rusty-sword" | "iron-sword" | "war-axe" | "dagger";
type InventoryItemType = "health-potion" | "strong-potion" | "weapon";

interface WeaponDef {
  damage: number;
  knockback: number;
  range: number;
  width: number;
  cooldownMs: number;
  durationMs: number;
  maxDurability: number;
  name: string;
  swingColor: string;
  swingArcScale: number;
  swingSpriteSize: number;
}

interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: "wall" | "rock" | "pillar";
}

interface MobConfig {
  type: MobType;
  segments: { x: number; y: number }[];
  size: number;
  speed: number;
  maxHp: number;
  contactDamage: number;
  currentHp?: number;
}

interface RuntimeMob {
  configIndex: number;
  type: MobType;
  segments: { x: number; y: number }[];
  size: number;
  speed: number;
  hp: number;
  maxHp: number;
  contactDamage: number;
  hitFlashUntil: number;
}

type ChestLoot =
  | { kind: "weapon"; weaponId: WeaponId }
  | { kind: "health-potion"; healAmount: number }
  | { kind: "strong-potion"; healAmount: number };

interface Chest {
  x: number;
  y: number;
  opened: boolean;
  loot: ChestLoot;
}

interface InventoryItem {
  type: InventoryItemType;
  healAmount?: number;
  weaponId?: WeaponId;
  weaponDurability?: number;
}

interface Room {
  id: string;
  name: string;
  background: string;
  gridX: number;
  gridY: number;
  exits: Partial<Record<Direction, string>>;
  coin: { x: number; y: number };
  enemies: MobConfig[];
  weaponPickup?: { x: number; y: number; weaponId: WeaponId };
  potionPickup?: { x: number; y: number };
  potionHeal?: number;
  potionCollected?: boolean;
  chest?: Chest;
  stairsDownTile?: { x: number; y: number };
  stairsUpTile?: { x: number; y: number };
  obstacles: Obstacle[];
}

interface Floor {
  depth: number;
  rooms: Record<string, Room>;
  startRoomId: string;
  stairsDownRoomId: string;
}

const WEAPONS: Record<WeaponId, WeaponDef> = {
  "rusty-sword": {
    damage: 1,
    knockback: 18,
    range: 44,
    width: 38,
    cooldownMs: 480,
    durationMs: 160,
    maxDurability: 25,
    name: "Rusty Sword",
    swingColor: "rgba(255, 120, 40, 0.85)",
    swingArcScale: 1,
    swingSpriteSize: 38,
  },
  "iron-sword": {
    damage: 2,
    knockback: 22,
    range: 48,
    width: 40,
    cooldownMs: 420,
    durationMs: 150,
    maxDurability: 40,
    name: "Iron Sword",
    swingColor: "rgba(180, 200, 230, 0.9)",
    swingArcScale: 1.05,
    swingSpriteSize: 42,
  },
  "war-axe": {
    damage: 3,
    knockback: 28,
    range: 40,
    width: 44,
    cooldownMs: 560,
    durationMs: 200,
    maxDurability: 35,
    name: "War Axe",
    swingColor: "rgba(255, 80, 20, 0.9)",
    swingArcScale: 1.25,
    swingSpriteSize: 46,
  },
  dagger: {
    damage: 1,
    knockback: 10,
    range: 36,
    width: 28,
    cooldownMs: 280,
    durationMs: 120,
    maxDurability: 50,
    name: "Dagger",
    swingColor: "rgba(210, 225, 255, 0.8)",
    swingArcScale: 0.72,
    swingSpriteSize: 30,
  },
};

const MOB_COLORS: Record<MobType, { normal: string; hit: string }> = {
  snake: { normal: "lime", hit: "#88ff88" },
  slime: { normal: "#20b2aa", hit: "#66dddd" },
  wraith: { normal: "#9932cc", hit: "#cc66ff" },
  brute: { normal: "#ff8800", hit: "#ffaa44" },
};

const PLAY_WIDTH = canvas.width;
const PLAY_HEIGHT = canvas.height;

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
  size: 42,
  speed: 4,
};

const coin = {
  x: 300,
  y: 200,
  size: 28,
};

const activeMobs: RuntimeMob[] = [];

let playerFacing: Direction = "east";

let activeWeaponSlot: number | null = null;

const weaponSwing = {
  activeUntil: 0,
  lastAttackAt: 0,
  lastDamagedSwing: 0,
  swingColor: "",
  durationMs: 0,
  range: 0,
  weaponId: null as WeaponId | null,
  swingArcScale: 1,
  swingSpriteSize: 38,
};


const WEAPON_PICKUP_SIZE = 48;
const STAIRS_TILE_SIZE = 56;
const SWORD_START_POSITION = { x: 200, y: 115 };
const FLOOR_MESSAGE_MS = 2500;
const DESCEND_BONUS = 15;

let floorMessageUntil = 0;
let floorMessage = "";
let stairsCooldownUntil = 0;
const STAIRS_COOLDOWN_MS = 900;

const DOOR_THICKNESS = 10;
const DOOR_LENGTH = 60;
const DOOR_HIT_DEPTH = 24;

const POTION_PICKUP_SIZE = 34;
const CHEST_SIZE = 44;
const MAX_INVENTORY_SIZE = 6;

const INVENTORY_UI = {
  panelX: 120,
  panelY: 48,
  panelWidth: 560,
  panelHeight: 340,
  slotSize: 72,
  slotGap: 12,
  gridX: 148,
  gridY: 136,
  cols: 3,
};

let mapOpen = false;
let inventoryOpen = false;
const inventory: (InventoryItem | null)[] = Array.from({ length: MAX_INVENTORY_SIZE }, () => null);

const inventoryDrag = {
  fromSlot: -1,
  item: null as InventoryItem | null,
  x: 0,
  y: 0,
  pointerDown: false,
  dragging: false,
  startX: 0,
  startY: 0,
};

const INVENTORY_DRAG_THRESHOLD = 6;

let state: GameState = "menu";
let score = 0;

const hp = {
  max: 100,
  current: 100,
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

  if (key === "i" && state === "playing") {
    event.preventDefault();
    toggleInventory();
  }

  if (key === "1" && state === "playing") {
    event.preventDefault();
    useHealthPotion();
  }

  if (key === "2" && state === "playing") {
    event.preventDefault();
    useStrongPotion();
  }

  if (key === "3" && state === "playing") {
    event.preventDefault();
    selectWeaponSlot(0);
  }

  if (key === "4" && state === "playing") {
    event.preventDefault();
    selectWeaponSlot(1);
  }

  if (key === "5" && state === "playing") {
    event.preventDefault();
    selectWeaponSlot(2);
  }

  if (key === "6" && state === "playing") {
    event.preventDefault();
    selectWeaponSlot(3);
  }

  if (key === "7" && state === "playing") {
    event.preventDefault();
    selectWeaponSlot(4);
  }

  if (key === "8" && state === "playing") {
    event.preventDefault();
    selectWeaponSlot(5);
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

function findClearPosition(
  rng: () => number,
  size: number,
  occupied: { x: number; y: number; w: number; h: number }[],
  margin = 72,
) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const pos = randomPosition(rng, margin);
    const candidate = { x: pos.x, y: pos.y, w: size, h: size };
    const overlaps = occupied.some((box) => boxesOverlap(candidate, box, 16));

    if (!overlaps) {
      return pos;
    }
  }

  return randomPosition(rng, margin);
}

function getDoorClearZones() {
  const centerX = PLAY_WIDTH / 2 - DOOR_LENGTH / 2;
  const centerY = PLAY_HEIGHT / 2 - DOOR_LENGTH / 2;
  const pad = 36;

  return [
    { x: centerX - pad, y: 0, w: DOOR_LENGTH + pad * 2, h: DOOR_HIT_DEPTH + pad },
    {
      x: centerX - pad,
      y: PLAY_HEIGHT - DOOR_HIT_DEPTH - pad,
      w: DOOR_LENGTH + pad * 2,
      h: DOOR_HIT_DEPTH + pad,
    },
    { x: 0, y: centerY - pad, w: DOOR_HIT_DEPTH + pad, h: DOOR_LENGTH + pad * 2 },
    {
      x: PLAY_WIDTH - DOOR_HIT_DEPTH - pad,
      y: centerY - pad,
      w: DOOR_HIT_DEPTH + pad,
      h: DOOR_LENGTH + pad * 2,
    },
  ];
}

function rollRoomLoot(rng: () => number) {
  const roll = rng();

  if (roll < 0.14) {
    return "chest" as const;
  }

  if (roll < 0.32) {
    return "potion" as const;
  }

  return "none" as const;
}

function getRoomObstacles(room = getCurrentRoom()) {
  return room.obstacles ?? [];
}

function collidesWithObstacles(
  box: { x: number; y: number; w: number; h: number },
  room = getCurrentRoom(),
) {
  return getRoomObstacles(room).some((obstacle) => boxesOverlap(box, obstacle));
}

function resolveObstaclePosition(
  x: number,
  y: number,
  w: number,
  h: number,
  prevX: number,
  prevY: number,
) {
  if (!collidesWithObstacles({ x, y, w, h })) {
    return { x, y };
  }

  if (!collidesWithObstacles({ x, y: prevY, w, h })) {
    return { x, y: prevY };
  }

  if (!collidesWithObstacles({ x: prevX, y, w, h })) {
    return { x: prevX, y };
  }

  return { x: prevX, y: prevY };
}

function clampMobToRoom(mob: RuntimeMob, segmentIndex: number) {
  const segment = mob.segments[segmentIndex];
  const prevX = segment.x;
  const prevY = segment.y;

  segment.x = Math.max(0, Math.min(PLAY_WIDTH - mob.size, segment.x));
  segment.y = Math.max(0, Math.min(PLAY_HEIGHT - mob.size, segment.y));

  const resolved = resolveObstaclePosition(
    segment.x,
    segment.y,
    mob.size,
    mob.size,
    prevX,
    prevY,
  );

  segment.x = resolved.x;
  segment.y = resolved.y;
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

function contactDamageForDepth(depth: number) {
  return 12 + Math.floor(depth * 3);
}

function generateMob(type: MobType, depth: number, rng: () => number): MobConfig {
  const baseContact = contactDamageForDepth(depth);
  const spawn = randomPosition(rng, 100);

  switch (type) {
    case "snake": {
      const segmentCount = Math.min(9, 2 + depth + Math.floor(rng() * 2));
      const speed = 1.2 + depth * 0.18 + rng() * 0.3;
      const maxHp = Math.floor(2 + depth * 2 + rng() * 2);
      const segments: { x: number; y: number }[] = [];

      for (let i = 0; i < segmentCount; i++) {
        segments.push({ x: spawn.x - i * 28, y: spawn.y });
      }

      return { type, segments, size: 32, speed, maxHp, contactDamage: baseContact };
    }
    case "slime":
      return {
        type,
        segments: [{ ...spawn }],
        size: 30,
        speed: 0.9 + depth * 0.12 + rng() * 0.15,
        maxHp: Math.floor(1 + depth * 1.2 + rng()),
        contactDamage: Math.floor(baseContact * 0.85),
      };
    case "wraith":
      return {
        type,
        segments: [{ ...spawn }],
        size: 28,
        speed: 2.0 + depth * 0.22 + rng() * 0.25,
        maxHp: Math.floor(1 + depth * 1.0 + rng()),
        contactDamage: Math.floor(baseContact * 0.9),
      };
    case "brute":
      return {
        type,
        segments: [{ ...spawn }],
        size: 40,
        speed: 0.85 + depth * 0.1 + rng() * 0.12,
        maxHp: Math.floor(4 + depth * 3.5 + rng() * 2),
        contactDamage: Math.floor(baseContact * 1.15),
      };
  }
}

const ALL_MOB_TYPES: MobType[] = ["snake", "slime", "wraith", "brute"];

function generateEnemies(depth: number, rng: () => number, isStartRoom: boolean) {
  if (isStartRoom && depth === 1) {
    return [];
  }

  const count = depth <= 3 ? 1 : rng() < 0.75 ? 1 : 2;
  const enemies: MobConfig[] = [];

  for (let i = 0; i < count; i++) {
    const type = ALL_MOB_TYPES[Math.floor(rng() * ALL_MOB_TYPES.length)];
    enemies.push(generateMob(type, depth, rng));
  }

  return enemies;
}

function generateChestLoot(depth: number, rng: () => number): ChestLoot {
  const roll = rng();

  if (roll < 0.35) {
    const weaponIds: WeaponId[] = ["iron-sword", "war-axe", "dagger"];
    return { kind: "weapon", weaponId: weaponIds[Math.floor(rng() * weaponIds.length)] };
  }

  if (roll < 0.7) {
    return { kind: "health-potion", healAmount: 30 + Math.floor(depth * 10 + rng() * 10) };
  }

  return { kind: "strong-potion", healAmount: 55 + Math.floor(depth * 14 + rng() * 12) };
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

    const isStartRoom = cell.id === startId;
    const occupied: { x: number; y: number; w: number; h: number }[] = [
      ...getDoorClearZones(),
    ];
    const centerStairs = {
      x: PLAY_WIDTH / 2 - STAIRS_TILE_SIZE / 2,
      y: PLAY_HEIGHT / 2 - STAIRS_TILE_SIZE / 2,
      w: STAIRS_TILE_SIZE,
      h: STAIRS_TILE_SIZE,
    };
    occupied.push(centerStairs);

    const layout =
      isStartRoom && depth === 1
        ? ROOM_LAYOUTS.find((entry) => entry.id === "start")!
        : pickRoomLayout(rng, isStartRoom);
    const obstacles = layoutToObstacles(layout, occupied);
    occupied.push(...obstacles);

    const coinPos = findLayoutPosition(rng, coin.size, occupied, layout);
    occupied.push({ x: coinPos.x, y: coinPos.y, w: coin.size, h: coin.size });

    rooms[cell.id] = {
      id: cell.id,
      name: `Depth ${depth} · ${layout.label}`,
      background: backgroundForDepth(depth, Math.floor(rng() * 5)),
      gridX: cell.gx,
      gridY: cell.gy,
      exits,
      coin: coinPos,
      enemies: [],
      obstacles,
    };

    const enemies = generateEnemies(depth, rng, isStartRoom);

    for (const enemy of enemies) {
      const spawn = findLayoutPosition(rng, enemy.size, occupied, layout);

      if (enemy.type === "snake") {
        const segmentCount = enemy.segments.length;

        enemy.segments = [];

        for (let s = 0; s < segmentCount; s++) {
          enemy.segments.push({ x: spawn.x - s * 28, y: spawn.y });
        }
      } else {
        enemy.segments = [{ x: spawn.x, y: spawn.y }];
      }

      occupied.push({ x: spawn.x, y: spawn.y, w: enemy.size, h: enemy.size });
      rooms[cell.id].enemies.push(enemy);
    }

    if (!(isStartRoom && depth === 1)) {
      const loot = rollRoomLoot(rng);

      if (loot === "potion") {
        const potionPos = findLayoutPosition(rng, POTION_PICKUP_SIZE, occupied, layout);
        occupied.push({
          x: potionPos.x,
          y: potionPos.y,
          w: POTION_PICKUP_SIZE,
          h: POTION_PICKUP_SIZE,
        });
        rooms[cell.id].potionPickup = potionPos;
        rooms[cell.id].potionHeal = 30 + Math.floor(depth * 12 + rng() * 10);
      } else if (loot === "chest") {
        const chestPos = findLayoutPosition(rng, CHEST_SIZE, occupied, layout);
        occupied.push({
          x: chestPos.x,
          y: chestPos.y,
          w: CHEST_SIZE,
          h: CHEST_SIZE,
        });
        rooms[cell.id].chest = {
          x: chestPos.x,
          y: chestPos.y,
          opened: false,
          loot: generateChestLoot(depth, rng),
        };
      }
    }
  }

  rooms[farthestRoomId].stairsDownTile = stairsTilePosition();

  if (depth > 1) {
    rooms[startId].stairsUpTile = stairsTilePosition();
  }

  if (depth === 1) {
    rooms[startId].weaponPickup = { ...SWORD_START_POSITION, weaponId: "rusty-sword" };
    rooms[startId].potionPickup = { x: 280, y: 200 };
    rooms[startId].potionHeal = 45;
    rooms[startId].potionCollected = false;
    rooms[startId].enemies = [
      {
        type: "snake",
        segments: [
          { x: 560, y: 310 },
          { x: 590, y: 310 },
        ],
        size: 32,
        speed: 1.2,
        maxHp: 3,
        contactDamage: contactDamageForDepth(1),
      },
    ];
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
  setMapOpen(!mapOpen);
}

function setMapOpen(open: boolean) {
  mapOpen = open;
  mapBtn.textContent = mapOpen ? "Close" : "Map";

  if (open) {
    setInventoryOpen(false);
  }
}

function setInventoryOpen(open: boolean) {
  inventoryOpen = open;
  invBtn.textContent = inventoryOpen ? "Close" : "Inv";
  resetInventoryDrag();

  if (open) {
    setMapOpen(false);
  }
}

function resetInventoryDrag() {
  inventoryDrag.fromSlot = -1;
  inventoryDrag.item = null;
  inventoryDrag.pointerDown = false;
  inventoryDrag.dragging = false;
  canvas.style.cursor = "";
}

function getCanvasMousePos(event: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function getInventorySlotRect(slot: number) {
  const col = slot % INVENTORY_UI.cols;
  const row = Math.floor(slot / INVENTORY_UI.cols);

  return {
    x: INVENTORY_UI.gridX + col * (INVENTORY_UI.slotSize + INVENTORY_UI.slotGap),
    y: INVENTORY_UI.gridY + row * (INVENTORY_UI.slotSize + INVENTORY_UI.slotGap),
    w: INVENTORY_UI.slotSize,
    h: INVENTORY_UI.slotSize,
  };
}

function getInventorySlotAt(x: number, y: number) {
  for (let slot = 0; slot < MAX_INVENTORY_SIZE; slot++) {
    const rect = getInventorySlotRect(slot);

    if (x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h) {
      return slot;
    }
  }

  return null;
}

function moveInventoryItem(fromSlot: number, toSlot: number) {
  if (fromSlot === toSlot) {
    return;
  }

  const movingItem = inventory[fromSlot];
  const targetItem = inventory[toSlot];

  inventory[fromSlot] = targetItem;
  inventory[toSlot] = movingItem;

  if (activeWeaponSlot === fromSlot) {
    activeWeaponSlot = toSlot;
  } else if (activeWeaponSlot === toSlot) {
    activeWeaponSlot = fromSlot;
  }
}

function toggleInventory() {
  setInventoryOpen(!inventoryOpen);
}

function showFloorMessage(message: string) {
  floorMessage = message;
  floorMessageUntil = performance.now() + FLOOR_MESSAGE_MS;
}

function isMobAlive(mob: RuntimeMob) {
  return mob.segments.length > 0;
}

function applyRoomState(room: Room) {
  coin.x = room.coin.x;
  coin.y = room.coin.y;
  activeMobs.length = 0;
  weaponSwing.activeUntil = 0;
  weaponSwing.lastAttackAt = 0;
  weaponSwing.weaponId = null;

  for (let i = 0; i < room.enemies.length; i++) {
    const config = room.enemies[i];

    if (config.currentHp !== undefined && config.currentHp <= 0) {
      continue;
    }

    activeMobs.push({
      configIndex: i,
      type: config.type,
      segments: config.segments.map((segment) => ({ ...segment })),
      size: config.size,
      speed: config.speed,
      hp: config.currentHp ?? config.maxHp,
      maxHp: config.maxHp,
      contactDamage: config.contactDamage,
      hitFlashUntil: 0,
    });
  }
}

function saveMobsToRoom() {
  if (!currentRoomId) {
    return;
  }

  const room = getCurrentRoom();

  for (const mob of activeMobs) {
    const config = room.enemies[mob.configIndex];

    if (isMobAlive(mob)) {
      config.currentHp = mob.hp;
      config.segments = mob.segments.map((segment) => ({ ...segment }));
    } else {
      config.currentHp = 0;
    }
  }
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

function countInventoryItems() {
  return inventory.filter((slot) => slot !== null).length;
}

function findFirstEmptySlot() {
  return inventory.findIndex((slot) => slot === null);
}

function getWeaponDurability(item: InventoryItem) {
  return item.weaponDurability ?? WEAPONS[item.weaponId!].maxDurability;
}

function getActiveWeaponItem() {
  if (activeWeaponSlot === null) {
    return null;
  }

  const item = inventory[activeWeaponSlot];

  if (!item || item.type !== "weapon" || !item.weaponId) {
    return null;
  }

  return item;
}

function hasUsableWeapon() {
  const item = getActiveWeaponItem();
  return item !== null && getWeaponDurability(item) > 0;
}

function getEquippedWeaponDef(): WeaponDef {
  return WEAPONS[getActiveWeaponItem()!.weaponId!];
}

function selectWeaponSlot(slot: number) {
  const item = inventory[slot];

  if (!item || item.type !== "weapon" || !item.weaponId) {
    showFloorMessage(`Slot ${slot + 1} has no weapon.`);
    return;
  }

  if (getWeaponDurability(item) <= 0) {
    showFloorMessage("That weapon is broken.");
    return;
  }

  activeWeaponSlot = slot;
  showFloorMessage(`Active weapon: ${WEAPONS[item.weaponId].name}`);
}

function ensureActiveWeaponSlot() {
  if (hasUsableWeapon()) {
    return;
  }

  const nextWeaponSlot = inventory.findIndex(
    (item) => item?.type === "weapon" && item.weaponId && getWeaponDurability(item) > 0,
  );

  activeWeaponSlot = nextWeaponSlot >= 0 ? nextWeaponSlot : null;
}

function consumeWeaponDurability(amount: number) {
  const item = getActiveWeaponItem();

  if (!item || activeWeaponSlot === null) {
    return;
  }

  const durability = Math.max(0, getWeaponDurability(item) - amount);
  item.weaponDurability = durability;

  if (durability <= 0) {
    const name = WEAPONS[item.weaponId!].name;
    showFloorMessage(`Your ${name} broke!`);
    ensureActiveWeaponSlot();
  }
}

function addWeaponToInventory(weaponId: WeaponId, durability = WEAPONS[weaponId].maxDurability) {
  const slot = addToInventory({
    type: "weapon",
    weaponId,
    weaponDurability: durability,
  });

  if (slot === null) {
    return null;
  }

  if (!hasUsableWeapon()) {
    activeWeaponSlot = slot;
  }

  return slot;
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
  saveMobsToRoom();
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
  saveMobsToRoom();
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

  saveMobsToRoom();
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
  inventory.fill(null);
  inventory[0] = {
    type: "weapon",
    weaponId: "rusty-sword",
    weaponDurability: WEAPONS["rusty-sword"].maxDurability,
  };
  activeWeaponSlot = 0;
  floorMessageUntil = 0;
  floorMessage = "";
  stairsCooldownUntil = 0;
  visitedRooms.clear();
  setMapOpen(false);
  setInventoryOpen(false);
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

function boxesOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
  padding = 0,
) {
  return (
    a.x < b.x + b.w + padding &&
    a.x + a.w + padding > b.x &&
    a.y < b.y + b.h + padding &&
    a.y + a.h + padding > b.y
  );
}

function getSwingHitbox() {
  const def = getEquippedWeaponDef();
  const centerX = player.x + player.size / 2;
  const centerY = player.y + player.size / 2;

  switch (playerFacing) {
    case "east":
      return {
        x: player.x + player.size,
        y: centerY - def.width / 2,
        w: def.range,
        h: def.width,
      };
    case "west":
      return {
        x: player.x - def.range,
        y: centerY - def.width / 2,
        w: def.range,
        h: def.width,
      };
    case "north":
      return {
        x: centerX - def.width / 2,
        y: player.y - def.range,
        w: def.width,
        h: def.range,
      };
    case "south":
      return {
        x: centerX - def.width / 2,
        y: player.y + player.size,
        w: def.width,
        h: def.range,
      };
  }
}

function getSwingArcAngles(arcScale = 1) {
  const sweep = Math.PI * 0.7 * arcScale;

  switch (playerFacing) {
    case "east":
      return { start: -sweep * 0.5, end: sweep * 0.5 };
    case "west":
      return { start: Math.PI - sweep * 0.5, end: Math.PI + sweep * 0.5 };
    case "north":
      return { start: -Math.PI / 2 - sweep * 0.5, end: -Math.PI / 2 + sweep * 0.5 };
    case "south":
      return { start: Math.PI / 2 - sweep * 0.5, end: Math.PI / 2 + sweep * 0.5 };
  }
}

function slayMob(mob: RuntimeMob) {
  mob.segments = [];
  mob.hp = 0;
  const room = getCurrentRoom();
  const config = room.enemies[mob.configIndex];
  config.currentHp = 0;
  score += 3;
}

function damageMob(mob: RuntimeMob, amount: number) {
  if (!isMobAlive(mob)) {
    return;
  }

  mob.hp = Math.max(0, mob.hp - amount);
  mob.hitFlashUntil = performance.now() + 180;
  getCurrentRoom().enemies[mob.configIndex].currentHp = mob.hp;

  if (mob.hp <= 0) {
    slayMob(mob);
  }
}

function applyKnockback(mob: RuntimeMob, knockback: number) {
  let dx = 0;
  let dy = 0;

  switch (playerFacing) {
    case "east":
      dx = knockback;
      break;
    case "west":
      dx = -knockback;
      break;
    case "north":
      dy = -knockback;
      break;
    case "south":
      dy = knockback;
      break;
  }

  for (const segment of mob.segments) {
    const prevX = segment.x;
    const prevY = segment.y;
    segment.x = Math.max(0, Math.min(PLAY_WIDTH - mob.size, segment.x + dx));
    segment.y = Math.max(0, Math.min(PLAY_HEIGHT - mob.size, segment.y + dy));
    const resolved = resolveObstaclePosition(
      segment.x,
      segment.y,
      mob.size,
      mob.size,
      prevX,
      prevY,
    );
    segment.x = resolved.x;
    segment.y = resolved.y;
  }
}

function tryAttack() {
  if (!hasUsableWeapon()) {
    return;
  }

  const def = getEquippedWeaponDef();
  const activeItem = getActiveWeaponItem()!;
  const now = performance.now();

  if (now < weaponSwing.lastAttackAt + def.cooldownMs) {
    return;
  }

  weaponSwing.lastAttackAt = now;
  weaponSwing.activeUntil = now + def.durationMs;
  weaponSwing.swingColor = def.swingColor;
  weaponSwing.durationMs = def.durationMs;
  weaponSwing.range = def.range;
  weaponSwing.weaponId = activeItem.weaponId!;
  weaponSwing.swingArcScale = def.swingArcScale;
  weaponSwing.swingSpriteSize = def.swingSpriteSize;
  checkWeaponHits();
  consumeWeaponDurability(1);
}

function getWeaponPickupPosition() {
  return getCurrentRoom().weaponPickup;
}

function tryPickupWeapon() {
  const pickup = getWeaponPickupPosition();

  if (!pickup) {
    return;
  }

  if (
    !boxesOverlap(
      { x: player.x, y: player.y, w: player.size, h: player.size },
      { x: pickup.x, y: pickup.y, w: WEAPON_PICKUP_SIZE, h: WEAPON_PICKUP_SIZE },
    )
  ) {
    return;
  }

  const slot = addWeaponToInventory(pickup.weaponId);

  if (slot !== null) {
    showFloorMessage(`${WEAPONS[pickup.weaponId].name} → slot ${slot + 1}`);
  }

  delete getCurrentRoom().weaponPickup;
}

function checkWeaponHits() {
  if (!hasUsableWeapon()) {
    return;
  }

  if (weaponSwing.lastAttackAt === weaponSwing.lastDamagedSwing) {
    return;
  }

  const def = getEquippedWeaponDef();
  const hitbox = getSwingHitbox();
  let hit = false;

  for (const mob of activeMobs) {
    if (!isMobAlive(mob)) {
      continue;
    }

    for (const segment of mob.segments) {
      if (
        boxesOverlap(hitbox, {
          x: segment.x,
          y: segment.y,
          w: mob.size,
          h: mob.size,
        })
      ) {
        weaponSwing.lastDamagedSwing = weaponSwing.lastAttackAt;
        damageMob(mob, def.damage);
        applyKnockback(mob, def.knockback);
        hit = true;
        break;
      }
    }

    if (hit) {
      break;
    }
  }
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

function setMenuHelpOpen(open: boolean) {
  menuHelpEl.classList.toggle("hidden", !open);
  menuEl.querySelector(".menu-content")?.classList.toggle("hidden", open);
}

function showMenu() {
  state = "menu";
  keys.clear();
  setMapOpen(false);
  setInventoryOpen(false);
  setMenuHelpOpen(false);

  gameOverEl.classList.add("hidden");
  gameWrap.classList.add("hidden");
  menuEl.classList.remove("hidden");
  startMenuArtLoop();
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
  setInventoryOpen(false);
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
  const prevX = player.x;
  const prevY = player.y;

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

  const resolved = resolveObstaclePosition(
    player.x,
    player.y,
    player.size,
    player.size,
    prevX,
    prevY,
  );
  player.x = resolved.x;
  player.y = resolved.y;
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

function takeDamage(amount: number) {
  if (isPlayerInvincible()) {
    return;
  }

  hp.current = Math.max(0, hp.current - amount);
  invincibleUntil = performance.now() + hp.invincibilityMs;

  if (hp.current <= 0) {
    endGame();
  }
}

function isPlayerHitByMobs() {
  for (const mob of activeMobs) {
    if (!isMobAlive(mob)) {
      continue;
    }

    for (const segment of mob.segments) {
      if (
        player.x < segment.x + mob.size &&
        player.x + player.size > segment.x &&
        player.y < segment.y + mob.size &&
        player.y + player.size > segment.y
      ) {
        return mob.contactDamage;
      }
    }
  }

  return 0;
}

function moveCoin() {
  coin.x = Math.random() * (PLAY_WIDTH - coin.size);
  coin.y = Math.random() * (PLAY_HEIGHT - coin.size);
}

function moveMob(mob: RuntimeMob) {
  if (!isMobAlive(mob)) {
    return;
  }

  const head = mob.segments[0];
  const dx = player.x - head.x;
  const dy = player.y - head.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance > 0) {
    head.x += (dx / distance) * mob.speed;
    head.y += (dy / distance) * mob.speed;
  }

  clampMobToRoom(mob, 0);

  if (mob.type === "snake") {
    for (let i = 1; i < mob.segments.length; i++) {
      const previous = mob.segments[i - 1];
      const current = mob.segments[i];
      const followDx = previous.x - current.x;
      const followDy = previous.y - current.y;
      const followDistance = Math.sqrt(followDx * followDx + followDy * followDy);
      const spacing = mob.size + 4;

      if (followDistance > spacing) {
        current.x += (followDx / followDistance) * mob.speed;
        current.y += (followDy / followDistance) * mob.speed;
      }

      clampMobToRoom(mob, i);
    }
  }
}

function moveMobs() {
  for (const mob of activeMobs) {
    moveMob(mob);
  }
}

function updateWeapon() {
  if (performance.now() < weaponSwing.activeUntil && hasUsableWeapon()) {
    checkWeaponHits();
  }
}

function addToInventory(item: InventoryItem) {
  const slot = findFirstEmptySlot();

  if (slot === -1) {
    showFloorMessage("Inventory full!");
    return null;
  }

  inventory[slot] = item;
  return slot;
}

function usePotion(type: "health-potion" | "strong-potion") {
  const potionIndex = inventory.findIndex((item) => item?.type === type);

  if (potionIndex === -1) {
    showFloorMessage(type === "health-potion" ? "No health potions." : "No strong potions.");
    return;
  }

  if (hp.current >= hp.max) {
    showFloorMessage("Already at full health!");
    return;
  }

  const potion = inventory[potionIndex]!;
  const healed = Math.min(potion.healAmount ?? 0, hp.max - hp.current);
  hp.current += healed;
  inventory[potionIndex] = null;
  showFloorMessage(`Restored ${healed} HP!`);
}

function useHealthPotion() {
  usePotion("health-potion");
}

function useStrongPotion() {
  usePotion("strong-potion");
}

function tryPickupPotion() {
  const room = getCurrentRoom();

  if (!room.potionPickup || room.potionCollected) {
    return;
  }

  if (
    !boxesOverlap(
      { x: player.x, y: player.y, w: player.size, h: player.size },
      {
        x: room.potionPickup.x,
        y: room.potionPickup.y,
        w: POTION_PICKUP_SIZE,
        h: POTION_PICKUP_SIZE,
      },
    )
  ) {
    return;
  }

  const healAmount = room.potionHeal ?? 40;

  if (
    addToInventory({
      type: "health-potion",
      healAmount,
    }) !== null
  ) {
    room.potionCollected = true;
    showFloorMessage(`Potion collected (+${healAmount} HP)`);
  }
}

function collectChestLoot(loot: ChestLoot) {
  if (loot.kind === "weapon") {
    const slot = addWeaponToInventory(loot.weaponId);

    if (slot !== null) {
      showFloorMessage(`${WEAPONS[loot.weaponId].name} → slot ${slot + 1}`);
    }

    return;
  }

  if (addToInventory({ type: loot.kind, healAmount: loot.healAmount }) !== null) {
    const label = loot.kind === "strong-potion" ? "Strong potion" : "Health potion";
    showFloorMessage(`${label} collected (+${loot.healAmount} HP)`);
  }
}

function tryOpenChest() {
  const room = getCurrentRoom();

  if (!room.chest || room.chest.opened) {
    return;
  }

  if (
    !boxesOverlap(
      { x: player.x, y: player.y, w: player.size, h: player.size },
      { x: room.chest.x, y: room.chest.y, w: CHEST_SIZE, h: CHEST_SIZE },
    )
  ) {
    return;
  }

  room.chest.opened = true;
  collectChestLoot(room.chest.loot);
}

function update() {
  if (mapOpen || inventoryOpen) {
    return;
  }

  movePlayer();
  moveMobs();
  updateWeapon();

  const contactDamage = isPlayerHitByMobs();

  if (contactDamage > 0) {
    takeDamage(contactDamage);
  }

  if (isCoinColliding()) {
    score += 1;
    moveCoin();
  }

  tryPickupWeapon();
  tryPickupPotion();
  tryOpenChest();
}

function updateHtmlHud() {
  const room = getCurrentRoom();

  hudScoreEl.textContent = String(score);
  hudDepthEl.textContent = String(currentDepth);
  hudRoomEl.textContent = room.name;
  hudItemsEl.textContent = `${countInventoryItems()}/${MAX_INVENTORY_SIZE} items`;

  const hpRatio = hp.current / hp.max;
  hudHpFillEl.style.width = `${Math.max(0, Math.min(1, hpRatio)) * 100}%`;
  hudHpTextEl.textContent = String(hp.current);

  const activeWeapon = getActiveWeaponItem();

  if (activeWeapon && getWeaponDurability(activeWeapon) > 0) {
    const def = WEAPONS[activeWeapon.weaponId!];
    const durability = getWeaponDurability(activeWeapon);
    const cooldownReady = performance.now() >= weaponSwing.lastAttackAt + def.cooldownMs;
    hudWeaponNameEl.textContent = cooldownReady
      ? `${def.name} (${durability})`
      : "Cooling down…";
    hudDurFillEl.style.width = `${(durability / def.maxDurability) * 100}%`;
    hudWeaponNameEl.classList.toggle("hud-weapon-ready", cooldownReady);
    hudWeaponNameEl.classList.toggle("hud-weapon-cooldown", !cooldownReady);
  } else {
    hudWeaponNameEl.textContent = "No weapon";
    hudDurFillEl.style.width = "0%";
    hudWeaponNameEl.classList.remove("hud-weapon-ready", "hud-weapon-cooldown");
  }
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
  const originY = (PLAY_HEIGHT - mapHeight) / 2 - 24;

  ctx.fillStyle = "rgba(0, 0, 0, 0.82)";
  ctx.fillRect(0, 0, PLAY_WIDTH, PLAY_HEIGHT);

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
  const centerY = PLAY_HEIGHT / 2 - DOOR_LENGTH / 2;
  const doorW = DOOR_LENGTH;
  const doorH = DOOR_THICKNESS + 4;

  if (room.exits.north) {
    drawSprite(ctx, SPRITES.door, centerX, 0, doorW, doorH);
  }

  if (room.exits.south) {
    drawSprite(ctx, SPRITES.door, centerX, PLAY_HEIGHT - doorH, doorW, doorH);
  }

  if (room.exits.west) {
    drawSprite(ctx, SPRITES.door, 0, centerY, doorH, doorW);
  }

  if (room.exits.east) {
    drawSprite(ctx, SPRITES.door, PLAY_WIDTH - doorH, centerY, doorH, doorW);
  }
}

function drawStairsTiles(room: Room) {
  if (room.stairsDownTile) {
    const tile = room.stairsDownTile;
    const pulse = Math.sin(performance.now() / 300) * 2;

    drawSprite(
      ctx,
      SPRITES.stairsDown,
      tile.x,
      tile.y + pulse,
      STAIRS_TILE_SIZE,
      STAIRS_TILE_SIZE,
    );

    ctx.fillStyle = "#e8c8ff";
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "center";
    ctx.fillText("▼ Down", tile.x + STAIRS_TILE_SIZE / 2, tile.y + STAIRS_TILE_SIZE + 12 + pulse);
    ctx.textAlign = "left";
  }

  if (room.stairsUpTile) {
    const tile = room.stairsUpTile;
    const pulse = Math.sin(performance.now() / 300) * 2;

    drawSprite(
      ctx,
      SPRITES.stairsUp,
      tile.x,
      tile.y + pulse,
      STAIRS_TILE_SIZE,
      STAIRS_TILE_SIZE,
    );

    ctx.fillStyle = "#b8e8ff";
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "center";
    ctx.fillText("▲ Up", tile.x + STAIRS_TILE_SIZE / 2, tile.y + STAIRS_TILE_SIZE + 12 + pulse);
    ctx.textAlign = "left";
  }
}

function getPlayerSprite() {
  switch (playerFacing) {
    case "west":
      return SPRITES.playerWest;
    case "north":
      return SPRITES.playerNorth;
    case "south":
      return SPRITES.playerSouth;
    default:
      return SPRITES.playerEast;
  }
}

function getMobSprite(mob: RuntimeMob, segmentIndex: number) {
  if (mob.type === "snake") {
    return segmentIndex === 0 ? SPRITES.snakeHead : SPRITES.snakeBody;
  }

  if (mob.type === "slime") {
    return SPRITES.slime;
  }

  if (mob.type === "wraith") {
    return SPRITES.wraith;
  }

  return SPRITES.brute;
}

function drawFloor() {
  const tile = SPRITES.floorTile;
  const tileW = tile.width;
  const tileH = tile.height;

  for (let y = 0; y < PLAY_HEIGHT; y += tileH) {
    for (let x = 0; x < PLAY_WIDTH; x += tileW) {
      drawSprite(ctx, tile, x, y);
    }
  }
}

function drawWeaponPickup() {
  const pickup = getWeaponPickupPosition();

  if (!pickup) {
    return;
  }

  const pulse = Math.sin(performance.now() / 200) * 3;
  const size = WEAPON_PICKUP_SIZE;

  ctx.fillStyle = "rgba(255, 136, 68, 0.18)";
  ctx.beginPath();
  ctx.arc(pickup.x + size / 2, pickup.y + size / 2 + pulse, size * 0.55, 0, Math.PI * 2);
  ctx.fill();

  drawSprite(
    ctx,
    getWeaponSprite(pickup.weaponId),
    pickup.x + 4,
    pickup.y + 4 + pulse,
    size - 8,
    size - 8,
  );
}

function drawPotionPickup() {
  const room = getCurrentRoom();

  if (!room.potionPickup || room.potionCollected) {
    return;
  }

  const screenX = room.potionPickup.x;
  const screenY = room.potionPickup.y;
  const pulse = Math.sin(performance.now() / 220) * 3;
  const size = POTION_PICKUP_SIZE;

  ctx.fillStyle = "rgba(200, 80, 255, 0.18)";
  ctx.beginPath();
  ctx.arc(screenX + size / 2, screenY + size / 2 + pulse, size * 0.55, 0, Math.PI * 2);
  ctx.fill();

  drawSprite(ctx, SPRITES.potionHealth, screenX, screenY + pulse, size, size);
}

function drawChest() {
  const room = getCurrentRoom();

  if (!room.chest) {
    return;
  }

  const screenX = room.chest.x;
  const screenY = room.chest.y;
  const pulse = room.chest.opened ? 0 : Math.sin(performance.now() / 260) * 2;
  const sprite = room.chest.opened ? SPRITES.chestOpen : SPRITES.chestClosed;

  if (!room.chest.opened) {
    ctx.fillStyle = "rgba(255, 215, 0, 0.15)";
    ctx.beginPath();
    ctx.arc(
      screenX + CHEST_SIZE / 2,
      screenY + CHEST_SIZE / 2 + pulse,
      CHEST_SIZE * 0.65,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  drawSprite(ctx, sprite, screenX, screenY + pulse, CHEST_SIZE, CHEST_SIZE);
}

function drawMobHpBar(mob: RuntimeMob) {
  if (!isMobAlive(mob)) {
    return;
  }

  const head = mob.segments[0];
  const barWidth = 44;
  const barHeight = 7;
  const x = head.x + mob.size / 2 - barWidth / 2;
  const y = head.y - 10;
  const fillRatio = mob.hp / mob.maxHp;

  ctx.fillStyle = "#222";
  ctx.fillRect(x, y, barWidth, barHeight);

  if (fillRatio > 0.5) {
    ctx.fillStyle = "#66ff66";
  } else if (fillRatio > 0.25) {
    ctx.fillStyle = "#ffcc00";
  } else {
    ctx.fillStyle = "#ff5555";
  }

  ctx.fillRect(x, y, barWidth * fillRatio, barHeight);

  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, barWidth, barHeight);
}

function drawInventoryItem(
  item: InventoryItem,
  slotX: number,
  slotY: number,
  slotSize: number,
  faded = false,
) {
  const iconSize = 40;
  const centerX = slotX + slotSize / 2;

  if (faded) {
    ctx.globalAlpha = 0.75;
  }

  if (item.type === "health-potion") {
    drawSprite(ctx, SPRITES.potionHealth, slotX + 16, slotY + 18, iconSize, iconSize);
    ctx.fillStyle = "#ddd";
    ctx.font = "10px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`HP +${item.healAmount}`, centerX, slotY + slotSize - 8);
    ctx.fillStyle = "#777";
    ctx.font = "9px Arial";
    ctx.fillText("Press 1", centerX, slotY + slotSize - 20);
  } else if (item.type === "strong-potion") {
    drawSprite(ctx, SPRITES.potionStrong, slotX + 16, slotY + 18, iconSize, iconSize);
    ctx.fillStyle = "#ddd";
    ctx.font = "10px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`HP +${item.healAmount}`, centerX, slotY + slotSize - 8);
    ctx.fillStyle = "#777";
    ctx.font = "9px Arial";
    ctx.fillText("Press 2", centerX, slotY + slotSize - 20);
  } else if (item.type === "weapon" && item.weaponId) {
    drawSprite(ctx, getWeaponSprite(item.weaponId), slotX + 16, slotY + 16, iconSize, iconSize);
    const dur = getWeaponDurability(item);
    const maxDur = WEAPONS[item.weaponId].maxDurability;
    ctx.fillStyle = "#fff";
    ctx.font = "9px Arial";
    ctx.textAlign = "center";
    ctx.fillText(WEAPONS[item.weaponId].name, centerX, slotY + slotSize - 20);
    ctx.fillStyle = dur > maxDur * 0.25 ? "#ccc" : "#f88";
    ctx.fillText(`${dur}/${maxDur}`, centerX, slotY + slotSize - 8);
  }

  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
}

function drawInventoryOverlay() {
  const { panelX, panelY, panelWidth, panelHeight, slotSize } = INVENTORY_UI;
  const hoverSlot =
    inventoryDrag.dragging ? getInventorySlotAt(inventoryDrag.x, inventoryDrag.y) : null;

  ctx.fillStyle = "rgba(0, 0, 0, 0.82)";
  ctx.fillRect(0, 0, PLAY_WIDTH, PLAY_HEIGHT);

  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
  ctx.strokeStyle = "#9b59ff";
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Inventory", panelX + panelWidth / 2, panelY + 32);

  ctx.font = "14px Arial";
  ctx.fillStyle = "#aaa";
  ctx.fillText(
    `${countInventoryItems()}/${MAX_INVENTORY_SIZE} slots · drag to rearrange · 3–8 active weapon`,
    panelX + panelWidth / 2,
    panelY + 54,
  );

  for (let i = 0; i < MAX_INVENTORY_SIZE; i++) {
    const { x: slotX, y: slotY } = getInventorySlotRect(i);
    const item = inventory[i];
    const isActiveWeapon = i === activeWeaponSlot && item?.type === "weapon";
    const isDragSource = inventoryDrag.dragging && inventoryDrag.fromSlot === i;
    const isDropTarget = hoverSlot === i && inventoryDrag.fromSlot !== i;

    ctx.fillStyle = isActiveWeapon ? "#3a2a18" : "#24202a";
    ctx.fillRect(slotX, slotY, slotSize, slotSize);
    ctx.strokeStyle = isDropTarget ? "#88ff88" : isActiveWeapon ? "#ffaa44" : "#555";
    ctx.lineWidth = isDropTarget ? 3 : isActiveWeapon ? 3 : 1;
    ctx.strokeRect(slotX, slotY, slotSize, slotSize);

    ctx.fillStyle = "#888";
    ctx.font = "11px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`${i + 3}`, slotX + 6, slotY + 14);

    if (isActiveWeapon) {
      ctx.fillStyle = "#ffaa44";
      ctx.font = "bold 9px Arial";
      ctx.textAlign = "right";
      ctx.fillText("ACTIVE", slotX + slotSize - 6, slotY + 14);
    }

    if (!item) {
      ctx.fillStyle = "#555";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillText("Empty", slotX + slotSize / 2, slotY + slotSize / 2 + 4);
      ctx.textAlign = "left";
      continue;
    }

    if (!isDragSource) {
      drawInventoryItem(item, slotX, slotY, slotSize);
    } else {
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.fillRect(slotX + 4, slotY + 4, slotSize - 8, slotSize - 8);
    }
  }

  if (inventoryDrag.dragging && inventoryDrag.item) {
    const ghostX = inventoryDrag.x - slotSize / 2;
    const ghostY = inventoryDrag.y - slotSize / 2;

    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(ghostX + 3, ghostY + 5, slotSize, slotSize);
    ctx.fillStyle = "#3a3048";
    ctx.fillRect(ghostX, ghostY, slotSize, slotSize);
    ctx.strokeStyle = "#c8a0ff";
    ctx.lineWidth = 2;
    ctx.strokeRect(ghostX, ghostY, slotSize, slotSize);
    drawInventoryItem(inventoryDrag.item, ghostX, ghostY, slotSize, true);
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#888";
  ctx.font = "13px Arial";
  ctx.fillText("Press I or Inv to close", panelX + panelWidth / 2, panelY + panelHeight - 16);
  ctx.textAlign = "left";
}

function handleInventoryMouseDown(event: MouseEvent) {
  if (!inventoryOpen || state !== "playing") {
    return;
  }

  const pos = getCanvasMousePos(event);
  const slot = getInventorySlotAt(pos.x, pos.y);

  if (slot === null || !inventory[slot]) {
    return;
  }

  event.preventDefault();
  inventoryDrag.pointerDown = true;
  inventoryDrag.dragging = false;
  inventoryDrag.fromSlot = slot;
  inventoryDrag.item = inventory[slot];
  inventoryDrag.startX = pos.x;
  inventoryDrag.startY = pos.y;
  inventoryDrag.x = pos.x;
  inventoryDrag.y = pos.y;
}

function handleInventoryMouseMove(event: MouseEvent) {
  if (!inventoryOpen || !inventoryDrag.pointerDown) {
    return;
  }

  const pos = getCanvasMousePos(event);
  inventoryDrag.x = pos.x;
  inventoryDrag.y = pos.y;

  if (!inventoryDrag.dragging) {
    const dx = pos.x - inventoryDrag.startX;
    const dy = pos.y - inventoryDrag.startY;

    if (Math.hypot(dx, dy) >= INVENTORY_DRAG_THRESHOLD) {
      inventoryDrag.dragging = true;
      canvas.style.cursor = "grabbing";
    }
  }
}

function handleInventoryMouseUp(event: MouseEvent) {
  if (!inventoryOpen || !inventoryDrag.pointerDown) {
    return;
  }

  const pos = getCanvasMousePos(event);
  const fromSlot = inventoryDrag.fromSlot;
  const wasDragging = inventoryDrag.dragging;

  if (wasDragging) {
    const toSlot = getInventorySlotAt(pos.x, pos.y);

    if (toSlot !== null) {
      moveInventoryItem(fromSlot, toSlot);
    }
  } else if (inventory[fromSlot]?.type === "weapon") {
    selectWeaponSlot(fromSlot);
  }

  resetInventoryDrag();
}

function handleInventoryMouseLeave() {
  if (inventoryDrag.dragging && inventoryDrag.fromSlot >= 0) {
    resetInventoryDrag();
  } else if (inventoryDrag.pointerDown) {
    resetInventoryDrag();
  }
}

function drawFloorMessage() {
  if (performance.now() >= floorMessageUntil) {
    return;
  }

  const bannerX = 140;
  const bannerY = PLAY_HEIGHT / 2 - 24;
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

function drawObstacles(room: Room) {
  for (const obstacle of room.obstacles) {
    const sprite =
      obstacle.kind === "wall"
        ? SPRITES.wall
        : obstacle.kind === "pillar"
          ? SPRITES.pillar
          : SPRITES.rock;
    drawSprite(ctx, sprite, obstacle.x, obstacle.y, obstacle.w, obstacle.h);
  }
}

function drawWeaponSwing() {
  const now = performance.now();

  if (now >= weaponSwing.activeUntil || !weaponSwing.weaponId) {
    return;
  }

  const centerX = player.x + player.size / 2;
  const centerY = player.y + player.size / 2;
  const elapsed = now - weaponSwing.lastAttackAt;
  const rawProgress = Math.min(1, elapsed / weaponSwing.durationMs);
  const progress = 1 - (1 - rawProgress) ** 2;
  const { start, end } = getSwingArcAngles(weaponSwing.swingArcScale);
  const arcStart = start;
  const arcEnd = start + (end - start) * progress;
  const radius = weaponSwing.range * 0.92;
  const bladeAngle = arcStart + (arcEnd - arcStart) * 0.88;
  const bladeDist = radius * (weaponSwing.weaponId === "dagger" ? 0.62 : 0.78);
  const tipX = centerX + Math.cos(bladeAngle) * bladeDist;
  const tipY = centerY + Math.sin(bladeAngle) * bladeDist;
  const sprite = getWeaponSprite(weaponSwing.weaponId);
  const spriteSize = weaponSwing.swingSpriteSize;
  const trailWidth = weaponSwing.weaponId === "war-axe" ? 6 : weaponSwing.weaponId === "dagger" ? 2.5 : 4;

  ctx.save();
  ctx.strokeStyle = weaponSwing.swingColor;
  ctx.fillStyle = weaponSwing.swingColor;

  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.arc(centerX, centerY, radius, arcStart, arcEnd);
  ctx.closePath();
  ctx.globalAlpha = weaponSwing.weaponId === "dagger" ? 0.18 : 0.26;
  ctx.fill();

  ctx.globalAlpha = 0.7;
  ctx.lineWidth = trailWidth;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, arcStart, arcEnd);
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.translate(tipX, tipY);
  ctx.rotate(bladeAngle + Math.PI * 0.68);
  drawSprite(ctx, sprite, -spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize);
  ctx.restore();
}

function draw() {
  const room = getCurrentRoom();

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawFloor();

  ctx.fillStyle = room.background;
  ctx.globalAlpha = 0.22;
  ctx.fillRect(0, 0, PLAY_WIDTH, PLAY_HEIGHT);
  ctx.globalAlpha = 1;

  drawObstacles(room);
  drawDoors(room);
  drawStairsTiles(room);
  drawWeaponPickup();
  drawPotionPickup();
  drawChest();

  const invincible = isPlayerInvincible();
  const showPlayer = !invincible || Math.floor(performance.now() / 100) % 2 === 0;

  if (showPlayer) {
    const playerSprite = getPlayerSprite();

    if (invincible) {
      drawTintedSprite(
        ctx,
        playerSprite,
        player.x,
        player.y,
        player.size,
        "#ff6666",
        0.55,
      );
    } else {
      drawSprite(ctx, playerSprite, player.x, player.y, player.size, player.size);
    }
  }

  drawWeaponSwing();

  drawSpriteCentered(ctx, SPRITES.coin, coin.x + coin.size / 2, coin.y + coin.size / 2, coin.size);

  for (const mob of activeMobs) {
    if (isMobAlive(mob)) {
      const colors = MOB_COLORS[mob.type];
      const hit = performance.now() < mob.hitFlashUntil;

      mob.segments.forEach((segment, index) => {
        const sprite = getMobSprite(mob, index);

        if (hit) {
          drawTintedSprite(ctx, sprite, segment.x, segment.y, mob.size, colors.hit, 0.5);
        } else {
          drawSprite(ctx, sprite, segment.x, segment.y, mob.size, mob.size);
        }
      });

      drawMobHpBar(mob);
    }
  }

  drawFloorMessage();
  updateHtmlHud();

  if (mapOpen) {
    drawMapOverlay();
  }

  if (inventoryOpen) {
    drawInventoryOverlay();
  }
}

function drawMenuArt() {
  const menuCanvas = document.querySelector<HTMLCanvasElement>("#menu-art");

  if (!menuCanvas) {
    return;
  }

  const menuCtx = menuCanvas.getContext("2d");

  if (!menuCtx) {
    return;
  }

  const w = menuCanvas.width;
  const h = menuCanvas.height;
  const bob = Math.sin(performance.now() / 520) * 4;

  menuCtx.clearRect(0, 0, w, h);

  for (let y = 0; y < h; y += SPRITES.floorTile.height) {
    for (let x = 0; x < w; x += SPRITES.floorTile.width) {
      drawSprite(menuCtx, SPRITES.floorTile, x, y);
    }
  }

  menuCtx.fillStyle = "rgba(12, 8, 24, 0.45)";
  menuCtx.fillRect(0, 0, w, h);

  drawSprite(menuCtx, SPRITES.chestClosed, 28, 44 + bob * 0.3, 52, 52);
  drawSprite(menuCtx, SPRITES.coin, 164, 72 + bob, 30, 30);
  drawSprite(menuCtx, SPRITES.snakeHead, 248, 54 - bob * 0.4, 44, 44);
  drawSprite(menuCtx, SPRITES.snakeBody, 286, 58 - bob * 0.4, 36, 36);
  drawSprite(menuCtx, SPRITES.playerEast, 108, 36 + bob * 0.6, 48, 48);
  drawSprite(menuCtx, SPRITES.stairsDown, 300, 18, 44, 44);

  menuCtx.fillStyle = "rgba(255, 200, 120, 0.08)";
  menuCtx.fillRect(0, 0, w, h);
}

function startMenuArtLoop() {
  if (state !== "menu") {
    return;
  }

  drawMenuArt();
  requestAnimationFrame(startMenuArtLoop);
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
helpBtn.addEventListener("click", () => setMenuHelpOpen(true));
helpCloseBtn.addEventListener("click", () => setMenuHelpOpen(false));
mapBtn.addEventListener("click", toggleMap);
invBtn.addEventListener("click", toggleInventory);
canvas.addEventListener("mousedown", handleInventoryMouseDown);
canvas.addEventListener("mousemove", handleInventoryMouseMove);
window.addEventListener("mouseup", handleInventoryMouseUp);
canvas.addEventListener("mouseleave", handleInventoryMouseLeave);

drawMenuArt();
startMenuArtLoop();
