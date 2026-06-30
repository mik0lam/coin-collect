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

export function getWeaponAbilityDescription(weaponId: WeaponId) {
  return getLegendaryAbilityLabel(weaponId) ?? `${WEAPONS[weaponId].damage} damage weapon`;
}
