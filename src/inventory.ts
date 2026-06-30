import { WEAPONS } from "./constants";
import { recordWeaponDiscovered } from "./encyclopedia";
import type { InventoryItem, WeaponId } from "./types";

export function getWeaponDurability(item: InventoryItem) {
  return item.weaponDurability ?? WEAPONS[item.weaponId!].maxDurability;
}

export function getActiveWeaponItem(
  inventory: (InventoryItem | null)[],
  activeWeaponSlot: number | null,
) {
  if (activeWeaponSlot === null) {
    return null;
  }

  const item = inventory[activeWeaponSlot];

  if (!item || item.type !== "weapon" || !item.weaponId) {
    return null;
  }

  return item;
}

export function hasUsableWeapon(
  inventory: (InventoryItem | null)[],
  activeWeaponSlot: number | null,
) {
  const item = getActiveWeaponItem(inventory, activeWeaponSlot);
  return item !== null && getWeaponDurability(item) > 0;
}

export function ensureActiveWeaponSlot(
  inventory: (InventoryItem | null)[],
  activeWeaponSlotRef: { value: number | null },
) {
  if (hasUsableWeapon(inventory, activeWeaponSlotRef.value)) {
    return;
  }

  const nextWeaponSlot = inventory.findIndex(
    (item) => item?.type === "weapon" && item.weaponId && getWeaponDurability(item) > 0,
  );

  activeWeaponSlotRef.value = nextWeaponSlot >= 0 ? nextWeaponSlot : null;
}

export function addWeaponToInventory(
  inventory: (InventoryItem | null)[],
  activeWeaponSlotRef: { value: number | null },
  addToInventory: (item: InventoryItem) => number | null,
  weaponId: WeaponId,
  durability = WEAPONS[weaponId].maxDurability,
) {
  recordWeaponDiscovered(weaponId);

  const slot = addToInventory({
    type: "weapon",
    weaponId,
    weaponDurability: durability,
  });

  if (slot === null) {
    return null;
  }

  if (!hasUsableWeapon(inventory, activeWeaponSlotRef.value)) {
    activeWeaponSlotRef.value = slot;
  }

  return slot;
}
