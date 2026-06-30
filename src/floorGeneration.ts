import { SPRITES } from "./sprites";
import { TILE_SCALE } from "./spriteAssets";
import {
  BOSS_FLOOR_INTERVAL,
  BOSS_HEART_HP_BONUS,
  SHOP_FLOOR_INTERVAL,
  SHOP_STATION_SIZE,
  SWORD_START_POSITION,
  VOID_SHARD_FLOOR_INTERVAL,
  VOID_SHARD_SIZE,
  SLOT_MACHINE_SIZE,
  POTION_PICKUP_SIZE,
  CHEST_SIZE,
  ALL_MOB_TYPES,
} from "./constants";
import { createRng } from "./rng";
import { findLayoutPosition, findOpenPosition, isSnakeSpawnClear } from "./placement";
import {
  clearDoorCorridors,
  DOOR_LENGTH,
  DOOR_START_X,
  DOOR_START_Y,
  getDoorClearZones,
  layoutToObstacles,
  pickRoomLayout,
  ROOM_LAYOUTS,
} from "./roomLayouts";
import type { ChestLoot, Direction, Floor, MobConfig, MobType, Room } from "./types";
import { PLAY_HEIGHT, PLAY_WIDTH } from "./constants";

function spriteDrawSize(sprite: HTMLCanvasElement) {
  return {
    w: sprite.width * TILE_SCALE,
    h: sprite.height * TILE_SCALE,
  };
}

function stairsTilePosition(kind: "down" | "up" = "down") {
  const sprite = kind === "up" ? SPRITES.stairsUp : SPRITES.stairsDown;
  const { w, h } = spriteDrawSize(sprite);

  return {
    x: PLAY_WIDTH / 2 - w / 2,
    y: PLAY_HEIGHT / 2 - h / 2,
  };
}

function contactDamageForDepth(depth: number) {
  return 6 + Math.floor(depth * 1.25);
}

function generateMob(type: MobType, depth: number, rng: () => number): MobConfig {
  const baseContact = contactDamageForDepth(depth);

  switch (type) {
    case "boss":
      return {
        type,
        segments: [{ x: 0, y: 0 }],
        size: 56,
        speed: 1.1 + depth * 0.04,
        maxHp: Math.floor(40 + depth * 6),
        contactDamage: Math.floor(baseContact * 1.5),
      };
    case "snake": {
      const segmentCount = Math.min(9, 2 + Math.floor(depth / 2) + Math.floor(rng() * 2));
      const speed = 1.0 + depth * 0.08 + rng() * 0.25;
      const maxHp = Math.floor(2 + depth * 1.1 + rng() * 1.5);
      const segments: { x: number; y: number }[] = [];

      for (let i = 0; i < segmentCount; i++) {
        segments.push({ x: 0, y: 0 });
      }

      return { type, segments, size: 32, speed, maxHp, contactDamage: baseContact };
    }
    case "slime":
      return {
        type,
        segments: [{ x: 0, y: 0 }],
        size: 30,
        speed: 0.75 + depth * 0.06 + rng() * 0.12,
        maxHp: Math.floor(1 + depth * 0.85 + rng()),
        contactDamage: Math.floor(baseContact * 0.85),
      };
    case "wraith":
      return {
        type,
        segments: [{ x: 0, y: 0 }],
        size: 28,
        speed: 1.6 + depth * 0.1 + rng() * 0.2,
        maxHp: Math.floor(1 + depth * 0.75 + rng()),
        contactDamage: Math.floor(baseContact * 0.9),
      };
    case "brute":
      return {
        type,
        segments: [{ x: 0, y: 0 }],
        size: 40,
        speed: 0.7 + depth * 0.05 + rng() * 0.1,
        maxHp: Math.floor(3 + depth * 1.8 + rng() * 1.5),
        contactDamage: Math.floor(baseContact * 1.15),
      };
  }
}

function generateEnemies(depth: number, rng: () => number, isStartRoom: boolean) {
  if (isStartRoom && depth === 1) {
    return [];
  }

  const count = depth <= 3 ? 1 : rng() < 0.75 ? 1 : 2;
  const enemies: MobConfig[] = [];

  for (let i = 0; i < count; i++) {
    const type = ALL_MOB_TYPES[Math.floor(rng() * ALL_MOB_TYPES.length)];
    enemies.push(generateMob(type, depth, rng));
  }

  return enemies;
}

function generateChestLoot(depth: number, rng: () => number): ChestLoot {
  const roll = rng();

  if (roll < 0.35) {
    const weaponIds = ["iron-sword", "war-axe", "dagger"] as const;
    return { kind: "weapon", weaponId: weaponIds[Math.floor(rng() * weaponIds.length)] };
  }

  if (roll < 0.7) {
    return { kind: "health-potion", healAmount: 30 + Math.floor(depth * 10 + rng() * 10) };
  }

  return { kind: "strong-potion", healAmount: 55 + Math.floor(depth * 14 + rng() * 12) };
}

function rollRoomLoot(rng: () => number) {
  const roll = rng();

  if (roll < 0.14) {
    return "chest" as const;
  }

  if (roll < 0.32) {
    return "potion" as const;
  }

  return "none" as const;
}

function backgroundForDepth(depth: number, variant: number) {
  const palettes = [
    "#1a1428",
    "#141c24",
    "#1c1410",
    "#10181c",
    "#18141c",
  ];

  return palettes[(depth + variant) % palettes.length];
}

function placeVoidShardAndSlotMachine(
  rooms: Record<string, Room>,
  startId: string,
  depth: number,
  rng: () => number,
  coinSize: number,
  buildOccupied: (room: Room) => { x: number; y: number; w: number; h: number }[],
) {
  if (depth % VOID_SHARD_FLOOR_INTERVAL !== 0) {
    return;
  }

  const shardCandidates = Object.values(rooms).filter((room) => room.id !== startId);

  if (shardCandidates.length > 0) {
    const shardRoom = shardCandidates[Math.floor(rng() * shardCandidates.length)];
    const shardPos = findOpenPosition(
      rng,
      VOID_SHARD_SIZE,
      buildOccupied(shardRoom),
      shardRoom.exits,
      shardRoom.obstacles,
    );

    shardRoom.voidShardPickup = shardPos;
    shardRoom.voidShardCollected = false;
  }

  const startRoom = rooms[startId];
  const machinePos = findOpenPosition(
    rng,
    SLOT_MACHINE_SIZE,
    buildOccupied(startRoom),
    startRoom.exits,
    startRoom.obstacles,
  );

  startRoom.slotMachine = machinePos;
  startRoom.name = `Depth ${depth} · Shrine Floor`;
}

function placeShop(
  room: Room,
  depth: number,
  rng: () => number,
  buildOccupied: (room: Room) => { x: number; y: number; w: number; h: number }[],
) {
  if (depth % SHOP_FLOOR_INTERVAL !== 0) {
    return;
  }

  const shopPos = findOpenPosition(
    rng,
    SHOP_STATION_SIZE,
    buildOccupied(room),
    room.exits,
    room.obstacles,
  );

  room.shop = shopPos;
  room.name = `Depth ${depth} · Merchant's Rest`;
}

function spawnEnemyInRoom(
  enemy: MobConfig,
  rng: () => number,
  occupied: { x: number; y: number; w: number; h: number }[],
  layout: ReturnType<typeof clearDoorCorridors>,
  exits: Partial<Record<Direction, string>>,
  obstacles: Room["obstacles"],
) {
  if (enemy.type === "snake") {
    const segmentCount = enemy.segments.length;

    for (let attempt = 0; attempt < 40; attempt++) {
      const spawn = findLayoutPosition(rng, enemy.size, occupied, layout, exits, obstacles);

      if (isSnakeSpawnClear(spawn.x, spawn.y, segmentCount, enemy.size, 28, exits, obstacles, occupied)) {
        enemy.segments = [];

        for (let s = 0; s < segmentCount; s++) {
          enemy.segments.push({ x: spawn.x - s * 28, y: spawn.y });
        }

        occupied.push({ x: spawn.x, y: spawn.y, w: enemy.size, h: enemy.size });
        return;
      }
    }
  }

  const spawn = findLayoutPosition(rng, enemy.size, occupied, layout, exits, obstacles);
  enemy.segments = [{ x: spawn.x, y: spawn.y }];
  occupied.push({ x: spawn.x, y: spawn.y, w: enemy.size, h: enemy.size });
}

function buildRoom(
  cell: { id: string; gx: number; gy: number },
  depth: number,
  exits: Partial<Record<Direction, string>>,
  rng: () => number,
  isStartRoom: boolean,
  coinSize: number,
  options: {
    layoutId?: string;
    isPrepRoom?: boolean;
    isBossRoom?: boolean;
    forceOpenLayout?: boolean;
    skipEnemies?: boolean;
    skipLoot?: boolean;
  } = {},
) {
  const occupied: { x: number; y: number; w: number; h: number }[] = [...getDoorClearZones(exits)];
  const downStairs = spriteDrawSize(SPRITES.stairsDown);
  occupied.push({
    x: PLAY_WIDTH / 2 - downStairs.w / 2,
    y: PLAY_HEIGHT / 2 - downStairs.h / 2,
    w: downStairs.w,
    h: downStairs.h,
  });

  let rawLayout;

  if (options.layoutId) {
    rawLayout = ROOM_LAYOUTS.find((entry) => entry.id === options.layoutId)!;
  } else if (isStartRoom && depth === 1) {
    rawLayout = ROOM_LAYOUTS.find((entry) => entry.id === "start")!;
  } else if (options.forceOpenLayout || options.isPrepRoom) {
    rawLayout = ROOM_LAYOUTS.find((entry) => entry.id === "open")!;
  } else {
    rawLayout = pickRoomLayout(rng, isStartRoom);
  }

  const layout = clearDoorCorridors(rawLayout, exits);
  const obstacles = layoutToObstacles(layout, occupied);
  occupied.push(...obstacles);

  const coinPos = findLayoutPosition(rng, coinSize, occupied, layout, exits, obstacles);
  occupied.push({ x: coinPos.x, y: coinPos.y, w: coinSize, h: coinSize });

  const room: Room = {
    id: cell.id,
    name: `Depth ${depth} · ${layout.label}`,
    background: backgroundForDepth(depth, Math.floor(rng() * 5)),
    gridX: cell.gx,
    gridY: cell.gy,
    exits,
    coin: coinPos,
    coinCollected: false,
    enemies: [],
    obstacles,
    layoutId: layout.id,
    scrapPickups: [],
    isPrepRoom: options.isPrepRoom,
    isBossRoom: options.isBossRoom,
  };

  if (!options.skipEnemies) {
    const enemies =
      options.isBossRoom
        ? [generateMob("boss", depth, rng)]
        : generateEnemies(depth, rng, isStartRoom);

    for (const enemy of enemies) {
      spawnEnemyInRoom(enemy, rng, occupied, layout, exits, obstacles);
      room.enemies.push(enemy);
    }
  }

  if (!options.skipLoot && !(isStartRoom && depth === 1)) {
    const loot = rollRoomLoot(rng);

    if (loot === "potion") {
      const potionPos = findLayoutPosition(rng, POTION_PICKUP_SIZE, occupied, layout, exits, obstacles);
      occupied.push({
        x: potionPos.x,
        y: potionPos.y,
        w: POTION_PICKUP_SIZE,
        h: POTION_PICKUP_SIZE,
      });
      room.potionPickup = potionPos;
      room.potionHeal = 30 + Math.floor(depth * 12 + rng() * 10);
    } else if (loot === "chest") {
      const chestPos = findLayoutPosition(rng, CHEST_SIZE, occupied, layout, exits, obstacles);
      occupied.push({
        x: chestPos.x,
        y: chestPos.y,
        w: CHEST_SIZE,
        h: CHEST_SIZE,
      });
      room.chest = {
        x: chestPos.x,
        y: chestPos.y,
        opened: false,
        loot: generateChestLoot(depth, rng),
        variant: "normal",
      };
    }
  }

  return { room, layout, occupied };
}

function generateBossFloor(depth: number, seed: number, coinSize: number): Floor {
  const rng = createRng(seed);
  const prepId = `d${depth}-prep`;
  const bossId = `d${depth}-boss`;

  const prepExits = { north: bossId };
  const bossExits = { south: prepId };

  const prepBuilt = buildRoom(
    { id: prepId, gx: 0, gy: 0 },
    depth,
    prepExits,
    rng,
    true,
    coinSize,
    { isPrepRoom: true, forceOpenLayout: true, skipEnemies: true, skipLoot: true },
  );

  const bossBuilt = buildRoom(
    { id: bossId, gx: 0, gy: -1 },
    depth,
    bossExits,
    rng,
    false,
    coinSize,
    { isBossRoom: true, forceOpenLayout: true, skipLoot: true },
  );

  prepBuilt.room.name = `Depth ${depth} · Boss Antechamber`;
  prepBuilt.room.isPrepRoom = true;
  bossBuilt.room.name = `Depth ${depth} · Boss Chamber`;
  bossBuilt.room.isBossRoom = true;

  placeShop(prepBuilt.room, depth, rng, (room) => {
    const occ: { x: number; y: number; w: number; h: number }[] = [...getDoorClearZones(room.exits)];
    occ.push(...room.obstacles);
    return occ;
  });

  bossBuilt.room.stairsDownTile = stairsTilePosition("down");

  if (depth > 1) {
    prepBuilt.room.stairsUpTile = stairsTilePosition("up");
  }

  return {
    depth,
    rooms: {
      [prepId]: prepBuilt.room,
      [bossId]: bossBuilt.room,
    },
    startRoomId: prepId,
    stairsDownRoomId: bossId,
    isBossFloor: true,
  };
}

export function generateFloor(depth: number, seed: number, coinSize: number): Floor {
  if (depth % BOSS_FLOOR_INTERVAL === 0) {
    return generateBossFloor(depth, seed, coinSize);
  }

  const rng = createRng(seed);
  const roomCount = Math.min(8, 4 + Math.floor(depth / 2) + Math.floor(rng() * 2));
  const grid = new Map<string, { id: string; gx: number; gy: number }>();
  const startId = `d${depth}-r0`;

  grid.set("0,0", { id: startId, gx: 0, gy: 0 });

  const directions = [
    { dx: 0, dy: -1, dir: "north" as Direction, opposite: "south" as Direction },
    { dx: 1, dy: 0, dir: "east" as Direction, opposite: "west" as Direction },
    { dx: 0, dy: 1, dir: "south" as Direction, opposite: "north" as Direction },
    { dx: -1, dy: 0, dir: "west" as Direction, opposite: "east" as Direction },
  ];

  while (grid.size < roomCount) {
    const cells = [...grid.values()];
    const parent = cells[Math.floor(rng() * cells.length)];
    const step = directions[Math.floor(rng() * directions.length)];
    const gx = parent.gx + step.dx;
    const gy = parent.gy + step.dy;
    const key = `${gx},${gy}`;

    if (!grid.has(key)) {
      grid.set(key, { id: `d${depth}-r${grid.size}`, gx, gy });
    }
  }

  const rooms: Record<string, Room> = {};
  let farthestRoomId = startId;
  let farthestDistance = 0;

  for (const cell of grid.values()) {
    const exits: Partial<Record<Direction, string>> = {};

    for (const step of directions) {
      const neighbor = grid.get(`${cell.gx + step.dx},${cell.gy + step.dy}`);

      if (neighbor) {
        exits[step.dir] = neighbor.id;
      }
    }

    const distance = Math.abs(cell.gx) + Math.abs(cell.gy);

    if (distance > farthestDistance) {
      farthestDistance = distance;
      farthestRoomId = cell.id;
    }

    const isStartRoom = cell.id === startId;
    const built = buildRoom(cell, depth, exits, rng, isStartRoom, coinSize);
    rooms[cell.id] = built.room;
  }

  rooms[farthestRoomId].stairsDownTile = stairsTilePosition("down");

  if (depth > 1) {
    rooms[startId].stairsUpTile = stairsTilePosition("up");
  }

  if (depth === 1) {
    rooms[startId].weaponPickup = { ...SWORD_START_POSITION, weaponId: "rusty-sword" };
    rooms[startId].potionPickup = { x: 280, y: 200 };
    rooms[startId].potionHeal = 45;
    rooms[startId].potionCollected = false;
    rooms[startId].enemies = [
      {
        type: "snake",
        segments: [
          { x: 560, y: 310 },
          { x: 590, y: 310 },
        ],
        size: 32,
        speed: 1.2,
        maxHp: 3,
        contactDamage: contactDamageForDepth(1),
      },
    ];
  }

  const buildOccupied = (room: Room) => {
    const occ: { x: number; y: number; w: number; h: number }[] = [
      ...getDoorClearZones(room.exits),
      ...room.obstacles,
    ];

    if (!room.coinCollected) {
      occ.push({ x: room.coin.x, y: room.coin.y, w: coinSize, h: coinSize });
    }

    return occ;
  };

  placeVoidShardAndSlotMachine(rooms, startId, depth, rng, coinSize, buildOccupied);
  placeShop(rooms[startId], depth, rng, buildOccupied);

  return {
    depth,
    rooms,
    startRoomId: startId,
    stairsDownRoomId: farthestRoomId,
  };
}

export { BOSS_HEART_HP_BONUS, contactDamageForDepth };
