import { BOSS_WEAPON_ID, EXECUTIONER_BOSS_WEAPON_ID, IMPALER_BOSS_WEAPON_ID } from "./constants";
import type { WeaponId } from "./types";

export type BossKind = "golem" | "executioner" | "impaler";

export function getBossKindForDepth(depth: number): BossKind {
  if (depth % 30 === 0) {
    return "impaler";
  }

  if (depth % 20 === 0) {
    return "executioner";
  }

  return "golem";
}

export function getBossDisplayName(kind: BossKind) {
  if (kind === "executioner") {
    return "Undead Executioner";
  }

  if (kind === "impaler") {
    return "The Impaler";
  }

  return "Mecha Stone Golem";
}

export function getBossWeaponDrop(kind: BossKind): WeaponId {
  if (kind === "executioner") {
    return EXECUTIONER_BOSS_WEAPON_ID;
  }

  if (kind === "impaler") {
    return IMPALER_BOSS_WEAPON_ID;
  }

  return BOSS_WEAPON_ID;
}

export function getBossAwakenMessage(kind: BossKind) {
  if (kind === "impaler") {
    return "The Impaler blocks your path!";
  }

  return `${getBossDisplayName(kind)} awakens!`;
}

export function getBossDefeatMessage(kind: BossKind) {
  if (kind === "executioner") {
    return "Boss defeated! Ladder down opened — claim the Heart Container and Executioner's Scythe.";
  }

  if (kind === "impaler") {
    return "Boss defeated! Ladder down opened — claim the Heart Container and Gungnir.";
  }

  return "Boss defeated! Ladder down opened — claim the Heart Container and Golem Club.";
}

export function getBossTransformMessage(_kind: BossKind) {
  return "";
}
