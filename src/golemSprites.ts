import characterSheetUrl from "./assets/sprites/mecha-golem/character-sheet.png";
import laserSheetUrl from "./assets/sprites/mecha-golem/laser-sheet.png";
import armProjectileUrl from "./assets/sprites/mecha-golem/arm-projectile-glowing.png";
import rockProjectileUrl from "./assets/sprites/mecha-golem/arm-projectile.png";

export const GOLEM_FRAME_SIZE = 100;
export const GOLEM_DRAW_SIZE = 192;
export const GOLEM_HITBOX_SIZE = 132;
export const GOLEM_SCALE = GOLEM_DRAW_SIZE / 96;
export const GOLEM_COLS = 10;

export const GOLEM_ANIMS = {
  idle: { row: 0, frames: 4, fps: 4 },
  walk: { row: 1, frames: 8, fps: 10 },
  laser: { row: 2, frames: 9, fps: 11 },
  hurt: { row: 4, frames: 8, fps: 14 },
  throw: { row: 6, frames: 10, fps: 11 },
  death: { row: 7, frames: 10, fps: 10 },
} as const;

export type GolemAnimKey = keyof typeof GOLEM_ANIMS;

const golemFrames: HTMLCanvasElement[][] = [];
let laserFrames: HTMLCanvasElement[] = [];
let armProjectileSprite: HTMLCanvasElement | null = null;
let rockProjectileSprite: HTMLCanvasElement | null = null;
let loaded = false;

async function loadImage(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch golem image (${response.status}): ${url}`);
  }

  const blob = await response.blob();
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

function sliceFrame(source: HTMLCanvasElement, col: number, row: number, size = GOLEM_FRAME_SIZE) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, col * size, row * size, size, size, 0, 0, size, size);

  return canvas;
}

function keyBlackBackground(canvas: HTMLCanvasElement, threshold = 18) {
  const ctx = canvas.getContext("2d")!;

  if (!ctx) {
    return canvas;
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i] <= threshold && pixels[i + 1] <= threshold && pixels[i + 2] <= threshold) {
      pixels[i + 3] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  return canvas;
}

export async function loadGolemSprites() {
  if (loaded) {
    return;
  }

  const [characterSheet, laserSheet, armProjectile, rockProjectile] = await Promise.all([
    loadImage(characterSheetUrl),
    loadImage(laserSheetUrl),
    loadImage(armProjectileUrl),
    loadImage(rockProjectileUrl),
  ]);

  for (let row = 0; row < 10; row++) {
    const rowFrames: HTMLCanvasElement[] = [];

    for (let col = 0; col < GOLEM_COLS; col++) {
      rowFrames.push(keyBlackBackground(sliceFrame(characterSheet, col, row)));
    }

    golemFrames.push(rowFrames);
  }

  const laserFrameHeight = Math.floor(laserSheet.height / 14);

  for (let i = 0; i < 14; i++) {
    const frame = document.createElement("canvas");
    frame.width = laserSheet.width;
    frame.height = laserFrameHeight;
    const ctx = frame.getContext("2d")!;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      laserSheet,
      0,
      i * laserFrameHeight,
      laserSheet.width,
      laserFrameHeight,
      0,
      0,
      laserSheet.width,
      laserFrameHeight,
    );

    laserFrames.push(keyBlackBackground(frame));
  }

  armProjectileSprite = keyBlackBackground(
    sliceFrame(armProjectile, 0, 0, armProjectile.width),
  );
  rockProjectileSprite = keyBlackBackground(
    sliceFrame(rockProjectile, 0, 0, rockProjectile.width),
  );

  loaded = true;
}

export function getGolemFrame(row: number, col: number) {
  return golemFrames[row]?.[col] ?? golemFrames[0][0];
}

export function getGolemAnimFrame(anim: GolemAnimKey, frameIndex: number) {
  const def = GOLEM_ANIMS[anim];
  const col = frameIndex % def.frames;

  return getGolemFrame(def.row, col);
}

export function getLaserFrame(index: number) {
  return laserFrames[Math.max(0, Math.min(laserFrames.length - 1, index))];
}

export function getArmProjectileSprite() {
  return armProjectileSprite!;
}

export function getRockProjectileSprite() {
  return rockProjectileSprite!;
}

export function areGolemSpritesLoaded() {
  return loaded;
}
