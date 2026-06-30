import type { WeaponId } from "./types";
import { WEAPONS } from "./constants";

export interface RunRecord {
  id: string;
  finishedAt: number;
  score: number;
  deepestDepth: number;
  enemiesKilled: number;
  bestWeaponId: WeaponId | null;
  durationMs: number;
}

const STORAGE_KEY = "cavern-crawler-leaderboard";
const MAX_ENTRIES = 15;

export function loadLeaderboard(): RunRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as RunRecord[];

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRunToLeaderboard(record: RunRecord) {
  const entries = loadLeaderboard();
  entries.push(record);
  entries.sort((a, b) => b.score - a.score || b.deepestDepth - a.deepestDepth);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
}

export function formatBestWeapon(id: WeaponId | null) {
  if (!id) {
    return "—";
  }

  const def = WEAPONS[id];
  const star = def.rarity === "legendary" ? "★ " : "";

  return `${star}${def.name}`;
}

export function formatDuration(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;

  return `${min}:${sec.toString().padStart(2, "0")}`;
}
