import { randomPosition } from "./rng";
import { isSpawnBoxClear } from "./collision";
import { PLAY_HEIGHT, PLAY_WIDTH } from "./constants";
import type { Box, Direction } from "./types";
import type { LayoutObstacle, RoomLayoutTemplate } from "./roomLayouts";
import { LAYOUT_TILE_SIZE } from "./roomLayouts";

export function findOpenPosition(
  rng: () => number,
  size: number,
  occupied: Box[],
  exits: Partial<Record<Direction, string>>,
  obstacles: LayoutObstacle[] = [],
) {
  for (let attempt = 0; attempt < 80; attempt++) {
    const pos = randomPosition(rng, PLAY_WIDTH, PLAY_HEIGHT, 72);
    const candidate = { x: pos.x, y: pos.y, w: size, h: size };

    if (isSpawnBoxClear(candidate, exits, obstacles, occupied, 12)) {
      return pos;
    }
  }

  const fallback = {
    x: PLAY_WIDTH / 2 - size / 2,
    y: PLAY_HEIGHT / 2 + 72,
  };

  if (isSpawnBoxClear({ ...fallback, w: size, h: size }, exits, obstacles, occupied, 8)) {
    return fallback;
  }

  return { x: LAYOUT_TILE_SIZE * 2, y: LAYOUT_TILE_SIZE * 2 };
}

export function findLayoutPosition(
  rng: () => number,
  size: number,
  occupied: Box[],
  layout: RoomLayoutTemplate,
  exits: Partial<Record<Direction, string>>,
  obstacles: LayoutObstacle[],
) {
  const candidates: { x: number; y: number }[] = [];

  for (let row = 0; row < layout.rows.length; row++) {
    const line = layout.rows[row];

    for (let col = 0; col < line.length; col++) {
      if (line[col] !== ".") {
        continue;
      }

      const x = col * LAYOUT_TILE_SIZE + (LAYOUT_TILE_SIZE - size) / 2;
      const y = row * LAYOUT_TILE_SIZE + (LAYOUT_TILE_SIZE - size) / 2;
      const box = { x, y, w: size, h: size };

      if (isSpawnBoxClear(box, exits, obstacles, occupied, 6)) {
        candidates.push({ x, y });
      }
    }
  }

  if (candidates.length === 0) {
    return findOpenPosition(rng, size, occupied, exits, obstacles);
  }

  return candidates[Math.floor(rng() * candidates.length)];
}

export function isSnakeSpawnClear(
  headX: number,
  headY: number,
  segmentCount: number,
  segmentSize: number,
  segmentSpacing: number,
  exits: Partial<Record<Direction, string>>,
  obstacles: LayoutObstacle[],
  occupied: Box[],
) {
  for (let s = 0; s < segmentCount; s++) {
    const box = {
      x: headX - s * segmentSpacing,
      y: headY,
      w: segmentSize,
      h: segmentSize,
    };

    if (!isSpawnBoxClear(box, exits, obstacles, occupied, 4)) {
      return false;
    }
  }

  return true;
}
