export const LAYOUT_TILE_SIZE = 32;
export const LAYOUT_COLS = 25;
export const LAYOUT_ROWS = 13;

export type LayoutCell = "." | "#" | "R" | "P";

export interface RoomLayoutTemplate {
  id: string;
  label: string;
  rows: string[];
  startOnly?: boolean;
}

function layoutRow(line: string) {
  if (line.length !== LAYOUT_COLS) {
    throw new Error(`Layout row must be ${LAYOUT_COLS} characters: "${line}"`);
  }

  return line;
}

export const ROOM_LAYOUTS: RoomLayoutTemplate[] = [
  {
    id: "start",
    label: "Entry Hall",
    startOnly: true,
    rows: [
      layoutRow("........................."),
      layoutRow("........................."),
      layoutRow("......R.........R........"),
      layoutRow("........................."),
      layoutRow("........................."),
      layoutRow(".........R..............."),
      layoutRow("........................."),
      layoutRow("........................."),
      layoutRow(".........R..............."),
      layoutRow("........................."),
      layoutRow("......R.........R........"),
      layoutRow("........................."),
      layoutRow("........................."),
    ],
  },
  {
    id: "open",
    label: "Open Cavern",
    rows: [
      layoutRow("........................."),
      layoutRow("....R...............R...."),
      layoutRow("........................."),
      layoutRow(".........R..............."),
      layoutRow("........................."),
      layoutRow("........................."),
      layoutRow("....R.......R.......R...."),
      layoutRow("........................."),
      layoutRow(".........R..............."),
      layoutRow("........................."),
      layoutRow("....R...............R...."),
      layoutRow("........................."),
      layoutRow("........................."),
    ],
  },
  {
    id: "pillars",
    label: "Pillar Hall",
    rows: [
      layoutRow("........................."),
      layoutRow("..P...................P.."),
      layoutRow("........................."),
      layoutRow("........................."),
      layoutRow(".........R...R..........."),
      layoutRow("........................."),
      layoutRow("....R...............R...."),
      layoutRow("........................."),
      layoutRow(".........R...R..........."),
      layoutRow("........................."),
      layoutRow("........................."),
      layoutRow("..P...................P.."),
      layoutRow("........................."),
    ],
  },
  {
    id: "cross",
    label: "Cross Chamber",
    rows: [
      layoutRow("........................."),
      layoutRow("........................."),
      layoutRow("...........#...#........."),
      layoutRow("...........#...#........."),
      layoutRow("...........#...#........."),
      layoutRow("........................."),
      layoutRow(".....####.......####....."),
      layoutRow(".....#...#.....#...#....."),
      layoutRow("........................."),
      layoutRow("...........#...#........."),
      layoutRow("...........#...#........."),
      layoutRow("........................."),
      layoutRow("........................."),
    ],
  },
  {
    id: "split",
    label: "Split Passage",
    rows: [
      layoutRow("........................."),
      layoutRow("........................."),
      layoutRow(".............R..........."),
      layoutRow(".............R..........."),
      layoutRow("........................."),
      layoutRow("........................."),
      layoutRow("........................."),
      layoutRow("........................."),
      layoutRow("........................."),
      layoutRow(".............R..........."),
      layoutRow(".............R..........."),
      layoutRow("........................."),
      layoutRow("........................."),
    ],
  },
  {
    id: "columns",
    label: "Column Gallery",
    rows: [
      layoutRow("........................."),
      layoutRow("..####............####..."),
      layoutRow("..####............####..."),
      layoutRow("........................."),
      layoutRow("........................."),
      layoutRow("........................."),
      layoutRow("..........####..........."),
      layoutRow("..........####..........."),
      layoutRow("........................."),
      layoutRow("........................."),
      layoutRow("..####............####..."),
      layoutRow("..####............####..."),
      layoutRow("........................."),
    ],
  },
  {
    id: "horseshoe",
    label: "Horseshoe Den",
    rows: [
      layoutRow("........................."),
      layoutRow("...####..........####...."),
      layoutRow("...#..#..........#..#...."),
      layoutRow("...#................#...."),
      layoutRow("...#.......R.......#....."),
      layoutRow("...#................#...."),
      layoutRow("...#................#...."),
      layoutRow("...#................#...."),
      layoutRow("...#.......R.......#....."),
      layoutRow("...#................#...."),
      layoutRow("...#..#..........#..#...."),
      layoutRow("...####..........####...."),
      layoutRow("........................."),
    ],
  },
  {
    id: "islands",
    label: "Rock Islands",
    rows: [
      layoutRow("........................."),
      layoutRow("..RR..............RR....."),
      layoutRow("..RR..............RR....."),
      layoutRow("........................."),
      layoutRow("........................."),
      layoutRow(".........RR.............."),
      layoutRow(".........RR.............."),
      layoutRow("........................."),
      layoutRow("........................."),
      layoutRow("..RR..............RR....."),
      layoutRow("..RR..............RR....."),
      layoutRow("........................."),
      layoutRow("........................."),
    ],
  },
  {
    id: "alcoves",
    label: "Wall Alcoves",
    rows: [
      layoutRow("........................."),
      layoutRow("........................."),
      layoutRow("###...................###"),
      layoutRow("#..#.................#..#"),
      layoutRow("#..#.................#..#"),
      layoutRow("###...................###"),
      layoutRow("........................."),
      layoutRow("........................."),
      layoutRow("###...................###"),
      layoutRow("#..#.................#..#"),
      layoutRow("#..#.................#..#"),
      layoutRow("###...................###"),
      layoutRow("........................."),
    ],
  },
  {
    id: "fortress",
    label: "Inner Fortress",
    rows: [
      layoutRow("........................."),
      layoutRow("....##############......."),
      layoutRow("....#............#......."),
      layoutRow("....#....PP......#......."),
      layoutRow("....#............#......."),
      layoutRow("....#......R.....#......."),
      layoutRow("....#............#......."),
      layoutRow("....#......R.....#......."),
      layoutRow("....#............#......."),
      layoutRow("....#....PP......#......."),
      layoutRow("....#............#......."),
      layoutRow("....###.......###........"),
      layoutRow("........................."),
    ],
  },
];

export type LayoutObstacleKind = "wall" | "rock" | "pillar";

export interface LayoutObstacle {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: LayoutObstacleKind;
  hp: number;
  maxHp: number;
  enchantSeal?: boolean;
}

export function obstacleMaxHp(kind: LayoutObstacleKind) {
  switch (kind) {
    case "rock":
      return 1;
    case "wall":
      return 2;
    case "pillar":
      return 4;
  }
}

function boxesOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
  padding = 0,
) {
  return (
    a.x < b.x + b.w + padding &&
    a.x + a.w + padding > b.x &&
    a.y < b.y + b.h + padding &&
    a.y + a.h + padding > b.y
  );
}

function cellToKind(cell: LayoutCell): LayoutObstacleKind | null {
  switch (cell) {
    case "#":
      return "wall";
    case "R":
      return "rock";
    case "P":
      return "pillar";
    default:
      return null;
  }
}

export type LayoutDirection = "north" | "south" | "east" | "west";

export const DOOR_TILE_COUNT = 2;
export const DOOR_TILE_COL_START = Math.floor((LAYOUT_COLS - DOOR_TILE_COUNT) / 2);
export const DOOR_TILE_ROW_START = Math.floor((LAYOUT_ROWS - DOOR_TILE_COUNT) / 2);
export const DOOR_START_X = DOOR_TILE_COL_START * LAYOUT_TILE_SIZE;
export const DOOR_START_Y = DOOR_TILE_ROW_START * LAYOUT_TILE_SIZE;
export const DOOR_LENGTH = DOOR_TILE_COUNT * LAYOUT_TILE_SIZE;
export const DOOR_APPROACH_DEPTH = LAYOUT_TILE_SIZE * 3;
export const DOOR_APPROACH_PAD = LAYOUT_TILE_SIZE;

export function getDoorClearZones(
  exits: Partial<Record<LayoutDirection, string>> = {
    north: "any",
    south: "any",
    east: "any",
    west: "any",
  },
) {
  const pad = DOOR_APPROACH_PAD;
  const zones: { x: number; y: number; w: number; h: number }[] = [];

  if (exits.north) {
    zones.push({
      x: DOOR_START_X - pad,
      y: 0,
      w: DOOR_LENGTH + pad * 2,
      h: DOOR_APPROACH_DEPTH,
    });
  }

  if (exits.south) {
    zones.push({
      x: DOOR_START_X - pad,
      y: LAYOUT_ROWS * LAYOUT_TILE_SIZE - DOOR_APPROACH_DEPTH,
      w: DOOR_LENGTH + pad * 2,
      h: DOOR_APPROACH_DEPTH,
    });
  }

  if (exits.west) {
    zones.push({
      x: 0,
      y: DOOR_START_Y - pad,
      w: DOOR_APPROACH_DEPTH,
      h: DOOR_LENGTH + pad * 2,
    });
  }

  if (exits.east) {
    zones.push({
      x: LAYOUT_COLS * LAYOUT_TILE_SIZE - DOOR_APPROACH_DEPTH,
      y: DOOR_START_Y - pad,
      w: DOOR_APPROACH_DEPTH,
      h: DOOR_LENGTH + pad * 2,
    });
  }

  return zones;
}

function cloneLayoutRows(rows: string[]) {
  return Array.from({ length: LAYOUT_ROWS }, (_, row) => {
    const line = rows[row] ?? ".".repeat(LAYOUT_COLS);
    const chars = line.split("");

    while (chars.length < LAYOUT_COLS) {
      chars.push(".");
    }

    return chars.slice(0, LAYOUT_COLS);
  });
}

export function clearDoorCorridors(
  layout: RoomLayoutTemplate,
  exits: Partial<Record<LayoutDirection, string>>,
): RoomLayoutTemplate {
  const rows = cloneLayoutRows(layout.rows);
  const colStart = DOOR_TILE_COL_START;
  const colEnd = colStart + DOOR_TILE_COUNT;
  const rowStart = DOOR_TILE_ROW_START;
  const rowEnd = rowStart + DOOR_TILE_COUNT;
  const corridorDepth = 3;

  const clearRect = (r0: number, r1: number, c0: number, c1: number) => {
    for (let row = r0; row < r1; row++) {
      for (let col = c0; col < c1; col++) {
        if (row >= 0 && row < rows.length && col >= 0 && col < rows[row].length) {
          rows[row][col] = ".";
        }
      }
    }
  };

  if (exits.north) {
    clearRect(0, corridorDepth, colStart - 1, colEnd + 1);
  }

  if (exits.south) {
    clearRect(LAYOUT_ROWS - corridorDepth, LAYOUT_ROWS, colStart - 1, colEnd + 1);
  }

  if (exits.west) {
    clearRect(rowStart - 1, rowEnd + 1, 0, corridorDepth);
  }

  if (exits.east) {
    clearRect(rowStart - 1, rowEnd + 1, LAYOUT_COLS - corridorDepth, LAYOUT_COLS);
  }

  return {
    ...layout,
    rows: rows.map((line) => layoutRow(line.join(""))),
  };
}

export function obstacleHitbox(obstacle: LayoutObstacle) {
  const inset =
    obstacle.kind === "wall" ? 0 : obstacle.kind === "pillar" ? 5 : 9;

  return {
    x: obstacle.x + inset,
    y: obstacle.y + inset,
    w: obstacle.w - inset * 2,
    h: obstacle.h - inset * 2,
  };
}

export function pickRoomLayout(rng: () => number, isStartRoom: boolean) {
  const pool = isStartRoom
    ? ROOM_LAYOUTS.filter((layout) => layout.startOnly || layout.id === "open")
    : ROOM_LAYOUTS.filter((layout) => !layout.startOnly);

  return pool[Math.floor(rng() * pool.length)];
}

export function layoutToObstacles(
  layout: RoomLayoutTemplate,
  blocked: { x: number; y: number; w: number; h: number }[] = [],
): LayoutObstacle[] {
  const obstacles: LayoutObstacle[] = [];

  for (let row = 0; row < layout.rows.length; row++) {
    const line = layout.rows[row];

    for (let col = 0; col < line.length; col++) {
      const kind = cellToKind(line[col] as LayoutCell);

      if (!kind) {
        continue;
      }

      const obstacle = {
        x: col * LAYOUT_TILE_SIZE,
        y: row * LAYOUT_TILE_SIZE,
        w: LAYOUT_TILE_SIZE,
        h: LAYOUT_TILE_SIZE,
        kind,
        hp: obstacleMaxHp(kind),
        maxHp: obstacleMaxHp(kind),
      };

      if (blocked.some((zone) => boxesOverlap(obstacle, zone))) {
        continue;
      }

      obstacles.push(obstacle);
    }
  }

  return obstacles;
}

export function findLayoutPosition(
  rng: () => number,
  size: number,
  occupied: { x: number; y: number; w: number; h: number }[],
  layout: RoomLayoutTemplate,
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

      if (!occupied.some((zone) => boxesOverlap(box, zone, 6))) {
        candidates.push({ x, y });
      }
    }
  }

  if (candidates.length === 0) {
    return {
      x: LAYOUT_TILE_SIZE * 2,
      y: LAYOUT_TILE_SIZE * 2,
    };
  }

  return candidates[Math.floor(rng() * candidates.length)];
}
