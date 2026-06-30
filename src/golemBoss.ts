import { PLAY_HEIGHT, PLAY_WIDTH } from "./constants";
import { drawSprite, drawTintedSprite } from "./sprites";
import {
  getArmProjectileSprite,
  getGolemAnimFrame,
  getLaserFrame,
  getRockProjectileSprite,
  GOLEM_ANIMS,
  GOLEM_DRAW_SIZE,
  type GolemAnimKey,
} from "./golemSprites";
import type { GolemBossState, RuntimeMob } from "./types";

export interface GolemRockProjectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  spin: number;
  size: number;
  kind: "rock" | "arm";
}

export interface GolemLaserBeam {
  originX: number;
  originY: number;
  angle: number;
  length: number;
  width: number;
  startedAt: number;
  telegraphUntil: number;
  activeUntil: number;
  damage: number;
}

let rocks: GolemRockProjectile[] = [];
let lasers: GolemLaserBeam[] = [];

export function createGolemBossState(): GolemBossState {
  const now = performance.now();

  return {
    phase: "idle",
    anim: "idle",
    animStartedAt: now,
    facingRight: true,
    nextAttackAt: now + 2200,
    phaseStartedAt: now,
    attackTriggered: false,
    deathHandled: false,
    hurtUntil: 0,
  };
}

export function clearGolemEffects() {
  rocks = [];
  lasers = [];
}

function getAnimFrameIndex(state: GolemBossState, loop: boolean) {
  const def = GOLEM_ANIMS[state.anim];
  const elapsed = performance.now() - state.animStartedAt;
  const frame = Math.floor((elapsed / 1000) * def.fps);

  if (loop) {
    return frame % def.frames;
  }

  return Math.min(frame, def.frames - 1);
}

function setAnim(state: GolemBossState, anim: GolemAnimKey) {
  state.anim = anim;
  state.animStartedAt = performance.now();
}

function golemCenter(mob: RuntimeMob) {
  const head = mob.segments[0];

  return {
    x: head.x + mob.size / 2,
    y: head.y + mob.size / 2,
  };
}

function playerBoxOverlaps(
  px: number,
  py: number,
  pw: number,
  ph: number,
  x: number,
  y: number,
  size: number,
) {
  return px < x + size && px + pw > x && py < y + size && py + ph > y;
}

function playerHitsLaser(
  laser: GolemLaserBeam,
  playerX: number,
  playerY: number,
  playerSize: number,
) {
  const now = performance.now();

  if (now < laser.telegraphUntil || now >= laser.activeUntil) {
    return false;
  }

  const pcx = playerX + playerSize / 2;
  const pcy = playerY + playerSize / 2;
  const endX = laser.originX + Math.cos(laser.angle) * laser.length;
  const endY = laser.originY + Math.sin(laser.angle) * laser.length;
  const half = laser.width / 2 + playerSize * 0.28;

  const segDx = endX - laser.originX;
  const segDy = endY - laser.originY;
  const lenSq = segDx * segDx + segDy * segDy;

  if (lenSq === 0) {
    return false;
  }

  const t = Math.max(
    0,
    Math.min(1, ((pcx - laser.originX) * segDx + (pcy - laser.originY) * segDy) / lenSq),
  );
  const closestX = laser.originX + t * segDx;
  const closestY = laser.originY + t * segDy;
  const distSq = (pcx - closestX) ** 2 + (pcy - closestY) ** 2;

  return distSq <= half * half;
}

function spawnRock(mob: RuntimeMob, state: GolemBossState, playerX: number, playerY: number, playerSize: number) {
  const center = golemCenter(mob);
  const pcx = playerX + playerSize / 2;
  const pcy = playerY + playerSize / 2;
  const dx = pcx - center.x;
  const dy = pcy - center.y;
  const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  const speed = 5.2;

  rocks.push({
    x: center.x - 18,
    y: center.y - 28,
    vx: (dx / dist) * speed,
    vy: (dy / dist) * speed,
    rotation: 0,
    spin: 0.22,
    size: 36,
    kind: Math.random() < 0.45 ? "arm" : "rock",
  });

  rocks.push({
    x: center.x + 18,
    y: center.y - 28,
    vx: (dx / dist) * speed * 0.92 + (Math.random() - 0.5) * 0.8,
    vy: (dy / dist) * speed * 0.92,
    rotation: Math.random() * Math.PI,
    spin: -0.18,
    size: 28,
    kind: "rock",
  });

  state.attackTriggered = true;
}

function spawnLaser(mob: RuntimeMob, playerX: number, playerY: number, playerSize: number) {
  const center = golemCenter(mob);
  const pcx = playerX + playerSize / 2;
  const pcy = playerY + playerSize / 2;
  const now = performance.now();

  lasers.push({
    originX: center.x,
    originY: center.y - 8,
    angle: Math.atan2(pcy - center.y, pcx - center.x),
    length: 460,
    width: 34,
    startedAt: now,
    telegraphUntil: now + 280,
    activeUntil: now + 1100,
    damage: Math.floor(mob.contactDamage * 1.15),
  });
}

export function triggerGolemHurt(state: GolemBossState) {
  if (state.phase === "dying" || state.phase === "laser" || state.phase === "throw") {
    return;
  }

  state.phase = "hurt";
  state.phaseStartedAt = performance.now();
  state.hurtUntil = performance.now() + 420;
  setAnim(state, "hurt");
}

export function startGolemDeath(state: GolemBossState) {
  state.phase = "dying";
  state.phaseStartedAt = performance.now();
  state.attackTriggered = false;
  setAnim(state, "death");
  rocks = [];
}

export function isGolemDying(state: GolemBossState) {
  return state.phase === "dying";
}

export function isGolemDeathComplete(state: GolemBossState) {
  if (state.phase !== "dying") {
    return false;
  }

  const frame = getAnimFrameIndex(state, false);

  return frame >= GOLEM_ANIMS.death.frames - 1 && performance.now() - state.phaseStartedAt > 1100;
}

export function updateGolemBoss(
  mob: RuntimeMob,
  state: GolemBossState,
  playerX: number,
  playerY: number,
  playerSize: number,
  clamp: (mob: RuntimeMob) => void,
  onPlayerHit: (damage: number) => void,
) {
  if (!mob.segments.length || state.phase === "dying") {
    return;
  }

  const head = mob.segments[0];
  const center = golemCenter(mob);
  const pcx = playerX + playerSize / 2;
  const pcy = playerY + playerSize / 2;
  const now = performance.now();

  state.facingRight = pcx >= center.x;

  for (let i = rocks.length - 1; i >= 0; i--) {
    const rock = rocks[i];
    rock.x += rock.vx;
    rock.y += rock.vy;
    rock.rotation += rock.spin;

    if (
      playerBoxOverlaps(playerX, playerY, playerSize, playerSize, rock.x, rock.y, rock.size)
    ) {
      onPlayerHit(Math.floor(mob.contactDamage * 0.75));
      rocks.splice(i, 1);
      continue;
    }

    if (
      rock.x < -60 ||
      rock.x > PLAY_WIDTH + 20 ||
      rock.y < -60 ||
      rock.y > PLAY_HEIGHT + 20
    ) {
      rocks.splice(i, 1);
    }
  }

  for (const laser of lasers) {
    if (playerHitsLaser(laser, playerX, playerY, playerSize)) {
      onPlayerHit(laser.damage);
    }
  }

  lasers = lasers.filter((laser) => now < laser.activeUntil + 120);

  if (state.phase === "hurt") {
    if (now >= state.hurtUntil) {
      state.phase = "chase";
      state.attackTriggered = false;
      setAnim(state, "walk");
    }

    return;
  }

  if (state.phase === "laser") {
    const frame = getAnimFrameIndex(state, false);

    if (frame >= 7 && !state.attackTriggered) {
      spawnLaser(mob, playerX, playerY, playerSize);
      state.attackTriggered = true;
    }

    if (frame >= GOLEM_ANIMS.laser.frames - 1) {
      state.phase = "chase";
      state.attackTriggered = false;
      state.nextAttackAt = now + 2400 + Math.random() * 1800;
      setAnim(state, "walk");
    }

    return;
  }

  if (state.phase === "throw") {
    const frame = getAnimFrameIndex(state, false);

    if (frame >= 6 && !state.attackTriggered) {
      spawnRock(mob, state, playerX, playerY, playerSize);
    }

    if (frame >= GOLEM_ANIMS.throw.frames - 1) {
      state.phase = "chase";
      state.attackTriggered = false;
      state.nextAttackAt = now + 2600 + Math.random() * 1600;
      setAnim(state, "walk");
    }

    return;
  }

  if (now >= state.nextAttackAt) {
    const useLaser = Math.random() < 0.48;
    state.phase = useLaser ? "laser" : "throw";
    state.phaseStartedAt = now;
    state.attackTriggered = false;
    setAnim(state, useLaser ? "laser" : "throw");
    return;
  }

  const dx = pcx - center.x;
  const dy = pcy - center.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > 96) {
    head.x += (dx / dist) * mob.speed;
    head.y += (dy / dist) * mob.speed;
    clamp(mob);
    state.phase = "chase";
    setAnim(state, "walk");
  } else {
    state.phase = "idle";
    setAnim(state, "idle");
  }
}

export function drawGolemBoss(
  ctx: CanvasRenderingContext2D,
  mob: RuntimeMob,
  state: GolemBossState,
  hitFlash: boolean,
) {
  if (!mob.segments.length) {
    return;
  }

  const head = mob.segments[0];
  const loop = state.phase === "idle" || state.phase === "chase";
  const frame = getAnimFrameIndex(state, loop || state.phase === "hurt");
  const sprite = getGolemAnimFrame(state.anim, frame);
  const drawX = head.x + (mob.size - GOLEM_DRAW_SIZE) / 2;
  const drawY = head.y + (mob.size - GOLEM_DRAW_SIZE) / 2;

  ctx.save();

  if (!state.facingRight) {
    ctx.translate(drawX + GOLEM_DRAW_SIZE, drawY);
    ctx.scale(-1, 1);
    if (hitFlash) {
      drawTintedSprite(ctx, sprite, 0, 0, GOLEM_DRAW_SIZE, "#ff6688", 0.45);
    } else {
      drawSprite(ctx, sprite, 0, 0, GOLEM_DRAW_SIZE, GOLEM_DRAW_SIZE);
    }
  } else if (hitFlash) {
    drawTintedSprite(ctx, sprite, drawX, drawY, GOLEM_DRAW_SIZE, "#ff6688", 0.45);
  } else {
    drawSprite(ctx, sprite, drawX, drawY, GOLEM_DRAW_SIZE, GOLEM_DRAW_SIZE);
  }

  ctx.restore();
}

export function drawGolemEffects(ctx: CanvasRenderingContext2D) {
  const now = performance.now();

  for (const laser of lasers) {
    const elapsed = now - laser.startedAt;
    const telegraph = now < laser.telegraphUntil;
    const active = now >= laser.telegraphUntil && now < laser.activeUntil;
    const frameIndex = telegraph
      ? Math.min(7, Math.floor(elapsed / 35))
      : 8 + Math.min(5, Math.floor((now - laser.telegraphUntil) / 70));
    const beamSprite = getLaserFrame(frameIndex);

    ctx.save();
    ctx.translate(laser.originX, laser.originY);
    ctx.rotate(laser.angle);

    if (telegraph) {
      ctx.globalAlpha = 0.55 + Math.sin(now / 60) * 0.15;
      drawSprite(ctx, beamSprite, -8, -beamSprite.height / 2, 72, beamSprite.height);
    } else if (active) {
      ctx.globalAlpha = 0.92;
      drawSprite(ctx, beamSprite, -4, -beamSprite.height / 2, laser.length * 0.55, beamSprite.height);
      ctx.fillStyle = "rgba(120, 220, 255, 0.35)";
      ctx.fillRect(0, -laser.width / 2, laser.length, laser.width);
    }

    ctx.restore();
  }

  for (const rock of rocks) {
    const sprite = rock.kind === "arm" ? getArmProjectileSprite() : getRockProjectileSprite();

    ctx.save();
    ctx.translate(rock.x + rock.size / 2, rock.y + rock.size / 2);
    ctx.rotate(rock.rotation);
    drawSprite(ctx, sprite, -rock.size / 2, -rock.size / 2, rock.size, rock.size);
    ctx.restore();
  }
}

export function isGolemBossContactActive(state: GolemBossState) {
  return state.phase === "idle" || state.phase === "chase" || state.phase === "hurt";
}
