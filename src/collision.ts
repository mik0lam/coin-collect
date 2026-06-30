import { TILE_DRAW_SIZE } from "./spriteAssets";
import { DOOR_LENGTH, DOOR_START_X, DOOR_START_Y, obstacleHitbox } from "./roomLayouts";
import { PLAY_HEIGHT, PLAY_WIDTH } from "./constants";
import type { Box, Direction, Room } from "./types";
import type { LayoutObstacle } from "./roomLayouts";

export function boxesOverlap(a: Box, b: Box, padding = 0) {
  return (
    a.x < b.x + b.w + padding &&
    a.x + a.w + padding > b.x &&
    a.y < b.y + b.h + padding &&
    a.y + a.h + padding > b.y
  );
}

export function getPerimeterWallTiles(exits: Partial<Record<Direction, string>>) {
  const ts = TILE_DRAW_SIZE;
  const doorEndX = DOOR_START_X + DOOR_LENGTH;
  const doorEndY = DOOR_START_Y + DOOR_LENGTH;

  const wallTiles: Box[] = [
    { x: 0, y: 0, w: ts, h: ts },
    { x: PLAY_WIDTH - ts, y: 0, w: ts, h: ts },
    { x: 0, y: PLAY_HEIGHT - ts, w: ts, h: ts },
    { x: PLAY_WIDTH - ts, y: PLAY_HEIGHT - ts, w: ts, h: ts },
  ];

  for (let x = ts; x < PLAY_WIDTH - ts; x += ts) {
    if (!(exits.north && x >= DOOR_START_X && x < doorEndX)) {
      wallTiles.push({ x, y: 0, w: ts, h: ts });
    }

    if (!(exits.south && x >= DOOR_START_X && x < doorEndX)) {
      wallTiles.push({ x, y: PLAY_HEIGHT - ts, w: ts, h: ts });
    }
  }

  for (let y = ts; y < PLAY_HEIGHT - ts; y += ts) {
    if (!(exits.west && y >= DOOR_START_Y && y < doorEndY)) {
      wallTiles.push({ x: 0, y, w: ts, h: ts });
    }

    if (!(exits.east && y >= DOOR_START_Y && y < doorEndY)) {
      wallTiles.push({ x: PLAY_WIDTH - ts, y, w: ts, h: ts });
    }
  }

  return wallTiles;
}

export function collidesWithPerimeterWalls(
  box: Box,
  exits: Partial<Record<Direction, string>>,
) {
  return getPerimeterWallTiles(exits).some((tile) => boxesOverlap(box, tile));
}

export function collidesWithObstacleList(box: Box, obstacles: LayoutObstacle[]) {
  return obstacles.some((obstacle) => boxesOverlap(box, obstacleHitbox(obstacle)));
}

export function isSpawnBoxClear(
  box: Box,
  exits: Partial<Record<Direction, string>>,
  obstacles: LayoutObstacle[],
  occupied: Box[] = [],
  padding = 4,
) {
  if (collidesWithPerimeterWalls(box, exits)) {
    return false;
  }

  if (collidesWithObstacleList(box, obstacles)) {
    return false;
  }

  return !occupied.some((zone) => boxesOverlap(box, zone, padding));
}

export function collidesWithRoomObstacles(box: Box, room: Room) {
  if (collidesWithPerimeterWalls(box, room.exits)) {
    return true;
  }

  return collidesWithObstacleList(box, room.obstacles ?? []);
}
