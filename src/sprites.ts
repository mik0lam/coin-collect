export type SpriteSheet = Record<string, HTMLCanvasElement>;

const PIXEL = 2;

function buildSprite(rows: string[], palette: Record<string, string>): HTMLCanvasElement {
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  const canvas = document.createElement("canvas");
  canvas.width = width * PIXEL;
  canvas.height = height * PIXEL;
  const ctx = canvas.getContext("2d")!;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const key = rows[y][x];
      if (key === ".") {
        continue;
      }

      const color = palette[key];
      if (!color) {
        continue;
      }

      ctx.fillStyle = color;
      ctx.fillRect(x * PIXEL, y * PIXEL, PIXEL, PIXEL);
    }
  }

  return canvas;
}

const SKIN = { s: "#f0c090", S: "#d8a070" };
const METAL = { m: "#b8c0d0", M: "#8898b0", l: "#e8ecf4" };
const LEATHER = { b: "#6b4423", B: "#4a2e14" };
const GOLD = { g: "#ffd54a", G: "#c9a020", d: "#8a6a10" };
const GREEN = { e: "#3cb878", E: "#2a9058", t: "#1a6038" };
const SLIME = { j: "#40d8c8", J: "#20a898", k: "#108878" };
const WRAITH = { w: "#c070ff", W: "#9040d0", p: "#e8c8ff" };
const BRUTE = { o: "#ff9830", O: "#d06010", r: "#8a4010" };
const POTION = { u: "#9b59ff", U: "#6b30d0", c: "#e8d8ff" };
const STRONG = { f: "#ff66cc", F: "#d03090", h: "#ffe0f8" };
const CHEST = { n: "#b8860b", N: "#8b6914", x: "#6b4a2a", X: "#4a3018" };
const DOOR = { y: "#ffd54a", Y: "#c9a020" };
const STAIRS_DOWN = { v: "#c070ff", V: "#9040d0", i: "#e8c8ff" };
const STAIRS_UP = { a: "#70c8ff", A: "#3090d0", q: "#d8f0ff" };

function mergePalettes(...parts: Record<string, string>[]) {
  return Object.assign({}, ...parts);
}

const playerEast = buildSprite(
  [
    "....bbbb....",
    "...bbbbbb...",
    "..bbssssbb..",
    "..bssiissbb.",
    ".bbssiissbb.",
    ".bbssiissbb.",
    "..bbssssbb..",
    "..bbmmmmbb..",
    ".bbb....bbb.",
    ".bbb....bbb.",
    "....mmmm....",
    "....mmmm....",
  ],
  mergePalettes(SKIN, METAL, LEATHER, { i: "#1a2030" }),
);

const playerWest = buildSprite(
  [
    "....bbbb....",
    "...bbbbbb...",
    "..bbssssbb..",
    ".bbssiissbb..",
    ".bbssiissbb.",
    ".bbssiissbb.",
    "..bbssssbb..",
    "..bbmmmmbb..",
    ".bbb....bbb.",
    ".bbb....bbb.",
    "....mmmm....",
    "....mmmm....",
  ],
  mergePalettes(SKIN, METAL, LEATHER, { i: "#1a2030" }),
);

const playerNorth = buildSprite(
  [
    "....bbbb....",
    "...bbbbbb...",
    "..bbssssbb..",
    "..bssiissbb.",
    ".bbssiissbb.",
    ".bbssiissbb.",
    "..bbssssbb..",
    "..bbmmmmbb..",
    ".bbb....bbb.",
    ".bbb....bbb.",
    "....mmmm....",
    "....mmmm....",
  ],
  mergePalettes(SKIN, METAL, LEATHER, { i: "#1a2030" }),
);

const playerSouth = buildSprite(
  [
    "....bbbb....",
    "...bbbbbb...",
    "..bbssssbb..",
    "..bssiissbb.",
    ".bbssiissbb.",
    ".bbssiissbb.",
    "..bbssssbb..",
    "..bbmmmmbb..",
    ".bbb....bbb.",
    ".bbb....bbb.",
    "....mmmm....",
    "....mmmm....",
  ],
  mergePalettes(SKIN, METAL, LEATHER, { i: "#1a2030" }),
);

const coinSprite = buildSprite(
  [
    "....gggg....",
    "...gGGGGg...",
    "..gGGddGg..",
    ".gGGddddGg.",
    ".gGGddddGg.",
    "..gGGddGg..",
    "...gGGGGg...",
    "....gggg....",
  ],
  GOLD,
);

const snakeHead = buildSprite(
  [
    "....eeee....",
    "...eeeeee...",
    "..eeGGGGee..",
    ".eeGgggGee.",
    ".eeGgggGee.",
    "..eeGGGGee..",
    "...eeeeee...",
    "....eeee....",
  ],
  mergePalettes(GREEN, GOLD),
);

const snakeBody = buildSprite(
  [
    "...eeeeee...",
    "..eeeeeeee..",
    ".eeeeeeeeee.",
    ".eeeeeeeeee.",
    "..eeeeeeee..",
    "...eeeeee...",
  ],
  GREEN,
);

const slimeSprite = buildSprite(
  [
    "....jjjj....",
    "...jjJJjj...",
    "..jjJJJJjj..",
    ".jjJJkkJJjj.",
    ".jjJJkkJJjj.",
    "..jjJJJJjj..",
    "...jjJJjj...",
    "....jjjj....",
  ],
  SLIME,
);

const wraithSprite = buildSprite(
  [
    "....wwww....",
    "...wwWWww...",
    "..wwppWWww..",
    ".wwWWWWWWww.",
    ".wwWWWWWWww.",
    "..wwWWWWww..",
    "...wwwwww...",
    "....wwww....",
  ],
  WRAITH,
);

const bruteSprite = buildSprite(
  [
    "...oooooo...",
    "..ooOOOOoo..",
    ".ooOrOrOoo.",
    ".ooOrOrOoo.",
    "..ooOOOOoo..",
    "..ooOOOOoo..",
    ".ooo....ooo.",
    ".ooo....ooo.",
  ],
  BRUTE,
);

const chestClosed = buildSprite(
  [
    "...nnnnnn...",
    "..nNNNNNNn..",
    ".nNNxxxxNNn.",
    ".nNNxxxxNNn.",
    ".nNNNNNNNNn.",
    ".nNNNNNNNNn.",
    "..nnnnnnnn..",
    "...nnnnnn...",
  ],
  CHEST,
);

const chestOpen = buildSprite(
  [
    "...xxxxxx...",
    "..xXXXXXXx..",
    ".xXXnnnnXXx.",
    ".xXXnnnnXXx.",
    ".xXXXXXXXXx.",
    ".xXXXXXXXXx.",
    "..xxxxxxxx..",
    "...xxxxxx...",
  ],
  CHEST,
);

const potionHealth = buildSprite(
  [
    "....cccc....",
    "...cccccc...",
    "..ccuuUUcc..",
    "..ccuuUUcc..",
    "..ccuuUUcc..",
    "...cccccc...",
    "....cccc....",
    "....uuuu....",
  ],
  POTION,
);

const potionStrong = buildSprite(
  [
    "....hhhh....",
    "...hhhhhh...",
    "..hhffFFhh..",
    "..hhffFFhh..",
    "..hhffFFhh..",
    "...hhhhhh...",
    "....hhhh....",
    "....ffff....",
  ],
  STRONG,
);

const swordPickup = buildSprite(
  [
    "......ll....",
    ".....lll....",
    "....lll.....",
    "...lll......",
    "..lll.......",
    ".lll........",
    "lll.........",
    "bbb.........",
    "bbb.........",
    "bbbbbb......",
    ".bbbbbb.....",
    "..bbbb......",
  ],
  mergePalettes(METAL, LEATHER),
);

const doorSprite = buildSprite(
  [
    "yyyyyyyyyyyy",
    "yYYYYYYYYYYy",
    "yYYYYYYYYYYy",
    "yYYYYYYYYYYy",
    "yyyyyyyyyyyy",
  ],
  DOOR,
);

const stairsDown = buildSprite(
  [
    "...vvvvvv...",
    "..vVVVVVVv..",
    ".vVViiVVVVv.",
    ".vVViiVVVVv.",
    ".vVViiVVVVv.",
    "..vVVVVVVv..",
    "...vvvvvv...",
    "....vvvv....",
  ],
  STAIRS_DOWN,
);

const stairsUp = buildSprite(
  [
    "...aaaaaa...",
    "..aAAAAAAa..",
    ".aAAqqAAAAa.",
    ".aAAqqAAAAa.",
    ".aAAqqAAAAa.",
    "..aAAAAAAa..",
    "...aaaaaa...",
    "....aaaa....",
  ],
  STAIRS_UP,
);

const floorTile = buildSprite(
  [
    "bbbbbbbbbbbb",
    "b..b..b..b.b",
    "bbbbbbbbbbbb",
    "b..b..b..b.b",
    "bbbbbbbbbbbb",
    "b..b..b..b.b",
    "bbbbbbbbbbbb",
    "b..b..b..b.b",
    "bbbbbbbbbbbb",
    "b..b..b..b.b",
    "bbbbbbbbbbbb",
    "b..b..b..b.b",
  ],
  { b: "#1a1a22", ".": "#22222e" },
);

export const SPRITES: SpriteSheet = {
  playerEast,
  playerWest,
  playerNorth,
  playerSouth,
  coin: coinSprite,
  snakeHead,
  snakeBody,
  slime: slimeSprite,
  wraith: wraithSprite,
  brute: bruteSprite,
  chestClosed,
  chestOpen,
  potionHealth,
  potionStrong,
  swordPickup,
  door: doorSprite,
  stairsDown,
  stairsUp,
  floorTile,
};

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  x: number,
  y: number,
  width?: number,
  height?: number,
) {
  const drawW = width ?? sprite.width;
  const drawH = height ?? sprite.height;
  const smoothing = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite, x, y, drawW, drawH);
  ctx.imageSmoothingEnabled = smoothing;
}

export function drawSpriteCentered(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  centerX: number,
  centerY: number,
  size: number,
) {
  drawSprite(ctx, sprite, centerX - size / 2, centerY - size / 2, size, size);
}

export function drawTintedSprite(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  x: number,
  y: number,
  size: number,
  tint: string,
  alpha = 0.45,
) {
  drawSprite(ctx, sprite, x, y, size, size);
  const smoothing = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = tint;
  ctx.globalAlpha = alpha;
  ctx.fillRect(x, y, size, size);
  ctx.globalAlpha = 1;
  ctx.imageSmoothingEnabled = smoothing;
}
