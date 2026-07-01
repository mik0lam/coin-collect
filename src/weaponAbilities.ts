import { WEAPONS } from "./constants";
import type { RuntimeMob, WeaponId } from "./types";

export function getLegendaryAbilityLabel(weaponId: WeaponId) {
  switch (weaponId) {
    case "soulreaver":
      return "Life Steal — heal 2 HP on kill";
    case "storm-cleaver":
      return "Chain Bolt — 40% chance to strike a second foe";
    case "blood-reaper":
      return "Execution — double damage below 30% HP";
    case "phantom-blade":
      return "Phase Strike — attacks never lose durability";
    case "golem-club":
      return "Golem Beam — each swing fires a laser at the first foe (+2 dmg)";
    case "executioner-scythe":
      return "Soul Scythe — each swing throws a spinning blade (+3 dmg)";
    case "gungnir":
      return "Ring of Fire — each thrust summons a ring of fire (+4 dmg)";
    default:
      return null;
  }
}

export function getEffectiveDamage(
  weaponId: WeaponId,
  baseDamage: number,
  mob: RuntimeMob,
  instakill: boolean,
) {
  if (instakill) {
    return 9999;
  }

  if (weaponId === "blood-reaper" && mob.maxHp > 0 && mob.hp / mob.maxHp <= 0.3) {
    return baseDamage * 2;
  }

  return baseDamage;
}

export function shouldSkipDurabilityLoss(weaponId: WeaponId) {
  return weaponId === "phantom-blade";
}

export function getLifeStealOnKill(weaponId: WeaponId) {
  return weaponId === "soulreaver" ? 2 : 0;
}

export function shouldChainStrike(weaponId: WeaponId, rng = Math.random()) {
  return weaponId === "storm-cleaver" && rng < 0.4;
}

export function shouldFireGolemBeam(weaponId: WeaponId) {
  return weaponId === "golem-club";
}

export function shouldThrowSoulScythe(weaponId: WeaponId) {
  return weaponId === "executioner-scythe";
}

export function shouldCastGungnirFireRing(weaponId: WeaponId) {
  return weaponId === "gungnir";
}

export function getSoulScytheDamage(_weaponId: WeaponId, _baseDamage: number) {
  return 3;
}

export function getGolemBeamDamage(_weaponId: WeaponId, _baseDamage: number) {
  return 2;
}

export function getGungnirFireRingDamage(_weaponId: WeaponId, _baseDamage: number) {
  return 4;
}

export function getWeaponAbilityDescription(weaponId: WeaponId) {
  return getLegendaryAbilityLabel(weaponId) ?? `${WEAPONS[weaponId].damage} damage weapon`;
}
