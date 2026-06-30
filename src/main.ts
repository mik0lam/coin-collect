import "./style.css";
import { SPRITES, drawSprite, drawSpriteCentered, drawTintedSprite, getWeaponSprite, FLOOR_TILES } from "./sprites";
import { loadAssetSprites, HERO_DRAW_SIZE, TILE_DRAW_SIZE, TILE_SCALE } from "./spriteAssets";
import {
  clearDoorCorridors,
  DOOR_LENGTH,
  DOOR_START_X,
  DOOR_START_Y,
  getDoorClearZones,
  layoutToObstacles,
  obstacleHitbox,
  pickRoomLayout,
  ROOM_LAYOUTS,
  type LayoutObstacle,
} from "./roomLayouts";
import { drawTileDebugOverlay, inspectTileAt, type TileInspection } from "./tileDebug";
import {
  ARMOR_TIERS,
  BASE_MAX_HP,
  BOSS_HEART_HP_BONUS,
  BOSS_HEART_SIZE,
  CHEST_SIZE,
  DESCEND_BONUS,
  FLOOR_MESSAGE_MS,
  LEGENDARY_WEAPON_IDS,
  MAX_INVENTORY_SIZE,
  MOB_COLORS,
  PLAY_HEIGHT,
  PLAY_WIDTH,
  POTION_PICKUP_SIZE,
  SCRAP_PICKUP_SIZE,
  SHOP_ITEMS,
  SHOP_STATION_SIZE,
  SLOT_MACHINE_SIZE,
  SLOT_SPIN_MS,
  STAIRS_COOLDOWN_MS,
  SWORD_START_POSITION,
  VOID_SHARD_SIZE,
  WEAPON_PICKUP_SIZE,
  WEAPONS,
} from "./constants";
import { boxesOverlap, collidesWithPerimeterWalls, collidesWithRoomObstacles } from "./collision";
import { generateFloor } from "./floorGeneration";
import { findLayoutPosition, findOpenPosition } from "./placement";
import { canCraftNextArmor, getArmorLabel, getNextArmorTier, tryCraftArmor } from "./crafting";
import {
  getDiscoveredWeapons,
  getUndiscoveredWeaponCount,
  isWeaponDiscovered,
  recordWeaponDiscovered,
  resetWeaponEncyclopedia,
} from "./encyclopedia";
import {
  isNearShopStation,
  tryBuyHealthPotion,
  tryBuyStrongPotion,
  tryBuyWeaponRepair,
} from "./shop";
import type {
  ArmorTier,
  ChestLoot,
  Direction,
  Floor,
  GameState,
  InventoryItem,
  MobConfig,
  MobType,
  Room,
  RuntimeMob,
  WeaponDef,
  WeaponId,
} from "./types";

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
        <span id="hud-shards" class="hud-shards">0 shards</span>
        <span id="hud-scrap" class="hud-shards">0 scrap</span>
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
    <canvas id="game" width="800" height="416"></canvas>
    <p class="game-hint">WASD move · Space attack · E interact · 1/2 potions · 3–8 weapons · M map · I inv · K encyclopedia · F3 debug</p>
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
const hudShardsEl = required(document.querySelector<HTMLElement>("#hud-shards"), "HUD shards");
const hudScrapEl = required(document.querySelector<HTMLElement>("#hud-scrap"), "HUD scrap");
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
type WeaponId =
  | "rusty-sword"
  | "iron-sword"
  | "war-axe"
  | "dagger"
  | "soulreaver"
  | "storm-cleaver"
  | "blood-reaper"
  | "phantom-blade";
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
  rarity?: "normal" | "legendary";
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
  coinCollected?: boolean;
  enemies: MobConfig[];
  weaponPickup?: { x: number; y: number; weaponId: WeaponId };
  potionPickup?: { x: number; y: number };
  potionHeal?: number;
  potionCollected?: boolean;
  chest?: Chest;
  stairsDownTile?: { x: number; y: number };
  stairsUpTile?: { x: number; y: number };
  obstacles: LayoutObstacle[];
  voidShardPickup?: { x: number; y: number };
  voidShardCollected?: boolean;
  slotMachine?: { x: number; y: number };
  layoutId?: string;
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
  soulreaver: {
    damage: 5,
    knockback: 34,
    range: 54,
    width: 44,
    cooldownMs: 380,
    durationMs: 170,
    maxDurability: 90,
    name: "Soulreaver",
    swingColor: "rgba(180, 120, 255, 0.95)",
    swingArcScale: 1.15,
    swingSpriteSize: 48,
    rarity: "legendary",
  },
  "storm-cleaver": {
    damage: 4,
    knockback: 26,
    range: 50,
    width: 48,
    cooldownMs: 260,
    durationMs: 140,
    maxDurability: 85,
    name: "Storm Cleaver",
    swingColor: "rgba(255, 230, 80, 0.95)",
    swingArcScale: 1.35,
    swingSpriteSize: 50,
    rarity: "legendary",
  },
  "blood-reaper": {
    damage: 7,
    knockback: 42,
    range: 52,
    width: 46,
    cooldownMs: 620,
    durationMs: 220,
    maxDurability: 75,
    name: "Blood Reaper",
    swingColor: "rgba(255, 60, 60, 0.95)",
    swingArcScale: 1.3,
    swingSpriteSize: 52,
    rarity: "legendary",
  },
  "phantom-blade": {
    damage: 3,
    knockback: 14,
    range: 42,
    width: 30,
    cooldownMs: 160,
    durationMs: 100,
    maxDurability: 100,
    name: "Phantom Blade",
    swingColor: "rgba(200, 240, 255, 0.9)",
    swingArcScale: 0.8,
    swingSpriteSize: 34,
    rarity: "legendary",
  },
};

const LEGENDARY_WEAPON_IDS: WeaponId[] = [
  "soulreaver",
  "storm-cleaver",
  "blood-reaper",
  "phantom-blade",
];

const VOID_SHARD_FLOOR_INTERVAL = 5;

const MOB_COLORS: Record<MobType, { normal: string; hit: string }> = {
  snake: { normal: "lime", hit: "#88ff88" },
  slime: { normal: "#20b2aa", hit: "#66dddd" },
  wraith: { normal: "#9932cc", hit: "#cc66ff" },
  brute: { normal: "#ff8800", hit: "#ffaa44" },
};

const PLAY_WIDTH = canvas.width;
const PLAY_HEIGHT = canvas.height;

let runSeed = 0;
let currentDepth = 1;
let deepestDepth = 1;
const floors = new Map<number, Floor>();
const visitedRooms = new Set<string>();
let currentRoomId = "";

const player = {
  x: 100,
  y: 100,
  size: HERO_DRAW_SIZE,
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
  lastMobDamagedSwing: 0,
  lastObstacleDamagedSwing: 0,
  swingColor: "",
  durationMs: 0,
  range: 0,
  weaponId: null as WeaponId | null,
  swingArcScale: 1,
  swingSpriteSize: 38,
};


const WEAPON_PICKUP_SIZE = 48;
const SWORD_START_POSITION = { x: 200, y: 116 };
const FLOOR_MESSAGE_MS = 2500;
const DESCEND_BONUS = 15;

let floorMessageUntil = 0;
let floorMessage = "";
let stairsCooldownUntil = 0;
const STAIRS_COOLDOWN_MS = 900;

const DOOR_HIT_DEPTH = TILE_DRAW_SIZE;

const POTION_PICKUP_SIZE = 34;
const CHEST_SIZE = 44;
const VOID_SHARD_SIZE = 34;
const SLOT_MACHINE_SIZE = 64;
const SLOT_SPIN_MS = 2600;
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
let debugMode = false;
let tileInspection: TileInspection | null = null;
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
let voidShards = 0;

const slotSpin = {
  activeUntil: 0,
  resultWeaponId: null as WeaponId | null,
  startedAt: 0,
};

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

  if ((event.key === "`" || event.key === "F3") && state === "playing") {
    event.preventDefault();
    debugMode = !debugMode;

    if (!debugMode) {
      tileInspection = null;
    }
  }

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

  if (key === "e" && state === "playing") {
    event.preventDefault();
    tryUseSlotMachine();
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

function findOpenPosition(
  rng: () => number,
  size: number,
  occupied: { x: number; y: number; w: number; h: number }[],
) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const pos = randomPosition(rng, 72);
    const candidate = { x: pos.x, y: pos.y, w: size, h: size };

    if (!occupied.some((zone) => boxesOverlap(candidate, zone, 12))) {
      return pos;
    }
  }

  return {
    x: PLAY_WIDTH / 2 - size / 2,
    y: PLAY_HEIGHT / 2 + 72,
  };
}

function buildRoomOccupied(room: Room) {
  const occupied: { x: number; y: number; w: number; h: number }[] = [
    ...getDoorClearZones(room.exits),
  ];

  if (room.stairsDownTile) {
    occupied.push(stairsBounds("down", room.stairsDownTile));
  }

  if (room.stairsUpTile) {
    occupied.push(stairsBounds("up", room.stairsUpTile));
  }

  occupied.push(...room.obstacles);

  if (!room.coinCollected) {
    occupied.push({ x: room.coin.x, y: room.coin.y, w: coin.size, h: coin.size });
  }

  for (const enemy of room.enemies) {
    const head = enemy.segments[0];

    if (head) {
      occupied.push({ x: head.x, y: head.y, w: enemy.size, h: enemy.size });
    }
  }

  if (room.weaponPickup) {
    occupied.push({
      x: room.weaponPickup.x,
      y: room.weaponPickup.y,
      w: WEAPON_PICKUP_SIZE,
      h: WEAPON_PICKUP_SIZE,
    });
  }

  if (room.potionPickup && !room.potionCollected) {
    occupied.push({
      x: room.potionPickup.x,
      y: room.potionPickup.y,
      w: POTION_PICKUP_SIZE,
      h: POTION_PICKUP_SIZE,
    });
  }

  if (room.chest) {
    occupied.push({ x: room.chest.x, y: room.chest.y, w: CHEST_SIZE, h: CHEST_SIZE });
  }

  if (room.voidShardPickup && !room.voidShardCollected) {
    occupied.push({
      x: room.voidShardPickup.x,
      y: room.voidShardPickup.y,
      w: VOID_SHARD_SIZE,
      h: VOID_SHARD_SIZE,
    });
  }

  if (room.slotMachine) {
    occupied.push({
      x: room.slotMachine.x,
      y: room.slotMachine.y,
      w: SLOT_MACHINE_SIZE,
      h: SLOT_MACHINE_SIZE,
    });
  }

  return occupied;
}

function placeVoidShardAndSlotMachine(
  rooms: Record<string, Room>,
  startId: string,
  depth: number,
  rng: () => number,
) {
  if (depth % VOID_SHARD_FLOOR_INTERVAL !== 0) {
    return;
  }

  const shardCandidates = Object.values(rooms).filter((room) => room.id !== startId);

  if (shardCandidates.length > 0) {
    const shardRoom = shardCandidates[Math.floor(rng() * shardCandidates.length)];
    const shardPos = findOpenPosition(rng, VOID_SHARD_SIZE, buildRoomOccupied(shardRoom));

    shardRoom.voidShardPickup = shardPos;
    shardRoom.voidShardCollected = false;
  }

  const startRoom = rooms[startId];
  const machinePos = findOpenPosition(rng, SLOT_MACHINE_SIZE, buildRoomOccupied(startRoom));

  startRoom.slotMachine = machinePos;
  startRoom.name = `Depth ${depth} · Shrine Floor`;
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

function getPlayerCollisionBox(x = player.x, y = player.y) {
  return {
    x,
    y,
    w: player.size,
    h: player.size,
  };
}

function collidesWithPerimeterWalls(
  box: { x: number; y: number; w: number; h: number },
  room: Room,
) {
  const ts = TILE_DRAW_SIZE;
  const doorEndX = DOOR_START_X + DOOR_LENGTH;
  const doorEndY = DOOR_START_Y + DOOR_LENGTH;

  const wallTiles: { x: number; y: number; w: number; h: number }[] = [
    { x: 0, y: 0, w: ts, h: ts },
    { x: PLAY_WIDTH - ts, y: 0, w: ts, h: ts },
    { x: 0, y: PLAY_HEIGHT - ts, w: ts, h: ts },
    { x: PLAY_WIDTH - ts, y: PLAY_HEIGHT - ts, w: ts, h: ts },
  ];

  for (let x = ts; x < PLAY_WIDTH - ts; x += ts) {
    if (!(room.exits.north && x >= DOOR_START_X && x < doorEndX)) {
      wallTiles.push({ x, y: 0, w: ts, h: ts });
    }

    if (!(room.exits.south && x >= DOOR_START_X && x < doorEndX)) {
      wallTiles.push({ x, y: PLAY_HEIGHT - ts, w: ts, h: ts });
    }
  }

  for (let y = ts; y < PLAY_HEIGHT - ts; y += ts) {
    if (!(room.exits.west && y >= DOOR_START_Y && y < doorEndY)) {
      wallTiles.push({ x: 0, y, w: ts, h: ts });
    }

    if (!(room.exits.east && y >= DOOR_START_Y && y < doorEndY)) {
      wallTiles.push({ x: PLAY_WIDTH - ts, y, w: ts, h: ts });
    }
  }

  return wallTiles.some((tile) => boxesOverlap(box, tile));
}

function getRoomObstacles(room = getCurrentRoom()) {
  return room.obstacles ?? [];
}

function collidesWithObstacles(
  box: { x: number; y: number; w: number; h: number },
  room = getCurrentRoom(),
) {
  if (collidesWithPerimeterWalls(box, room)) {
    return true;
  }

  return getRoomObstacles(room).some((obstacle) =>
    boxesOverlap(box, obstacleHitbox(obstacle)),
  );
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
  const tints = [
    "rgba(52, 32, 22, 0.42)",
    "rgba(44, 24, 18, 0.45)",
    "rgba(58, 28, 24, 0.4)",
    "rgba(36, 22, 28, 0.44)",
    "rgba(48, 30, 18, 0.43)",
  ];

  return tints[(depth + variant) % tints.length];
}

function hashRoomSeed(value: string) {
  let seed = 0;

  for (let i = 0; i < value.length; i++) {
    seed = (seed * 31 + value.charCodeAt(i)) >>> 0;
  }

  return seed;
}

function spriteDrawSize(sprite: HTMLCanvasElement) {
  return {
    w: sprite.width * TILE_SCALE,
    h: sprite.height * TILE_SCALE,
  };
}

function stairsBounds(kind: "down" | "up", tile: { x: number; y: number }) {
  const sprite = kind === "up" ? SPRITES.stairsUp : SPRITES.stairsDown;

  return {
    x: tile.x,
    y: tile.y,
    ...spriteDrawSize(sprite),
  };
}

function stairsTilePosition(kind: "down" | "up" = "down") {
  const sprite = kind === "up" ? SPRITES.stairsUp : SPRITES.stairsDown;
  const { w, h } = spriteDrawSize(sprite);

  return {
    x: PLAY_WIDTH / 2 - w / 2,
    y: PLAY_HEIGHT / 2 - h / 2,
  };
}

function contactDamageForDepth(depth: number) {
  return 6 + Math.floor(depth * 1.25);
}

function generateMob(type: MobType, depth: number, rng: () => number): MobConfig {
  const baseContact = contactDamageForDepth(depth);
  const spawn = randomPosition(rng, 100);

  switch (type) {
    case "snake": {
      const segmentCount = Math.min(9, 2 + Math.floor(depth / 2) + Math.floor(rng() * 2));
      const speed = 1.0 + depth * 0.08 + rng() * 0.25;
      const maxHp = Math.floor(2 + depth * 1.1 + rng() * 1.5);
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
        speed: 0.75 + depth * 0.06 + rng() * 0.12,
        maxHp: Math.floor(1 + depth * 0.85 + rng()),
        contactDamage: Math.floor(baseContact * 0.85),
      };
    case "wraith":
      return {
        type,
        segments: [{ ...spawn }],
        size: 28,
        speed: 1.6 + depth * 0.1 + rng() * 0.2,
        maxHp: Math.floor(1 + depth * 0.75 + rng()),
        contactDamage: Math.floor(baseContact * 0.9),
      };
    case "brute":
      return {
        type,
        segments: [{ ...spawn }],
        size: 40,
        speed: 0.7 + depth * 0.05 + rng() * 0.1,
        maxHp: Math.floor(3 + depth * 1.8 + rng() * 1.5),
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
      ...getDoorClearZones(exits),
    ];
    const downStairs = spriteDrawSize(SPRITES.stairsDown);
    occupied.push({
      x: PLAY_WIDTH / 2 - downStairs.w / 2,
      y: PLAY_HEIGHT / 2 - downStairs.h / 2,
      w: downStairs.w,
      h: downStairs.h,
    });

    const rawLayout =
      isStartRoom && depth === 1
        ? ROOM_LAYOUTS.find((entry) => entry.id === "start")!
        : pickRoomLayout(rng, isStartRoom);
    const layout = clearDoorCorridors(rawLayout, exits);
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
      coinCollected: false,
      enemies: [],
      obstacles,
      layoutId: layout.id,
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

  rooms[farthestRoomId].stairsDownTile = stairsTilePosition("down");

  if (depth > 1) {
    rooms[startId].stairsUpTile = stairsTilePosition("up");
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

  placeVoidShardAndSlotMachine(rooms, startId, depth, rng);

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
  if (!room.coinCollected) {
    coin.x = room.coin.x;
    coin.y = room.coin.y;
  }
  activeMobs.length = 0;
  weaponSwing.activeUntil = 0;
  weaponSwing.lastAttackAt = 0;
  weaponSwing.lastMobDamagedSwing = 0;
  weaponSwing.lastObstacleDamagedSwing = 0;
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
  const margin = TILE_DRAW_SIZE + 6;
  const doorCenterX = DOOR_START_X + DOOR_LENGTH / 2 - player.size / 2;
  const doorCenterY = DOOR_START_Y + DOOR_LENGTH / 2 - player.size / 2;

  switch (direction) {
    case "east":
      player.x = PLAY_WIDTH - player.size - margin;
      player.y = doorCenterY;
      break;
    case "west":
      player.x = margin;
      player.y = doorCenterY;
      break;
    case "south":
      player.y = PLAY_HEIGHT - player.size - margin;
      player.x = doorCenterX;
      break;
    case "north":
      player.y = margin;
      player.x = doorCenterX;
      break;
  }
}

function changeRoom(roomId: string, enteredFrom: Direction) {
  saveMobsToRoom();
  loadRoom(roomId);
  spawnFromDirection(enteredFrom);
}

function spawnAtTile(tile: { x: number; y: number }, below: boolean, kind: "down" | "up" = "down") {
  const sprite = kind === "up" ? SPRITES.stairsUp : SPRITES.stairsDown;
  const { w, h } = spriteDrawSize(sprite);
  player.x = tile.x + w / 2 - player.size / 2;
  player.y = below ? tile.y + h + 10 : tile.y - player.size - 10;
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
    spawnAtTile(startRoom.stairsUpTile, true, "up");
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
    spawnAtTile(room.stairsDownTile, false, "down");
  } else {
    spawnFromDirection("south");
  }

  stairsCooldownUntil = performance.now() + STAIRS_COOLDOWN_MS;
  showFloorMessage(`Ascended to Depth ${currentDepth}`);
}

function resetGame() {
  score = 0;
  voidShards = 0;
  slotSpin.activeUntil = 0;
  slotSpin.resultWeaponId = null;
  slotSpin.startedAt = 0;
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
  checkWeaponMobHits();
  checkWeaponObstacleHits();
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

function obstacleStrikeBox(obstacle: LayoutObstacle) {
  return { x: obstacle.x, y: obstacle.y, w: obstacle.w, h: obstacle.h };
}

function checkWeaponMobHits() {
  if (!hasUsableWeapon()) {
    return;
  }

  if (weaponSwing.lastAttackAt === weaponSwing.lastMobDamagedSwing) {
    return;
  }

  const def = getEquippedWeaponDef();
  const hitbox = getSwingHitbox();

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
        weaponSwing.lastMobDamagedSwing = weaponSwing.lastAttackAt;
        damageMob(mob, def.damage);
        applyKnockback(mob, def.knockback);
        return;
      }
    }
  }
}

function checkWeaponObstacleHits() {
  if (!hasUsableWeapon()) {
    return;
  }

  if (weaponSwing.lastAttackAt === weaponSwing.lastObstacleDamagedSwing) {
    return;
  }

  const def = getEquippedWeaponDef();
  const hitbox = getSwingHitbox();
  const room = getCurrentRoom();
  let hitAny = false;

  for (let i = room.obstacles.length - 1; i >= 0; i--) {
    const obstacle = room.obstacles[i];

    if (boxesOverlap(hitbox, obstacleStrikeBox(obstacle))) {
      hitAny = true;
      obstacle.hp -= def.damage;

      if (obstacle.hp <= 0) {
        room.obstacles.splice(i, 1);
      }
    }
  }

  if (hitAny) {
    weaponSwing.lastObstacleDamagedSwing = weaponSwing.lastAttackAt;
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
  if (!spritesReady) {
    return;
  }

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
    const bounds = stairsBounds("down", tile);

    if (boxesOverlap(playerBox, bounds)) {
      descendFloor();
      return;
    }
  }

  if (room.stairsUpTile) {
    const tile = room.stairsUpTile;
    const bounds = stairsBounds("up", tile);

    if (boxesOverlap(playerBox, bounds)) {
      ascendFloor();
    }
  }
}

function getDoorHitbox(direction: Direction, room: Room) {
  if (!room.exits[direction]) {
    return null;
  }

  switch (direction) {
    case "north":
      return { x: DOOR_START_X, y: 0, w: DOOR_LENGTH, h: DOOR_HIT_DEPTH };
    case "south":
      return {
        x: DOOR_START_X,
        y: PLAY_HEIGHT - DOOR_HIT_DEPTH,
        w: DOOR_LENGTH,
        h: DOOR_HIT_DEPTH,
      };
    case "west":
      return { x: 0, y: DOOR_START_Y, w: DOOR_HIT_DEPTH, h: DOOR_LENGTH };
    case "east":
      return {
        x: PLAY_WIDTH - DOOR_HIT_DEPTH,
        y: DOOR_START_Y,
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

  const collisionPrev = getPlayerCollisionBox(prevX, prevY);
  const collisionNext = getPlayerCollisionBox();

  const resolved = resolveObstaclePosition(
    collisionNext.x,
    collisionNext.y,
    collisionNext.w,
    collisionNext.h,
    collisionPrev.x,
    collisionPrev.y,
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

function tryCollectCoin() {
  const room = getCurrentRoom();

  if (room.coinCollected || !isCoinColliding()) {
    return;
  }

  room.coinCollected = true;
  score += 1;
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
    checkWeaponMobHits();
    checkWeaponObstacleHits();
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

function tryPickupVoidShard() {
  const room = getCurrentRoom();

  if (!room.voidShardPickup || room.voidShardCollected) {
    return;
  }

  if (
    !boxesOverlap(
      { x: player.x, y: player.y, w: player.size, h: player.size },
      {
        x: room.voidShardPickup.x,
        y: room.voidShardPickup.y,
        w: VOID_SHARD_SIZE,
        h: VOID_SHARD_SIZE,
      },
    )
  ) {
    return;
  }

  room.voidShardCollected = true;
  voidShards += 1;
  showFloorMessage("Void Shard collected!");
}

function isNearSlotMachine() {
  const room = getCurrentRoom();

  if (!room.slotMachine) {
    return false;
  }

  return boxesOverlap(
    { x: player.x, y: player.y, w: player.size, h: player.size },
    {
      x: room.slotMachine.x,
      y: room.slotMachine.y,
      w: SLOT_MACHINE_SIZE,
      h: SLOT_MACHINE_SIZE,
    },
    18,
  );
}

function tryUseSlotMachine() {
  const room = getCurrentRoom();
  const now = performance.now();

  if (!room.slotMachine || slotSpin.activeUntil > now) {
    return;
  }

  if (!isNearSlotMachine()) {
    return;
  }

  if (voidShards < 1) {
    showFloorMessage("Need a Void Shard to spin.");
    return;
  }

  voidShards -= 1;
  slotSpin.resultWeaponId =
    LEGENDARY_WEAPON_IDS[Math.floor(Math.random() * LEGENDARY_WEAPON_IDS.length)];
  slotSpin.startedAt = now;
  slotSpin.activeUntil = now + SLOT_SPIN_MS;
}

function finishSlotSpin() {
  const now = performance.now();

  if (!slotSpin.activeUntil || now < slotSpin.activeUntil || !slotSpin.resultWeaponId) {
    return;
  }

  const weaponId = slotSpin.resultWeaponId;
  const slot = addWeaponToInventory(weaponId);

  if (slot !== null) {
    showFloorMessage(`★ ${WEAPONS[weaponId].name} ★`);
  } else {
    voidShards += 1;
    showFloorMessage("Inventory full — shard refunded.");
  }

  slotSpin.resultWeaponId = null;
  slotSpin.activeUntil = 0;
  slotSpin.startedAt = 0;
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

  const spinning = slotSpin.activeUntil > performance.now();

  if (!spinning) {
    movePlayer();
    moveMobs();
    updateWeapon();

    const contactDamage = isPlayerHitByMobs();

    if (contactDamage > 0) {
      takeDamage(contactDamage);
    }

    tryCollectCoin();

    tryPickupWeapon();
    tryPickupPotion();
    tryPickupVoidShard();
    tryOpenChest();
  }

  finishSlotSpin();
}

function updateHtmlHud() {
  const room = getCurrentRoom();

  hudScoreEl.textContent = String(score);
  hudDepthEl.textContent = String(currentDepth);
  hudRoomEl.textContent = room.name;
  hudItemsEl.textContent = `${countInventoryItems()}/${MAX_INVENTORY_SIZE} items`;
  hudShardsEl.textContent = `${voidShards} shard${voidShards === 1 ? "" : "s"}`;

  const hpRatio = hp.current / hp.max;
  hudHpFillEl.style.width = `${Math.max(0, Math.min(1, hpRatio)) * 100}%`;
  hudHpTextEl.textContent = String(hp.current);

  const activeWeapon = getActiveWeaponItem();

  if (activeWeapon && getWeaponDurability(activeWeapon) > 0) {
    const def = WEAPONS[activeWeapon.weaponId!];
    const durability = getWeaponDurability(activeWeapon);
    const cooldownReady = performance.now() >= weaponSwing.lastAttackAt + def.cooldownMs;
    const prefix = def.rarity === "legendary" ? "★ " : "";
    hudWeaponNameEl.textContent = cooldownReady
      ? `${prefix}${def.name} (${durability})`
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
  const exploredDepths = getExploredDepths();

  const panelPad = 20;
  const headerH = 54;
  const legendH = 18;
  const footerH = 28;
  const sidebarW = 92;
  const sectionGap = 14;
  const outerMargin = 12;
  const maxMapW = PLAY_WIDTH - outerMargin * 2 - panelPad * 2 - sidebarW - sectionGap;
  const maxMapH =
    PLAY_HEIGHT - outerMargin * 2 - panelPad * 2 - headerH - legendH - footerH - 8;
  const cellSize = Math.floor(
    Math.min(50, maxMapW / gridWidth, maxMapH / gridHeight),
  );
  const mapWidth = gridWidth * cellSize;
  const mapHeight = gridHeight * cellSize;
  const panelW = panelPad * 2 + mapWidth + sectionGap + sidebarW;
  const panelH = panelPad * 2 + headerH + legendH + mapHeight + footerH;
  const panelX = (PLAY_WIDTH - panelW) / 2;
  const panelY = (PLAY_HEIGHT - panelH) / 2;
  const originX = panelX + panelPad;
  const originY = panelY + panelPad + headerH + legendH;
  const depthListX = originX + mapWidth + sectionGap;

  ctx.fillStyle = "rgba(0, 0, 0, 0.86)";
  ctx.fillRect(0, 0, PLAY_WIDTH, PLAY_HEIGHT);

  ctx.fillStyle = "#1a1410";
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = "#6a5040";
  ctx.lineWidth = 3;
  ctx.strokeRect(panelX + 1.5, panelY + 1.5, panelW - 3, panelH - 3);
  ctx.strokeStyle = "#2a2018";
  ctx.lineWidth = 1;
  ctx.strokeRect(panelX + 5, panelY + 5, panelW - 10, panelH - 10);

  ctx.fillStyle = "#e8d8c0";
  ctx.font = "bold 18px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`MAP — DEPTH ${currentDepth}`, panelX + panelW / 2, panelY + panelPad + 20);

  ctx.font = "11px Arial";
  ctx.fillStyle = "#9a8878";
  ctx.fillText("Explored rooms only", panelX + panelW / 2, panelY + panelPad + 38);

  ctx.font = "10px Arial";
  ctx.fillStyle = "#7a6a5a";
  ctx.fillText(
    "● you   ▼ stairs down   ▲ stairs up",
    panelX + panelW / 2,
    panelY + panelPad + headerH + 6,
  );

  ctx.strokeStyle = "#3a3028";
  ctx.lineWidth = 3;

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
    const inset = 3;
    const roomW = cellSize - inset * 2;
    const roomH = cellSize - inset * 2;

    if (isStairsDown) {
      ctx.fillStyle = "#3a2848";
    } else if (isStart) {
      ctx.fillStyle = "#283830";
    } else {
      ctx.fillStyle = "#242028";
    }

    ctx.fillRect(x + inset, y + inset, roomW, roomH);

    ctx.strokeStyle = isCurrent ? "#e8c878" : "#4a5868";
    ctx.lineWidth = isCurrent ? 2.5 : 1.5;
    ctx.strokeRect(x + inset, y + inset, roomW, roomH);

    if (room.stairsDownTile && room.stairsUpTile) {
      ctx.fillStyle = "#d8a0a0";
      ctx.font = "bold 10px Arial";
      ctx.textAlign = "center";
      ctx.fillText("▲▼", x + cellSize / 2, y + cellSize / 2 + 3);
    } else if (room.stairsDownTile) {
      ctx.fillStyle = "#d87878";
      ctx.font = "bold 11px Arial";
      ctx.textAlign = "center";
      ctx.fillText("▼", x + cellSize / 2, y + cellSize / 2 + 4);
    } else if (room.stairsUpTile) {
      ctx.fillStyle = "#88b8d8";
      ctx.font = "bold 11px Arial";
      ctx.textAlign = "center";
      ctx.fillText("▲", x + cellSize / 2, y + cellSize / 2 + 4);
    }

    if (isCurrent) {
      ctx.fillStyle = "#e8c878";
      ctx.beginPath();
      ctx.arc(x + cellSize / 2, y + cellSize / 2, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  let depthListY = originY + 2;

  ctx.textAlign = "left";
  ctx.fillStyle = "#c8b8a8";
  ctx.font = "bold 11px Arial";
  ctx.fillText("FLOORS", depthListX, depthListY);
  depthListY += 16;

  ctx.font = "11px Arial";

  for (const depth of exploredDepths) {
    const isCurrentDepth = depth === currentDepth;

    ctx.fillStyle = isCurrentDepth ? "#e8c878" : "#7a6a5a";
    ctx.fillText(
      isCurrentDepth ? `▸ ${depth}` : `  ${depth}`,
      depthListX,
      depthListY,
    );
    depthListY += 15;
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#7a6a5a";
  ctx.font = "11px Arial";
  ctx.fillText("M or Map to close", panelX + panelW / 2, panelY + panelH - panelPad - 6);
  ctx.textAlign = "left";
}

function drawDoorAt(x: number, y: number, rotation = 0) {
  const door = SPRITES.door;
  const w = door.width * TILE_SCALE;
  const h = door.height * TILE_SCALE;

  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(rotation);
  drawSprite(ctx, door, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function drawRoomWalls(room: Room) {
  const ts = TILE_DRAW_SIZE;
  const cols = PLAY_WIDTH / ts;
  const rows = PLAY_HEIGHT / ts;
  const doorEndX = DOOR_START_X + DOOR_LENGTH;
  const doorEndY = DOOR_START_Y + DOOR_LENGTH;

  for (let col = 0; col < cols; col++) {
    const x = col * ts;

    for (let row = 0; row < rows; row++) {
      const y = row * ts;
      const onTop = row === 0;
      const onBottom = row === rows - 1;
      const onLeft = col === 0;
      const onRight = col === cols - 1;

      if (!onTop && !onBottom && !onLeft && !onRight) {
        continue;
      }

      if (onTop && room.exits.north && x >= DOOR_START_X && x < doorEndX) {
        continue;
      }

      if (onBottom && room.exits.south && x >= DOOR_START_X && x < doorEndX) {
        continue;
      }

      if (onLeft && room.exits.west && y >= DOOR_START_Y && y < doorEndY) {
        continue;
      }

      if (onRight && room.exits.east && y >= DOOR_START_Y && y < doorEndY) {
        continue;
      }

      let sprite = SPRITES.wallTop;

      if (onTop && onLeft) {
        sprite = SPRITES.wallCornerTL;
      } else if (onTop && onRight) {
        sprite = SPRITES.wallCornerTR;
      } else if (onBottom && onLeft) {
        sprite = SPRITES.wallCornerBL;
      } else if (onBottom && onRight) {
        sprite = SPRITES.wallCornerBR;
      } else if (onTop) {
        sprite = SPRITES.wallTop;
      } else if (onBottom) {
        sprite = col % 2 === 0 ? SPRITES.wallTop : SPRITES.wallTopAlt;
      } else if (onLeft) {
        sprite = SPRITES.wallLeft;
      } else if (onRight) {
        sprite = SPRITES.wallRight;
      }

      drawSprite(ctx, sprite, x, y, ts, ts);
    }
  }
}

function drawDoors(room: Room) {
  const doorW = SPRITES.door.width * TILE_SCALE;
  const doorH = SPRITES.door.height * TILE_SCALE;

  if (room.exits.north) {
    drawDoorAt(DOOR_START_X, 0, 0);
  }

  if (room.exits.south) {
    drawDoorAt(DOOR_START_X, PLAY_HEIGHT - doorH, Math.PI);
  }

  if (room.exits.west) {
    drawDoorAt(0, DOOR_START_Y, -Math.PI / 2);
  }

  if (room.exits.east) {
    drawDoorAt(PLAY_WIDTH - doorW, DOOR_START_Y, Math.PI / 2);
  }
}

function drawStairsTiles(room: Room) {
  if (room.stairsDownTile) {
    const tile = room.stairsDownTile;
    const sprite = SPRITES.stairsDown;
    const { w, h } = spriteDrawSize(sprite);
    const pulse = Math.sin(performance.now() / 300) * 2;

    drawSprite(ctx, sprite, tile.x, tile.y + pulse, w, h);

    ctx.fillStyle = "#e8c8ff";
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "center";
    ctx.fillText("▼ Ladder Down", tile.x + w / 2, tile.y + h + 12 + pulse);
    ctx.textAlign = "left";
  }

  if (room.stairsUpTile) {
    const tile = room.stairsUpTile;
    const sprite = SPRITES.stairsUp;
    const { w, h } = spriteDrawSize(sprite);
    const pulse = Math.sin(performance.now() / 300) * 2;

    drawSprite(ctx, sprite, tile.x, tile.y + pulse, w, h);

    ctx.fillStyle = "#b8e8ff";
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "center";
    ctx.fillText("▲ Ladder Up", tile.x + w / 2, tile.y + h + 12 + pulse);
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

function drawFloor(room: Room) {
  const seed = hashRoomSeed(room.id);
  const tileW = TILE_DRAW_SIZE;
  const tileH = TILE_DRAW_SIZE;

  for (let y = 0; y < PLAY_HEIGHT; y += tileH) {
    for (let x = 0; x < PLAY_WIDTH; x += tileW) {
      const tileIndex =
        (seed + (x / tileW) * 7 + (y / tileH) * 13) % FLOOR_TILES.length;
      drawSprite(ctx, FLOOR_TILES[tileIndex], x, y, tileW, tileH);
    }
  }
}

function drawRoomAtmosphere(room: Room) {
  ctx.fillStyle = room.background;
  ctx.globalAlpha = 0.55;
  ctx.fillRect(0, 0, PLAY_WIDTH, PLAY_HEIGHT);
  ctx.globalAlpha = 1;

  const centerX = PLAY_WIDTH / 2;
  const centerY = PLAY_HEIGHT / 2;
  const vignette = ctx.createRadialGradient(
    centerX,
    centerY,
    PLAY_WIDTH * 0.12,
    centerX,
    centerY,
    PLAY_WIDTH * 0.72,
  );

  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(0.65, "rgba(0, 0, 0, 0.18)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.55)");

  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, PLAY_WIDTH, PLAY_HEIGHT);
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

function drawVoidShardPickup() {
  const room = getCurrentRoom();

  if (!room.voidShardPickup || room.voidShardCollected) {
    return;
  }

  const screenX = room.voidShardPickup.x;
  const screenY = room.voidShardPickup.y;
  const pulse = Math.sin(performance.now() / 180) * 4;
  const bob = Math.sin(performance.now() / 320) * 3;

  ctx.fillStyle = "rgba(144, 64, 232, 0.22)";
  ctx.beginPath();
  ctx.arc(
    screenX + VOID_SHARD_SIZE / 2,
    screenY + VOID_SHARD_SIZE / 2 + bob,
    VOID_SHARD_SIZE * 0.7 + pulse * 0.15,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  drawSprite(
    ctx,
    SPRITES.voidShard,
    screenX,
    screenY + bob,
    VOID_SHARD_SIZE,
    VOID_SHARD_SIZE,
  );
}

function drawSlotMachine() {
  const room = getCurrentRoom();

  if (!room.slotMachine) {
    return;
  }

  const screenX = room.slotMachine.x;
  const screenY = room.slotMachine.y;
  const pulse = Math.sin(performance.now() / 340) * 2;

  ctx.fillStyle = "rgba(255, 168, 48, 0.12)";
  ctx.beginPath();
  ctx.arc(
    screenX + SLOT_MACHINE_SIZE / 2,
    screenY + SLOT_MACHINE_SIZE / 2 + pulse,
    SLOT_MACHINE_SIZE * 0.62,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  drawSprite(
    ctx,
    SPRITES.slotMachine,
    screenX,
    screenY + pulse,
    SLOT_MACHINE_SIZE,
    SLOT_MACHINE_SIZE,
  );

  if (isNearSlotMachine() && slotSpin.activeUntil <= performance.now()) {
    ctx.fillStyle = voidShards > 0 ? "#e8d8a0" : "#9a8878";
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      voidShards > 0 ? "E — Spin (1 shard)" : "E — Need shard",
      screenX + SLOT_MACHINE_SIZE / 2,
      screenY - 8 + pulse,
    );
    ctx.textAlign = "left";
  }
}

function drawSlotSpinOverlay() {
  const now = performance.now();

  if (slotSpin.activeUntil <= now) {
    return;
  }

  const progress = Math.min(1, (now - slotSpin.startedAt) / SLOT_SPIN_MS);
  const slowing = progress ** 3;
  const reelW = 72;
  const reelH = 72;
  const gap = 14;
  const panelW = reelW * 3 + gap * 2 + 48;
  const panelH = 170;
  const panelX = (PLAY_WIDTH - panelW) / 2;
  const panelY = (PLAY_HEIGHT - panelH) / 2;

  ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
  ctx.fillRect(0, 0, PLAY_WIDTH, PLAY_HEIGHT);

  ctx.fillStyle = "#1a1410";
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = "#c070ff";
  ctx.lineWidth = 3;
  ctx.strokeRect(panelX + 1.5, panelY + 1.5, panelW - 3, panelH - 3);

  ctx.fillStyle = "#e8d8c0";
  ctx.font = "bold 18px Arial";
  ctx.textAlign = "center";
  ctx.fillText("LEGENDARY SLOT", panelX + panelW / 2, panelY + 28);

  for (let reel = 0; reel < 3; reel++) {
    const reelX = panelX + 24 + reel * (reelW + gap);
    const reelY = panelY + 48;

    ctx.fillStyle = "#0e0a08";
    ctx.fillRect(reelX, reelY, reelW, reelH);
    ctx.strokeStyle = "#5a4838";
    ctx.lineWidth = 2;
    ctx.strokeRect(reelX, reelY, reelW, reelH);

    const spinOffset = Math.floor((now / (90 + reel * 30) + reel * 2) * (1 - slowing * 0.92));
    const weaponId =
      reel === 1 && progress > 0.82 && slotSpin.resultWeaponId
        ? slotSpin.resultWeaponId
        : LEGENDARY_WEAPON_IDS[
            (spinOffset + reel) % LEGENDARY_WEAPON_IDS.length
          ];

    drawSprite(
      ctx,
      getWeaponSprite(weaponId),
      reelX + 10,
      reelY + 10,
      reelW - 20,
      reelH - 20,
    );
  }

  if (progress > 0.9 && slotSpin.resultWeaponId) {
    ctx.fillStyle = "#ffd860";
    ctx.font = "bold 14px Arial";
    ctx.fillText(
      WEAPONS[slotSpin.resultWeaponId].name,
      panelX + panelW / 2,
      panelY + panelH - 18,
    );
  }

  ctx.textAlign = "left";
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
    const def = WEAPONS[item.weaponId];
    ctx.fillStyle = def.rarity === "legendary" ? "#ffd860" : "#fff";
    ctx.font = "9px Arial";
    ctx.textAlign = "center";
    ctx.fillText(def.name, centerX, slotY + slotSize - 20);
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

function handleCanvasMouseDown(event: MouseEvent) {
  if (state !== "playing") {
    return;
  }

  if (debugMode) {
    const pos = getCanvasMousePos(event);
    const room = getCurrentRoom();
    tileInspection = inspectTileAt(pos.x, pos.y, room, PLAY_WIDTH, PLAY_HEIGHT);
    return;
  }

  handleInventoryMouseDown(event);
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
    let sprite = SPRITES.rock;

    if (obstacle.kind === "wall") {
      const col = Math.round(obstacle.x / TILE_DRAW_SIZE);
      sprite = col % 2 === 0 ? SPRITES.wallTop : SPRITES.wallTopAlt;
    } else if (obstacle.kind === "pillar") {
      sprite = SPRITES.pillar;
    }

    const damaged = obstacle.hp < obstacle.maxHp;

    if (damaged) {
      ctx.save();
      ctx.globalAlpha = 0.72;
    }

    drawSprite(ctx, sprite, obstacle.x, obstacle.y, obstacle.w, obstacle.h);

    if (damaged) {
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = "#000000";
      ctx.fillRect(obstacle.x + 4, obstacle.y + 4, obstacle.w - 8, obstacle.h - 8);
      ctx.restore();
    }
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

  drawFloor(room);
  drawRoomAtmosphere(room);
  drawRoomWalls(room);

  drawObstacles(room);
  drawDoors(room);
  drawStairsTiles(room);
  drawWeaponPickup();
  drawPotionPickup();
  drawChest();
  drawVoidShardPickup();
  drawSlotMachine();

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

  if (!getCurrentRoom().coinCollected) {
    drawSpriteCentered(ctx, SPRITES.coin, coin.x + coin.size / 2, coin.y + coin.size / 2, coin.size);
  }

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
  drawTileDebugOverlay(ctx, tileInspection, debugMode, PLAY_WIDTH);

  if (mapOpen) {
    drawMapOverlay();
  }

  if (inventoryOpen) {
    drawInventoryOverlay();
  }

  if (slotSpin.activeUntil > performance.now()) {
    drawSlotSpinOverlay();
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

  for (let y = 0; y < h; y += FLOOR_TILES[0].height) {
    for (let x = 0; x < w; x += FLOOR_TILES[0].width) {
      const tileIndex = ((x / FLOOR_TILES[0].width) * 3 + (y / FLOOR_TILES[0].height) * 5) % FLOOR_TILES.length;
      drawSprite(menuCtx, FLOOR_TILES[tileIndex], x, y);
    }
  }

  menuCtx.fillStyle = "rgba(12, 8, 24, 0.45)";
  menuCtx.fillRect(0, 0, w, h);

  drawSprite(menuCtx, SPRITES.chestClosed, 28, 44 + bob * 0.3, 52, 52);
  drawSprite(menuCtx, SPRITES.coin, 164, 72 + bob, 30, 30);
  drawSprite(menuCtx, SPRITES.snakeHead, 248, 54 - bob * 0.4, 44, 44);
  drawSprite(menuCtx, SPRITES.snakeBody, 286, 58 - bob * 0.4, 36, 36);
  drawSprite(menuCtx, SPRITES.playerEast, 108, 32 + bob * 0.6, HERO_DRAW_SIZE, HERO_DRAW_SIZE);
  drawSprite(menuCtx, SPRITES.stairsDown, 300, 18, 40, 40);

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
canvas.addEventListener("mousedown", handleCanvasMouseDown);
canvas.addEventListener("mousemove", handleInventoryMouseMove);
window.addEventListener("mouseup", handleInventoryMouseUp);
canvas.addEventListener("mouseleave", handleInventoryMouseLeave);

let spritesReady = false;

loadAssetSprites()
  .then(() => {
    spritesReady = true;
    drawMenuArt();
    startMenuArtLoop();
  })
  .catch((error) => {
    console.warn("Failed to load external sprites, using built-in art.", error);
    spritesReady = true;
    drawMenuArt();
    startMenuArtLoop();
  });
