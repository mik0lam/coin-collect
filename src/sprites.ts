export type SpriteSheet = Record<string, HTMLCanvasElement>;

const PIXEL = 3;

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

function mergePalettes(...parts: Record<string, string>[]) {
  return Object.assign({}, ...parts);
}

const SKIN = { s: "#f0c090", S: "#d8a070", h: "#c88858" };
const HAIR = { a: "#5a3820", A: "#3a2410" };
const METAL = { m: "#c8d0e0", M: "#98a8c0", l: "#eef2fa", d: "#687888" };
const LEATHER = { b: "#7a5030", B: "#4a3018", c: "#9a6840" };
const GOLD = { g: "#ffd54a", G: "#e8b820", d: "#a07810", D: "#705008" };
const GREEN = { e: "#48d080", E: "#28a858", t: "#187040", y: "#90ffb0" };
const SLIME = { j: "#50e8d8", J: "#28b8a8", k: "#188878", z: "#a8fff0" };
const WRAITH = { w: "#d080ff", W: "#a040e0", p: "#f0d0ff", n: "#6020a0" };
const BRUTE = { o: "#ffa840", O: "#e07018", r: "#903808", R: "#602004" };
const POTION = { u: "#a868ff", U: "#7838d8", c: "#f0e0ff", C: "#d8c0ff" };
const STRONG = { f: "#ff70cc", F: "#e03098", H: "#ffe8f8" };
const CHEST = { n: "#d0a020", N: "#a07818", x: "#7a5028", X: "#503018", L: "#ffd860" };
const DOOR = { y: "#5a4030", Y: "#3a2818", q: "#2a1810", w: "#6a5040", W: "#4a3828" };
const STAIRS_DOWN = { v: "#c84848", V: "#882828", i: "#f0a0a0", b: "#3a1818" };
const STAIRS_UP = { T: "#88b8d8", t: "#4878a8", Q: "#d8ecf8" };
const FLOOR = { D: "#1a1410", d: "#241c16", m: "#342820", M: "#443428", l: "#544438", s: "#18120e" };
const FLOOR_BLOOD = { ...FLOOR, b: "#4a1818", B: "#6a2020", r: "#3a1010" };
const FLOOR_CRACK = { ...FLOOR, c: "#14100c", C: "#0e0a08", k: "#2e241c" };
const STONE = { z: "#3a3028", Z: "#4a4034", W: "#5a5044", q: "#2a2218", Q: "#1e1814" };

const playerEast = buildSprite(
  [
    "......aaaaaa......",
    ".....aaaaaaaa.....",
    "....aaSSSSSSaa....",
    "...aaSSssssSSaa...",
    "...aaSsiiiiSsaa...",
    "..aaSSsiiiiSsSSaa.",
    "..aaSSsiiiiSsSSaa.",
    "..aaSSsshhssSSaa..",
    "...aaSSssssSSaa...",
    "...aaMMMMMMMMaa...",
    "..aaabbbbbbbbaa..",
    "..aaabbbbbbbbaa..",
    "...aab......bbaa..",
    "...aab......bbaa..",
    "....bb......bb....",
    "....mm......mm....",
    "....mm......mm....",
    "....mm......mm....",
  ],
  mergePalettes(SKIN, HAIR, METAL, LEATHER, { i: "#1a2030" }),
);

const playerWest = buildSprite(
  [
    "......aaaaaa......",
    ".....aaaaaaaa.....",
    "....aaSSSSSSaa....",
    "...aaSSSSSSSSaa...",
    "...aaSsiiiiSsaa...",
    ".aaSSSsiiiiSsSSaa..",
    ".aaSSSsiiiiSsSSaa..",
    "..aaSSsshhssSSaa..",
    "...aaSSssssSSaa...",
    "...aaMMMMMMMMaa...",
    "..aaabbbbbbbbaa..",
    "..aaabbbbbbbbaa..",
    "..aab......bbaa...",
    "..aab......bbaa...",
    "....bb......bb....",
    "....mm......mm....",
    "....mm......mm....",
    "....mm......mm....",
  ],
  mergePalettes(SKIN, HAIR, METAL, LEATHER, { i: "#1a2030" }),
);

const playerNorth = buildSprite(
  [
    "......aaaaaa......",
    ".....aaaaaaaa.....",
    "....aaSSSSSSaa....",
    "...aaSSssssSSaa...",
    "...aaSsiiiiSsaa...",
    "..aaSSsiiiiSsSSaa.",
    "..aaSSsiiiiSsSSaa.",
    "..aaSSsshhssSSaa..",
    "...aaSSssssSSaa...",
    "...aaMMMMMMMMaa...",
    "..aaabbbbbbbbaa..",
    "..aaabbbbbbbbaa..",
    "...aab......bbaa..",
    "...aab......bbaa..",
    "....bb......bb....",
    "....mm......mm....",
    "....mm......mm....",
    "....mm......mm....",
  ],
  mergePalettes(SKIN, HAIR, METAL, LEATHER, { i: "#1a2030" }),
);

const playerSouth = buildSprite(
  [
    "......aaaaaa......",
    ".....aaaaaaaa.....",
    "....aaSSSSSSaa....",
    "...aaSSssssSSaa...",
    "...aaSsiiiiSsaa...",
    "..aaSSsiiiiSsSSaa.",
    "..aaSSsiiiiSsSSaa.",
    "..aaSSsshhssSSaa..",
    "...aaSSssssSSaa...",
    "...aaMMMMMMMMaa...",
    "..aaabbbbbbbbaa..",
    "..aaabbbbbbbbaa..",
    "...aab......bbaa..",
    "...aab......bbaa..",
    "....bb......bb....",
    "....mm......mm....",
    "....mm......mm....",
    "....mm......mm....",
  ],
  mergePalettes(SKIN, HAIR, METAL, LEATHER, { i: "#1a2030" }),
);

const coinSprite = buildSprite(
  [
    "......gggg......",
    "....ggGGGGgg....",
    "...gGGGddGGGg...",
    "..gGGGddddGGGg..",
    ".gGGGddddddGGGg.",
    ".gGGGddddddGGGg.",
    ".gGGGddddddGGGg.",
    "..gGGGddddGGGg..",
    "...gGGGddGGGg...",
    "....ggGGGGgg....",
    "......gggg......",
  ],
  GOLD,
);

const snakeHead = buildSprite(
  [
    "......eeee......",
    "....eeeeeeee....",
    "...eeeeEEEeee...",
    "..eeeGGGGGGeee..",
    ".eeeGgggggGeee.",
    ".eeeGgyyygGeee.",
    ".eeeGgggggGeee.",
    "..eeeGGGGGGeee..",
    "...eeeeEEEeee...",
    "....eeeeeeee....",
    "......eeee......",
  ],
  mergePalettes(GREEN, GOLD),
);

const snakeBody = buildSprite(
  [
    "....eeeeeeee....",
    "...eeeeEEEEeee..",
    "..eeeeeeeeeeee..",
    ".eeeeeeeeeeeeee.",
    ".eeeeeeeeeeeeee.",
    "..eeeeeeeeeeee..",
    "...eeeeEEEEeee..",
    "....eeeeeeee....",
  ],
  GREEN,
);

const slimeSprite = buildSprite(
  [
    "......jjjj......",
    "....jjJJJJjj....",
    "...jjJJzzJJjj...",
    "..jjJJzzzzJJjj..",
    ".jjJJzzkkzzJJjj.",
    ".jjJJzzkkzzJJjj.",
    ".jjJJJJkkJJJJjj.",
    "..jjJJJJJJJJjj..",
    "...jjJJJJJJjj...",
    "....jjJJJJjj....",
    "......jjjj......",
  ],
  SLIME,
);

const wraithSprite = buildSprite(
  [
    "......wwww......",
    "....wwWWWWww....",
    "...wwWppppWww...",
    "..wwWppppppWww..",
    ".wwWWWWWWWWWWww.",
    ".wwWWnnnnWWWWww.",
    ".wwWWWWWWWWWWww.",
    "..wwWWWWWWWWww..",
    "...wwwwwwwwww...",
    "....wwwwwwww....",
    "......wwww......",
  ],
  WRAITH,
);

const bruteSprite = buildSprite(
  [
    "....oooooooo....",
    "...ooOOOOOOoo...",
    "..ooOOrRrROOoo..",
    ".ooOOrRrRrROOoo.",
    ".ooOOrRrRrROOoo.",
    "..ooOOOOOOOOoo..",
    "..ooOOOOOOOOoo..",
    "...ooORRRROOoo..",
    "...ooo....ooo...",
    "...ooo....ooo...",
    "...bbb....bbb...",
    "...bbb....bbb...",
  ],
  mergePalettes(BRUTE, LEATHER),
);

const chestClosed = buildSprite(
  [
    "....nnnnnnnn....",
    "...nNNNNNNNNn...",
    "..nNNLLLLLLNNn..",
    ".nNNLxxxxxxLNNn.",
    ".nNNLxxxxxxLNNn.",
    ".nNNNNNNNNNNNNn.",
    ".nNNNNNNNNNNNNn.",
    "..nNNNNNNNNNNn..",
    "...nnnnnnnnnn...",
    "....nnnnnnnn....",
  ],
  CHEST,
);

const chestOpen = buildSprite(
  [
    "....xxxxxxxx....",
    "...xXXXXXXXXx...",
    "..xXXnnnnnnXXx..",
    ".xXXnnLLLLnnXXx.",
    ".xXXnnLLLLnnXXx.",
    ".xXXXXXXXXXXXXx.",
    ".xXXXXXXXXXXXXx.",
    "..xxxxxxxxxxxx..",
    "...xxxxxxxxxx...",
    "....xxxxxxxx....",
  ],
  CHEST,
);

const potionHealth = buildSprite(
  [
    "......cccc......",
    "....cccccccc....",
    "...ccCuuUUCcc...",
    "..ccCuuUUUUCcc..",
    "..ccuuUUUUuucc..",
    "..ccuuUUUUuucc..",
    "..ccuuUUUUuucc..",
    "...ccuuUUuucc...",
    "....cccccccc....",
    "......uuuu......",
    "......uuuu......",
  ],
  POTION,
);

const potionStrong = buildSprite(
  [
    "......HHHH......",
    "....HHHHHHHH....",
    "...HHHffFFHHH...",
    "..HHHffFFFFHHH..",
    "..HHffFFFFffHH..",
    "..HHffFFFFffHH..",
    "..HHffFFFFffHH..",
    "...HHffFFffHH...",
    "....HHHHHHHH....",
    "......ffff......",
    "......ffff......",
  ],
  STRONG,
);

const RUST = { R: "#c87838", r: "#8a5020", t: "#5a3810", n: "#3a2818" };

const rustySword = buildSprite(
  [
    "......Rrll......",
    ".....Rrlllr.....",
    "....R.rlllr.....",
    "...R..rlllr.....",
    ".....rllllr.....",
    ".....rllllr.....",
    "......rlllr.....",
    "......rlllr.....",
    "......rlllr.....",
    "......btbtb.....",
    "......bbbbb.....",
    ".......bbb......",
    ".......bbb......",
    "........bb......",
    "........nb......",
    "................",
  ],
  mergePalettes(METAL, LEATHER, RUST),
);

const ironSword = buildSprite(
  [
    ".........ll.....",
    "........lll.....",
    ".......llll.....",
    "......lllll.....",
    ".....llllll.....",
    "....lllllll.....",
    "...llllllll.....",
    "..lllllllll.....",
    ".llllllllll.....",
    "lllllllllll.....",
    "..bbbbbbbbbb....",
    "...bbbbbbbb.....",
    "....bbbbbbb.....",
    ".....bbbbbb.....",
    "......bbbbb.....",
    ".......bbb......",
  ],
  mergePalettes(
    { l: "#eef4ff", m: "#b8c8e0", M: "#8898b8", d: "#586878" },
    { b: "#6a4830", B: "#4a3018", c: "#8a6040" },
  ),
);

const warAxe = buildSprite(
  [
    "....oooooooo....",
    "...oOOOOOOOOo...",
    "..oOOOOOOOOOOo..",
    ".oOOOOOrRrOOOOo.",
    "oOOOOOrRRrOOOOo.",
    "..oOOOOOOOOOo...",
    "...oOOOOOOOo....",
    ".....bbbbbb.....",
    ".....bbbbbb.....",
    "......bbbb......",
    "......bbbb......",
    ".......bb.......",
    ".......bb.......",
    "........b.......",
    "........b.......",
    "................",
  ],
  mergePalettes(BRUTE, LEATHER, RUST),
);

const daggerSprite = buildSprite(
  [
    "........ll......",
    ".......lll......",
    "......llll......",
    ".....lllll......",
    "....llllll......",
    "...lllllll......",
    "..llllllll......",
    "...bbbbbbb......",
    "...bbbbbbb......",
    "..bbbbbbbb......",
    "..bb..bbbb......",
    "...g..gggg......",
    "...g..gggg......",
    "....gggggg......",
    ".....gggg.......",
    "................",
  ],
  mergePalettes(METAL, LEATHER, { g: "#ffd860", G: "#e8b820" }),
);

const SOUL = {
  u: "#9040e8",
  U: "#c070ff",
  w: "#f0d8ff",
  W: "#ffffff",
  d: "#281848",
  D: "#180828",
  e: "#6020a0",
};
const LEGENDARY = { L: "#ffd860", l: "#e8b020", u: "#c070ff", U: "#9040e8", w: "#f0e8ff" };

const soulreaverSprite = buildSprite(
  [
    "........uu......",
    ".......uUwu.....",
    "......uUUwu.....",
    ".....uUUUwu.....",
    "....uUUUUwu.....",
    "...uUUUUUwu.....",
    "..uUUUUUUwu.....",
    ".uUUUUUUUwu.....",
    "uUUUUUUUUwu.....",
    "dddddeeeedd.....",
    ".dddeeeeedd.....",
    "..ddeeeeedd.....",
    "...deeeeed......",
    "....deeed.......",
    ".....ddd........",
    "................",
  ],
  mergePalettes(METAL, LEATHER, SOUL, LEGENDARY),
);

const STORM = {
  L: "#ffe860",
  l: "#ffd020",
  y: "#fff8c0",
  Y: "#fff060",
  e: "#88a8ff",
  E: "#4466cc",
};
const stormCleaverSprite = buildSprite(
  [
    "......yyyy......",
    ".....yLLLLy.....",
    "....yLLLLLLy....",
    "...yLLLeLLLy....",
    "..yLLLLLLLLy....",
    ".yLLLLLLLLLLy...",
    "yLLLLLLLLLLLy...",
    ".yLLLLLLLLLy....",
    "..yLLLLLLLy.....",
    "...bbbbbbb......",
    "...bbbbbbb......",
    "..bbbbbbbb......",
    "..bbbbbbbb......",
    "...bbbbbb.......",
    "....bbbb........",
    ".....bb.........",
  ],
  mergePalettes(BRUTE, LEATHER, STORM, LEGENDARY),
);

const BLOOD = {
  L: "#ff4040",
  l: "#cc2020",
  r: "#880808",
  R: "#660000",
  b: "#ff8080",
};
const bloodReaperSprite = buildSprite(
  [
    "........ll......",
    ".......lLL......",
    "......lLLL......",
    ".....lLLLL......",
    "....lLLLLL......",
    "...lLLLLLL......",
    "..lLLLLLLL......",
    ".lLLLLLLLL......",
    "lLLLLLLLLL......",
    "lLLLLLLLLL......",
    "bbbbbbbbbb......",
    ".bbbbbbbbbb.....",
    "..bbbbbbbb......",
    "...bbbbbb.......",
    "....LbbL........",
    ".....Lb.........",
  ],
  mergePalettes(METAL, LEATHER, BLOOD, LEGENDARY),
);

const PHANTOM = {
  u: "#a0e8ff",
  U: "#60c8f0",
  w: "#e8fcff",
  W: "#ffffff",
  f: "#4088a8",
  F: "#206080",
};
const phantomBladeSprite = buildSprite(
  [
    "........ww......",
    ".......wUUw.....",
    "......wUUUw.....",
    ".....wUUUUw.....",
    "....wUUUUUw.....",
    "...wUUUUUUw.....",
    "..wUUUUUUUw.....",
    "...wUUUUUw......",
    "...bbbbbbb......",
    "..bbbbbbbb......",
    "..bbffbbbb......",
    "...bbffbb.......",
    "...bbffbb.......",
    "....bbbb........",
    ".....bb.........",
    "................",
  ],
  mergePalettes(METAL, LEATHER, PHANTOM, LEGENDARY),
);

const GOLEM = {
  C: "#44ccff",
  c: "#2288cc",
  w: "#aaeeff",
  W: "#66ddff",
  g: "#88a0b0",
  G: "#607080",
};
const golemClubSprite = buildSprite(
  [
    "....zzZZzz....",
    "...zZCCWWZz...",
    "..zZCCWWCCZz..",
    ".zZCCWWWWCCZz.",
    ".zZCCWWWWCCZz.",
    "..zZCCWWCCZz..",
    "...zZCCWWZz...",
    "....zzZZzz....",
    ".....bbbb.....",
    ".....bbbb.....",
    "......bb......",
    "......bb......",
    ".......bb.....",
    ".......bb.....",
    "........b.....",
    "..............",
  ],
  mergePalettes(STONE, GOLEM, LEGENDARY),
);

const doorSprite = buildSprite(
  [
    "wwwwwwwwwwwwwwwwww",
    "wWWWWWWWWWWWWWWWWw",
    "wWyyyyyyyyyyyyyyWw",
    "wWyYYYYYYYYYYYYyWw",
    "wWyYqqqqqqqqqqYyWw",
    "wWyYqqqqqqqqqqYyWw",
    "wWyYqqqqqqqqqqYyWw",
    "wWyYYYYYYYYYYYYyWw",
    "wWyyyyyyyyyyyyyyWw",
    "wWWWWWWWWWWWWWWWWw",
    "wwwwwwwwwwwwwwwwww",
  ],
  DOOR,
);

const stairsDown = buildSprite(
  [
    "....vvvvvvvv....",
    "...vVVVVVVVVv...",
    "..vVViiiiVVVVv..",
    ".vVViiiiiiVVVVv.",
    ".vVViiiiiiVVVVv.",
    ".vVViiiiiiVVVVv.",
    "..vVVVVVVVVVVv..",
    "...vvvvvvvvvv...",
    "....vvvvvvvv....",
  ],
  STAIRS_DOWN,
);

const stairsUp = buildSprite(
  [
    "....TTTTTTTT....",
    "...TTTTTTTTTTt..",
    "..TTTQQQQTTTTt..",
    ".TTTQQQQQQTTTTt.",
    ".TTTQQQQQQTTTTt.",
    ".TTTQQQQQQTTTTt.",
    "..TTTTTTTTTTt...",
    "...ttttttttt....",
    "....tttttttt....",
  ],
  STAIRS_UP,
);

const floorTile = buildSprite(
  [
    "dddddddddddddddd",
    "dmmlmmmlmmmlmmmd",
    "dmlMlmMlmMlmMlmM",
    "dmmlmmmlmmmlmmmd",
    "dmlMlmMlmMlmMlmM",
    "dmmlmmmlmmmlmmmd",
    "dmlMlmMlmMlmMlmM",
    "dmmlmmmlmmmlmmmd",
    "dmlMlmMlmMlmMlmM",
    "dmmlmmmlmmmlmmmd",
    "dmlMlmMlmMlmMlmM",
    "dmmlmmmlmmmlmmmd",
    "dmlMlmMlmMlmMlmM",
    "dmmlmmmlmmmlmmmd",
    "dmlMlmMlmMlmMlmM",
    "dddddddddddddddd",
  ],
  FLOOR,
);

const floorTileSpeckled = buildSprite(
  [
    "dddddddddddddddd",
    "dssmsssmsssmsssd",
    "dsmMlsMlsMlsMlsM",
    "dssmsssmsssmsssd",
    "dsmMlsMlsMlsMlsM",
    "dssmsssmsssmsssd",
    "dsmMlsMlsMlsMlsM",
    "dssmsssmsssmsssd",
    "dsmMlsMlsMlsMlsM",
    "dssmsssmsssmsssd",
    "dsmMlsMlsMlsMlsM",
    "dssmsssmsssmsssd",
    "dsmMlsMlsMlsMlsM",
    "dssmsssmsssmsssd",
    "dsmMlsMlsMlsMlsM",
    "dddddddddddddddd",
  ],
  FLOOR,
);

const floorTileBlood = buildSprite(
  [
    "dddddddddddddddd",
    "dmmlmmmlmmmlmmmd",
    "dmlMlmMlmMlmMlmM",
    "dmmlmmmlmmmlmmmd",
    "dmlMlmMbbbblmMlm",
    "dmmlmmmbBBbmmmd",
    "dmlMlmMbbbblmMlm",
    "dmmlmmmlmmmlmmmd",
    "dmlMlmMlmMlmMlmM",
    "dmmlmmmlmmmlmmmd",
    "dmlMlmMlmMlmMlmM",
    "dmmlmmmlmmmlmmmd",
    "dmlMlmMlmMlmMlmM",
    "dmmlmmmlmmmlmmmd",
    "dmlMlmMlmMlmMlmM",
    "dddddddddddddddd",
  ],
  FLOOR_BLOOD,
);

const floorTileCracked = buildSprite(
  [
    "dddddddddddddddd",
    "dmmlmmmlmmmlmmmd",
    "dmlMlmCklmMlmMlm",
    "dmmlmmkCklmmlmmmd",
    "dmlMlmMcklmMlmMlm",
    "dmmlmmmlCklmmlmmmd",
    "dmlMlmMlmMlmMlmM",
    "dmmlmmmlmmmlmmmd",
    "dmlMlmMlmMlmMlmM",
    "dmmlmmmlmmmlmmmd",
    "dmlMlmMlmMlmMlmM",
    "dmmlmmmlmmmlmmmd",
    "dmlMlmMlmMlmMlmM",
    "dmmlmmmlmmmlmmmd",
    "dmlMlmMlmMlmMlmM",
    "dddddddddddddddd",
  ],
  FLOOR_CRACK,
);

export const FLOOR_TILES = [floorTile, floorTileSpeckled, floorTileBlood, floorTileCracked];

const VOID = { v: "#68e8f0", V: "#38b8d0", i: "#c8f8ff", p: "#9040e8", P: "#c070ff", d: "#281848" };

const voidShardSprite = buildSprite(
  [
    "......dddd......",
    "....ddPPPPdd....",
    "...ddPViiVPdd...",
    "..ddPViiiiVPdd..",
    ".ddPViiVViiVPdd.",
    ".ddPViVVVViVPdd.",
    ".ddPViVVVViVPdd.",
    "..ddPViiiiVPdd..",
    "...ddPViiVPdd...",
    "....ddPPPPdd....",
    "......dddd......",
  ],
  VOID,
);

const slotMachineSprite = buildSprite(
  [
    "....rrrrrrrr....",
    "...rRRRRRRRRr...",
    "..rRbbbbbbbbRr..",
    ".rRbyyyyyyyybRr.",
    ".rRbyGGGGGGybRr.",
    ".rRbyGggggGybRr.",
    ".rRbyGGGGGGybRr.",
    ".rRbyyyyyyyybRr.",
    ".rRbbbbbbbbbbRr.",
    "..rRRRRRRRRRRr..",
    "...rRRnnnnRRr...",
    "....rrrrrrrr....",
    "...nnnnnnnnnn...",
    "..nnnnnnnnnnnn..",
  ],
  mergePalettes({ r: "#5a1818", R: "#7a2828" }, GOLD, { b: "#2a2018", y: "#ffd860", Y: "#e8b020", G: "#44cc44", g: "#228822", n: "#1a1410" }),
);

const rockSprite = buildSprite(
  [
    "......zzzzzz......",
    "....zzZZZZzz....",
    "...zzZZWWZZzz...",
    "..zzZZqqWWZZzz..",
    ".zzZZqqqqWWZZzz.",
    ".zzZZqqqqWWZZzz.",
    "..zzZZWWWWZZzz..",
    "...zzZZWWZZzz...",
    "....zzZZZZzz....",
    "......zzzzzz......",
  ],
  STONE,
);

const wallSprite = buildSprite(
  [
    "QQqqQQqqQQqqQQqq",
    "qZZzzZZzzZZzzZZq",
    "qZzzzzzzzzzzzzZq",
    "qZzzzzzzzzzzzzZq",
    "qZzzzzzzzzzzzzZq",
    "QQqqQQqqQQqqQQqq",
    "qZZzzZZzzZZzzZZq",
    "qZzzzzzzzzzzzzZq",
    "qZzzzzzzzzzzzzZq",
    "qZzzzzzzzzzzzzZq",
    "QQqqQQqqQQqqQQqq",
    "qZZzzZZzzZZzzZZq",
    "qZzzzzzzzzzzzzZq",
    "qZzzzzzzzzzzzzZq",
    "qZzzzzzzzzzzzzZq",
    "QQqqQQqqQQqqQQqq",
    "qZZzzZZzzZZzzZZq",
    "qZzzzzzzzzzzzzZq",
  ],
  STONE,
);

const pillarSprite = buildSprite(
  [
    "......QQQQ......",
    ".....QZZZQ.....",
    "....QZZZZZQ....",
    "...QZZZZZZZQ...",
    "...QZZzzZZZQ...",
    "...QZZzzZZZQ...",
    "...QZZzzZZZQ...",
    "...QZZzzZZZQ...",
    "...QZZzzZZZQ...",
    "...QZZZZZZZQ...",
    "....QZZZZZQ....",
    ".....QZZZQ.....",
    "......QQQQ......",
    ".....QZZZQ.....",
    "....QZZZZZQ....",
    "...QZZZZZZZQ...",
  ],
  STONE,
);

export const SPRITES: SpriteSheet = {
  playerEast,
  playerWest,
  playerNorth,
  playerSouth,
  coin: coinSprite,
  voidShard: voidShardSprite,
  slotMachine: slotMachineSprite,
  dashBoots: slotMachineSprite,
  snakeHead,
  snakeBody,
  slime: slimeSprite,
  wraith: wraithSprite,
  brute: bruteSprite,
  chestClosed,
  chestOpen,
  potionHealth,
  potionStrong,
  rustySword,
  ironSword,
  warAxe,
  dagger: daggerSprite,
  soulreaver: soulreaverSprite,
  "storm-cleaver": stormCleaverSprite,
  "blood-reaper": bloodReaperSprite,
  "phantom-blade": phantomBladeSprite,
  "golem-club": golemClubSprite,
  door: doorSprite,
  stairsDown,
  stairsUp,
  floorTile,
  rock: rockSprite,
  pillar: pillarSprite,
  wall: wallSprite,
  wallTop: wallSprite,
  wallTopAlt: wallSprite,
  wallBottom: wallSprite,
  wallLeft: wallSprite,
  wallRight: wallSprite,
  wallCornerTL: wallSprite,
  wallCornerTR: wallSprite,
  wallCornerBL: wallSprite,
  wallCornerBR: wallSprite,
};

export function applySpriteOverrides(
  overrides: Partial<SpriteSheet>,
  floorTiles?: HTMLCanvasElement[],
) {
  Object.assign(SPRITES, overrides);

  if (floorTiles && floorTiles.length > 0) {
    FLOOR_TILES.splice(0, FLOOR_TILES.length, ...floorTiles);
  }
}

export type WeaponSpriteId =
  | "rusty-sword"
  | "iron-sword"
  | "war-axe"
  | "dagger"
  | "soulreaver"
  | "storm-cleaver"
  | "blood-reaper"
  | "phantom-blade"
  | "golem-club"
  | "executioner-scythe"
  | "gungnir";

const WEAPON_SPRITE_MAP: Record<WeaponSpriteId, HTMLCanvasElement> = {
  "rusty-sword": rustySword,
  "iron-sword": ironSword,
  "war-axe": warAxe,
  dagger: daggerSprite,
  soulreaver: soulreaverSprite,
  "storm-cleaver": stormCleaverSprite,
  "blood-reaper": bloodReaperSprite,
  "phantom-blade": phantomBladeSprite,
  "golem-club": golemClubSprite,
  "executioner-scythe": bloodReaperSprite,
  gungnir: soulreaverSprite,
};

export function applyWeaponSpriteOverrides(
  overrides: Partial<Record<WeaponSpriteId, HTMLCanvasElement>>,
) {
  Object.assign(WEAPON_SPRITE_MAP, overrides);
}

export function getWeaponSprite(weaponId: WeaponSpriteId) {
  return WEAPON_SPRITE_MAP[weaponId];
}

export type WeaponSwingPivot = {
  handleX: number;
  handleY: number;
  bladeAngleRad: number;
};

/** Handle grip + natural blade direction for PNG art (handle bottom-left, blade top-right). */
export const WEAPON_SWING_PIVOTS: Record<WeaponSpriteId, WeaponSwingPivot> = {
  "rusty-sword": { handleX: 0.23, handleY: 0.8, bladeAngleRad: Math.atan2(-0.56, 0.54) },
  "iron-sword": { handleX: 0.23, handleY: 0.8, bladeAngleRad: Math.atan2(-0.57, 0.54) },
  "war-axe": { handleX: 0.12, handleY: 0.78, bladeAngleRad: Math.atan2(-0.52, 0.61) },
  dagger: { handleX: 0.2, handleY: 0.81, bladeAngleRad: Math.atan2(-0.57, 0.56) },
  soulreaver: { handleX: 0.24, handleY: 0.8, bladeAngleRad: Math.atan2(-0.55, 0.52) },
  "storm-cleaver": { handleX: 0.22, handleY: 0.79, bladeAngleRad: Math.atan2(-0.54, 0.53) },
  "blood-reaper": { handleX: 0.23, handleY: 0.82, bladeAngleRad: Math.atan2(-0.59, 0.52) },
  "phantom-blade": { handleX: 0.23, handleY: 0.8, bladeAngleRad: Math.atan2(-0.59, 0.51) },
  "golem-club": { handleX: 0.15, handleY: 0.81, bladeAngleRad: Math.atan2(-0.6, 0.59) },
  "executioner-scythe": { handleX: 0.23, handleY: 0.82, bladeAngleRad: Math.atan2(-0.59, 0.52) },
  gungnir: { handleX: 0.105, handleY: 0.888, bladeAngleRad: Math.atan2(-0.763, 0.765) },
};

export function drawWeaponSwingSprite(
  ctx: CanvasRenderingContext2D,
  weaponId: WeaponSpriteId,
  sprite: HTMLCanvasElement,
  pivotX: number,
  pivotY: number,
  swingAngleRad: number,
  size: number,
) {
  const pivot = WEAPON_SWING_PIVOTS[weaponId];
  const maxDim = Math.max(sprite.width, sprite.height);
  const scale = size / maxDim;
  const drawW = sprite.width * scale;
  const drawH = sprite.height * scale;

  ctx.translate(pivotX, pivotY);
  ctx.rotate(swingAngleRad - pivot.bladeAngleRad);
  drawSprite(ctx, sprite, -pivot.handleX * drawW, -pivot.handleY * drawH, drawW, drawH);
}

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
