import { LEGENDARY_WEAPON_IDS, BOSS_WEAPON_ID, getOneStarWeaponIds } from "./constants";
import type { WeaponId } from "./types";

let golemClubUnlocked = false;

export function resetLegendaryPool() {
  golemClubUnlocked = false;
}

export function unlockGolemClubLegendary() {
  golemClubUnlocked = true;
}

export function isGolemClubInLegendaryPool() {
  return golemClubUnlocked;
}

export function getOneStarWeaponPool(): WeaponId[] {
  return getOneStarWeaponIds();
}

export function getLegendaryWeaponPool(): WeaponId[] {
  if (golemClubUnlocked) {
    return [...LEGENDARY_WEAPON_IDS, BOSS_WEAPON_ID];
  }

  return [...LEGENDARY_WEAPON_IDS];
}

export function isLegendaryWeaponId(weaponId: WeaponId) {
  return LEGENDARY_WEAPON_IDS.includes(weaponId) || (golemClubUnlocked && weaponId === BOSS_WEAPON_ID);
}
