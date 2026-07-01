import "./style.css";
import titleLogoUrl from "../newsprites/titlelog.png";
import { SPRITES, drawSprite, drawSpriteCentered, drawTintedSprite, getWeaponSprite, drawWeaponSwingSprite, FLOOR_TILES } from "./sprites";
import { loadAssetSprites, getHeroHitbox, HERO_DRAW_SIZE, TILE_DRAW_SIZE, TILE_SCALE } from "./spriteAssets";
import { loadGolemSprites, areGolemSpritesLoaded, getLaserFrame } from "./golemSprites";
import { loadExecutionerSprites, areExecutionerSpritesLoaded } from "./executionerSprites";
import { loadWeaponSprites } from "./weaponSprites";
import { getBossAwakenMessage, getBossDefeatMessage, getBossKindForDepth, getBossWeaponDrop } from "./bossKind";
import {
  clearExecutionerEffects,
  createExecutionerBossState,
  drawExecutionerBoss,
  isExecutionerBossContactActive,
  isExecutionerDeathComplete,
  isExecutionerBoss,
  startExecutionerDeath,
  triggerExecutionerHurt,
  updateExecutionerBoss,
} from "./executionerBoss";
import { clampDeltaMs, deltaScale, TARGET_FRAME_MS } from "./timing";
import {
  getLegendaryWeaponPool,
  getOneStarWeaponPool,
  resetLegendaryPool,
  unlockGolemClubLegendary,
} from "./legendaryPool";
import {
  clearGolemEffects,
  createGolemBossState,
  drawGolemBoss,
  drawGolemEffects,
  isGolemBossContactActive,
  isGolemDeathComplete,
  startGolemDeath,
  triggerGolemHurt,
  updateGolemBoss,
} from "./golemBoss";
import {
  DOOR_LENGTH,
  DOOR_START_X,
  DOOR_START_Y,
  LAYOUT_TILE_SIZE,
  type LayoutObstacle,
} from "./roomLayouts";
import { drawTileDebugOverlay, inspectTileAt, type TileInspection } from "./tileDebug";
import {
  ARMOR_TIERS,
  ARMOR_VISUAL,
  BASE_MAX_HP,
  BOSS_HEART_HP_BONUS,
  BOSS_HEART_SIZE,
  CHEST_SIZE,
  DASH_COOLDOWN_MS,
  DASH_DURATION_MS,
  DASH_SPEED,
  DESCEND_BONUS,
  FLOOR_MESSAGE_MS,
  MAX_INVENTORY_SIZE,
  INVENTORY_ABSOLUTE_MAX,
  BOSS_INVENTORY_BONUS,
  ALL_WEAPON_IDS,
  MOB_COLORS,
  PLAY_HEIGHT,
  PLAY_WIDTH,
  POTION_PICKUP_SIZE,
  SCRAP_PICKUP_SIZE,
  SHOP_ITEMS,
  SHOP_STATION_SIZE,
  SPECIAL_ITEMS,
  SPECIAL_PICKUP_SIZE,
  SLOT_MACHINE_SIZE,
  SLOT_SPIN_MS,
  STAIRS_COOLDOWN_MS,
  VOID_SHARD_SIZE,
  WEAPON_PICKUP_SIZE,
  WEAPONS,
  formatWeaponName,
  getWeaponDisplayColor,
} from "./constants";
import { boxesOverlap, collidesWithRoomObstacles, isSpawnBoxClear } from "./collision";
import { generateFloor } from "./floorGeneration";
import { hashRoomSeed } from "./rng";
import { getArmorLabel, getNextArmorTier, tryCraftArmor } from "./crafting";
import {
  getAccessoryCatalogIds,
  getDiscoveredAccessories,
  getDiscoveredWeapons,
  isAccessoryDiscovered,
  isWeaponDiscovered,
  recordAccessoryDiscovered,
  recordWeaponDiscovered,
  resetWeaponEncyclopedia,
} from "./encyclopedia";
import {
  isNearShopStation,
  tryBuyHealthPotion,
  tryBuyStrongPotion,
  tryBuyWeaponRepair,
  tryBuySpecialItem,
} from "./shop";
import {
  formatBestWeapon,
  formatDuration,
  loadLeaderboard,
  saveRunToLeaderboard,
} from "./leaderboard";
import { createRunStats, getBestWeapon, recordMobKill, type RunStats } from "./runStats";
import {
  getEffectiveDamage,
  getLifeStealOnKill,
  getWeaponAbilityDescription,
  shouldChainStrike,
  shouldFireGolemBeam,
  getGolemBeamDamage,
  shouldSkipDurabilityLoss,
  shouldThrowSoulScythe,
  getSoulScytheDamage,
} from "./weaponAbilities";
import {
  ACCESSORY_SLOT_COUNT,
  canEquipAsAccessory,
  getAccessoryDamageBonus,
  getAccessoryDurabilityMultiplier,
  getAccessoryMaxHpBonus,
  playerHasDashEquipped,
} from "./accessories";
import {
  applyEnchantToItem,
  formatEnchantLabel,
  getEnchantDamageBonus,
  getEnchantDurabilityBonus,
  rollItemEnchant,
} from "./enchants";
import { clampToPlayBounds } from "./placement";
import { getEnchantDepthNear } from "./enchantFloors";
import type {
  ArmorTier,
  ChestLoot,
  Direction,
  Floor,
  GameState,
  InventoryItem,
  Room,
  RuntimeMob,
  SpecialItemId,
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
      <img
        id="menu-title-logo"
        class="menu-title-logo"
        src="${titleLogoUrl}"
        alt="Cavern Crawlers"
        width="440"
        height="220"
      />
      <p class="menu-tagline">Loot chests · Slay mobs · Delve deeper</p>
      <canvas id="menu-art" class="menu-art" width="360" height="128" aria-hidden="true"></canvas>
      <div class="menu-actions">
        <button id="play-btn" class="menu-btn menu-btn-primary" type="button">Enter the Cavern</button>
        <button id="help-btn" class="menu-btn menu-btn-secondary" type="button">Controls</button>
        <button id="leaderboard-btn" class="menu-btn menu-btn-secondary" type="button">Leaderboard</button>
      </div>
    </div>
    <div id="menu-leaderboard" class="menu-help hidden">
      <h2 class="menu-help-title">Past Runs</h2>
      <div id="leaderboard-list" class="leaderboard-list"></div>
      <button id="leaderboard-close-btn" class="menu-btn menu-btn-secondary" type="button">Back</button>
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
        <div><dt>Encyclopedia</dt><dd><kbd>K</kbd> · scroll with mouse wheel</dd></div>
        <div><dt>Pause</dt><dd><kbd>Esc</kbd></dd></div>
        <div><dt>Debug</dt><dd><kbd>F3</kbd> tiles · <kbd>F4</kbd> cheat menu</dd></div>
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
    <div class="game-canvas-wrap">
      <canvas id="game" width="800" height="416"></canvas>
    </div>
    <p class="game-hint">WASD move · Space attack · E interact · M map · I inv · K encyclopedia · Esc pause · F3 tiles · F4 debug</p>
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
const menuLeaderboardEl = required(
  document.querySelector<HTMLDivElement>("#menu-leaderboard"),
  "Menu leaderboard",
);
const leaderboardListEl = required(
  document.querySelector<HTMLDivElement>("#leaderboard-list"),
  "Leaderboard list",
);
const playBtn = required(
  document.querySelector<HTMLButtonElement>("#play-btn"),
  "Play button",
);
const helpBtn = required(document.querySelector<HTMLButtonElement>("#help-btn"), "Help button");
const helpCloseBtn = required(
  document.querySelector<HTMLButtonElement>("#help-close-btn"),
  "Help close button",
);
const leaderboardBtn = required(
  document.querySelector<HTMLButtonElement>("#leaderboard-btn"),
  "Leaderboard button",
);
const leaderboardCloseBtn = required(
  document.querySelector<HTMLButtonElement>("#leaderboard-close-btn"),
  "Leaderboard close button",
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

const DOOR_HIT_DEPTH = TILE_DRAW_SIZE;

const INVENTORY_UI = {
  slotSize: 58,
  slotGap: 8,
  cols: 3,
};

type EncyclopediaTab = "weapons" | "accessories";

function getInventoryLayout() {
  const { slotSize, slotGap, cols } = INVENTORY_UI;
  const bagRows = Math.ceil(inventorySlotCount / cols);
  const accRowW = ACCESSORY_SLOT_COUNT * slotSize + (ACCESSORY_SLOT_COUNT - 1) * slotGap;
  const bagRowW = cols * slotSize + (cols - 1) * slotGap;
  const panelWidth = Math.max(accRowW, bagRowW) + 56;
  const headerH = 52;
  const accBlockH = 18 + slotSize + 12;
  const bagBlockH = 18 + bagRows * slotSize + Math.max(0, bagRows - 1) * slotGap;
  const footerH = 24;
  const panelHeight = headerH + accBlockH + bagBlockH + footerH;
  const panelX = Math.floor((PLAY_WIDTH - panelWidth) / 2);
  const panelY = Math.max(6, Math.floor((PLAY_HEIGHT - panelHeight) / 2));

  return {
    panelX,
    panelY,
    panelWidth,
    panelHeight,
    slotSize,
    slotGap,
    cols,
    accessoryRowX: panelX + (panelWidth - accRowW) / 2,
    accessoryRowY: panelY + headerH + 18,
    accLabelY: panelY + headerH + 4,
    gridX: panelX + (panelWidth - bagRowW) / 2,
    gridY: panelY + headerH + accBlockH + 18,
    bagLabelY: panelY + headerH + accBlockH + 4,
    footerY: panelY + panelHeight - 14,
  };
}

type DebugGrantEntry =
  | { kind: "weapon"; weaponId: WeaponId }
  | { kind: "health-potion"; healAmount: number }
  | { kind: "strong-potion"; healAmount: number }
  | { kind: "special"; specialId: SpecialItemId };

const DEBUG_ITEM_CATALOG: DebugGrantEntry[] = [
  ...ALL_WEAPON_IDS.map((weaponId) => ({ kind: "weapon" as const, weaponId })),
  { kind: "health-potion", healAmount: 50 },
  { kind: "strong-potion", healAmount: 80 },
  { kind: "special", specialId: "dash-boots" },
  { kind: "special", specialId: "power-ring" },
  { kind: "special", specialId: "stone-charm" },
  { kind: "special", specialId: "vitality-charm" },
];

const ITEM_DEBUG_UI = {
  panelX: 80,
  panelY: 28,
  panelWidth: 640,
  panelHeight: 360,
  slotSize: 72,
  slotGap: 10,
  gridX: 108,
  gridY: 88,
  cols: 4,
};

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


let floorMessageUntil = 0;
let floorMessage = "";
let stairsCooldownUntil = 0;
let stairsPrompt: "down" | "up" | null = null;

interface PlayerGolemBeam {
  originX: number;
  originY: number;
  angle: number;
  length: number;
  width: number;
  activeUntil: number;
}

const playerGolemBeams: PlayerGolemBeam[] = [];

interface SoulScytheProjectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  spinRate: number;
  damage: number;
  size: number;
  activeUntil: number;
  hitMobIndices: Set<number>;
}

const soulScytheProjectiles: SoulScytheProjectile[] = [];

const equippedAccessories: (InventoryItem | null)[] = Array.from(
  { length: ACCESSORY_SLOT_COUNT },
  () => null,
);
let accessoryHpBonus = 0;

let enchantOverlayOpen = false;

let dashCooldownUntil = 0;
let dashActiveUntil = 0;
let dashDirection: Direction = "east";

let mapOpen = false;
let inventoryOpen = false;
let encyclopediaOpen = false;
let encyclopediaScroll = 0;
let encyclopediaTab: EncyclopediaTab = "weapons";
let debugMenuOpen = false;
let itemDebugMenuOpen = false;
let itemDebugHoverIndex = -1;
let debugGodMode = false;
let debugInstakill = false;
let debugMode = false;
let tileInspection: TileInspection | null = null;
let shopOpen = false;
let inventorySlotCount = MAX_INVENTORY_SIZE;
let runStats: RunStats = createRunStats();
const inventory: (InventoryItem | null)[] = Array.from(
  { length: INVENTORY_ABSOLUTE_MAX },
  () => null,
);

const inventoryDrag = {
  fromSlot: -1,
  fromAccessory: false,
  item: null as InventoryItem | null,
  x: 0,
  y: 0,
  pointerDown: false,
  dragging: false,
  startX: 0,
  startY: 0,
};

let inventoryHoverX = 0;
let inventoryHoverY = 0;

const INVENTORY_DRAG_THRESHOLD = 6;

let state: GameState = "menu";
let score = 0;
let voidShards = 0;
let scrap = 0;
let armorTier: ArmorTier = "none";

const slotSpin = {
  activeUntil: 0,
  resultWeaponId: null as WeaponId | null,
  startedAt: 0,
};

const hp = {
  max: BASE_MAX_HP,
  current: BASE_MAX_HP,
  invincibilityMs: 1000,
};

let invincibleUntil = 0;
let lastUpdateTime = 0;
let gamePaused = false;
const playerKnockback = { x: 0, y: 0 };

const keys = new Set<string>();

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  keys.add(key);

  if (key === "escape" && state === "playing") {
    if (itemDebugMenuOpen) {
      event.preventDefault();
      itemDebugMenuOpen = false;
      return;
    }

    if (debugMenuOpen) {
      event.preventDefault();
      debugMenuOpen = false;
      return;
    }

    if (shopOpen) {
      event.preventDefault();
      toggleShop(false);
      return;
    }

    if (encyclopediaOpen) {
      event.preventDefault();
      toggleEncyclopedia();
      return;
    }

    if (mapOpen) {
      event.preventDefault();
      setMapOpen(false);
      return;
    }

    if (inventoryOpen) {
      event.preventDefault();
      setInventoryOpen(false);
      return;
    }

    if (enchantOverlayOpen) {
      event.preventDefault();
      return;
    }

    if (stairsPrompt) {
      event.preventDefault();
      stairsPrompt = null;
      return;
    }

    event.preventDefault();
    gamePaused = !gamePaused;
    return;
  }

  if (shopOpen && state === "playing") {
    if (key === "q") {
      event.preventDefault();
      handleShopPurchase("health");
    }

    if (key === "w") {
      event.preventDefault();
      handleShopPurchase("strong");
    }

    if (key === "r") {
      event.preventDefault();
      handleShopPurchase("repair");
    }

    if (key === "t") {
      event.preventDefault();
      handleShopPurchase("craft");
    }

    if (key === "u") {
      event.preventDefault();
      handleShopPurchase("dash");
    }

    if (key === "e" || key === "escape") {
      event.preventDefault();
      toggleShop(false);
    }

    return;
  }

  if (encyclopediaOpen && state === "playing") {
    if (key === "1") {
      event.preventDefault();
      encyclopediaTab = "weapons";
      encyclopediaScroll = 0;
      return;
    }

    if (key === "2") {
      event.preventDefault();
      encyclopediaTab = "accessories";
      encyclopediaScroll = 0;
      return;
    }

    if (key === "k" || key === "escape") {
      event.preventDefault();
      toggleEncyclopedia();
      return;
    }
  }

  if ((event.key === "`" || event.key === "F3") && state === "playing") {
    event.preventDefault();
    debugMode = !debugMode;

    if (!debugMode) {
      tileInspection = null;
    }
  }

  if ((event.key === "F4" || event.code === "F4") && state === "playing") {
    event.preventDefault();
    itemDebugMenuOpen = false;

    if (debugMenuOpen) {
      debugMenuOpen = false;
    } else {
      debugMenuOpen = true;
      shopOpen = false;
      setMapOpen(false);
      setInventoryOpen(false);
      encyclopediaOpen = false;
    }

    return;
  }

  if ((event.key === "F5" || event.code === "F5") && state === "playing") {
    event.preventDefault();
    toggleItemDebugMenu();
    return;
  }

  if (itemDebugMenuOpen && state === "playing") {
    if (key === "escape" || key === "f5") {
      event.preventDefault();
      itemDebugMenuOpen = false;
    }

    return;
  }

  if (debugMenuOpen && state === "playing") {
    event.preventDefault();
    handleDebugMenuKey(key);
    return;
  }

  if (stairsPrompt && state === "playing") {
    if (key === "y" || key === "enter") {
      event.preventDefault();
      confirmStairsPrompt();
    } else if (key === "n" || key === "escape") {
      event.preventDefault();
      dismissStairsPrompt();
    }

    return;
  }

  if (key === "shift" && state === "playing") {
    event.preventDefault();
    tryDash();
  }

  if (key === " " && state === "playing") {
    event.preventDefault();
    tryAttack();
  }

  if (key === "m" && state === "playing") {
    event.preventDefault();
    toggleMap();
  }

  if (key === "i" && state === "playing" && !enchantOverlayOpen) {
    event.preventDefault();
    toggleInventory();
  }

  if (key === "e" && state === "playing") {
    event.preventDefault();
    tryInteract();
  }

  if (key === "k" && state === "playing") {
    event.preventDefault();
    toggleEncyclopedia();
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

  if (enchantOverlayOpen && state === "playing" && key === "escape") {
    event.preventDefault();
    return;
  }

  if (inventoryOpen && state === "playing" && (key === "delete" || key === "backspace")) {
    event.preventDefault();
    const hoverAccSlot = getAccessorySlotAt(inventoryHoverX, inventoryHoverY);
    const hoverSlot = getInventorySlotAt(inventoryHoverX, inventoryHoverY);

    if (hoverAccSlot !== null) {
      discardAccessoryItem(hoverAccSlot);
    } else if (hoverSlot !== null) {
      discardInventoryItem(hoverSlot);
    }
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

function getPlayerCollisionBox(drawX = player.x, drawY = player.y) {
  const hitbox = getHeroHitbox();

  return {
    x: drawX + hitbox.insetX,
    y: drawY + hitbox.insetY,
    w: hitbox.w,
    h: hitbox.h,
  };
}

function setPlayerDrawPositionFromHitbox(hitboxX: number, hitboxY: number) {
  const hitbox = getHeroHitbox();
  player.x = hitboxX - hitbox.insetX;
  player.y = hitboxY - hitbox.insetY;
}

function collidesWithObstacles(
  box: { x: number; y: number; w: number; h: number },
  room = getCurrentRoom(),
) {
  return collidesWithRoomObstacles(box, room);
}

function collidesWithMobSegments(box: { x: number; y: number; w: number; h: number }) {
  for (const mob of activeMobs) {
    if (!isMobAlive(mob) || isExecutionerBoss(mob)) {
      continue;
    }

    for (const segment of mob.segments) {
      if (
        boxesOverlap(box, {
          x: segment.x,
          y: segment.y,
          w: mob.size,
          h: mob.size,
        })
      ) {
        return true;
      }
    }
  }

  return false;
}


function resolvePositionAgainst(
  x: number,
  y: number,
  prevX: number,
  prevY: number,
  isBlocked: (x: number, y: number) => boolean,
) {
  if (!isBlocked(x, y)) {
    return { x, y };
  }

  if (!isBlocked(x, prevY)) {
    return { x, y: prevY };
  }

  if (!isBlocked(prevX, y)) {
    return { x: prevX, y };
  }

  return { x: prevX, y: prevY };
}

function resolvePlayerPosition(
  x: number,
  y: number,
  w: number,
  h: number,
  prevX: number,
  prevY: number,
) {
  return resolvePositionAgainst(x, y, prevX, prevY, (nextX, nextY) => {
    const box = { x: nextX, y: nextY, w, h };
    return collidesWithObstacles(box) || collidesWithMobSegments(box);
  });
}

function resolveMobPosition(
  x: number,
  y: number,
  w: number,
  h: number,
  prevX: number,
  prevY: number,
) {
  return resolvePositionAgainst(x, y, prevX, prevY, (nextX, nextY) =>
    collidesWithObstacles({ x: nextX, y: nextY, w, h }),
  );
}

function mobBoxOverlapsPlayer(x: number, y: number, size: number) {
  return boxesOverlap(getPlayerCollisionBox(), { x, y, w: size, h: size });
}

function resolvePlayerMobOverlap() {
  const hitbox = getHeroHitbox();
  const prevBox = getPlayerCollisionBox();
  let boxX = prevBox.x;
  let boxY = prevBox.y;
  const boxW = hitbox.w;
  const boxH = hitbox.h;

  for (const mob of activeMobs) {
    if (!isMobAlive(mob) || isExecutionerBoss(mob)) {
      continue;
    }

    for (const segment of mob.segments) {
      const playerBox = { x: boxX, y: boxY, w: boxW, h: boxH };
      const mobBox = { x: segment.x, y: segment.y, w: mob.size, h: mob.size };

      if (!boxesOverlap(playerBox, mobBox)) {
        continue;
      }

      const overlapLeft = boxX + boxW - segment.x;
      const overlapRight = segment.x + mob.size - boxX;
      const overlapTop = boxY + boxH - segment.y;
      const overlapBottom = segment.y + mob.size - boxY;
      const minOverlapX = Math.min(overlapLeft, overlapRight);
      const minOverlapY = Math.min(overlapTop, overlapBottom);

      if (minOverlapX < minOverlapY) {
        boxX += overlapLeft < overlapRight ? -minOverlapX : minOverlapX;
      } else {
        boxY += overlapTop < overlapBottom ? -minOverlapY : minOverlapY;
      }
    }
  }

  const resolved = resolvePlayerPosition(boxX, boxY, boxW, boxH, prevBox.x, prevBox.y);
  setPlayerDrawPositionFromHitbox(resolved.x, resolved.y);
  player.x = Math.max(0, Math.min(PLAY_WIDTH - player.size, player.x));
  player.y = Math.max(0, Math.min(PLAY_HEIGHT - player.size, player.y));
}

function clampMobToRoom(mob: RuntimeMob, segmentIndex: number) {
  const segment = mob.segments[segmentIndex];
  const prevX = segment.x;
  const prevY = segment.y;

  segment.x = Math.max(0, Math.min(PLAY_WIDTH - mob.size, segment.x));
  segment.y = Math.max(0, Math.min(PLAY_HEIGHT - mob.size, segment.y));

  const resolved = resolveMobPosition(
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

function getStairsTilePosition(kind: "down" | "up" = "down") {
  const sprite = kind === "up" ? SPRITES.stairsUp : SPRITES.stairsDown;
  const { w, h } = spriteDrawSize(sprite);

  return {
    x: PLAY_WIDTH / 2 - w / 2,
    y: PLAY_HEIGHT / 2 - h / 2,
  };
}

function spawnBossDownStairs(room: Room) {
  if (room.stairsDownTile) {
    return;
  }

  room.stairsDownTile = getStairsTilePosition("down");
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

function ensureFloor(depth: number) {
  if (!floors.has(depth)) {
    floors.set(depth, generateFloor(depth, runSeed + depth * 9973, coin.size, runSeed));
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
    shopOpen = false;
    encyclopediaOpen = false;
  }
}

function setInventoryOpen(open: boolean) {
  inventoryOpen = open;
  invBtn.textContent = inventoryOpen ? "Close" : "Inv";
  resetInventoryDrag();

  if (open) {
    setMapOpen(false);
    shopOpen = false;
    encyclopediaOpen = false;
  }
}

function setMenuLeaderboardOpen(open: boolean) {
  menuLeaderboardEl.classList.toggle("hidden", !open);
  menuEl.querySelector(".menu-content")?.classList.toggle("hidden", open);

  if (open) {
    menuHelpEl.classList.add("hidden");
    renderLeaderboard();
  }
}

function renderLeaderboard() {
  const entries = loadLeaderboard();

  if (entries.length === 0) {
    leaderboardListEl.innerHTML = `<p class="leaderboard-empty">No runs recorded yet. Delve and fall gloriously!</p>`;
    return;
  }

  leaderboardListEl.innerHTML = entries
    .map(
      (entry, index) => `
      <div class="leaderboard-row">
        <span class="leaderboard-rank">#${index + 1}</span>
        <span class="leaderboard-score">${entry.score} pts</span>
        <span class="leaderboard-depth">Depth ${entry.deepestDepth}</span>
        <span class="leaderboard-kills">${entry.enemiesKilled} kills</span>
        <span class="leaderboard-weapon">${formatBestWeapon(entry.bestWeaponId)}</span>
        <span class="leaderboard-time">${formatDuration(entry.durationMs)}</span>
      </div>`,
    )
    .join("");
}

function handleDebugMenuKey(key: string) {
  switch (key) {
    case "escape":
      debugMenuOpen = false;
      break;
    case "g":
      debugGodMode = !debugGodMode;
      showFloorMessage(debugGodMode ? "God mode ON" : "God mode OFF");
      break;
    case "k":
      debugInstakill = !debugInstakill;
      showFloorMessage(debugInstakill ? "Instakill ON" : "Instakill OFF");
      break;
    case "h":
      hp.current = hp.max;
      showFloorMessage("Healed to full.");
      break;
    case "c":
      score += 50;
      showFloorMessage("+50 coins");
      break;
    case "s":
      scrap += 10;
      showFloorMessage("+10 scrap");
      break;
    case "w": {
      const weaponId = ALL_WEAPON_IDS[Math.floor(Math.random() * ALL_WEAPON_IDS.length)];
      addWeaponToInventory(weaponId);
      showFloorMessage(`Spawned ${WEAPONS[weaponId].name}`);
      break;
    }
    case "p": {
      const room = getCurrentRoom();
      room.weaponPickup = {
        x: player.x + 20,
        y: player.y,
        weaponId: getLegendaryWeaponPool()[
          Math.floor(Math.random() * getLegendaryWeaponPool().length)
        ],
      };
      showFloorMessage("Legendary weapon spawned nearby.");
      break;
    }
    case "t":
      debugTeleportToStairs();
      break;
    case "e":
      debugTeleportToEnchantRoom();
      break;
    case "n":
      debugTeleportNextRoom();
      break;
    case "d":
      if (currentDepth < 50) {
        descendFloor();
      }
      break;
    case "i":
      itemDebugMenuOpen = true;
      debugMenuOpen = false;
      itemDebugHoverIndex = -1;
      break;
  }
}

function debugTeleportToStairs() {
  saveMobsToRoom();
  loadRoom(getCurrentFloor().stairsDownRoomId);
  const room = getCurrentRoom();

  if (room.stairsDownTile) {
    spawnAtTile(room.stairsDownTile, false, "down");
  }

  showFloorMessage("Teleported to stairs room.");
}

function debugTeleportNextRoom() {
  const room = getCurrentRoom();
  const exits = Object.entries(room.exits) as [Direction, string][];

  if (exits.length === 0) {
    return;
  }

  const [dir, roomId] = exits[0];
  const enteredFrom =
    dir === "north"
      ? "south"
      : dir === "south"
        ? "north"
        : dir === "east"
          ? "west"
          : "east";

  changeRoom(roomId, enteredFrom);
  showFloorMessage(`Teleported ${dir}.`);
}

function debugTeleportToEnchantRoom() {
  saveMobsToRoom();

  const targetDepth = getEnchantDepthNear(runSeed, currentDepth);

  currentDepth = targetDepth;
  deepestDepth = Math.max(deepestDepth, currentDepth);
  ensureFloor(currentDepth);

  const floor = getCurrentFloor();
  loadRoom(floor.startRoomId);

  const room = getCurrentRoom();
  const hasSeal = room.obstacles.some((obstacle) => obstacle.enchantSeal);

  if (!hasSeal && !room.enchantSealBroken) {
    for (const candidate of Object.values(floor.rooms)) {
      if (candidate.obstacles.some((obstacle) => obstacle.enchantSeal)) {
        loadRoom(candidate.id);
        break;
      }
    }
  }

  const enchantRoom = getCurrentRoom();
  const sealStillMissing = !enchantRoom.obstacles.some((obstacle) => obstacle.enchantSeal);

  if (sealStillMissing && !enchantRoom.enchantSealBroken) {
    const sealX = Math.min(PLAY_WIDTH - LAYOUT_TILE_SIZE - 24, player.x + 48);
    const sealY = Math.max(24, player.y - 16);
    enchantRoom.obstacles.push({
      x: sealX,
      y: sealY,
      w: LAYOUT_TILE_SIZE,
      h: LAYOUT_TILE_SIZE,
      kind: "rock",
      hp: 1,
      maxHp: 1,
      enchantSeal: true,
    });
  }

  player.x = PLAY_WIDTH / 2 - player.size / 2;
  player.y = PLAY_HEIGHT / 2 - player.size / 2;
  showFloorMessage(`Teleported to depth ${targetDepth} (this run's enchant floor).`);
}

function toggleItemDebugMenu(open?: boolean) {
  itemDebugMenuOpen = open ?? !itemDebugMenuOpen;
  itemDebugHoverIndex = -1;

  if (itemDebugMenuOpen) {
    debugMenuOpen = false;
    shopOpen = false;
    setMapOpen(false);
    setInventoryOpen(false);
    encyclopediaOpen = false;
  }
}

function getItemDebugSlotRect(index: number) {
  const col = index % ITEM_DEBUG_UI.cols;
  const row = Math.floor(index / ITEM_DEBUG_UI.cols);

  return {
    x: ITEM_DEBUG_UI.gridX + col * (ITEM_DEBUG_UI.slotSize + ITEM_DEBUG_UI.slotGap),
    y: ITEM_DEBUG_UI.gridY + row * (ITEM_DEBUG_UI.slotSize + ITEM_DEBUG_UI.slotGap),
    w: ITEM_DEBUG_UI.slotSize,
    h: ITEM_DEBUG_UI.slotSize,
  };
}

function getItemDebugSlotAt(x: number, y: number) {
  for (let i = 0; i < DEBUG_ITEM_CATALOG.length; i++) {
    const rect = getItemDebugSlotRect(i);

    if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) {
      return i;
    }
  }

  return null;
}

function grantDebugItem(entry: DebugGrantEntry) {
  if (entry.kind === "weapon") {
    const slot = addWeaponToInventory(entry.weaponId);

    if (slot !== null) {
      showFloorMessage(`Debug: ${WEAPONS[entry.weaponId].name} added`);
    }

    return;
  }

  if (entry.kind === "special") {
    if (addToInventory({ type: "special", specialId: entry.specialId }) !== null) {
      showFloorMessage(`Debug: ${SPECIAL_ITEMS[entry.specialId].name} added`);
    }

    return;
  }

  if (addToInventory({ type: entry.kind, healAmount: entry.healAmount }) !== null) {
    const label = entry.kind === "strong-potion" ? "Strong Potion" : "Health Potion";
    showFloorMessage(`Debug: ${label} (+${entry.healAmount} HP) added`);
  }
}

function toggleEncyclopedia() {
  encyclopediaOpen = !encyclopediaOpen;
  encyclopediaScroll = 0;
  encyclopediaTab = "weapons";

  if (encyclopediaOpen) {
    setMapOpen(false);
    setInventoryOpen(false);
    shopOpen = false;
    debugMenuOpen = false;
  }
}

function getEncyclopediaEntryCount() {
  return encyclopediaTab === "weapons" ? ALL_WEAPON_IDS.length : getAccessoryCatalogIds().length;
}

function toggleEncyclopediaScroll(delta: number) {
  if (!encyclopediaOpen) {
    return;
  }

  const entryHeight = encyclopediaTab === "weapons" ? 78 : 68;
  const visibleHeight = 250;
  const maxScroll = Math.max(0, getEncyclopediaEntryCount() * entryHeight - visibleHeight);
  encyclopediaScroll = Math.max(0, Math.min(maxScroll, encyclopediaScroll + delta));
}

function toggleShop(open: boolean) {
  shopOpen = open;

  if (open) {
    setMapOpen(false);
    setInventoryOpen(false);
    encyclopediaOpen = false;
  }
}

function tryInteract() {
  const room = getCurrentRoom();
  const playerBox = getPlayerCollisionBox();

  if (isNearShopStation(room, playerBox)) {
    toggleShop(true);
    return;
  }

  if (tryOpenStairsPrompt()) {
    return;
  }

  if (room.slotMachine && isNearSlotMachine()) {
    tryUseSlotMachine();
  }
}

function handleShopPurchase(choice: "health" | "strong" | "repair" | "craft" | "dash") {
  const scoreRef = { value: score };
  const scrapRef = { value: scrap };
  const armorRef = { value: armorTier };
  let message: string | null = null;

  if (choice === "health") {
    const result = tryBuyHealthPotion(scoreRef);

    if (result?.startsWith("bought:")) {
      const heal = Number(result.split(":")[1]);
      addToInventory({ type: "health-potion", healAmount: heal });
      message = `Bought health potion (+${heal} HP)`;
    } else {
      message = result;
    }
  } else if (choice === "strong") {
    const result = tryBuyStrongPotion(scoreRef);

    if (result?.startsWith("bought-strong:")) {
      const heal = Number(result.split(":")[1]);
      addToInventory({ type: "strong-potion", healAmount: heal });
      message = `Bought strong potion (+${heal} HP)`;
    } else {
      message = result;
    }
  } else if (choice === "repair") {
    message = tryBuyWeaponRepair(scoreRef, inventory, activeWeaponSlot);
  } else if (choice === "dash") {
    message = tryBuySpecialItem(scoreRef, "dash-boots");

    if (message?.startsWith("bought-special:")) {
      const specialId = message.split(":")[1] as SpecialItemId;
      addToInventory({ type: "special", specialId });
      message = `Bought ${SPECIAL_ITEMS[specialId].name}`;
    }
  } else {
    message = tryCraftArmor(scrapRef, armorRef, hp);
    armorTier = armorRef.value;
  }

  score = scoreRef.value;
  scrap = scrapRef.value;

  if (message) {
    showFloorMessage(message);
  }
}

function resetInventoryDrag() {
  inventoryDrag.fromSlot = -1;
  inventoryDrag.fromAccessory = false;
  inventoryDrag.item = null;
  inventoryDrag.pointerDown = false;
  inventoryDrag.dragging = false;
  canvas.style.cursor = "";
}

function clampDragPosition(x: number, y: number, slotSize: number) {
  const half = slotSize / 2;
  return {
    x: Math.max(half, Math.min(PLAY_WIDTH - half, x)),
    y: Math.max(half, Math.min(PLAY_HEIGHT - half, y)),
  };
}

function syncAccessoryHpBonus() {
  const newBonus = getAccessoryMaxHpBonus(equippedAccessories);
  const delta = newBonus - accessoryHpBonus;
  accessoryHpBonus = newBonus;
  hp.max += delta;

  if (delta > 0) {
    hp.current += delta;
  } else {
    hp.current = Math.min(hp.current, hp.max);
  }
}

function getWeaponMaxDurability(item: InventoryItem) {
  const def = WEAPONS[item.weaponId!];
  const mult = getAccessoryDurabilityMultiplier(equippedAccessories);
  return Math.floor(def.maxDurability * mult) + getEnchantDurabilityBonus(item);
}

function getPlayerWeaponDamage(_weaponId: WeaponId, baseDamage: number) {
  const activeItem = getActiveWeaponItem();
  let damage = baseDamage + getAccessoryDamageBonus(equippedAccessories);

  if (activeItem) {
    damage += getEnchantDamageBonus(activeItem);
  }

  return damage;
}

function getAccessorySlotRect(slot: number) {
  const layout = getInventoryLayout();
  const { accessoryRowX, accessoryRowY, slotSize, slotGap } = layout;

  return {
    x: accessoryRowX + slot * (slotSize + slotGap),
    y: accessoryRowY,
    w: slotSize,
    h: slotSize,
  };
}

function getAccessorySlotAt(x: number, y: number) {
  for (let slot = 0; slot < ACCESSORY_SLOT_COUNT; slot++) {
    const rect = getAccessorySlotRect(slot);

    if (x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h) {
      return slot;
    }
  }

  return null;
}

function moveAccessoryItem(fromSlot: number, toSlot: number) {
  if (fromSlot === toSlot) {
    return;
  }

  const moving = equippedAccessories[fromSlot];
  equippedAccessories[fromSlot] = equippedAccessories[toSlot];
  equippedAccessories[toSlot] = moving;
  syncAccessoryHpBonus();
}

function equipAccessoryFromInventory(invSlot: number, accSlot: number) {
  const item = inventory[invSlot];

  if (!canEquipAsAccessory(item)) {
    return;
  }

  if (item?.specialId) {
    recordAccessoryDiscovered(item.specialId);
  }

  const previous = equippedAccessories[accSlot];
  equippedAccessories[accSlot] = item;
  inventory[invSlot] = previous;
  syncAccessoryHpBonus();
}

function unequipAccessoryToInventory(accSlot: number, invSlot: number) {
  const item = equippedAccessories[accSlot];

  if (!item) {
    return;
  }

  const target = inventory[invSlot];
  equippedAccessories[accSlot] = target && canEquipAsAccessory(target) ? target : null;
  inventory[invSlot] = item;
  syncAccessoryHpBonus();
}

function discardAccessoryItem(slot: number) {
  const item = equippedAccessories[slot];

  if (!item || !item.specialId) {
    return;
  }

  equippedAccessories[slot] = null;
  syncAccessoryHpBonus();
  showFloorMessage(`Discarded ${SPECIAL_ITEMS[item.specialId].name}.`);
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
  const layout = getInventoryLayout();
  const col = slot % layout.cols;
  const row = Math.floor(slot / layout.cols);

  return {
    x: layout.gridX + col * (layout.slotSize + layout.slotGap),
    y: layout.gridY + row * (layout.slotSize + layout.slotGap),
    w: layout.slotSize,
    h: layout.slotSize,
  };
}

function getInventorySlotAt(x: number, y: number) {
  for (let slot = 0; slot < inventorySlotCount; slot++) {
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

function discardInventoryItem(slot: number) {
  const item = inventory[slot];

  if (!item) {
    return;
  }

  const label =
    item.type === "weapon" && item.weaponId
      ? WEAPONS[item.weaponId].name
      : item.type === "special" && item.specialId
        ? SPECIAL_ITEMS[item.specialId].name
        : item.type === "strong-potion"
          ? "Strong potion"
          : item.type === "health-potion"
            ? "Health potion"
            : "Item";

  inventory[slot] = null;

  if (slot === activeWeaponSlot) {
    activeWeaponSlot = null;
    ensureActiveWeaponSlot();
  }

  showFloorMessage(`Discarded ${label}.`);
}

function isPointInInventoryPanel(x: number, y: number) {
  const { panelX, panelY, panelWidth, panelHeight } = getInventoryLayout();

  return x >= panelX && x <= panelX + panelWidth && y >= panelY && y <= panelY + panelHeight;
}

function canEnchantItem(item: InventoryItem | null) {
  return item?.type === "weapon" && !!item.weaponId;
}

function openEnchantChamber() {
  enchantOverlayOpen = true;
  showFloorMessage("Secret enchant chamber! Click a weapon to imbue it.");
}

function applyEnchantToInventorySlot(slot: number) {
  const item = inventory[slot];

  if (!canEnchantItem(item)) {
    return;
  }

  const enchant = rollItemEnchant(Math.random);
  inventory[slot] = applyEnchantToItem(item!, enchant);
  enchantOverlayOpen = false;
  getCurrentRoom().enchantSealBroken = true;
  player.x = PLAY_WIDTH / 2 - player.size / 2;
  player.y = PLAY_HEIGHT - 140;
  showFloorMessage(`${enchant.label} applied! The chamber fades away...`);
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
  clearGolemEffects();
  clearExecutionerEffects();
  playerGolemBeams.length = 0;
  soulScytheProjectiles.length = 0;

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
      bossKind: config.bossKind,
      golemState:
        config.type === "boss" && config.bossKind !== "executioner"
          ? createGolemBossState()
          : undefined,
      executionerState:
        config.type === "boss" && config.bossKind === "executioner"
          ? createExecutionerBossState()
          : undefined,
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
  return inventory.slice(0, inventorySlotCount).filter((slot) => slot !== null).length;
}

function findFirstEmptySlot() {
  return inventory.slice(0, inventorySlotCount).findIndex((slot) => slot === null);
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

  const nextWeaponSlot = inventory
    .slice(0, inventorySlotCount)
    .findIndex((item) => item?.type === "weapon" && item.weaponId && getWeaponDurability(item) > 0);

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
    const brokenSlot = activeWeaponSlot;
    inventory[brokenSlot] = null;

    if (activeWeaponSlot === brokenSlot) {
      activeWeaponSlot = null;
    }

    showFloorMessage(`Your ${name} broke and was discarded!`);
    ensureActiveWeaponSlot();
  }
}

function addWeaponToInventory(weaponId: WeaponId, durability = WEAPONS[weaponId].maxDurability) {
  recordWeaponDiscovered(weaponId);

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
  const room = getCurrentRoom();
  applyRoomState(room);

  if (room.isBossRoom && !room.bossDefeated && room.enemies.some((e) => (e.currentHp ?? e.maxHp) > 0)) {
    const bossKind = room.enemies.find((enemy) => enemy.bossKind)?.bossKind ?? getBossKindForDepth(currentDepth);
    showFloorMessage(getBossAwakenMessage(bossKind));
  }
}

function getExploredDepths() {
  return [...floors.keys()]
    .filter((depth) =>
      Object.values(floors.get(depth)!.rooms).some((room) => isRoomVisited(depth, room.id)),
    )
    .sort((a, b) => a - b);
}

function getSpawnInwardVector(direction: Direction) {
  switch (direction) {
    case "north":
      return { dx: 0, dy: 1 };
    case "south":
      return { dx: 0, dy: -1 };
    case "west":
      return { dx: 1, dy: 0 };
    case "east":
      return { dx: -1, dy: 0 };
  }
}

function isPlayerSpawnBoxClear(box: { x: number; y: number; w: number; h: number }) {
  const room = getCurrentRoom();
  return (
    isSpawnBoxClear(box, room.exits, room.obstacles ?? [], [], 4) &&
    !collidesWithMobSegments(box)
  );
}

function resolvePlayerSpawnPosition(enteredFrom: Direction) {
  const hitbox = getHeroHitbox();
  const inward = getSpawnInwardVector(enteredFrom);
  const step = TILE_DRAW_SIZE;
  let boxX = player.x + hitbox.insetX;
  let boxY = player.y + hitbox.insetY;

  if (isPlayerSpawnBoxClear({ x: boxX, y: boxY, w: hitbox.w, h: hitbox.h })) {
    return;
  }

  for (let dist = 1; dist <= 6; dist++) {
    const baseX = boxX + inward.dx * step * dist;
    const baseY = boxY + inward.dy * step * dist;
    const candidates = [
      { x: baseX, y: baseY },
      { x: baseX + step, y: baseY },
      { x: baseX - step, y: baseY },
      { x: baseX, y: baseY + step },
      { x: baseX, y: baseY - step },
    ];

    for (const candidate of candidates) {
      if (isPlayerSpawnBoxClear({ x: candidate.x, y: candidate.y, w: hitbox.w, h: hitbox.h })) {
        setPlayerDrawPositionFromHitbox(candidate.x, candidate.y);
        return;
      }
    }
  }

  const fallbackX = PLAY_WIDTH / 2 - hitbox.w / 2;
  const fallbackY = PLAY_HEIGHT / 2 - hitbox.h / 2;

  if (isPlayerSpawnBoxClear({ x: fallbackX, y: fallbackY, w: hitbox.w, h: hitbox.h })) {
    setPlayerDrawPositionFromHitbox(fallbackX, fallbackY);
  }
}

function spawnFromDirection(direction: Direction) {
  const margin = TILE_DRAW_SIZE * 2 + 8;
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

  resolvePlayerSpawnPosition(direction);
}

function changeRoom(roomId: string, enteredFrom: Direction) {
  saveMobsToRoom();
  stairsPrompt = null;
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
  resolvePlayerSpawnPosition(below ? "south" : "north");
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
  stairsPrompt = null;
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
  stairsPrompt = null;
  showFloorMessage(`Ascended to Depth ${currentDepth}`);
}

function resetGame() {
  score = 0;
  voidShards = 0;
  scrap = 0;
  armorTier = "none";
  inventorySlotCount = MAX_INVENTORY_SIZE;
  runStats = createRunStats();
  debugMenuOpen = false;
  itemDebugMenuOpen = false;
  debugGodMode = false;
  debugInstakill = false;
  encyclopediaScroll = 0;
  encyclopediaTab = "weapons";
  resetWeaponEncyclopedia();
  resetLegendaryPool();
  shopOpen = false;
  encyclopediaOpen = false;
  slotSpin.activeUntil = 0;
  slotSpin.resultWeaponId = null;
  slotSpin.startedAt = 0;
  hp.max = BASE_MAX_HP;
  hp.current = BASE_MAX_HP;
  invincibleUntil = 0;
  inventory.fill(null);
  inventory[0] = {
    type: "weapon",
    weaponId: "rusty-sword",
    weaponDurability: WEAPONS["rusty-sword"].maxDurability,
  };
  recordWeaponDiscovered("rusty-sword");
  activeWeaponSlot = 0;
  floorMessageUntil = 0;
  floorMessage = "";
  stairsCooldownUntil = 0;
  stairsPrompt = null;
  playerGolemBeams.length = 0;
  soulScytheProjectiles.length = 0;
  lastUpdateTime = 0;
  playerKnockback.x = 0;
  playerKnockback.y = 0;
  equippedAccessories.fill(null);
  accessoryHpBonus = 0;
  enchantOverlayOpen = false;
  dashCooldownUntil = 0;
  dashActiveUntil = 0;
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
  const room = getCurrentRoom();
  const head = mob.segments[0];
  const config = room.enemies[mob.configIndex];
  config.currentHp = 0;
  mob.segments = [];
  mob.hp = 0;
  score += mob.type === "boss" ? 25 : 3;

  const weaponId = getActiveWeaponItem()?.weaponId ?? null;
  recordMobKill(runStats, weaponId);

  const lifeSteal = weaponId ? getLifeStealOnKill(weaponId) : 0;

  if (lifeSteal > 0) {
    hp.current = Math.min(hp.max, hp.current + lifeSteal);
  }

  if (mob.type === "boss" && head) {
    room.bossDefeated = true;
    const bossKind = mob.bossKind ?? getBossKindForDepth(currentDepth);

    if (bossKind === "golem") {
      unlockGolemClubLegendary();
    }

    spawnBossDownStairs(room);
    room.bossHeartPickup = { x: head.x - 24, y: head.y };
    room.bossWeaponPickup = {
      x: head.x + 36,
      y: head.y,
      weaponId: getBossWeaponDrop(bossKind),
    };
    showFloorMessage(getBossDefeatMessage(bossKind));
    return;
  }

  if (head && mob.type !== "boss") {
    const amount = 1 + Math.floor(Math.random() * 2);
    room.scrapPickups = room.scrapPickups ?? [];
    room.scrapPickups.push({ x: head.x, y: head.y, amount });
  }
}

function applyWeaponHitToMob(mob: RuntimeMob) {
  const activeItem = getActiveWeaponItem()!;
  const weaponId = activeItem.weaponId!;
  const def = WEAPONS[weaponId];
  const baseDamage = getPlayerWeaponDamage(weaponId, def.damage);
  const damage = getEffectiveDamage(weaponId, baseDamage, mob, debugInstakill);

  damageMob(mob, damage);
  applyKnockback(mob, def.knockback);
}

function damageMob(mob: RuntimeMob, amount: number) {
  if (!isMobAlive(mob)) {
    return;
  }

  mob.hp = Math.max(0, mob.hp - amount);
  mob.hitFlashUntil = performance.now() + 180;
  getCurrentRoom().enemies[mob.configIndex].currentHp = mob.hp;

  if (mob.hp <= 0) {
    if (mob.type === "boss" && mob.golemState && mob.golemState.phase !== "dying") {
      startGolemDeath(mob.golemState);
      return;
    }

    if (mob.type === "boss" && mob.executionerState && mob.executionerState.phase !== "dying") {
      startExecutionerDeath(mob.executionerState);
      return;
    }

    slayMob(mob);
    return;
  }

  if (mob.type === "boss" && mob.golemState) {
    triggerGolemHurt(mob.golemState);
  }

  if (mob.type === "boss" && mob.executionerState) {
    triggerExecutionerHurt(mob.executionerState);
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
    const resolved = resolveMobPosition(
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
  const weaponId = activeItem.weaponId!;
  checkWeaponMobHits();

  if (shouldFireGolemBeam(weaponId)) {
    fireGolemClubBeam(weaponId);
  }

  if (shouldThrowSoulScythe(weaponId)) {
    throwSoulScythes(weaponId);
  }

  const hitObstacle = checkWeaponObstacleHits();

  if (
    !shouldSkipDurabilityLoss(weaponId) &&
    (weaponSwing.lastMobDamagedSwing === weaponSwing.lastAttackAt || hitObstacle)
  ) {
    consumeWeaponDurability(1);
  }
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
      getPlayerCollisionBox(),
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

  const activeItem = getActiveWeaponItem()!;
  const weaponId = activeItem.weaponId!;
  const hitbox = getSwingHitbox();
  let primaryMob: RuntimeMob | null = null;

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
        primaryMob = mob;
        break;
      }
    }

    if (primaryMob) {
      break;
    }
  }

  if (!primaryMob) {
    return;
  }

  weaponSwing.lastMobDamagedSwing = weaponSwing.lastAttackAt;
  applyWeaponHitToMob(primaryMob);

  if (!shouldChainStrike(weaponId)) {
    return;
  }

  for (const mob of activeMobs) {
    if (!isMobAlive(mob) || mob === primaryMob) {
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
        applyWeaponHitToMob(mob);
        return;
      }
    }
  }
}

function checkWeaponObstacleHits() {
  if (!hasUsableWeapon()) {
    return false;
  }

  if (weaponSwing.lastAttackAt === weaponSwing.lastObstacleDamagedSwing) {
    return false;
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
        if (obstacle.enchantSeal && !room.enchantSealBroken) {
          room.enchantSealBroken = true;
          room.obstacles.splice(i, 1);
          openEnchantChamber();
        } else {
          room.obstacles.splice(i, 1);
        }
      }
    }
  }

  if (hitAny) {
    weaponSwing.lastObstacleDamagedSwing = weaponSwing.lastAttackAt;
  }

  return hitAny;
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
  gamePaused = false;
  setMapOpen(false);
  setInventoryOpen(false);
  setMenuHelpOpen(false);
  setMenuLeaderboardOpen(false);

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
  gamePaused = false;
  resetGame();

  gameOverEl.classList.add("hidden");
  menuEl.classList.add("hidden");
  gameWrap.classList.remove("hidden");
  gameLoop();
}

function endGame() {
  state = "gameover";
  keys.clear();
  gamePaused = false;
  setMapOpen(false);
  setInventoryOpen(false);
  shopOpen = false;
  debugMenuOpen = false;

  runStats.score = score;
  runStats.deepestDepth = deepestDepth;

  saveRunToLeaderboard({
    id: `${Date.now()}`,
    finishedAt: Date.now(),
    score,
    deepestDepth,
    enemiesKilled: runStats.enemiesKilled,
    bestWeaponId: getBestWeapon(runStats),
    durationMs: Date.now() - runStats.startedAt,
  });

  finalScoreEl.textContent = String(score);
  finalDepthEl.textContent = String(deepestDepth);

  gameWrap.classList.add("hidden");
  gameOverEl.classList.remove("hidden");
}

function facingToAngle(facing: Direction) {
  switch (facing) {
    case "east":
      return 0;
    case "south":
      return Math.PI / 2;
    case "west":
      return Math.PI;
    case "north":
      return -Math.PI / 2;
  }
}

function mobHitByBeam(
  mob: RuntimeMob,
  originX: number,
  originY: number,
  angle: number,
  length: number,
  width: number,
) {
  const endX = originX + Math.cos(angle) * length;
  const endY = originY + Math.sin(angle) * length;
  const half = width / 2 + mob.size * 0.35;
  const segDx = endX - originX;
  const segDy = endY - originY;
  const lenSq = segDx * segDx + segDy * segDy;

  if (lenSq === 0) {
    return false;
  }

  for (const segment of mob.segments) {
    const mcx = segment.x + mob.size / 2;
    const mcy = segment.y + mob.size / 2;
    const t = Math.max(
      0,
      Math.min(1, ((mcx - originX) * segDx + (mcy - originY) * segDy) / lenSq),
    );
    const closestX = originX + t * segDx;
    const closestY = originY + t * segDy;
    const distSq = (mcx - closestX) ** 2 + (mcy - closestY) ** 2;

    if (distSq <= half * half) {
      return true;
    }
  }

  return false;
}

function fireGolemClubBeam(weaponId: WeaponId) {
  const cx = player.x + player.size / 2;
  const cy = player.y + player.size / 2;
  const angle = facingToAngle(playerFacing);
  const now = performance.now();
  const beamLength = 320;
  const beamWidth = 18;
  const beamDamage = getGolemBeamDamage(weaponId, WEAPONS[weaponId].damage);
  const totalBeamDamage = getPlayerWeaponDamage(weaponId, WEAPONS[weaponId].damage + beamDamage);

  playerGolemBeams.push({
    originX: cx,
    originY: cy,
    angle,
    length: beamLength,
    width: beamWidth,
    activeUntil: now + 260,
  });

  for (const mob of activeMobs) {
    if (!isMobAlive(mob)) {
      continue;
    }

    if (mobHitByBeam(mob, cx, cy, angle, beamLength, beamWidth)) {
      const damage = getEffectiveDamage(weaponId, totalBeamDamage, mob, debugInstakill);
      damageMob(mob, damage);
      break;
    }
  }
}

function drawPlayerGolemBeams() {
  if (!areGolemSpritesLoaded()) {
    return;
  }

  const now = performance.now();
  const beamSprite = getLaserFrame(12);
  const beamThickness = Math.max(beamSprite.height, 24);

  for (const beam of playerGolemBeams) {
    if (now >= beam.activeUntil) {
      continue;
    }

    ctx.save();
    ctx.translate(beam.originX, beam.originY);
    ctx.rotate(beam.angle);
    ctx.globalAlpha = 0.9;
    drawSprite(ctx, beamSprite, 0, -beamThickness / 2, beam.length, beamThickness);
    ctx.fillStyle = "rgba(120, 220, 255, 0.38)";
    ctx.fillRect(0, -beam.width / 2, beam.length, beam.width);
    ctx.restore();
  }
}

function getStairsAtPlayer(): "down" | "up" | null {
  if (performance.now() < stairsCooldownUntil) {
    return null;
  }

  const room = getCurrentRoom();
  const playerBox = getPlayerCollisionBox();

  if (room.stairsDownTile) {
    const bounds = stairsBounds("down", room.stairsDownTile);

    if (boxesOverlap(playerBox, bounds)) {
      return "down";
    }
  }

  if (room.stairsUpTile) {
    const bounds = stairsBounds("up", room.stairsUpTile);

    if (boxesOverlap(playerBox, bounds)) {
      return "up";
    }
  }

  return null;
}

function updateStairsProximity() {
  if (!getStairsAtPlayer()) {
    stairsPrompt = null;
  }
}

function tryOpenStairsPrompt() {
  const stairs = getStairsAtPlayer();

  if (!stairs) {
    return false;
  }

  const room = getCurrentRoom();

  if (stairs === "down" && room.isBossRoom && !room.bossDefeated) {
    showFloorMessage("Defeat the boss first!");
    return true;
  }

  stairsPrompt = stairs;
  return true;
}

function dismissStairsPrompt() {
  stairsPrompt = null;
}

function confirmStairsPrompt() {
  if (!stairsPrompt) {
    return;
  }

  if (stairsPrompt === "down") {
    descendFloor();
  } else {
    ascendFloor();
  }

  stairsPrompt = null;
}

function throwSoulScythes(weaponId: WeaponId) {
  const cx = player.x + player.size / 2;
  const cy = player.y + player.size / 2;
  const baseAngle = facingToAngle(playerFacing);
  const now = performance.now();
  const bonus = getSoulScytheDamage(weaponId, WEAPONS[weaponId].damage);
  const damage = getPlayerWeaponDamage(weaponId, WEAPONS[weaponId].damage + bonus);
  const speed = 4.8;

  for (const spread of [-0.28, 0.28]) {
    const angle = baseAngle + spread;
    soulScytheProjectiles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      spin: Math.random() * Math.PI * 2,
      spinRate: 0.22,
      damage,
      size: 34,
      activeUntil: now + 1400,
      hitMobIndices: new Set(),
    });
  }
}

function updateSoulScytheProjectiles(dt: number) {
  const now = performance.now();

  for (let i = soulScytheProjectiles.length - 1; i >= 0; i--) {
    const scythe = soulScytheProjectiles[i]!;

    if (now >= scythe.activeUntil) {
      soulScytheProjectiles.splice(i, 1);
      continue;
    }

    scythe.x += scythe.vx * dt;
    scythe.y += scythe.vy * dt;
    scythe.spin += scythe.spinRate * dt;

    const clamped = clampToPlayBounds(scythe.x, scythe.y, scythe.size);
    scythe.x = clamped.x;
    scythe.y = clamped.y;

    const hitbox = { x: scythe.x, y: scythe.y, w: scythe.size, h: scythe.size };

    for (let m = 0; m < activeMobs.length; m++) {
      const mob = activeMobs[m]!;

      if (!isMobAlive(mob) || scythe.hitMobIndices.has(m)) {
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
          scythe.hitMobIndices.add(m);
          damageMob(mob, scythe.damage);
          break;
        }
      }
    }
  }
}

function drawSoulScytheProjectiles() {
  for (const scythe of soulScytheProjectiles) {
    if (performance.now() >= scythe.activeUntil) {
      continue;
    }

    ctx.save();
    ctx.translate(scythe.x + scythe.size / 2, scythe.y + scythe.size / 2);
    ctx.rotate(scythe.spin);
    ctx.globalAlpha = 0.92;
    drawSprite(
      ctx,
      getWeaponSprite("executioner-scythe"),
      -scythe.size / 2,
      -scythe.size / 2,
      scythe.size,
      scythe.size,
    );
    ctx.restore();
  }
}

function tryDash() {
  if (
    !playerHasDashEquipped(equippedAccessories) ||
    performance.now() < dashCooldownUntil ||
    performance.now() < dashActiveUntil
  ) {
    return;
  }

  dashDirection = playerFacing;
  dashActiveUntil = performance.now() + DASH_DURATION_MS;
  dashCooldownUntil = performance.now() + DASH_COOLDOWN_MS;
  invincibleUntil = Math.max(invincibleUntil, dashActiveUntil);
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
  const playerBox = getPlayerCollisionBox();

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

function movePlayer(dt: number) {
  const roomBeforeMove = currentRoomId;
  const prevX = player.x;
  const prevY = player.y;

  if (performance.now() < dashActiveUntil) {
    const burst = DASH_SPEED * dt;

    switch (dashDirection) {
      case "north":
        player.y -= burst;
        break;
      case "south":
        player.y += burst;
        break;
      case "west":
        player.x -= burst;
        break;
      case "east":
        player.x += burst;
        break;
    }
  } else {
    if (keys.has("w") || keys.has("arrowup")) {
      player.y -= player.speed * dt;
    }

    if (keys.has("s") || keys.has("arrowdown")) {
      player.y += player.speed * dt;
    }

    if (keys.has("a") || keys.has("arrowleft")) {
      player.x -= player.speed * dt;
    }

    if (keys.has("d") || keys.has("arrowright")) {
      player.x += player.speed * dt;
    }
  }

  updateFacing();
  tryChangeRoom();
  updateStairsProximity();

  if (Math.abs(playerKnockback.x) > 0.01 || Math.abs(playerKnockback.y) > 0.01) {
    player.x += playerKnockback.x * dt;
    player.y += playerKnockback.y * dt;
    const decay = Math.pow(0.78, dt);
    playerKnockback.x *= decay;
    playerKnockback.y *= decay;

    if (Math.abs(playerKnockback.x) < 0.05) {
      playerKnockback.x = 0;
    }

    if (Math.abs(playerKnockback.y) < 0.05) {
      playerKnockback.y = 0;
    }
  }

  player.x = Math.max(0, Math.min(PLAY_WIDTH - player.size, player.x));
  player.y = Math.max(0, Math.min(PLAY_HEIGHT - player.size, player.y));

  const roomJustChanged = currentRoomId !== roomBeforeMove;
  const collisionNext = getPlayerCollisionBox();
  const collisionPrev = roomJustChanged ? collisionNext : getPlayerCollisionBox(prevX, prevY);

  const resolved = resolvePlayerPosition(
    collisionNext.x,
    collisionNext.y,
    collisionNext.w,
    collisionNext.h,
    collisionPrev.x,
    collisionPrev.y,
  );
  setPlayerDrawPositionFromHitbox(resolved.x, resolved.y);
}

function isCoinColliding() {
  return boxesOverlap(getPlayerCollisionBox(), {
    x: coin.x,
    y: coin.y,
    w: coin.size,
    h: coin.size,
  });
}

function isPlayerInvincible() {
  return performance.now() < invincibleUntil;
}

function applyPlayerKnockback(fromX: number, fromY: number, strength = 11) {
  const hitbox = getPlayerCollisionBox();
  const pcx = hitbox.x + hitbox.w / 2;
  const pcy = hitbox.y + hitbox.h / 2;
  let dx = pcx - fromX;
  let dy = pcy - fromY;
  const dist = Math.hypot(dx, dy) || 1;

  dx /= dist;
  dy /= dist;
  playerKnockback.x += dx * strength;
  playerKnockback.y += dy * strength;
}

function takeDamage(amount: number, knockbackFrom?: { x: number; y: number; strength?: number }) {
  if (debugGodMode || isPlayerInvincible()) {
    return;
  }

  hp.current = Math.max(0, hp.current - amount);
  invincibleUntil = performance.now() + hp.invincibilityMs;

  if (knockbackFrom) {
    applyPlayerKnockback(knockbackFrom.x, knockbackFrom.y, knockbackFrom.strength ?? 11);
  }

  if (hp.current <= 0) {
    endGame();
  }
}

function handlePlayerHit(damage: number, sourceX: number, sourceY: number) {
  takeDamage(damage, { x: sourceX, y: sourceY });
}

function isPlayerHitByMobs() {
  for (const mob of activeMobs) {
    if (!isMobAlive(mob)) {
      continue;
    }

    if (mob.type === "boss" && mob.golemState && !isGolemBossContactActive(mob.golemState)) {
      continue;
    }

    if (
      mob.type === "boss" &&
      mob.executionerState &&
      !isExecutionerBossContactActive(mob.executionerState)
    ) {
      continue;
    }

    for (const segment of mob.segments) {
      if (
        boxesOverlap(
          getPlayerCollisionBox(),
          {
            x: segment.x,
            y: segment.y,
            w: mob.size,
            h: mob.size,
          },
          4,
        )
      ) {
        return {
          damage: mob.contactDamage,
          fromX: segment.x + mob.size / 2,
          fromY: segment.y + mob.size / 2,
        };
      }
    }
  }

  return null;
}

function tryCollectCoin() {
  const room = getCurrentRoom();

  if (room.coinCollected || !isCoinColliding()) {
    return;
  }

  room.coinCollected = true;
  score += 1;
}

function moveMob(mob: RuntimeMob, dt: number) {
  if (!isMobAlive(mob)) {
    return;
  }

  if (mob.type === "boss" && (mob.golemState || mob.executionerState)) {
    return;
  }

  const head = mob.segments[0];
  const dx = player.x - head.x;
  const dy = player.y - head.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance > 0) {
    const nextX = head.x + (dx / distance) * mob.speed * dt;
    const nextY = head.y + (dy / distance) * mob.speed * dt;

    if (!mobBoxOverlapsPlayer(nextX, nextY, mob.size)) {
      head.x = nextX;
      head.y = nextY;
    }
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
        const nextX = current.x + (followDx / followDistance) * mob.speed * dt;
        const nextY = current.y + (followDy / followDistance) * mob.speed * dt;

        if (!mobBoxOverlapsPlayer(nextX, nextY, mob.size)) {
          current.x = nextX;
          current.y = nextY;
        }
      }

      clampMobToRoom(mob, i);
    }
  }
}

function moveMobs(dt: number) {
  for (const mob of activeMobs) {
    if (mob.type === "boss" && mob.golemState) {
      if (mob.golemState.phase !== "dying") {
        const playerHitbox = getPlayerCollisionBox();
        updateGolemBoss(
          mob,
          mob.golemState,
          playerHitbox.x,
          playerHitbox.y,
          playerHitbox.w,
          dt,
          (target) => clampMobToRoom(target, 0),
          handlePlayerHit,
        );
      }
    } else if (mob.type === "boss" && mob.executionerState) {
      if (mob.executionerState.phase !== "dying") {
        const playerHitbox = getPlayerCollisionBox();
        updateExecutionerBoss(
          mob,
          mob.executionerState,
          playerHitbox.x,
          playerHitbox.y,
          playerHitbox.w,
          dt,
          (target) => clampMobToRoom(target, 0),
          handlePlayerHit,
        );
      }
    } else {
      moveMob(mob, dt);
    }
  }

  for (const mob of activeMobs) {
    if (
      mob.type === "boss" &&
      mob.golemState &&
      isGolemDeathComplete(mob.golemState) &&
      isMobAlive(mob)
    ) {
      slayMob(mob);
    }

    if (
      mob.type === "boss" &&
      mob.executionerState &&
      isExecutionerDeathComplete(mob.executionerState) &&
      isMobAlive(mob)
    ) {
      slayMob(mob);
    }
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

  if (item.type === "special" && item.specialId) {
    recordAccessoryDiscovered(item.specialId);
  }

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
      getPlayerCollisionBox(),
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

function collectChestLoot(loot: ChestLoot, dropNear?: { x: number; y: number }) {
  const room = getCurrentRoom();

  if (loot.kind === "weapon") {
    const slot = addWeaponToInventory(loot.weaponId);

    if (slot !== null) {
      showFloorMessage(`${formatWeaponName(loot.weaponId)} → slot ${slot + 1}`);
      return;
    }

    if (dropNear) {
      dropItemOnFloor(room, chestLootToInventoryItem(loot), dropNear.x, dropNear.y);
      showFloorMessage(`${formatWeaponName(loot.weaponId)} dropped — inventory full`);
    }

    return;
  }

  if (loot.kind === "special") {
    if (addToInventory({ type: "special", specialId: loot.specialId }) !== null) {
      showFloorMessage(`${SPECIAL_ITEMS[loot.specialId].name} collected — drag into accessory slots`);
      return;
    }

    if (dropNear) {
      dropItemOnFloor(room, chestLootToInventoryItem(loot), dropNear.x, dropNear.y);
      showFloorMessage(`${SPECIAL_ITEMS[loot.specialId].name} dropped — inventory full`);
    }

    return;
  }

  if (addToInventory({ type: loot.kind, healAmount: loot.healAmount }) !== null) {
    const label = loot.kind === "strong-potion" ? "Strong potion" : "Health potion";
    showFloorMessage(`${label} collected (+${loot.healAmount} HP)`);
    return;
  }

  if (dropNear) {
    dropItemOnFloor(room, chestLootToInventoryItem(loot), dropNear.x, dropNear.y);
    const label = loot.kind === "strong-potion" ? "Strong potion" : "Health potion";
    showFloorMessage(`${label} dropped — inventory full`);
  }
}

function chestLootToInventoryItem(loot: ChestLoot): InventoryItem {
  switch (loot.kind) {
    case "weapon":
      return {
        type: "weapon",
        weaponId: loot.weaponId,
        weaponDurability: WEAPONS[loot.weaponId].maxDurability,
      };
    case "special":
      return { type: "special", specialId: loot.specialId };
    case "health-potion":
      return { type: "health-potion", healAmount: loot.healAmount };
    case "strong-potion":
      return { type: "strong-potion", healAmount: loot.healAmount };
  }
}

function getDroppedItemSize(item: InventoryItem) {
  if (item.type === "weapon") {
    return WEAPON_PICKUP_SIZE;
  }

  if (item.type === "special") {
    return SPECIAL_PICKUP_SIZE;
  }

  return POTION_PICKUP_SIZE;
}

function dropItemOnFloor(room: Room, item: InventoryItem, nearX: number, nearY: number) {
  room.droppedItems = room.droppedItems ?? [];
  const size = getDroppedItemSize(item);
  const index = room.droppedItems.length;
  const spreadX = (index % 3) * (size + 8) - (size + 8);
  const spreadY = Math.floor(index / 3) * (size + 8);
  const pos = clampToPlayBounds(nearX + spreadX - size / 2, nearY + spreadY, size);

  room.droppedItems.push({ x: pos.x, y: pos.y, item });
}

function tryPickupDroppedItems() {
  const room = getCurrentRoom();

  if (!room.droppedItems?.length) {
    return;
  }

  const playerBox = getPlayerCollisionBox();

  for (let i = room.droppedItems.length - 1; i >= 0; i--) {
    const drop = room.droppedItems[i]!;
    const size = getDroppedItemSize(drop.item);

    if (!boxesOverlap(playerBox, { x: drop.x, y: drop.y, w: size, h: size })) {
      continue;
    }

    let collected = false;

    if (drop.item.type === "weapon" && drop.item.weaponId) {
      const slot = addWeaponToInventory(
        drop.item.weaponId,
        drop.item.weaponDurability ?? WEAPONS[drop.item.weaponId].maxDurability,
      );
      collected = slot !== null;

      if (collected) {
        showFloorMessage(`${WEAPONS[drop.item.weaponId].name} → slot ${slot! + 1}`);
      }
    } else {
      collected = addToInventory(drop.item) !== null;

      if (collected) {
        if (drop.item.type === "special" && drop.item.specialId) {
          showFloorMessage(`${SPECIAL_ITEMS[drop.item.specialId].name} collected`);
        } else if (drop.item.type === "health-potion" || drop.item.type === "strong-potion") {
          const label = drop.item.type === "strong-potion" ? "Strong potion" : "Health potion";
          showFloorMessage(`${label} collected (+${drop.item.healAmount ?? 0} HP)`);
        }
      }
    }

    if (collected) {
      room.droppedItems.splice(i, 1);
    } else {
      showFloorMessage("Inventory full!");
    }

    return;
  }
}

function tryPickupSpecial() {
  const room = getCurrentRoom();

  if (!room.specialPickup || room.specialPickupCollected) {
    return;
  }

  const pickup = room.specialPickup;

  if (
    !boxesOverlap(getPlayerCollisionBox(), {
      x: pickup.x,
      y: pickup.y,
      w: SPECIAL_PICKUP_SIZE,
      h: SPECIAL_PICKUP_SIZE,
    })
  ) {
    return;
  }

  room.specialPickupCollected = true;

  if (addToInventory({ type: "special", specialId: pickup.specialId }) !== null) {
    showFloorMessage(`${SPECIAL_ITEMS[pickup.specialId].name} collected — drag into accessory slots`);
  }
}

function tryPickupVoidShard() {
  const room = getCurrentRoom();

  if (!room.voidShardPickup || room.voidShardCollected) {
    return;
  }

  if (
    !boxesOverlap(
      getPlayerCollisionBox(),
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
    getPlayerCollisionBox(),
    {
      x: room.slotMachine.x,
      y: room.slotMachine.y,
      w: SLOT_MACHINE_SIZE,
      h: SLOT_MACHINE_SIZE,
    },
    18,
  );
}

function tryPickupScrap() {
  const room = getCurrentRoom();

  if (!room.scrapPickups?.length) {
    return;
  }

  for (let i = room.scrapPickups.length - 1; i >= 0; i--) {
    const pickup = room.scrapPickups[i];

    if (
      boxesOverlap(getPlayerCollisionBox(), {
        x: pickup.x,
        y: pickup.y,
        w: SCRAP_PICKUP_SIZE,
        h: SCRAP_PICKUP_SIZE,
      })
    ) {
      scrap += pickup.amount;
      room.scrapPickups.splice(i, 1);
      showFloorMessage(`+${pickup.amount} scrap`);
    }
  }
}

function tryPickupBossHeart() {
  const room = getCurrentRoom();

  if (!room.bossHeartPickup) {
    return;
  }

  const heart = room.bossHeartPickup;

  if (
    boxesOverlap(getPlayerCollisionBox(), {
      x: heart.x,
      y: heart.y,
      w: BOSS_HEART_SIZE,
      h: BOSS_HEART_SIZE,
    })
  ) {
    delete room.bossHeartPickup;
    hp.max += BOSS_HEART_HP_BONUS;
    hp.current += BOSS_HEART_HP_BONUS;

    if (inventorySlotCount < INVENTORY_ABSOLUTE_MAX) {
      inventorySlotCount += BOSS_INVENTORY_BONUS;
      showFloorMessage(`Heart Container! +${BOSS_HEART_HP_BONUS} HP & +1 bag slot`);
    } else {
      showFloorMessage(`Heart Container! +${BOSS_HEART_HP_BONUS} max HP`);
    }
  }
}

function tryPickupBossWeapon() {
  const room = getCurrentRoom();

  if (!room.bossWeaponPickup) {
    return;
  }

  const pickup = room.bossWeaponPickup;

  if (
    !boxesOverlap(getPlayerCollisionBox(), {
      x: pickup.x,
      y: pickup.y,
      w: WEAPON_PICKUP_SIZE,
      h: WEAPON_PICKUP_SIZE,
    })
  ) {
    return;
  }

  const slot = addWeaponToInventory(pickup.weaponId);

  if (slot !== null) {
    showFloorMessage(`${formatWeaponName(pickup.weaponId)} claimed!`);
    delete room.bossWeaponPickup;
  }
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
  const legendaryPool = getLegendaryWeaponPool();
  slotSpin.resultWeaponId =
    legendaryPool[Math.floor(Math.random() * legendaryPool.length)];
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
      getPlayerCollisionBox(),
      { x: room.chest.x, y: room.chest.y, w: CHEST_SIZE, h: CHEST_SIZE },
    )
  ) {
    return;
  }

  room.chest.opened = true;

  const dropNear = {
    x: room.chest.x + CHEST_SIZE / 2,
    y: room.chest.y + CHEST_SIZE,
  };

  if (room.chest.variant === "slot") {
    const oneStarPool = getOneStarWeaponPool();
    const weaponId = oneStarPool[Math.floor(Math.random() * oneStarPool.length)];
    collectChestLoot({ kind: "weapon", weaponId }, dropNear);
    return;
  }

  collectChestLoot(room.chest.loot, dropNear);
}

function update() {
  const now = performance.now();
  const deltaMs = lastUpdateTime === 0 ? TARGET_FRAME_MS : clampDeltaMs(now - lastUpdateTime);
  lastUpdateTime = now;
  const dt = deltaScale(deltaMs);

  for (let i = playerGolemBeams.length - 1; i >= 0; i--) {
    if (playerGolemBeams[i].activeUntil <= now) {
      playerGolemBeams.splice(i, 1);
    }
  }

  updateSoulScytheProjectiles(dt);

  if (
    mapOpen ||
    inventoryOpen ||
    encyclopediaOpen ||
    debugMenuOpen ||
    itemDebugMenuOpen ||
    stairsPrompt ||
    enchantOverlayOpen
  ) {
    return;
  }

  if (gamePaused) {
    return;
  }

  const spinning = slotSpin.activeUntil > performance.now();

  if (!spinning && !shopOpen) {
    movePlayer(dt);
    moveMobs(dt);
    resolvePlayerMobOverlap();
    updateWeapon();

    const contactHit = isPlayerHitByMobs();

    if (contactHit) {
      takeDamage(contactHit.damage, { x: contactHit.fromX, y: contactHit.fromY });
    }

    tryCollectCoin();

    tryPickupWeapon();
    tryPickupPotion();
    tryPickupDroppedItems();
    tryPickupVoidShard();
    tryPickupScrap();
    tryPickupBossHeart();
    tryPickupBossWeapon();
    tryPickupSpecial();
    tryOpenChest();
  }

  finishSlotSpin();
}

function updateHtmlHud() {
  const room = getCurrentRoom();

  hudScoreEl.textContent = String(score);
  hudDepthEl.textContent = String(currentDepth);
  hudRoomEl.textContent = room.name;
  hudItemsEl.textContent = `${countInventoryItems()}/${inventorySlotCount} items`;
  hudShardsEl.textContent = `${voidShards} shard${voidShards === 1 ? "" : "s"}`;
  hudScrapEl.textContent = `${scrap} scrap · ${getArmorLabel(armorTier)}${playerHasDashEquipped(equippedAccessories) ? " · Dash ready" : ""}`;

  const hpRatio = hp.current / hp.max;
  hudHpFillEl.style.width = `${Math.max(0, Math.min(1, hpRatio)) * 100}%`;
  hudHpTextEl.textContent = String(hp.current);

  const activeWeapon = getActiveWeaponItem();

  if (activeWeapon && getWeaponDurability(activeWeapon) > 0) {
    const def = WEAPONS[activeWeapon.weaponId!];
    const durability = getWeaponDurability(activeWeapon);
    const cooldownReady = performance.now() >= weaponSwing.lastAttackAt + def.cooldownMs;
    const maxDur = getWeaponMaxDurability(activeWeapon);
    const prefix = formatWeaponName(activeWeapon.weaponId!).replace(def.name, "").trim();
    const nameLabel = prefix ? `${prefix} ${def.name}` : def.name;
    hudWeaponNameEl.textContent = cooldownReady
      ? `${nameLabel} (${durability})`
      : "Cooling down…";
    hudDurFillEl.style.width = `${(durability / maxDur) * 100}%`;
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

function drawPlayer() {
  const playerSprite = getPlayerSprite();
  const invincible = isPlayerInvincible();
  const showPlayer = !invincible || Math.floor(performance.now() / 100) % 2 === 0;

  if (!showPlayer) {
    return;
  }

  if (invincible) {
    drawTintedSprite(ctx, playerSprite, player.x, player.y, player.size, "#ff6666", 0.55);
  } else {
    drawSprite(ctx, playerSprite, player.x, player.y, player.size, player.size);
  }

  if (armorTier !== "none") {
    const visual = ARMOR_VISUAL[armorTier];
    drawTintedSprite(
      ctx,
      playerSprite,
      player.x,
      player.y,
      player.size,
      visual.tint,
      visual.alpha,
    );

    const cx = player.x + player.size / 2;
    const cy = player.y + player.size / 2;
    ctx.fillStyle = visual.accent;
    ctx.globalAlpha = 0.75;

    if (playerFacing === "north" || playerFacing === "south") {
      ctx.fillRect(cx - 14, cy - 6, 28, 10);
      ctx.fillRect(cx - 18, cy - 14, 8, 8);
      ctx.fillRect(cx + 10, cy - 14, 8, 8);
    } else {
      ctx.fillRect(cx - 10, cy - 4, 20, 12);
      ctx.fillRect(cx - 20, cy - 10, 8, 8);
      ctx.fillRect(cx + 12, cy - 10, 8, 8);
    }

    ctx.globalAlpha = 1;
  }

  if (performance.now() < dashActiveUntil) {
    ctx.strokeStyle = "rgba(120, 200, 255, 0.8)";
    ctx.lineWidth = 2;
    ctx.strokeRect(player.x + 2, player.y + 2, player.size - 4, player.size - 4);
  }

  if (debugMode) {
    const hitbox = getPlayerCollisionBox();
    ctx.strokeStyle = "rgba(80, 255, 120, 0.95)";
    ctx.lineWidth = 1;
    ctx.strokeRect(hitbox.x + 0.5, hitbox.y + 0.5, hitbox.w - 1, hitbox.h - 1);
  }
}

function getMobSprite(mob: RuntimeMob, segmentIndex: number) {
  if (mob.type === "boss") {
    return SPRITES.brute;
  }

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
    const isSlotChest = room.chest.variant === "slot";
    ctx.fillStyle = isSlotChest ? "rgba(180, 80, 255, 0.28)" : "rgba(255, 215, 0, 0.15)";
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

  if (room.chest.variant === "slot" && !room.chest.opened) {
    drawTintedSprite(ctx, sprite, screenX, screenY + pulse, CHEST_SIZE, "#c070ff", 0.45);
  } else {
    drawSprite(ctx, sprite, screenX, screenY + pulse, CHEST_SIZE, CHEST_SIZE);
  }
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

function drawScrapPickups() {
  const room = getCurrentRoom();

  if (!room.scrapPickups?.length) {
    return;
  }

  for (const pickup of room.scrapPickups) {
    const pulse = Math.sin(performance.now() / 240 + pickup.x) * 2;

    ctx.fillStyle = "rgba(160, 160, 170, 0.25)";
    ctx.beginPath();
    ctx.arc(
      pickup.x + SCRAP_PICKUP_SIZE / 2,
      pickup.y + SCRAP_PICKUP_SIZE / 2 + pulse,
      SCRAP_PICKUP_SIZE * 0.55,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    ctx.fillStyle = "#b8bcc8";
    ctx.fillRect(pickup.x + 6, pickup.y + 8 + pulse, SCRAP_PICKUP_SIZE - 12, SCRAP_PICKUP_SIZE - 14);
    ctx.fillStyle = "#8a90a0";
    ctx.fillRect(pickup.x + 9, pickup.y + 11 + pulse, SCRAP_PICKUP_SIZE - 18, 4);

    ctx.fillStyle = "#e8ecf4";
    ctx.font = "bold 10px Arial";
    ctx.textAlign = "center";
    ctx.fillText(String(pickup.amount), pickup.x + SCRAP_PICKUP_SIZE / 2, pickup.y + SCRAP_PICKUP_SIZE + 10);
    ctx.textAlign = "left";
  }
}

function drawBossHeartPickup() {
  const room = getCurrentRoom();

  if (!room.bossHeartPickup) {
    return;
  }

  const heart = room.bossHeartPickup;
  const pulse = Math.sin(performance.now() / 200) * 3;

  ctx.fillStyle = "rgba(255, 64, 96, 0.28)";
  ctx.beginPath();
  ctx.arc(
    heart.x + BOSS_HEART_SIZE / 2,
    heart.y + BOSS_HEART_SIZE / 2 + pulse,
    BOSS_HEART_SIZE * 0.75,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  ctx.fillStyle = "#ff4466";
  ctx.beginPath();
  ctx.arc(heart.x + BOSS_HEART_SIZE / 2, heart.y + BOSS_HEART_SIZE / 2 + pulse, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffd0d8";
  ctx.font = "bold 10px Arial";
  ctx.textAlign = "center";
  ctx.fillText("♥ +Max HP", heart.x + BOSS_HEART_SIZE / 2, heart.y - 6 + pulse);
  ctx.textAlign = "left";
}

function drawShopStation() {
  const room = getCurrentRoom();

  if (!room.shop) {
    return;
  }

  const screenX = room.shop.x;
  const screenY = room.shop.y;
  const pulse = Math.sin(performance.now() / 300) * 2;

  ctx.fillStyle = "rgba(80, 200, 120, 0.18)";
  ctx.beginPath();
  ctx.arc(
    screenX + SHOP_STATION_SIZE / 2,
    screenY + SHOP_STATION_SIZE / 2 + pulse,
    SHOP_STATION_SIZE * 0.62,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  drawTintedSprite(
    ctx,
    SPRITES.chestClosed,
    screenX + 6,
    screenY + 8 + pulse,
    SHOP_STATION_SIZE - 12,
    "#5cd68a",
    0.35,
  );

  if (isNearShopStation(room, getPlayerCollisionBox())) {
    ctx.fillStyle = "#b8f0c8";
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "center";
    ctx.fillText("E — Shop & Craft", screenX + SHOP_STATION_SIZE / 2, screenY - 8 + pulse);
    ctx.textAlign = "left";
  }
}

function drawSlotMachine() {
  const room = getCurrentRoom();

  if (!room.slotMachine) {
    return;
  }

  const screenX = room.slotMachine.x;
  const screenY = room.slotMachine.y;
  const pulse = Math.sin(performance.now() / 340) * 2;

  ctx.fillStyle = "rgba(160, 72, 255, 0.22)";
  ctx.beginPath();
  ctx.arc(
    screenX + SLOT_MACHINE_SIZE / 2,
    screenY + SLOT_MACHINE_SIZE / 2 + pulse,
    SLOT_MACHINE_SIZE * 0.68,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  drawTintedSprite(
    ctx,
    SPRITES.slotMachine,
    screenX,
    screenY + pulse,
    SLOT_MACHINE_SIZE,
    "#c070ff",
    0.4,
  );

  if (isNearSlotMachine() && slotSpin.activeUntil <= performance.now()) {
    ctx.fillStyle = voidShards > 0 ? "#e8c8ff" : "#9a8878";
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
  const legendaryPool = getLegendaryWeaponPool();
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
        : legendaryPool[
            (spinOffset + reel) % legendaryPool.length
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
  const iconSize = Math.round(slotSize * 0.58);
  const iconX = slotX + Math.round((slotSize - iconSize) / 2);
  const iconY = slotY + Math.round((slotSize - iconSize) / 2) - 2;
  const centerX = slotX + slotSize / 2;
  const labelSize = slotSize <= 60 ? 8 : 9;
  const titleSize = slotSize <= 60 ? 8 : 9;

  if (faded) {
    ctx.globalAlpha = 0.75;
  }

  if (item.type === "health-potion") {
    drawSprite(ctx, SPRITES.potionHealth, iconX, iconY + 2, iconSize, iconSize);
    ctx.fillStyle = "#ddd";
    ctx.font = `${labelSize}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText(`+${item.healAmount ?? 0} HP`, centerX, slotY + slotSize - 6);
    ctx.fillStyle = "#777";
    ctx.font = `${labelSize - 1}px Arial`;
    ctx.fillText("Press 1", centerX, slotY + slotSize - 16);
  } else if (item.type === "strong-potion") {
    drawSprite(ctx, SPRITES.potionStrong, iconX, iconY + 2, iconSize, iconSize);
    ctx.fillStyle = "#ddd";
    ctx.font = `${labelSize}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText(`+${item.healAmount ?? 0} HP`, centerX, slotY + slotSize - 6);
    ctx.fillStyle = "#777";
    ctx.font = `${labelSize - 1}px Arial`;
    ctx.fillText("Press 2", centerX, slotY + slotSize - 16);
  } else if (item.type === "weapon" && item.weaponId) {
    drawSprite(ctx, getWeaponSprite(item.weaponId), iconX, iconY, iconSize, iconSize);
    const dur = getWeaponDurability(item);
    const maxDur = getWeaponMaxDurability(item);
    ctx.fillStyle = getWeaponDisplayColor(item.weaponId);
    ctx.font = `${titleSize}px Arial`;
    ctx.textAlign = "center";
    const title = formatEnchantLabel(item) || formatWeaponName(item.weaponId);
    ctx.fillText(title.length > 14 ? `${title.slice(0, 13)}…` : title, centerX, slotY + slotSize - 18);
    ctx.fillStyle = dur > maxDur * 0.25 ? "#ccc" : "#f88";
    ctx.font = `${labelSize}px Arial`;
    ctx.fillText(`${dur}/${maxDur}`, centerX, slotY + slotSize - 6);
  } else if (item.type === "special" && item.specialId) {
    drawSprite(ctx, SPRITES.dashBoots, iconX, iconY, iconSize, iconSize);
    const def = SPECIAL_ITEMS[item.specialId];
    ctx.fillStyle = "#88ddff";
    ctx.font = `${titleSize}px Arial`;
    ctx.textAlign = "center";
    const name = def.name.length > 14 ? `${def.name.slice(0, 13)}…` : def.name;
    ctx.fillText(name, centerX, slotY + slotSize - 18);
    ctx.fillStyle = "#888";
    ctx.font = `${labelSize - 1}px Arial`;
    ctx.fillText("Accessory", centerX, slotY + slotSize - 6);
  }

  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
}

function drawInventoryOverlay() {
  const layout = getInventoryLayout();
  const { panelX, panelY, panelWidth, panelHeight, slotSize } = layout;
  const hoverInvSlot =
    inventoryDrag.dragging && !inventoryDrag.fromAccessory
      ? getInventorySlotAt(inventoryDrag.x, inventoryDrag.y)
      : null;
  const hoverAccSlot = inventoryDrag.dragging
    ? getAccessorySlotAt(inventoryDrag.x, inventoryDrag.y)
    : null;

  ctx.fillStyle = "rgba(0, 0, 0, 0.82)";
  ctx.fillRect(0, 0, PLAY_WIDTH, PLAY_HEIGHT);

  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
  ctx.strokeStyle = "#9b59ff";
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Inventory", panelX + panelWidth / 2, panelY + 24);

  ctx.font = "12px Arial";
  ctx.fillStyle = "#aaa";
  ctx.fillText(
    `${countInventoryItems()}/${inventorySlotCount} bag · drag accessories into equipped slots`,
    panelX + panelWidth / 2,
    panelY + 42,
  );

  ctx.fillStyle = "#c8a0ff";
  ctx.font = "bold 12px Arial";
  ctx.fillText("Equipped", panelX + panelWidth / 2, layout.accLabelY);

  for (let i = 0; i < ACCESSORY_SLOT_COUNT; i++) {
    const { x: slotX, y: slotY } = getAccessorySlotRect(i);
    const item = equippedAccessories[i];
    const isDragSource = inventoryDrag.dragging && inventoryDrag.fromAccessory && inventoryDrag.fromSlot === i;
    const isDropTarget =
      hoverAccSlot === i &&
      (inventoryDrag.fromAccessory ? inventoryDrag.fromSlot !== i : canEquipAsAccessory(inventoryDrag.item));

    ctx.fillStyle = "#1a2430";
    ctx.fillRect(slotX, slotY, slotSize, slotSize);
    ctx.strokeStyle = isDropTarget ? "#88ff88" : "#6688cc";
    ctx.lineWidth = isDropTarget ? 2 : 1.5;
    ctx.strokeRect(slotX, slotY, slotSize, slotSize);

    if (!item) {
      ctx.fillStyle = "#556";
      ctx.font = "10px Arial";
      ctx.textAlign = "center";
      ctx.fillText("Empty", slotX + slotSize / 2, slotY + slotSize / 2 + 3);
      ctx.textAlign = "left";
      continue;
    }

    if (!isDragSource) {
      drawInventoryItem(item, slotX, slotY, slotSize);
    }
  }

  ctx.fillStyle = "#888";
  ctx.font = "bold 12px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Bag", panelX + panelWidth / 2, layout.bagLabelY);

  for (let i = 0; i < inventorySlotCount; i++) {
    const { x: slotX, y: slotY } = getInventorySlotRect(i);
    const item = inventory[i];
    const isActiveWeapon = i === activeWeaponSlot && item?.type === "weapon";
    const isDragSource = inventoryDrag.dragging && !inventoryDrag.fromAccessory && inventoryDrag.fromSlot === i;
    const isDropTarget =
      hoverInvSlot === i &&
      (inventoryDrag.fromAccessory || inventoryDrag.fromSlot !== i);

    ctx.fillStyle = isActiveWeapon ? "#3a2a18" : "#24202a";
    ctx.fillRect(slotX, slotY, slotSize, slotSize);
    ctx.strokeStyle = isDropTarget ? "#88ff88" : isActiveWeapon ? "#ffaa44" : "#555";
    ctx.lineWidth = isDropTarget ? 2 : isActiveWeapon ? 2 : 1;
    ctx.strokeRect(slotX, slotY, slotSize, slotSize);

    ctx.fillStyle = "#777";
    ctx.font = "9px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`${i + 3}`, slotX + 4, slotY + 11);

    if (isActiveWeapon) {
      ctx.fillStyle = "#ffaa44";
      ctx.font = "bold 8px Arial";
      ctx.textAlign = "right";
      ctx.fillText("ACTIVE", slotX + slotSize - 4, slotY + 11);
    }

    if (!item) {
      ctx.fillStyle = "#555";
      ctx.font = "10px Arial";
      ctx.textAlign = "center";
      ctx.fillText("Empty", slotX + slotSize / 2, slotY + slotSize / 2 + 3);
      ctx.textAlign = "left";
      continue;
    }

    if (!isDragSource) {
      drawInventoryItem(item, slotX, slotY, slotSize);
    } else {
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.fillRect(slotX + 3, slotY + 3, slotSize - 6, slotSize - 6);
    }
  }

  if (inventoryDrag.dragging && inventoryDrag.item) {
    const clamped = clampDragPosition(inventoryDrag.x, inventoryDrag.y, slotSize);
    const ghostX = clamped.x - slotSize / 2;
    const ghostY = clamped.y - slotSize / 2;

    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(ghostX + 2, ghostY + 4, slotSize, slotSize);
    ctx.fillStyle = "#3a3048";
    ctx.fillRect(ghostX, ghostY, slotSize, slotSize);
    ctx.strokeStyle = "#c8a0ff";
    ctx.lineWidth = 2;
    ctx.strokeRect(ghostX, ghostY, slotSize, slotSize);
    drawInventoryItem(inventoryDrag.item, ghostX, ghostY, slotSize, true);
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#777";
  ctx.font = "11px Arial";
  ctx.fillText("I close · Del discard · click weapon to equip", panelX + panelWidth / 2, layout.footerY);
  ctx.textAlign = "left";
}

function drawEnchantOverlay() {
  if (!enchantOverlayOpen) {
    return;
  }

  const panelW = 520;
  const panelH = 360;
  const panelX = (PLAY_WIDTH - panelW) / 2;
  const panelY = (PLAY_HEIGHT - panelH) / 2;
  const { slotSize, slotGap, cols } = INVENTORY_UI;

  ctx.fillStyle = "rgba(0, 0, 0, 0.88)";
  ctx.fillRect(0, 0, PLAY_WIDTH, PLAY_HEIGHT);

  ctx.fillStyle = "#181028";
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = "#c060ff";
  ctx.lineWidth = 3;
  ctx.strokeRect(panelX, panelY, panelW, panelH);

  ctx.fillStyle = "#e8d0ff";
  ctx.font = "bold 22px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Secret Enchant Chamber", panelX + panelW / 2, panelY + 36);

  ctx.font = "14px Arial";
  ctx.fillStyle = "#bba0dd";
  ctx.fillText("Click a weapon to imbue it with a random buff", panelX + panelW / 2, panelY + 62);
  ctx.fillText("You will be teleported out after enchanting", panelX + panelW / 2, panelY + 82);

  const gridStartX = panelX + (panelW - (cols * (slotSize + slotGap) - slotGap)) / 2;
  const gridStartY = panelY + 108;

  for (let i = 0; i < inventorySlotCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const slotX = gridStartX + col * (slotSize + slotGap);
    const slotY = gridStartY + row * (slotSize + slotGap);
    const item = inventory[i];
    const canPick = canEnchantItem(item);

    ctx.fillStyle = canPick ? "#2a2040" : "#1a1420";
    ctx.fillRect(slotX, slotY, slotSize, slotSize);
    ctx.strokeStyle = canPick ? "#c060ff" : "#444";
    ctx.lineWidth = canPick ? 2 : 1;
    ctx.strokeRect(slotX, slotY, slotSize, slotSize);

    if (item && canPick) {
      drawInventoryItem(item, slotX, slotY, slotSize);
    } else if (!item) {
      ctx.fillStyle = "#555";
      ctx.font = "11px Arial";
      ctx.textAlign = "center";
      ctx.fillText("Empty", slotX + slotSize / 2, slotY + slotSize / 2 + 4);
    }
  }

  ctx.textAlign = "left";
}

function getEnchantSlotAt(x: number, y: number) {
  if (!enchantOverlayOpen) {
    return null;
  }

  const panelW = 520;
  const panelH = 360;
  const panelX = (PLAY_WIDTH - panelW) / 2;
  const panelY = (PLAY_HEIGHT - panelH) / 2;
  const { slotSize, slotGap, cols } = INVENTORY_UI;
  const gridStartX = panelX + (panelW - (cols * (slotSize + slotGap) - slotGap)) / 2;
  const gridStartY = panelY + 108;

  for (let i = 0; i < inventorySlotCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const slotX = gridStartX + col * (slotSize + slotGap);
    const slotY = gridStartY + row * (slotSize + slotGap);

    if (x >= slotX && x < slotX + slotSize && y >= slotY && y < slotY + slotSize) {
      return i;
    }
  }

  return null;
}

function handleCanvasMouseDown(event: MouseEvent) {
  if (state !== "playing") {
    return;
  }

  if (itemDebugMenuOpen) {
    if (event.button !== 0) {
      return;
    }

    const pos = getCanvasMousePos(event);
    const slot = getItemDebugSlotAt(pos.x, pos.y);

    if (slot !== null) {
      grantDebugItem(DEBUG_ITEM_CATALOG[slot]);
    }

    return;
  }

  if (debugMode) {
    const pos = getCanvasMousePos(event);
    const room = getCurrentRoom();
    tileInspection = inspectTileAt(pos.x, pos.y, room, PLAY_WIDTH, PLAY_HEIGHT);
    return;
  }

  handleEnchantMouseDown(event);
  handleInventoryMouseDown(event);
}

function handleEnchantMouseDown(event: MouseEvent) {
  if (!enchantOverlayOpen || event.button !== 0) {
    return;
  }

  const pos = getCanvasMousePos(event);
  const slot = getEnchantSlotAt(pos.x, pos.y);

  if (slot !== null && canEnchantItem(inventory[slot])) {
    event.preventDefault();
    applyEnchantToInventorySlot(slot);
  }
}

function handleInventoryMouseDown(event: MouseEvent) {
  if (enchantOverlayOpen || !inventoryOpen || state !== "playing") {
    return;
  }

  const pos = getCanvasMousePos(event);
  inventoryHoverX = pos.x;
  inventoryHoverY = pos.y;
  const accSlot = getAccessorySlotAt(pos.x, pos.y);
  const invSlot = getInventorySlotAt(pos.x, pos.y);
  const slot = accSlot ?? invSlot;
  const fromAccessory = accSlot !== null;
  const item = fromAccessory ? equippedAccessories[accSlot!] : invSlot !== null ? inventory[invSlot] : null;

  if (slot === null || !item) {
    return;
  }

  if (event.button === 2) {
    event.preventDefault();

    if (fromAccessory) {
      discardAccessoryItem(accSlot!);
    } else {
      discardInventoryItem(invSlot!);
    }

    return;
  }

  if (event.button !== 0) {
    return;
  }

  event.preventDefault();
  inventoryDrag.pointerDown = true;
  inventoryDrag.dragging = false;
  inventoryDrag.fromAccessory = fromAccessory;
  inventoryDrag.fromSlot = fromAccessory ? accSlot! : invSlot!;
  inventoryDrag.item = item;
  inventoryDrag.startX = pos.x;
  inventoryDrag.startY = pos.y;
  inventoryDrag.x = pos.x;
  inventoryDrag.y = pos.y;
}

function handleInventoryMouseMove(event: MouseEvent) {
  if (itemDebugMenuOpen) {
    const pos = getCanvasMousePos(event);
    itemDebugHoverIndex = getItemDebugSlotAt(pos.x, pos.y) ?? -1;
    return;
  }

  if (!inventoryOpen || !inventoryDrag.pointerDown) {
    if (inventoryOpen) {
      const pos = getCanvasMousePos(event);
      inventoryHoverX = pos.x;
      inventoryHoverY = pos.y;
    }

    return;
  }

  const pos = getCanvasMousePos(event);
  inventoryHoverX = pos.x;
  inventoryHoverY = pos.y;
  const clamped = clampDragPosition(pos.x, pos.y, getInventoryLayout().slotSize);
  inventoryDrag.x = clamped.x;
  inventoryDrag.y = clamped.y;

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
  const fromAccessory = inventoryDrag.fromAccessory;
  const wasDragging = inventoryDrag.dragging;

  if (wasDragging) {
    const toAccSlot = getAccessorySlotAt(pos.x, pos.y);
    const toInvSlot = getInventorySlotAt(pos.x, pos.y);

    if (fromAccessory) {
      if (toAccSlot !== null && toAccSlot !== fromSlot) {
        moveAccessoryItem(fromSlot, toAccSlot);
      } else if (toInvSlot !== null) {
        unequipAccessoryToInventory(fromSlot, toInvSlot);
      } else if (!isPointInInventoryPanel(pos.x, pos.y)) {
        discardAccessoryItem(fromSlot);
      }
    } else if (toAccSlot !== null && canEquipAsAccessory(inventoryDrag.item)) {
      equipAccessoryFromInventory(fromSlot, toAccSlot);
    } else if (toInvSlot !== null) {
      moveInventoryItem(fromSlot, toInvSlot);
    } else if (!isPointInInventoryPanel(pos.x, pos.y)) {
      discardInventoryItem(fromSlot);
    }
  } else if (!fromAccessory && inventory[fromSlot]?.type === "weapon") {
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

  const paddingX = 14;
  const bannerHeight = 36;
  const margin = 12;
  const maxWidth = PLAY_WIDTH - margin * 2;

  ctx.font = "bold 16px Arial";
  const textWidth = Math.min(maxWidth - paddingX * 2, ctx.measureText(floorMessage).width);
  const bannerWidth = Math.ceil(textWidth + paddingX * 2);
  const bannerX = margin;
  const bannerY = PLAY_HEIGHT - bannerHeight - margin;

  ctx.fillStyle = "rgba(0, 0, 0, 0.82)";
  ctx.fillRect(bannerX, bannerY, bannerWidth, bannerHeight);

  ctx.strokeStyle = "#b45cff";
  ctx.lineWidth = 2;
  ctx.strokeRect(bannerX, bannerY, bannerWidth, bannerHeight);

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(floorMessage, bannerX + paddingX, bannerY + bannerHeight / 2);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
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

    if (obstacle.enchantSeal) {
      const pulse = 0.45 + Math.sin(performance.now() / 280) * 0.25;
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = "#c060ff";
      ctx.lineWidth = 3;
      ctx.strokeRect(obstacle.x + 2, obstacle.y + 2, obstacle.w - 4, obstacle.h - 4);
      ctx.fillStyle = "rgba(160, 80, 255, 0.22)";
      ctx.fillRect(obstacle.x + 6, obstacle.y + 6, obstacle.w - 12, obstacle.h - 12);
      ctx.restore();
    }

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
  const swingAngle = arcStart + (arcEnd - arcStart) * progress;
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
  drawWeaponSwingSprite(ctx, weaponSwing.weaponId, sprite, centerX, centerY, swingAngle, spriteSize);
  ctx.restore();
}

function drawShopOverlay() {
  if (!shopOpen) {
    return;
  }

  const panelW = 420;
  const panelH = 320;
  const panelX = (PLAY_WIDTH - panelW) / 2;
  const panelY = (PLAY_HEIGHT - panelH) / 2;
  const nextArmor = getNextArmorTier(armorTier);

  ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
  ctx.fillRect(0, 0, PLAY_WIDTH, PLAY_HEIGHT);

  ctx.fillStyle = "#1a2018";
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = "#5cd68a";
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX + 1, panelY + 1, panelW - 2, panelH - 2);

  ctx.fillStyle = "#d8f0dc";
  ctx.font = "bold 20px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Coin Shop & Forge", panelX + panelW / 2, panelY + 32);

  ctx.font = "14px Arial";
  ctx.fillStyle = "#b8d8bc";
  ctx.fillText(`Coins: ${score} · Scrap: ${scrap} · Armor: ${getArmorLabel(armorTier)}`, panelX + panelW / 2, panelY + 56);

  const lines = [
    `Q — Health Potion (${SHOP_ITEMS.healthPotion.cost} coins)`,
    `W — Strong Potion (${SHOP_ITEMS.strongPotion.cost} coins)`,
    `R — Repair Weapon (${SHOP_ITEMS.weaponRepair.cost} coins)`,
    nextArmor
      ? `T — Craft ${ARMOR_TIERS[nextArmor].label} (${ARMOR_TIERS[nextArmor].scrapCost} scrap)`
      : "T — Max armor reached",
    playerHasDashEquipped(equippedAccessories)
      ? "U — Dash Boots (buy spare)"
      : `U — Dash Boots (${SPECIAL_ITEMS["dash-boots"].shopCost} coins)`,
    "E / Esc — Close",
  ];

  ctx.textAlign = "left";
  ctx.fillStyle = "#e8f4ea";

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], panelX + 28, panelY + 96 + i * 28);
  }

  ctx.textAlign = "left";
}

function drawEncyclopediaOverlay() {
  if (!encyclopediaOpen) {
    return;
  }

  const panelW = 520;
  const panelH = 360;
  const panelX = (PLAY_WIDTH - panelW) / 2;
  const panelY = (PLAY_HEIGHT - panelH) / 2;
  const weaponEntryHeight = 78;
  const accessoryEntryHeight = 68;
  const listTop = panelY + 96;
  const listHeight = panelH - 118;
  const tabW = 118;
  const tabX = panelX + panelW / 2 - tabW - 6;
  const tabY = panelY + 58;

  ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
  ctx.fillRect(0, 0, PLAY_WIDTH, PLAY_HEIGHT);

  ctx.fillStyle = "#18141c";
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = "#c8a050";
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX + 1, panelY + 1, panelW - 2, panelH - 2);

  ctx.fillStyle = "#f0e6c8";
  ctx.font = "bold 20px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Encyclopedia", panelX + panelW / 2, panelY + 32);

  ctx.fillStyle = encyclopediaTab === "weapons" ? "#3a3020" : "#242028";
  ctx.fillRect(tabX, tabY, tabW, 28);
  ctx.strokeStyle = encyclopediaTab === "weapons" ? "#c8a050" : "#666";
  ctx.strokeRect(tabX, tabY, tabW, 28);

  ctx.fillStyle = encyclopediaTab === "accessories" ? "#3a3020" : "#242028";
  ctx.fillRect(tabX + tabW + 12, tabY, tabW, 28);
  ctx.strokeStyle = encyclopediaTab === "accessories" ? "#c8a050" : "#666";
  ctx.strokeRect(tabX + tabW + 12, tabY, tabW, 28);

  ctx.font = "13px Arial";
  ctx.fillStyle = encyclopediaTab === "weapons" ? "#f0e6c8" : "#9a9080";
  ctx.fillText("1 · Weapons", tabX + tabW / 2, tabY + 18);
  ctx.fillStyle = encyclopediaTab === "accessories" ? "#f0e6c8" : "#9a9080";
  ctx.fillText("2 · Accessories", tabX + tabW + 12 + tabW / 2, tabY + 18);

  ctx.font = "12px Arial";
  ctx.fillStyle = "#c8b890";
  if (encyclopediaTab === "weapons") {
    ctx.fillText(
      `${getDiscoveredWeapons().length} / ${ALL_WEAPON_IDS.length} discovered`,
      panelX + panelW / 2,
      panelY + 54,
    );
  } else {
    ctx.fillText(
      `${getDiscoveredAccessories().length} / ${getAccessoryCatalogIds().length} discovered`,
      panelX + panelW / 2,
      panelY + 54,
    );
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(panelX + 12, listTop, panelW - 24, listHeight);
  ctx.clip();

  if (encyclopediaTab === "weapons") {
    for (let i = 0; i < ALL_WEAPON_IDS.length; i++) {
      const weaponId = ALL_WEAPON_IDS[i];
      const y = listTop + i * weaponEntryHeight - encyclopediaScroll;
      const discovered = isWeaponDiscovered(weaponId);

      if (y + weaponEntryHeight < listTop || y > listTop + listHeight) {
        continue;
      }

      ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)";
      ctx.fillRect(panelX + 16, y, panelW - 32, weaponEntryHeight - 6);

      if (discovered) {
        const def = WEAPONS[weaponId];

        drawSprite(ctx, getWeaponSprite(weaponId), panelX + 24, y + 12, 44, 44);

        ctx.textAlign = "left";
        ctx.fillStyle = def.stars ? "#a8e0ff" : def.rarity === "legendary" ? "#e8c8ff" : "#e8e0d0";
        ctx.font = "bold 15px Arial";
        ctx.fillText(formatWeaponName(weaponId), panelX + 80, y + 28);
        ctx.font = "12px Arial";
        ctx.fillStyle = "#b8a890";
        ctx.fillText(
          `${def.damage} dmg · ${def.maxDurability} dur · ${def.cooldownMs}ms cd`,
          panelX + 80,
          y + 46,
        );
        ctx.fillStyle = def.stars ? "#7ab8d8" : def.rarity === "legendary" ? "#c8a0ff" : "#8a8070";
        ctx.fillText(getWeaponAbilityDescription(weaponId), panelX + 80, y + 62);
      } else {
        ctx.fillStyle = "#3a3540";
        ctx.fillRect(panelX + 24, y + 12, 44, 44);
        ctx.textAlign = "left";
        ctx.fillStyle = "#6a6470";
        ctx.font = "bold 15px Arial";
        ctx.fillText("???", panelX + 80, y + 36);
        ctx.font = "12px Arial";
        ctx.fillText("Not yet discovered", panelX + 80, y + 56);
      }
    }
  } else {
    const catalog = getAccessoryCatalogIds();

    for (let i = 0; i < catalog.length; i++) {
      const specialId = catalog[i]!;
      const y = listTop + i * accessoryEntryHeight - encyclopediaScroll;
      const discovered = isAccessoryDiscovered(specialId);
      const def = SPECIAL_ITEMS[specialId];

      if (y + accessoryEntryHeight < listTop || y > listTop + listHeight) {
        continue;
      }

      ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)";
      ctx.fillRect(panelX + 16, y, panelW - 32, accessoryEntryHeight - 6);

      if (discovered) {
        drawSprite(ctx, SPRITES.dashBoots, panelX + 24, y + 10, 40, 40);

        ctx.textAlign = "left";
        ctx.fillStyle = "#a8e0ff";
        ctx.font = "bold 15px Arial";
        ctx.fillText(def.name, panelX + 80, y + 26);
        ctx.font = "12px Arial";
        ctx.fillStyle = "#b8a890";
        ctx.fillText(def.description, panelX + 80, y + 44);
        ctx.fillStyle = "#7ab8d8";
        ctx.fillText("Drag into equipped accessory slots", panelX + 80, y + 58);
      } else {
        ctx.fillStyle = "#3a3540";
        ctx.fillRect(panelX + 24, y + 10, 40, 40);
        ctx.textAlign = "left";
        ctx.fillStyle = "#6a6470";
        ctx.font = "bold 15px Arial";
        ctx.fillText("???", panelX + 80, y + 34);
        ctx.font = "12px Arial";
        ctx.fillText("Find in chests or the shop", panelX + 80, y + 52);
      }
    }
  }

  ctx.restore();

  ctx.fillStyle = "#9a9080";
  ctx.font = "12px Arial";
  ctx.textAlign = "center";
  ctx.fillText(
    "1 / 2 tabs · K / Esc close · scroll wheel",
    panelX + panelW / 2,
    panelY + panelH - 14,
  );
  ctx.textAlign = "left";
}

function drawDebugCatalogItem(entry: DebugGrantEntry, slotX: number, slotY: number, slotSize: number) {
  const iconSize = 40;
  const centerX = slotX + slotSize / 2;

  if (entry.kind === "weapon") {
    drawSprite(ctx, getWeaponSprite(entry.weaponId), slotX + 16, slotY + 16, iconSize, iconSize);
    ctx.fillStyle = getWeaponDisplayColor(entry.weaponId);
    ctx.font = "9px Arial";
    ctx.textAlign = "center";
    ctx.fillText(formatWeaponName(entry.weaponId), centerX, slotY + slotSize - 8);
  } else if (entry.kind === "health-potion") {
    drawSprite(ctx, SPRITES.potionHealth, slotX + 16, slotY + 18, iconSize, iconSize);
    ctx.fillStyle = "#ddd";
    ctx.font = "9px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`HP +${entry.healAmount}`, centerX, slotY + slotSize - 8);
  } else if (entry.kind === "strong-potion") {
    drawSprite(ctx, SPRITES.potionStrong, slotX + 16, slotY + 18, iconSize, iconSize);
    ctx.fillStyle = "#ddd";
    ctx.font = "9px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`HP +${entry.healAmount}`, centerX, slotY + slotSize - 8);
  } else if (entry.kind === "special") {
    drawSprite(ctx, SPRITES.dashBoots, slotX + 16, slotY + 16, iconSize, iconSize);
    ctx.fillStyle = "#88ddff";
    ctx.font = "9px Arial";
    ctx.textAlign = "center";
    ctx.fillText(SPECIAL_ITEMS[entry.specialId].name, centerX, slotY + slotSize - 8);
  }

  ctx.textAlign = "left";
}

function drawItemDebugOverlay() {
  if (!itemDebugMenuOpen) {
    return;
  }

  const { panelX, panelY, panelWidth, panelHeight, slotSize } = ITEM_DEBUG_UI;

  ctx.fillStyle = "rgba(0, 0, 0, 0.84)";
  ctx.fillRect(0, 0, PLAY_WIDTH, PLAY_HEIGHT);

  ctx.fillStyle = "#141820";
  ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
  ctx.strokeStyle = "#66aaff";
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX + 1, panelY + 1, panelWidth - 2, panelHeight - 2);

  ctx.fillStyle = "#d8e8ff";
  ctx.font = "bold 22px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Item Debug Spawner", panelX + panelWidth / 2, panelY + 32);

  ctx.font = "13px Arial";
  ctx.fillStyle = "#9ab0c8";
  ctx.fillText("Click an item to add it to your inventory", panelX + panelWidth / 2, panelY + 54);

  for (let i = 0; i < DEBUG_ITEM_CATALOG.length; i++) {
    const { x: slotX, y: slotY } = getItemDebugSlotRect(i);
    const isHovered = itemDebugHoverIndex === i;

    ctx.fillStyle = isHovered ? "#2a3848" : "#1e2430";
    ctx.fillRect(slotX, slotY, slotSize, slotSize);
    ctx.strokeStyle = isHovered ? "#88ccff" : "#445566";
    ctx.lineWidth = isHovered ? 3 : 1;
    ctx.strokeRect(slotX, slotY, slotSize, slotSize);

    drawDebugCatalogItem(DEBUG_ITEM_CATALOG[i], slotX, slotY, slotSize);
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#888";
  ctx.font = "13px Arial";
  ctx.fillText("F5 / Esc — Close", panelX + panelWidth / 2, panelY + panelHeight - 14);
  ctx.textAlign = "left";
}

function drawDebugMenuOverlay() {
  if (!debugMenuOpen) {
    return;
  }

  const panelW = 420;
  const panelH = 388;
  const panelX = (PLAY_WIDTH - panelW) / 2;
  const panelY = (PLAY_HEIGHT - panelH) / 2;

  ctx.fillStyle = "rgba(0, 0, 0, 0.78)";
  ctx.fillRect(0, 0, PLAY_WIDTH, PLAY_HEIGHT);

  ctx.fillStyle = "#141820";
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = debugGodMode ? "#66ff88" : "#6688ff";
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX + 1, panelY + 1, panelW - 2, panelH - 2);

  ctx.fillStyle = "#d8e0ff";
  ctx.font = "bold 20px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Debug Menu (F4)", panelX + panelW / 2, panelY + 30);

  const lines = [
    `G — God mode ${debugGodMode ? "[ON]" : "[off]"}`,
    `K — Instakill ${debugInstakill ? "[ON]" : "[off]"}`,
    "H — Full heal",
    "C — +50 coins",
    "S — +10 scrap",
    "W — Add random weapon to bag",
    "P — Spawn legendary pickup nearby",
    "T — Teleport to stairs room",
    "E — Teleport to enchant antechamber",
    "N — Teleport to linked room",
    "D — Descend one floor",
    "I — Item spawner (click to grant items)",
    "F4 / Esc — Close",
  ];

  ctx.textAlign = "left";
  ctx.font = "14px Arial";
  ctx.fillStyle = "#c8d0e8";

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], panelX + 24, panelY + 64 + i * 24);
  }

  ctx.textAlign = "left";
}

function drawBossWeaponPickup() {
  const room = getCurrentRoom();

  if (!room.bossWeaponPickup) {
    return;
  }

  const pickup = room.bossWeaponPickup;
  const pulse = Math.sin(performance.now() / 220) * 3;
  const size = WEAPON_PICKUP_SIZE;

  ctx.fillStyle = "rgba(180, 120, 255, 0.28)";
  ctx.beginPath();
  ctx.arc(pickup.x + size / 2, pickup.y + size / 2 + pulse, size * 0.62, 0, Math.PI * 2);
  ctx.fill();

  drawSprite(
    ctx,
    getWeaponSprite(pickup.weaponId),
    pickup.x + 4,
    pickup.y + 4 + pulse,
    size - 8,
    size - 8,
  );

  ctx.fillStyle = getWeaponDisplayColor(pickup.weaponId);
  ctx.font = "bold 10px Arial";
  ctx.textAlign = "center";
  ctx.fillText(formatWeaponName(pickup.weaponId), pickup.x + size / 2, pickup.y - 6 + pulse);
  ctx.textAlign = "left";
}

function drawSpecialPickup() {
  const room = getCurrentRoom();

  if (!room.specialPickup || room.specialPickupCollected) {
    return;
  }

  const pickup = room.specialPickup;
  const pulse = Math.sin(performance.now() / 180) * 3;
  const size = SPECIAL_PICKUP_SIZE;

  ctx.fillStyle = "rgba(80, 180, 255, 0.25)";
  ctx.beginPath();
  ctx.arc(pickup.x + size / 2, pickup.y + size / 2 + pulse, size * 0.55, 0, Math.PI * 2);
  ctx.fill();

  drawSprite(ctx, SPRITES.dashBoots, pickup.x + 4, pickup.y + 4 + pulse, size - 8, size - 8);

  ctx.fillStyle = "#a8e8ff";
  ctx.font = "bold 10px Arial";
  ctx.textAlign = "center";
  ctx.fillText(
    SPECIAL_ITEMS[pickup.specialId].name,
    pickup.x + size / 2,
    pickup.y - 6 + pulse,
  );
  ctx.textAlign = "left";
}

function drawDroppedItems() {
  const room = getCurrentRoom();

  if (!room.droppedItems?.length) {
    return;
  }

  for (const drop of room.droppedItems) {
    const pulse = Math.sin(performance.now() / 200 + drop.x) * 3;
    const size = getDroppedItemSize(drop.item);
    const item = drop.item;

    ctx.fillStyle = "rgba(255, 200, 80, 0.2)";
    ctx.beginPath();
    ctx.arc(drop.x + size / 2, drop.y + size / 2 + pulse, size * 0.55, 0, Math.PI * 2);
    ctx.fill();

    if (item.type === "weapon" && item.weaponId) {
      drawSprite(
        ctx,
        getWeaponSprite(item.weaponId),
        drop.x + 4,
        drop.y + 4 + pulse,
        size - 8,
        size - 8,
      );
    } else if (item.type === "health-potion") {
      drawSprite(ctx, SPRITES.potionHealth, drop.x, drop.y + pulse, size, size);
    } else if (item.type === "strong-potion") {
      drawSprite(ctx, SPRITES.potionStrong, drop.x, drop.y + pulse, size, size);
    } else if (item.type === "special" && item.specialId) {
      drawSprite(ctx, SPRITES.dashBoots, drop.x + 4, drop.y + 4 + pulse, size - 8, size - 8);
    }
  }
}

function drawStairsPrompt() {
  if (!stairsPrompt) {
    return;
  }

  const panelW = 360;
  const panelH = 120;
  const panelX = (PLAY_WIDTH - panelW) / 2;
  const panelY = PLAY_HEIGHT / 2 - panelH / 2;
  const label = stairsPrompt === "down" ? "Descend to the next floor?" : "Ascend to the previous floor?";

  ctx.fillStyle = "rgba(0, 0, 0, 0.78)";
  ctx.fillRect(0, 0, PLAY_WIDTH, PLAY_HEIGHT);

  ctx.fillStyle = "#1a1820";
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = "#d8b060";
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX + 1, panelY + 1, panelW - 2, panelH - 2);

  ctx.fillStyle = "#f0e8d0";
  ctx.font = "bold 18px Arial";
  ctx.textAlign = "center";
  ctx.fillText(label, panelX + panelW / 2, panelY + 42);

  ctx.font = "14px Arial";
  ctx.fillStyle = "#c8c0b0";
  ctx.fillText("Y / Enter — Yes     N / Esc — Stay", panelX + panelW / 2, panelY + 78);
  ctx.textAlign = "left";
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
  drawShopStation();
  drawSlotMachine();
  drawScrapPickups();
  drawBossHeartPickup();
  drawBossWeaponPickup();
  drawSpecialPickup();
  drawDroppedItems();

  drawPlayer();

  drawWeaponSwing();
  drawPlayerGolemBeams();
  drawSoulScytheProjectiles();

  if (!getCurrentRoom().coinCollected) {
    drawSpriteCentered(ctx, SPRITES.coin, coin.x + coin.size / 2, coin.y + coin.size / 2, coin.size);
  }

  for (const mob of activeMobs) {
    if (isMobAlive(mob)) {
      if (mob.type === "boss" && mob.golemState && areGolemSpritesLoaded()) {
        drawGolemBoss(ctx, mob, mob.golemState, performance.now() < mob.hitFlashUntil);
        drawMobHpBar(mob);
        continue;
      }

      if (mob.type === "boss" && mob.executionerState && areExecutionerSpritesLoaded()) {
        drawExecutionerBoss(
          ctx,
          mob,
          mob.executionerState,
          performance.now() < mob.hitFlashUntil,
          performance.now(),
        );
        drawMobHpBar(mob);
        continue;
      }

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

  if (areGolemSpritesLoaded()) {
    drawGolemEffects(ctx);
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

  if (enchantOverlayOpen) {
    drawEnchantOverlay();
  }

  if (slotSpin.activeUntil > performance.now()) {
    drawSlotSpinOverlay();
  }

  if (shopOpen) {
    drawShopOverlay();
  }

  if (encyclopediaOpen) {
    drawEncyclopediaOverlay();
  }

  if (debugMenuOpen) {
    drawDebugMenuOverlay();
  }

  if (itemDebugMenuOpen) {
    drawItemDebugOverlay();
  }

  if (stairsPrompt) {
    drawStairsPrompt();
  }

  if (gamePaused) {
    drawPauseOverlay();
  }
}

function drawPauseOverlay() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.58)";
  ctx.fillRect(0, 0, PLAY_WIDTH, PLAY_HEIGHT);

  ctx.fillStyle = "#f0e8d0";
  ctx.font = "bold 34px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Paused", PLAY_WIDTH / 2, PLAY_HEIGHT / 2 - 8);

  ctx.font = "16px Arial";
  ctx.fillStyle = "#c8c0b0";
  ctx.fillText("Press Esc to resume", PLAY_WIDTH / 2, PLAY_HEIGHT / 2 + 28);
  ctx.textAlign = "left";
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
leaderboardBtn.addEventListener("click", () => setMenuLeaderboardOpen(true));
leaderboardCloseBtn.addEventListener("click", () => setMenuLeaderboardOpen(false));
mapBtn.addEventListener("click", toggleMap);
invBtn.addEventListener("click", toggleInventory);
canvas.addEventListener("mousedown", handleCanvasMouseDown);
canvas.addEventListener("contextmenu", (event) => {
  if (inventoryOpen && state === "playing") {
    event.preventDefault();
  }
});
canvas.addEventListener("mousemove", handleInventoryMouseMove);
window.addEventListener("mouseup", handleInventoryMouseUp);
canvas.addEventListener("mouseleave", handleInventoryMouseLeave);
canvas.addEventListener(
  "wheel",
  (event) => {
    if (encyclopediaOpen && state === "playing") {
      event.preventDefault();
      toggleEncyclopediaScroll(event.deltaY);
    }
  },
  { passive: false },
);

let spritesReady = false;

loadAssetSprites()
  .then(() => loadWeaponSprites())
  .then(() => loadGolemSprites())
  .then(() => loadExecutionerSprites())
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
