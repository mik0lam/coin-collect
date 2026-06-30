import { SPRITES, FLOOR_TILES } from "./sprites";
import { TILE_DRAW_SIZE } from "./spriteAssets";
import {
  DOOR_LENGTH,
  DOOR_START_X,
  DOOR_START_Y,
  LAYOUT_TILE_SIZE,
  obstacleHitbox,
  type LayoutObstacle,
} from "./roomLayouts";

export type DebugDirection = "north" | "south" | "east" | "west";

export interface TileInspection {
  col: number;
  row: number;
  x: number;
  y: number;
  layers: string[];
}

export interface DebugRoomView {
  exits: Partial<Record<DebugDirection, string>>;
  obstacles: LayoutObstacle[];
  stairsDownTile?: { x: number; y: number };
  stairsUpTile?: { x: number; y: number };
  coin?: { x: number; y: number };
  coinCollected?: boolean;
  chest?: { x: number; y: number; opened: boolean };
  layoutId?: string;
}

function boxesOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function pointInBox(x: number, y: number, box: { x: number; y: number; w: number; h: number }) {
  return x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h;
}

function perimeterWallLabel(
  col: number,
  row: number,
  playWidth: number,
  playHeight: number,
  exits: Partial<Record<DebugDirection, string>>,
) {
  const ts = TILE_DRAW_SIZE;
  const cols = playWidth / ts;
  const rows = playHeight / ts;
  const doorEndX = DOOR_START_X + DOOR_LENGTH;
  const doorEndY = DOOR_START_Y + DOOR_LENGTH;
  const onTop = row === 0;
  const onBottom = row === rows - 1;
  const onLeft = col === 0;
  const onRight = col === cols - 1;

  if (!onTop && !onBottom && !onLeft && !onRight) {
    return null;
  }

  const x = col * ts;

  if (onTop && exits.north && x >= DOOR_START_X && x < doorEndX) {
    return "door opening (north)";
  }

  if (onBottom && exits.south && x >= DOOR_START_X && x < doorEndX) {
    return "door opening (south)";
  }

  const y = row * ts;

  if (onLeft && exits.west && y >= DOOR_START_Y && y < doorEndY) {
    return "door opening (west)";
  }

  if (onRight && exits.east && y >= DOOR_START_Y && y < doorEndY) {
    return "door opening (east)";
  }

  if (onTop && onLeft) {
    return "perimeter wall · wallCornerTL (tileset 0,0)";
  }

  if (onTop && onRight) {
    return "perimeter wall · wallCornerTR (tileset 3,0)";
  }

  if (onBottom && onLeft) {
    return "perimeter wall · wallCornerBL (tileset 0,3)";
  }

  if (onBottom && onRight) {
    return "perimeter wall · wallCornerBR (flipped BL corner)";
  }

  if (onTop) {
    return "perimeter wall · wallTop (tileset 1,0 or 2,0) · indestructible";
  }

  if (onBottom) {
    return "perimeter wall · wallTop cap (bottom edge) · indestructible";
  }

  if (onLeft) {
    return "perimeter wall · wallLeft (tileset 0,1) · indestructible";
  }

  if (onRight) {
    return "perimeter wall · wallRight (flipped wallLeft) · indestructible";
  }

  return null;
}

function interiorObstacleLabel(obstacle: LayoutObstacle) {
  const hpLabel = `${obstacle.hp}/${obstacle.maxHp} hp · breakable`;
  switch (obstacle.kind) {
    case "wall":
      return `layout wall · wallTop cap (tileset 1,0 or 2,0) · ${hpLabel}`;
    case "rock":
      return `layout rock · tileset (3,8) stone pile · ${hpLabel}`;
    case "pillar":
      return `layout pillar · candlestick sprite · ${hpLabel}`;
  }
}

export function inspectTileAt(
  x: number,
  y: number,
  room: DebugRoomView,
  playWidth: number,
  playHeight: number,
): TileInspection {
  const col = Math.floor(x / LAYOUT_TILE_SIZE);
  const row = Math.floor(y / LAYOUT_TILE_SIZE);
  const layers: string[] = [];
  const tileX = col * LAYOUT_TILE_SIZE;
  const tileY = row * LAYOUT_TILE_SIZE;
  const tileBox = { x: tileX, y: tileY, w: LAYOUT_TILE_SIZE, h: LAYOUT_TILE_SIZE };

  if (room.stairsDownTile) {
    const sprite = SPRITES.stairsDown;
    const bounds = {
      x: room.stairsDownTile.x,
      y: room.stairsDownTile.y,
      w: sprite.width * 2,
      h: sprite.height * 2,
    };

    if (pointInBox(x, y, bounds)) {
      layers.push("stairs down · ladder (tileset 6,4) 2×2, flipped");
    }
  }

  if (room.stairsUpTile) {
    const sprite = SPRITES.stairsUp;
    const bounds = {
      x: room.stairsUpTile.x,
      y: room.stairsUpTile.y,
      w: sprite.width * 2,
      h: sprite.height * 2,
    };

    if (pointInBox(x, y, bounds)) {
      layers.push("stairs up · ladder (tileset 6,4) 2×2");
    }
  }

  if (room.chest && pointInBox(x, y, { x: room.chest.x, y: room.chest.y, w: 44, h: 44 })) {
    layers.push(room.chest.opened ? "chest (opened)" : "chest (closed)");
  }

  if (room.coin && !room.coinCollected && pointInBox(x, y, { x: room.coin.x, y: room.coin.y, w: 28, h: 28 })) {
    layers.push("coin pickup");
  }

  const doorW = SPRITES.door.width * 2;
  const doorH = SPRITES.door.height * 2;

  if (room.exits.north && pointInBox(x, y, { x: DOOR_START_X, y: 0, w: doorW, h: doorH })) {
    layers.push("door sprite (north) · tileset (6,6) 2×2 arch");
  }

  if (room.exits.south && pointInBox(x, y, { x: DOOR_START_X, y: playHeight - doorH, w: doorW, h: doorH })) {
    layers.push("door sprite (south) · tileset (6,6) 2×2 arch");
  }

  if (room.exits.west && pointInBox(x, y, { x: 0, y: DOOR_START_Y, w: doorW, h: doorH })) {
    layers.push("door sprite (west) · tileset (6,6) 2×2 arch");
  }

  if (room.exits.east && pointInBox(x, y, { x: playWidth - doorW, y: DOOR_START_Y, w: doorW, h: doorH })) {
    layers.push("door sprite (east) · tileset (6,6) 2×2 arch");
  }

  for (const obstacle of room.obstacles) {
    if (boxesOverlap(tileBox, obstacleHitbox(obstacle))) {
      layers.push(interiorObstacleLabel(obstacle));
    }
  }

  const perimeter = perimeterWallLabel(col, row, playWidth, playHeight, room.exits);

  if (perimeter) {
    layers.push(perimeter);
  }

  const floorIndex =
    FLOOR_TILES.length > 0
      ? (col * 7 + row * 13) % FLOOR_TILES.length
      : 0;
  layers.push(`floor · floorTile variant ${floorIndex} (tileset 1–2, 1–2)`);

  if (room.layoutId) {
    layers.unshift(`layout: ${room.layoutId}`);
  }

  layers.unshift(`grid (${col}, ${row}) · px (${tileX}, ${tileY})`);

  return { col, row, x: tileX, y: tileY, layers };
}

export function drawTileDebugOverlay(
  ctx: CanvasRenderingContext2D,
  inspection: TileInspection | null,
  debugMode: boolean,
  playWidth: number,
) {
  if (!debugMode) {
    return;
  }

  if (inspection) {
    ctx.fillStyle = "rgba(0, 180, 255, 0.12)";
    ctx.fillRect(inspection.x, inspection.y, LAYOUT_TILE_SIZE, LAYOUT_TILE_SIZE);
    ctx.strokeStyle = "#00e8ff";
    ctx.lineWidth = 2;
    ctx.strokeRect(inspection.x, inspection.y, LAYOUT_TILE_SIZE, LAYOUT_TILE_SIZE);
  }

  const panelW = Math.min(playWidth - 16, 420);
  ctx.fillStyle = "rgba(8, 12, 20, 0.92)";
  ctx.fillRect(8, 8, panelW, 88);
  ctx.strokeStyle = "#00e8ff";
  ctx.lineWidth = 1;
  ctx.strokeRect(8, 8, panelW, 88);

  ctx.fillStyle = "#7aeeff";
  ctx.font = "bold 11px Consolas, monospace";
  ctx.textAlign = "left";
  ctx.fillText("TILE DEBUG (F3 toggle · click a tile)", 14, 24);

  ctx.fillStyle = "#d8f8ff";
  ctx.font = "10px Consolas, monospace";

  if (!inspection) {
    ctx.fillText("Click any tile to inspect sprites.", 14, 42);
    return;
  }

  let textY = 40;

  for (const line of inspection.layers.slice(0, 5)) {
    ctx.fillText(line, 14, textY);
    textY += 13;
  }

  if (inspection.layers.length > 5) {
    ctx.fillStyle = "#7aeeff";
    ctx.fillText(`+${inspection.layers.length - 5} more…`, 14, textY);
  }
}
