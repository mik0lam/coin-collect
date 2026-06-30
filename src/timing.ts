/** Gameplay speeds are tuned for 60 Hz; scale movement by elapsed frame time. */
export const TARGET_FRAME_MS = 1000 / 60;
export const MAX_DELTA_MS = 50;

export function clampDeltaMs(deltaMs: number) {
  return Math.min(Math.max(deltaMs, 0), MAX_DELTA_MS);
}

export function deltaScale(deltaMs: number) {
  return clampDeltaMs(deltaMs) / TARGET_FRAME_MS;
}
