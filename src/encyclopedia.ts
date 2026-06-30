import type { WeaponId } from "./types";
import { ALL_WEAPON_IDS, WEAPONS } from "./constants";

const discoveredWeapons = new Set<WeaponId>(["rusty-sword"]);

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
}

export function isWeaponDiscovered(weaponId: WeaponId) {
  return discoveredWeapons.has(weaponId);
}
