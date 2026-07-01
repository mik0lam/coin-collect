import type { SpecialItemId, WeaponId } from "./types";
import { ALL_WEAPON_IDS, WEAPONS } from "./constants";
import { ACCESSORY_ITEM_IDS } from "./accessories";

const discoveredWeapons = new Set<WeaponId>(["rusty-sword"]);
const discoveredAccessories = new Set<SpecialItemId>();

export function recordWeaponDiscovered(weaponId: WeaponId) {
  discoveredWeapons.add(weaponId);
}

export function getDiscoveredWeapons() {
  return [...discoveredWeapons].sort((a, b) => WEAPONS[a].name.localeCompare(WEAPONS[b].name));
}

export function getUndiscoveredWeaponCount() {
  return ALL_WEAPON_IDS.length - discoveredWeapons.size;
}

export function resetWeaponEncyclopedia() {
  discoveredWeapons.clear();
  discoveredWeapons.add("rusty-sword");
  discoveredAccessories.clear();
}

export function isWeaponDiscovered(weaponId: WeaponId) {
  return discoveredWeapons.has(weaponId);
}

export function recordAccessoryDiscovered(specialId: SpecialItemId) {
  discoveredAccessories.add(specialId);
}

export function getDiscoveredAccessories() {
  return [...discoveredAccessories].sort((a, b) =>
    ACCESSORY_ITEM_IDS.indexOf(a) - ACCESSORY_ITEM_IDS.indexOf(b),
  );
}

export function getUndiscoveredAccessoryCount() {
  return ACCESSORY_ITEM_IDS.length - discoveredAccessories.size;
}

export function isAccessoryDiscovered(specialId: SpecialItemId) {
  return discoveredAccessories.has(specialId);
}

export function getAccessoryCatalogIds() {
  return ACCESSORY_ITEM_IDS;
}
