import type { WeaponId } from "./types";

export interface RunStats {
  startedAt: number;
  enemiesKilled: number;
  weaponKills: Partial<Record<WeaponId, number>>;
  deepestDepth: number;
  score: number;
}

export function createRunStats(): RunStats {
  return {
    startedAt: Date.now(),
    enemiesKilled: 0,
    weaponKills: {},
    deepestDepth: 1,
    score: 0,
  };
}

export function recordMobKill(stats: RunStats, weaponId: WeaponId | null) {
  stats.enemiesKilled += 1;

  if (weaponId) {
    stats.weaponKills[weaponId] = (stats.weaponKills[weaponId] ?? 0) + 1;
  }
}

export function getBestWeapon(stats: RunStats): WeaponId | null {
  let best: WeaponId | null = null;
  let bestKills = 0;

  for (const [id, kills] of Object.entries(stats.weaponKills)) {
    if ((kills ?? 0) > bestKills) {
      bestKills = kills ?? 0;
      best = id as WeaponId;
    }
  }

  return best;
}
