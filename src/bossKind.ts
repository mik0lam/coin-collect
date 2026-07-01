import { BOSS_WEAPON_ID, EXECUTIONER_BOSS_WEAPON_ID } from "./constants";
import type { WeaponId } from "./types";

export type BossKind = "golem" | "executioner";

export function getBossKindForDepth(depth: number): BossKind {
  return depth % 20 === 0 ? "executioner" : "golem";
}

export function getBossDisplayName(kind: BossKind) {
  return kind === "executioner" ? "Undead Executioner" : "Mecha Stone Golem";
}

export function getBossWeaponDrop(kind: BossKind): WeaponId {
  return kind === "executioner" ? EXECUTIONER_BOSS_WEAPON_ID : BOSS_WEAPON_ID;
}

export function getBossAwakenMessage(kind: BossKind) {
  return `${getBossDisplayName(kind)} awakens!`;
}

export function getBossDefeatMessage(kind: BossKind) {
  if (kind === "executioner") {
    return "Boss defeated! Ladder down opened — claim the Heart Container and Executioner's Scythe.";
  }

  return "Boss defeated! Ladder down opened — claim the Heart Container and Golem Club.";
}
