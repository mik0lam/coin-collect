import type { LayoutObstacle } from "./roomLayouts";

export type GameState = "menu" | "playing" | "gameover";
export type Direction = "north" | "south" | "east" | "west";
export type MobType = "snake" | "slime" | "wraith" | "brute" | "boss";
export type WeaponId =
  | "rusty-sword"
  | "iron-sword"
  | "war-axe"
  | "dagger"
  | "soulreaver"
  | "storm-cleaver"
  | "blood-reaper"
  | "phantom-blade";
export type InventoryItemType = "health-potion" | "strong-potion" | "weapon" | "special";
export type SpecialItemId = "dash-boots";
export type ArmorTier = "none" | "leather" | "chain" | "plate";

export interface WeaponDef {
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
  ability?: string;
}

export interface MobConfig {
  type: MobType;
  segments: { x: number; y: number }[];
  size: number;
  speed: number;
  maxHp: number;
  contactDamage: number;
  currentHp?: number;
}

export type GolemBossPhase = "idle" | "chase" | "laser" | "throw" | "hurt" | "dying";

export interface GolemBossState {
  phase: GolemBossPhase;
  anim: "idle" | "walk" | "laser" | "hurt" | "throw" | "death";
  animStartedAt: number;
  facingRight: boolean;
  nextAttackAt: number;
  phaseStartedAt: number;
  attackTriggered: boolean;
  deathHandled: boolean;
  hurtUntil: number;
}

export interface RuntimeMob {
  configIndex: number;
  type: MobType;
  segments: { x: number; y: number }[];
  size: number;
  speed: number;
  hp: number;
  maxHp: number;
  contactDamage: number;
  hitFlashUntil: number;
  golemState?: GolemBossState;
}

export type ChestLoot =
  | { kind: "weapon"; weaponId: WeaponId }
  | { kind: "health-potion"; healAmount: number }
  | { kind: "strong-potion"; healAmount: number }
  | { kind: "special"; specialId: SpecialItemId };

export interface Chest {
  x: number;
  y: number;
  opened: boolean;
  loot: ChestLoot;
  variant?: "normal" | "slot";
}

export interface InventoryItem {
  type: InventoryItemType;
  healAmount?: number;
  weaponId?: WeaponId;
  weaponDurability?: number;
  specialId?: SpecialItemId;
}

export interface ScrapPickup {
  x: number;
  y: number;
  amount: number;
}

export interface ShopStation {
  x: number;
  y: number;
}

export interface Room {
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
  shop?: ShopStation;
  scrapPickups?: ScrapPickup[];
  bossHeartPickup?: { x: number; y: number };
  bossWeaponPickup?: { x: number; y: number; weaponId: WeaponId };
  bossDefeated?: boolean;
  isPrepRoom?: boolean;
  isBossRoom?: boolean;
  isCraftingRoom?: boolean;
  specialPickup?: { x: number; y: number; specialId: SpecialItemId };
  specialPickupCollected?: boolean;
  layoutId?: string;
}

export interface Floor {
  depth: number;
  rooms: Record<string, Room>;
  startRoomId: string;
  stairsDownRoomId: string;
  isBossFloor?: boolean;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
