import { BOSS_FLOOR_INTERVAL } from "./constants";
import { createRng } from "./rng";

/** Which 10-level block (0 = depths 10–19, 1 = 20–29, …) contains this depth. */
export function getEnchantBlockIndex(depth: number) {
  if (depth < BOSS_FLOOR_INTERVAL) {
    return 0;
  }

  return Math.floor((depth - BOSS_FLOOR_INTERVAL) / BOSS_FLOOR_INTERVAL);
}

/** Run-seeded enchant depth for a block (e.g. block 0 → 10–19, one pick per run). */
export function rollEnchantDepth(runSeed: number, blockIndex: number) {
  const rng = createRng(runSeed ^ ((blockIndex + 1) * 5821 + 9176));
  const minDepth = BOSS_FLOOR_INTERVAL + blockIndex * BOSS_FLOOR_INTERVAL;

  return minDepth + Math.floor(rng() * BOSS_FLOOR_INTERVAL);
}

export function isEnchantFloorDepth(runSeed: number, depth: number) {
  if (depth < BOSS_FLOOR_INTERVAL) {
    return false;
  }

  const blockIndex = getEnchantBlockIndex(depth);

  return rollEnchantDepth(runSeed, blockIndex) === depth;
}

export function getEnchantDepthForBlock(runSeed: number, blockIndex: number) {
  return rollEnchantDepth(runSeed, blockIndex);
}

/** Enchant depth for the block the player is currently in. */
export function getEnchantDepthNear(runSeed: number, currentDepth: number) {
  return rollEnchantDepth(runSeed, getEnchantBlockIndex(currentDepth));
}
