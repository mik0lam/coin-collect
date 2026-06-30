import { boxesOverlap } from "./collision";
import { SHOP_ITEMS, SHOP_STATION_SIZE, SPECIAL_ITEMS, WEAPONS } from "./constants";
import type { Box, InventoryItem, Room, SpecialItemId } from "./types";
import { getWeaponDurability } from "./inventory";

export function tryBuyHealthPotion(score: { value: number }): string | null {
  const item = SHOP_ITEMS.healthPotion;

  if (score.value < item.cost) {
    return `Need ${item.cost} coins.`;
  }

  score.value -= item.cost;
  return `bought:${item.healAmount}`;
}

export function tryBuyStrongPotion(score: { value: number }): string | null {
  const item = SHOP_ITEMS.strongPotion;

  if (score.value < item.cost) {
    return `Need ${item.cost} coins.`;
  }

  score.value -= item.cost;
  return `bought-strong:${item.healAmount}`;
}

export function tryBuyWeaponRepair(
  score: { value: number },
  inventory: (InventoryItem | null)[],
  activeWeaponSlot: number | null,
): string | null {
  const item = SHOP_ITEMS.weaponRepair;

  if (score.value < item.cost) {
    return `Need ${item.cost} coins.`;
  }

  const activeItem = activeWeaponSlot !== null ? inventory[activeWeaponSlot] : null;

  if (!activeItem || activeItem.type !== "weapon" || !activeItem.weaponId) {
    return "Equip a weapon to repair.";
  }

  const def = WEAPONS[activeItem.weaponId];
  const current = getWeaponDurability(activeItem);

  if (current >= def.maxDurability) {
    return "Weapon is already full.";
  }

  score.value -= item.cost;
  activeItem.weaponDurability = def.maxDurability;

  return `Repaired ${def.name}.`;
}

export function tryBuySpecialItem(
  score: { value: number },
  specialId: SpecialItemId,
  alreadyOwned: boolean,
): string | null {
  const item = SPECIAL_ITEMS[specialId];

  if (alreadyOwned) {
    return "You already have dash.";
  }

  if (score.value < item.shopCost) {
    return `Need ${item.shopCost} coins.`;
  }

  score.value -= item.shopCost;
  return `bought-special:${specialId}`;
}

export function isNearShopStation(room: Room, playerBox: Box) {
  if (!room.shop) {
    return false;
  }

  return boxesOverlap(playerBox, {
    x: room.shop.x,
    y: room.shop.y,
    w: SHOP_STATION_SIZE,
    h: SHOP_STATION_SIZE,
  }, 18);
}
