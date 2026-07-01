import { IMPALER_BOSS_WEAPON_ID, LEGENDARY_WEAPON_IDS, BOSS_WEAPON_ID, getOneStarWeaponIds } from "./constants";
import type { WeaponId } from "./types";

let golemClubUnlocked = false;
let gungnirUnlocked = false;

export function resetLegendaryPool() {
  golemClubUnlocked = false;
  gungnirUnlocked = false;
}

export function unlockGolemClubLegendary() {
  golemClubUnlocked = true;
}

export function unlockGungnirLegendary() {
  gungnirUnlocked = true;
}

export function isGolemClubInLegendaryPool() {
  return golemClubUnlocked;
}

export function getOneStarWeaponPool(): WeaponId[] {
  return getOneStarWeaponIds();
}

export function getLegendaryWeaponPool(): WeaponId[] {
  const pool = [...LEGENDARY_WEAPON_IDS];

  if (golemClubUnlocked) {
    pool.push(BOSS_WEAPON_ID);
  }

  if (gungnirUnlocked) {
    pool.push(IMPALER_BOSS_WEAPON_ID);
  }

  return pool;
}

export function isLegendaryWeaponId(weaponId: WeaponId) {
  return (
    LEGENDARY_WEAPON_IDS.includes(weaponId) ||
    (golemClubUnlocked && weaponId === BOSS_WEAPON_ID) ||
    (gungnirUnlocked && weaponId === IMPALER_BOSS_WEAPON_ID)
  );
}
