import idleUrl from "./assets/sprites/executioner/idle.png";
import attackingUrl from "./assets/sprites/executioner/attacking.png";
import skill1Url from "./assets/sprites/executioner/skill1.png";
import deathUrl from "./assets/sprites/executioner/death.png";

export const EXECUTIONER_FRAME = 100;
export const EXECUTIONER_DRAW_SIZE = 220;
export const EXECUTIONER_HITBOX_SIZE = 92;

const idleFrames: HTMLCanvasElement[] = [];
const attackingRows: HTMLCanvasElement[][] = [];
const skill1Rows: HTMLCanvasElement[][] = [];
const deathRows: HTMLCanvasElement[][] = [];
let loaded = false;

async function loadImage(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch executioner image (${response.status}): ${url}`);
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

function sliceFrame(source: HTMLCanvasElement, col: number, row: number, size = EXECUTIONER_FRAME) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, col * size, row * size, size, size, 0, 0, size, size);

  return canvas;
}

function sliceSheet(source: HTMLCanvasElement, cols: number, rows: number, size = EXECUTIONER_FRAME) {
  const sheet: HTMLCanvasElement[][] = [];

  for (let row = 0; row < rows; row++) {
    const rowFrames: HTMLCanvasElement[] = [];

    for (let col = 0; col < cols; col++) {
      rowFrames.push(sliceFrame(source, col, row, size));
    }

    sheet.push(rowFrames);
  }

  return sheet;
}

export async function loadExecutionerSprites() {
  if (loaded) {
    return;
  }

  const [idleSheet, attackingSheet, skill1Sheet, deathSheet] = await Promise.all([
    loadImage(idleUrl),
    loadImage(attackingUrl),
    loadImage(skill1Url),
    loadImage(deathUrl),
  ]);

  for (let col = 0; col < 5; col++) {
    idleFrames.push(sliceFrame(idleSheet, col, 0));
  }

  attackingRows.push(...sliceSheet(attackingSheet, 6, 3));
  skill1Rows.push(...sliceSheet(skill1Sheet, 6, 2));
  deathRows.push(...sliceSheet(deathSheet, 10, 2));

  loaded = true;
}

export function areExecutionerSpritesLoaded() {
  return loaded;
}

export function getExecutionerIdleFrame(index: number) {
  return idleFrames[index % idleFrames.length] ?? idleFrames[0];
}

export function getExecutionerAttackingFrame(row: number, col: number) {
  return attackingRows[row]?.[col] ?? attackingRows[0][0];
}

export function getExecutionerSkill1Frame(row: number, col: number) {
  return skill1Rows[row]?.[col] ?? skill1Rows[0][0];
}

export function getExecutionerDeathFrame(row: number, col: number) {
  return deathRows[row]?.[col] ?? deathRows[0][0];
}
