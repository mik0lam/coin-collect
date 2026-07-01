import { applySpriteOverrides, SPRITES } from "./sprites";

import tilesetUrl from "./assets/sprites/dungeon-pack/character and tileset/Dungeon_Tileset.png";
import charactersUrl from "./assets/sprites/dungeon-pack/character and tileset/Dungeon_Character.png";
import coinUrl from "./assets/sprites/dungeon-pack/items and trap_animation/coin/coin_1.png";
import chestClosedUrl from "./assets/sprites/dungeon-pack/items and trap_animation/chest/chest_2.png";
import chestOpenUrl from "./assets/sprites/dungeon-pack/items and trap_animation/chest/chest_open_2.png";
import potionHealthUrl from "./assets/sprites/dungeon-pack/items and trap_animation/flasks/flasks_1_1.png";
import potionStrongUrl from "./assets/sprites/dungeon-pack/items and trap_animation/flasks/flasks_2_1.png";
import pillarUrl from "./assets/sprites/dungeon-pack/items and trap_animation/torch/candlestick_1_1.png";
import slotMachineUrl from "./assets/sprites/dungeon-pack/items and trap_animation/mini_chest/mini_chest_1.png";
import voidShardUrl from "./assets/sprites/dungeon-pack/items and trap_animation/keys/keys_2_1.png";
import skeletonIdleUrl from "./assets/sprites/dungeon-pack/Character_animation/monsters_idle/skeleton1/v1/skeleton_v1_1.png";
import vampireIdleUrl from "./assets/sprites/dungeon-pack/Character_animation/monsters_idle/vampire/v1/vampire_v1_1.png";
import dashBootsUrl from "./assets/sprites/dungeon-pack/items and trap_animation/mini_box_2/mini_box_2_1.png";
import heroIdleDownUrl from "./assets/sprites/rpg-hero/idle/idle_down_40x40.png";
import heroIdleUpUrl from "./assets/sprites/rpg-hero/idle/idle_up_40x40.png";
import heroIdleLeftUrl from "./assets/sprites/rpg-hero/idle/idle_left_40x40.png";
import heroIdleRightUrl from "./assets/sprites/rpg-hero/idle/idle_right_40x40.png";

export const TILE_SIZE = 16;
export const TILE_DRAW_SIZE = 32;
export const TILE_SCALE = TILE_DRAW_SIZE / TILE_SIZE;
const HERO_FRAME = 40;
export const HERO_DRAW_SIZE = 64;

export type HeroHitbox = {
  insetX: number;
  insetY: number;
  w: number;
  h: number;
};

const DEFAULT_HERO_HITBOX: HeroHitbox = {
  insetX: 12,
  insetY: 12,
  w: 40,
  h: 40,
};

let heroHitbox: HeroHitbox = { ...DEFAULT_HERO_HITBOX };

export function getHeroHitbox() {
  return heroHitbox;
}

function measureOpaqueBounds(canvas: HTMLCanvasElement, alphaThreshold = 24): HeroHitbox {
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

  if (!ctx) {
    return { ...DEFAULT_HERO_HITBOX };
  }

  const { width, height } = canvas;
  const { data } = ctx.getImageData(0, 0, width, height);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];

      if (alpha > alphaThreshold) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX) {
    return { ...DEFAULT_HERO_HITBOX };
  }

  const pad = 2;
  minX = Math.min(minX + pad, maxX);
  minY = Math.min(minY + pad, maxY);
  maxX = Math.max(maxX - pad, minX);
  maxY = Math.max(maxY - pad, minY);

  return {
    insetX: minX,
    insetY: minY,
    w: maxX - minX + 1,
    h: maxY - minY + 1,
  };
}

function unionHeroHitboxes(...boxes: HeroHitbox[]): HeroHitbox {
  if (boxes.length === 0) {
    return { ...DEFAULT_HERO_HITBOX };
  }

  let minX = HERO_DRAW_SIZE;
  let minY = HERO_DRAW_SIZE;
  let maxX = 0;
  let maxY = 0;

  for (const box of boxes) {
    minX = Math.min(minX, box.insetX);
    minY = Math.min(minY, box.insetY);
    maxX = Math.max(maxX, box.insetX + box.w);
    maxY = Math.max(maxY, box.insetY + box.h);
  }

  return {
    insetX: minX,
    insetY: minY,
    w: maxX - minX,
    h: maxY - minY,
  };
}

function initHeroHitbox(facingSprites: HTMLCanvasElement[]) {
  heroHitbox = unionHeroHitboxes(...facingSprites.map((sprite) => measureOpaqueBounds(sprite)));
}

/**
 * Pixel Poem dungeon tileset (10×10 grid of 16px tiles).
 * Top-left block = walled room demo; middle-right = doors & stairs.
 */
const DUNGEON_TILES = {
  floorA: [1, 1],
  floorB: [2, 1],
  floorC: [1, 2],
  floorD: [2, 2],
  cornerTL: [0, 0],
  cornerTR: [3, 0],
  cornerBL: [0, 3],
  cornerBR: [3, 3],
  wallTop: [1, 0],
  wallBottom: [1, 3],
  wallLeft: [0, 1],
  wallRight: [3, 1],
  wallBlock: [0, 1],
  doorOrigin: [6, 6],
  stairsDownOrigin: [6, 4],
  stairsUpOrigin: [6, 4],
  rock: [3, 8],
} as const;

const MOB_TILES = {
  slime: [0, 2],
  wraith: [1, 2],
  snakeHead: [2, 2],
  snakeBody: [3, 2],
  brute: [4, 2],
} as const;

type SpriteSource = HTMLCanvasElement;

async function loadImage(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch image (${response.status}): ${url}`);
  }

  const blob = await response.blob();

  if (!blob.type.startsWith("image/")) {
    throw new Error(`Expected image, got "${blob.type}" for ${url}`);
  }

  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d")!;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  return canvas;
}

function keyBlackBackground(canvas: HTMLCanvasElement, threshold = 14) {
  const ctx = canvas.getContext("2d")!;

  if (!ctx) {
    return canvas;
  }

  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;

  for (let i = 0; i < pixels.length; i += 4) {
    const red = pixels[i];
    const green = pixels[i + 1];
    const blue = pixels[i + 2];

    if (red <= threshold && green <= threshold && blue <= threshold) {
      pixels[i + 3] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  return canvas;
}

function imageToCanvas(
  source: SpriteSource,
  sx = 0,
  sy = 0,
  sw = source.width,
  sh = source.height,
) {
  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d")!;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh);

  return canvas;
}

function sliceTileset(source: SpriteSource, col: number, row: number, size = TILE_SIZE) {
  return imageToCanvas(source, col * size, row * size, size, size);
}

function composeTileRegion(
  source: SpriteSource,
  startCol: number,
  startRow: number,
  tileCols: number,
  tileRows: number,
) {
  const canvas = document.createElement("canvas");
  canvas.width = tileCols * TILE_SIZE;
  canvas.height = tileRows * TILE_SIZE;
  const ctx = canvas.getContext("2d")!;

  ctx.imageSmoothingEnabled = false;

  for (let row = 0; row < tileRows; row++) {
    for (let col = 0; col < tileCols; col++) {
      ctx.drawImage(
        source,
        (startCol + col) * TILE_SIZE,
        (startRow + row) * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE,
        col * TILE_SIZE,
        row * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE,
      );
    }
  }

  return canvas;
}

function flipHorizontal(source: SpriteSource) {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext("2d")!;

  ctx.imageSmoothingEnabled = false;
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(source, 0, 0);

  return canvas;
}

function flipVertical(source: SpriteSource) {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext("2d")!;

  ctx.imageSmoothingEnabled = false;
  ctx.translate(0, canvas.height);
  ctx.scale(1, -1);
  ctx.drawImage(source, 0, 0);

  return canvas;
}

function sliceCharacter(source: SpriteSource, col: number, row: number) {
  return sliceTileset(source, col, row, TILE_SIZE);
}

function sliceHeroFrame(source: SpriteSource, frame = 0) {
  const raw = keyBlackBackground(
    imageToCanvas(source, frame * HERO_FRAME, 0, HERO_FRAME, HERO_FRAME),
  );
  const scaled = document.createElement("canvas");
  scaled.width = HERO_DRAW_SIZE;
  scaled.height = HERO_DRAW_SIZE;
  const ctx = scaled.getContext("2d")!;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(raw, 0, 0, HERO_DRAW_SIZE, HERO_DRAW_SIZE);

  return scaled;
}

export async function loadAssetSprites() {
  const [
    tileset,
    characters,
    coin,
    chestClosed,
    chestOpen,
    potionHealth,
    potionStrong,
    pillar,
    slotMachine,
    voidShard,
    skeletonMob,
    vampireMob,
    dashBoots,
    heroDown,
    heroUp,
    heroLeft,
    heroRight,
  ] = await Promise.all([
    loadImage(tilesetUrl),
    loadImage(charactersUrl),
    loadImage(coinUrl),
    loadImage(chestClosedUrl),
    loadImage(chestOpenUrl),
    loadImage(potionHealthUrl),
    loadImage(potionStrongUrl),
    loadImage(pillarUrl),
    loadImage(slotMachineUrl),
    loadImage(voidShardUrl),
    loadImage(skeletonIdleUrl),
    loadImage(vampireIdleUrl),
    loadImage(dashBootsUrl),
    loadImage(heroIdleDownUrl),
    loadImage(heroIdleUpUrl),
    loadImage(heroIdleLeftUrl),
    loadImage(heroIdleRightUrl),
  ]);

  const floorTiles = [
    sliceTileset(tileset, ...DUNGEON_TILES.floorA),
    sliceTileset(tileset, ...DUNGEON_TILES.floorB),
    sliceTileset(tileset, ...DUNGEON_TILES.floorC),
    sliceTileset(tileset, ...DUNGEON_TILES.floorD),
  ];

  const doorSprite = composeTileRegion(
    tileset,
    ...DUNGEON_TILES.doorOrigin,
    2,
    2,
  );
  const ladderSprite = composeTileRegion(
    tileset,
    ...DUNGEON_TILES.stairsUpOrigin,
    2,
    2,
  );
  const stairsDownSprite = flipVertical(ladderSprite);
  const stairsUpSprite = ladderSprite;

  const wallLeftSprite = sliceTileset(tileset, ...DUNGEON_TILES.wallLeft);
  const wallTopSprite = sliceTileset(tileset, ...DUNGEON_TILES.wallTop);
  const wallTopAltSprite = sliceTileset(tileset, 2, 0);
  const cornerTLSprite = sliceTileset(tileset, ...DUNGEON_TILES.cornerTL);
  const cornerTRSprite = sliceTileset(tileset, ...DUNGEON_TILES.cornerTR);
  const cornerBLSprite = sliceTileset(tileset, ...DUNGEON_TILES.cornerBL);

  const playerSouth = sliceHeroFrame(heroDown);
  const playerNorth = sliceHeroFrame(heroUp);
  const playerWest = sliceHeroFrame(heroLeft);
  const playerEast = sliceHeroFrame(heroRight);

  initHeroHitbox([playerSouth, playerNorth, playerWest, playerEast]);

  applySpriteOverrides(
    {
      playerSouth,
      playerNorth,
      playerWest,
      playerEast,
      coin: imageToCanvas(coin),
      voidShard: imageToCanvas(voidShard),
      slotMachine: imageToCanvas(slotMachine),
      dashBoots: imageToCanvas(dashBoots),
      snakeHead: sliceCharacter(characters, ...MOB_TILES.snakeHead),
      snakeBody: sliceCharacter(characters, ...MOB_TILES.snakeBody),
      slime: sliceCharacter(characters, ...MOB_TILES.slime),
      wraith: imageToCanvas(vampireMob),
      brute: imageToCanvas(skeletonMob),
      chestClosed: imageToCanvas(chestClosed),
      chestOpen: imageToCanvas(chestOpen),
      potionHealth: imageToCanvas(potionHealth),
      potionStrong: imageToCanvas(potionStrong),
      rock: sliceTileset(tileset, ...DUNGEON_TILES.rock),
      pillar: imageToCanvas(pillar),
      wall: wallTopSprite,
      wallCornerTL: cornerTLSprite,
      wallCornerTR: cornerTRSprite,
      wallCornerBL: cornerBLSprite,
      wallCornerBR: flipHorizontal(cornerBLSprite),
      wallTop: wallTopSprite,
      wallTopAlt: wallTopAltSprite,
      wallBottom: wallTopSprite,
      wallLeft: wallLeftSprite,
      wallRight: flipHorizontal(wallLeftSprite),
      door: doorSprite,
      stairsDown: stairsDownSprite,
      stairsUp: stairsUpSprite,
      floorTile: floorTiles[0],
    },
    floorTiles,
  );

  return SPRITES;
}
