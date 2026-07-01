import type { InventoryItem, SpecialItemId } from "./types";

export const ACCESSORY_SLOT_COUNT = 2;

export const ACCESSORY_ITEM_IDS: SpecialItemId[] = [
  "dash-boots",
  "power-ring",
  "stone-charm",
  "vitality-charm",
];

export function getRandomAccessoryId(rng: () => number): SpecialItemId {
  return ACCESSORY_ITEM_IDS[Math.floor(rng() * ACCESSORY_ITEM_IDS.length)]!;
}

export function canEquipAsAccessory(item: InventoryItem | null) {
  return item?.type === "special" && !!item.specialId;
}

export function hasAccessoryEquipped(
  equipped: (InventoryItem | null)[],
  specialId: SpecialItemId,
) {
  return equipped.some((item) => item?.type === "special" && item.specialId === specialId);
}

export function getAccessoryDamageBonus(equipped: (InventoryItem | null)[]) {
  return hasAccessoryEquipped(equipped, "power-ring") ? 1 : 0;
}

export function getAccessoryMaxHpBonus(equipped: (InventoryItem | null)[]) {
  return hasAccessoryEquipped(equipped, "vitality-charm") ? 8 : 0;
}

export function getAccessoryDurabilityMultiplier(equipped: (InventoryItem | null)[]) {
  return hasAccessoryEquipped(equipped, "stone-charm") ? 1.2 : 1;
}

export function playerHasDashEquipped(equipped: (InventoryItem | null)[]) {
  return hasAccessoryEquipped(equipped, "dash-boots");
}
