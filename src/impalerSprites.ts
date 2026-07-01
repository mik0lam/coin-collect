import manifest from "./assets/sprites/impaler/manifest.json";

export const IMPALER_DRAW_H = 120;
export const IMPALER_HITBOX_SIZE = 108;
export const IMPALER_FRAME_MS = 100;

export type ImpalerAttackKey = "attack1" | "attack2" | "attack3" | "attack4" | "attack5" | "attack6";

export const IMPALER_ATTACK_FRAME_COUNTS: Record<ImpalerAttackKey, number> = {
  attack1: manifest.attack1,
  attack2: manifest.attack2,
  attack3: manifest.attack3,
  attack4: manifest.attack4,
  attack5: manifest.attack5,
  attack6: manifest.attack6,
};

export const IMPALER_ATTACK_KEYS: ImpalerAttackKey[] = [
  "attack1",
  "attack2",
  "attack3",
  "attack4",
  "attack5",
  "attack6",
];

export const IMPALER_COUNTER_FRAME_COUNT = manifest.counter;
export const IMPALER_DEATH_FRAME_COUNT = manifest.death;

export interface ImpalerFrame {
  canvas: HTMLCanvasElement;
  feetX: number;
  canvasW: number;
  canvasH: number;
}

type GlobModule = string | { default: string };

const attack1Glob = import.meta.glob<GlobModule>("./assets/sprites/impaler/attack1/f*.png", {
  eager: true,
  query: "?url",
  import: "default",
});
const attack2Glob = import.meta.glob<GlobModule>("./assets/sprites/impaler/attack2/f*.png", {
  eager: true,
  query: "?url",
  import: "default",
});
const attack3Glob = import.meta.glob<GlobModule>("./assets/sprites/impaler/attack3/f*.png", {
  eager: true,
  query: "?url",
  import: "default",
});
const attack4Glob = import.meta.glob<GlobModule>("./assets/sprites/impaler/attack4/f*.png", {
  eager: true,
  query: "?url",
  import: "default",
});
const attack5Glob = import.meta.glob<GlobModule>("./assets/sprites/impaler/attack5/f*.png", {
  eager: true,
  query: "?url",
  import: "default",
});
const attack6Glob = import.meta.glob<GlobModule>("./assets/sprites/impaler/attack6/f*.png", {
  eager: true,
  query: "?url",
  import: "default",
});
const deathGlob = import.meta.glob<GlobModule>("./assets/sprites/impaler/death/f*.png", {
  eager: true,
  query: "?url",
  import: "default",
});
const counterGlob = import.meta.glob<GlobModule>("./assets/sprites/impaler/counter/f*.png", {
  eager: true,
  query: "?url",
  import: "default",
});
const idleGlob = import.meta.glob<GlobModule>("./assets/sprites/impaler/idle/f*.png", {
  eager: true,
  query: "?url",
  import: "default",
});
const walkGlob = import.meta.glob<GlobModule>("./assets/sprites/impaler/walk/f*.png", {
  eager: true,
  query: "?url",
  import: "default",
});

const idleFrames: ImpalerFrame[] = [];
const walkFrames: ImpalerFrame[] = [];
const counterFrames: ImpalerFrame[] = [];
const attackFrames: Partial<Record<ImpalerAttackKey, ImpalerFrame[]>> = {};
const deathFrames: ImpalerFrame[] = [];
let loaded = false;

function frameNumber(path: string) {
  return Number(path.match(/f(\d+)\.png$/)?.[1] ?? 0);
}

function resolveGlobUrl(mod: GlobModule) {
  return typeof mod === "string" ? mod : mod.default;
}

function sortedGlobUrls(glob: Record<string, GlobModule>) {
  return Object.entries(glob)
    .sort(([a], [b]) => frameNumber(a) - frameNumber(b))
    .map(([, mod]) => resolveGlobUrl(mod));
}

function loadImage(url: string) {
  return new Promise<HTMLCanvasElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error(`Failed to create canvas for impaler image: ${url}`));
        return;
      }

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, 0, 0);
      resolve(canvas);
    };

    image.onerror = () => {
      reject(new Error(`Failed to decode impaler image: ${url}`));
    };

    image.src = url;
  });
}

function buildFrame(canvas: HTMLCanvasElement): ImpalerFrame {
  return {
    canvas,
    feetX: canvas.width / 2,
    canvasW: canvas.width,
    canvasH: canvas.height,
  };
}

async function loadFrameList(urls: string[]) {
  const frames: ImpalerFrame[] = [];

  for (const url of urls) {
    if (!url) {
      throw new Error("Missing impaler sprite URL. Run scripts/preprocess-impaler-sprites.py");
    }

    frames.push(buildFrame(await loadImage(url)));
  }

  return frames;
}

export async function loadImpalerSprites() {
  if (loaded) {
    return;
  }

  const attackGlobs: Record<ImpalerAttackKey, Record<string, GlobModule>> = {
    attack1: attack1Glob,
    attack2: attack2Glob,
    attack3: attack3Glob,
    attack4: attack4Glob,
    attack5: attack5Glob,
    attack6: attack6Glob,
  };

  const [idle, walk, counter, death, ...attackLists] = await Promise.all([
    loadFrameList(sortedGlobUrls(idleGlob)),
    loadFrameList(sortedGlobUrls(walkGlob)),
    loadFrameList(sortedGlobUrls(counterGlob)),
    loadFrameList(sortedGlobUrls(deathGlob)),
    ...IMPALER_ATTACK_KEYS.map((key) => loadFrameList(sortedGlobUrls(attackGlobs[key]))),
  ]);

  idleFrames.push(...idle);
  walkFrames.push(...walk);
  counterFrames.push(...counter);
  deathFrames.push(...death);

  for (let i = 0; i < IMPALER_ATTACK_KEYS.length; i++) {
    attackFrames[IMPALER_ATTACK_KEYS[i]] = attackLists[i];
  }

  loaded = true;
}

export function areImpalerSpritesLoaded() {
  return loaded;
}

export function getImpalerIdleFrame(index: number): ImpalerFrame {
  return idleFrames[index % idleFrames.length];
}

export function getImpalerWalkFrame(index: number): ImpalerFrame {
  return walkFrames[index % walkFrames.length];
}

export function getImpalerCounterFrame(index: number): ImpalerFrame {
  return counterFrames[index % counterFrames.length];
}

export function getImpalerAttackFrame(attack: ImpalerAttackKey, index: number): ImpalerFrame {
  const frames = attackFrames[attack];

  if (!frames?.length) {
    throw new Error("Impaler sprites not loaded");
  }

  return frames[Math.max(0, Math.min(frames.length - 1, index))];
}

export function getImpalerDeathFrame(index: number): ImpalerFrame {
  return deathFrames[Math.max(0, Math.min(deathFrames.length - 1, index))];
}

export function getImpalerDrawSize(frame: ImpalerFrame) {
  const scale = IMPALER_DRAW_H / frame.canvasH;

  return {
    drawW: frame.canvasW * scale,
    drawH: IMPALER_DRAW_H,
    scale,
  };
}
