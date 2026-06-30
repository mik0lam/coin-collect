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
      layoutRow("...........####.........."),
      layoutRow("...........####.........."),
      layoutRow("...........#..#.........."),
      layoutRow("........................."),
      layoutRow(".....####.......####....."),
      layoutRow(".....#..#.......#..#....."),
      layoutRow("........................."),
      layoutRow("...........#..#.........."),
      layoutRow("...........####.........."),
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
      layoutRow(".............#..........."),
      layoutRow(".............#..........."),
      layoutRow(".............#..........."),
      layoutRow(".............#..........."),
      layoutRow(".............#..........."),
      layoutRow(".............#..........."),
      layoutRow(".............#..........."),
      layoutRow(".............#..........."),
      layoutRow(".............#..........."),
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
      layoutRow("..RRR..............RRR..."),
      layoutRow("..RRR..............RRR..."),
      layoutRow("........................."),
      layoutRow("........................."),
      layoutRow(".........RRR............."),
      layoutRow(".........RRR............."),
      layoutRow(".........RRR............."),
      layoutRow("........................."),
      layoutRow("........................."),
      layoutRow("..RRR..............RRR..."),
      layoutRow("..RRR..............RRR..."),
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
      layoutRow("....##############......."),
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
