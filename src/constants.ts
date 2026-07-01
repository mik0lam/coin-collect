import type { ArmorTier, MobType, SpecialItemId, WeaponDef, WeaponId } from "./types";

export const PLAY_WIDTH = 800;
export const PLAY_HEIGHT = 416;

export const WEAPONS: Record<WeaponId, WeaponDef> = {
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
    ability: "Life Steal — heal 2 HP on kill",
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
    ability: "Chain Bolt — 40% chance to hit a second foe",
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
    ability: "Execution — double damage below 30% HP",
  },
  "phantom-blade": {
    damage: 3,
    knockback: 14,
    range: 58,
    width: 32,
    cooldownMs: 220,
    durationMs: 110,
    maxDurability: 80,
    name: "Phantom Blade",
    swingColor: "rgba(200, 240, 255, 0.9)",
    swingArcScale: 0.8,
    swingSpriteSize: 34,
    rarity: "legendary",
    ability: "Phase Strike — attacks never lose durability",
  },
  "golem-club": {
    damage: 4,
    knockback: 28,
    range: 48,
    width: 42,
    cooldownMs: 500,
    durationMs: 180,
    maxDurability: 70,
    name: "Golem Club",
    swingColor: "rgba(100, 200, 255, 0.9)",
    swingArcScale: 1.15,
    swingSpriteSize: 48,
    stars: 2,
    ability: "Golem Beam — each swing fires a laser at the first foe (+2 dmg)",
  },
};

export function formatWeaponName(weaponId: WeaponId) {
  const def = WEAPONS[weaponId];
  const prefix = def.stars
    ? `${"★".repeat(def.stars)} `
    : def.rarity === "legendary"
      ? "★ "
      : "";

  return `${prefix}${def.name}`;
}

export function getWeaponDisplayColor(weaponId: WeaponId) {
  const def = WEAPONS[weaponId];

  if (def.rarity === "legendary") {
    return "#ffd860";
  }

  if (def.stars && def.stars >= 2) {
    return "#88ccff";
  }

  return "#ffffff";
}

export const LEGENDARY_WEAPON_IDS: WeaponId[] = [
  "soulreaver",
  "storm-cleaver",
  "blood-reaper",
  "phantom-blade",
];

export function isOneStarWeapon(weaponId: WeaponId) {
  const def = WEAPONS[weaponId];
  return def.rarity === "legendary" && (!def.stars || def.stars <= 1);
}

export function getOneStarWeaponIds(): WeaponId[] {
  return ALL_WEAPON_IDS.filter(isOneStarWeapon);
}

export function getNormalWeaponIds(): WeaponId[] {
  return ALL_WEAPON_IDS.filter((id) => !isOneStarWeapon(id) && id !== BOSS_WEAPON_ID);
}

export const BOSS_WEAPON_ID: WeaponId = "golem-club";

export const ALL_WEAPON_IDS = Object.keys(WEAPONS) as WeaponId[];

export const MOB_COLORS: Record<MobType, { normal: string; hit: string }> = {
  snake: { normal: "lime", hit: "#88ff88" },
  slime: { normal: "#20b2aa", hit: "#66dddd" },
  wraith: { normal: "#9932cc", hit: "#cc66ff" },
  brute: { normal: "#ff8800", hit: "#ffaa44" },
  boss: { normal: "#cc2244", hit: "#ff6688" },
};

export const ALL_MOB_TYPES: MobType[] = ["snake", "slime", "wraith", "brute"];

export const VOID_SHARD_FLOOR_INTERVAL = 5;
export const SHOP_FLOOR_INTERVAL = 3;
export const BOSS_FLOOR_INTERVAL = 10;

export const WEAPON_PICKUP_SIZE = 48;
export const SWORD_START_POSITION = { x: 200, y: 116 };
export const FLOOR_MESSAGE_MS = 2500;
export const DESCEND_BONUS = 15;
export const STAIRS_COOLDOWN_MS = 900;
export const POTION_PICKUP_SIZE = 34;
export const CHEST_SIZE = 44;
export const VOID_SHARD_SIZE = 34;
export const SLOT_MACHINE_SIZE = 64;
export const SLOT_SPIN_MS = 2600;
export const MAX_INVENTORY_SIZE = 6;
export const INVENTORY_ABSOLUTE_MAX = 9;
export const BOSS_INVENTORY_BONUS = 1;
export const SCRAP_PICKUP_SIZE = 28;
export const SHOP_STATION_SIZE = 56;
export const BOSS_HEART_SIZE = 36;
export const SPECIAL_PICKUP_SIZE = 40;

export const DASH_COOLDOWN_MS = 900;
export const DASH_DURATION_MS = 140;
export const DASH_SPEED = 16;

export const SPECIAL_ITEMS: Record<SpecialItemId, { name: string; description: string; shopCost: number }> = {
  "dash-boots": {
    name: "Dash Boots",
    description: "Press Shift to dash through danger",
    shopCost: 45,
  },
};

export const ARMOR_VISUAL: Record<
  Exclude<ArmorTier, "none">,
  { tint: string; alpha: number; accent: string }
> = {
  leather: { tint: "#8B5A2B", alpha: 0.28, accent: "#6B4423" },
  chain: { tint: "#8899AA", alpha: 0.32, accent: "#667788" },
  plate: { tint: "#C0C8D8", alpha: 0.38, accent: "#909AAA" },
};

export const ARMOR_TIERS: Record<
  Exclude<ArmorTier, "none">,
  { scrapCost: number; maxHpBonus: number; label: string }
> = {
  leather: { scrapCost: 5, maxHpBonus: 15, label: "Leather Armor" },
  chain: { scrapCost: 12, maxHpBonus: 30, label: "Chain Mail" },
  plate: { scrapCost: 25, maxHpBonus: 50, label: "Plate Armor" },
};

export const SHOP_ITEMS = {
  healthPotion: { cost: 15, healAmount: 40, label: "Health Potion" },
  strongPotion: { cost: 30, healAmount: 70, label: "Strong Potion" },
  weaponRepair: { cost: 20, label: "Repair Weapon" },
} as const;

export const BASE_MAX_HP = 100;
export const BOSS_HEART_HP_BONUS = 25;
