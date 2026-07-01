import { PLAY_HEIGHT, PLAY_WIDTH } from "./constants";
import { drawSprite, drawTintedSprite } from "./sprites";
import {
  EXECUTIONER_DRAW_SIZE,
  getExecutionerAttackingFrame,
  getExecutionerDeathFrame,
  getExecutionerIdleFrame,
  getExecutionerSkill1Frame,
} from "./executionerSprites";
import type { ExecutionerBossState, RuntimeMob } from "./types";

const SWING_FPS = 24;
const SWING_DURATION_MS = 520;
const VANISH_FRAME_MS = 110;
const APPEAR_FRAME_MS = 95;
const HIDDEN_MS = 160;

function executionerCenter(mob: RuntimeMob) {
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

export function createExecutionerBossState(): ExecutionerBossState {
  const now = performance.now();

  return {
    phase: "float",
    anim: "idle",
    animFrame: 0,
    animStartedAt: now,
    facingRight: true,
    nextAttackAt: now + 1800,
    phaseStartedAt: now,
    floatAngle: Math.random() * Math.PI * 2,
    swingHit: false,
    appearHit: false,
    attackTriggered: false,
    deathHandled: false,
    hurtUntil: 0,
    teleportX: 0,
    teleportY: 0,
    hiddenUntil: 0,
    preferTeleport: false,
  };
}

export function isExecutionerBoss(mob: RuntimeMob) {
  return mob.type === "boss" && mob.executionerState !== undefined;
}

export function clearExecutionerEffects() {}

function getIdleFrame(state: ExecutionerBossState) {
  const elapsed = performance.now() - state.animStartedAt;

  return Math.floor(elapsed / 140) % 5;
}

function getDeathFrame(state: ExecutionerBossState) {
  const elapsed = performance.now() - state.phaseStartedAt;
  const index = Math.min(19, Math.floor(elapsed / 90));
  const row = index >= 10 ? 1 : 0;
  const col = index % 10;

  return { row, col };
}

export function triggerExecutionerHurt(state: ExecutionerBossState) {
  if (state.phase === "dying" || state.phase === "hidden" || state.phase === "vanish") {
    return;
  }

  state.phase = "hurt";
  state.phaseStartedAt = performance.now();
  state.hurtUntil = performance.now() + 320;
}

export function startExecutionerDeath(state: ExecutionerBossState) {
  state.phase = "dying";
  state.phaseStartedAt = performance.now();
  state.attackTriggered = false;
}

export function isExecutionerDeathComplete(state: ExecutionerBossState) {
  if (state.phase !== "dying") {
    return false;
  }

  return performance.now() - state.phaseStartedAt > 1900;
}

export function isExecutionerBossContactActive(state: ExecutionerBossState) {
  if (state.phase === "swing") {
    return state.animFrame >= 2 && state.animFrame <= 4;
  }

  if (state.phase === "appear") {
    return state.animFrame >= 1;
  }

  return false;
}

export function updateExecutionerBoss(
  mob: RuntimeMob,
  state: ExecutionerBossState,
  playerX: number,
  playerY: number,
  playerSize: number,
  dt: number,
  clamp: (mob: RuntimeMob) => void,
  onPlayerHit: (damage: number, sourceX: number, sourceY: number) => void,
) {
  if (!mob.segments.length || state.phase === "dying") {
    return;
  }

  const head = mob.segments[0];
  const center = executionerCenter(mob);
  const pcx = playerX + playerSize / 2;
  const pcy = playerY + playerSize / 2;
  const now = performance.now();

  state.facingRight = pcx >= center.x;

  if (state.phase === "hurt") {
    if (now >= state.hurtUntil) {
      state.phase = "float";
      state.nextAttackAt = now + 900;
      state.anim = "idle";
      state.animStartedAt = now;
    }

    return;
  }

  if (state.phase === "float") {
    state.anim = "idle";
    state.animFrame = getIdleFrame(state);
    state.floatAngle += dt * 0.0018;

    const hoverX = Math.cos(state.floatAngle) * 52;
    const hoverY = Math.sin(state.floatAngle * 1.4) * 28 - 36;
    const targetX = pcx - mob.size / 2 + hoverX * 0.35;
    const targetY = pcy - mob.size / 2 + hoverY;
    const follow = 0.028 * dt;

    head.x += (targetX - head.x) * follow;
    head.y += (targetY - head.y) * follow;
    clamp(mob);

    if (now >= state.nextAttackAt) {
      if (state.preferTeleport) {
        state.phase = "vanish";
        state.phaseStartedAt = now;
        state.anim = "skill1";
        state.animFrame = 0;
        state.preferTeleport = false;
      } else {
        state.phase = "swing";
        state.phaseStartedAt = now;
        state.anim = "attacking";
        state.animFrame = 0;
        state.swingHit = false;
        state.preferTeleport = true;
      }
    }

    return;
  }

  if (state.phase === "swing") {
    const elapsed = now - state.phaseStartedAt;
    state.animFrame = Math.min(5, Math.floor((elapsed / 1000) * SWING_FPS));

    const dx = pcx - center.x;
    const dy = pcy - center.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    head.x += (dx / dist) * mob.speed * 3.2 * dt;
    head.y += (dy / dist) * mob.speed * 3.2 * dt;
    clamp(mob);

    if (
      state.animFrame >= 2 &&
      state.animFrame <= 4 &&
      !state.swingHit &&
      playerBoxOverlaps(playerX, playerY, playerSize, playerSize, head.x, head.y, mob.size)
    ) {
      onPlayerHit(mob.contactDamage, center.x, center.y);
      state.swingHit = true;
    }

    if (elapsed >= SWING_DURATION_MS) {
      state.phase = "float";
      state.anim = "idle";
      state.animStartedAt = now;
      state.nextAttackAt = now + 700 + Math.random() * 500;
    }

    return;
  }

  if (state.phase === "vanish") {
    const elapsed = now - state.phaseStartedAt;
    state.animFrame = Math.min(2, Math.floor(elapsed / VANISH_FRAME_MS));

    if (state.animFrame >= 2 && elapsed >= VANISH_FRAME_MS * 3) {
      state.phase = "hidden";
      state.hiddenUntil = now + HIDDEN_MS;
      state.teleportX = Math.max(
        16,
        Math.min(PLAY_WIDTH - mob.size - 16, playerX + playerSize / 2 - mob.size / 2),
      );
      state.teleportY = Math.max(
        16,
        Math.min(PLAY_HEIGHT - mob.size - 16, playerY + playerSize / 2 - mob.size / 2),
      );
    }

    return;
  }

  if (state.phase === "hidden") {
    if (now >= state.hiddenUntil) {
      head.x = state.teleportX;
      head.y = state.teleportY;
      clamp(mob);
      state.phase = "appear";
      state.phaseStartedAt = now;
      state.animFrame = 0;
      state.appearHit = false;
    }

    return;
  }

  if (state.phase === "appear") {
    const elapsed = now - state.phaseStartedAt;
    state.animFrame = Math.min(5, Math.floor(elapsed / APPEAR_FRAME_MS) + 3);

    if (
      state.animFrame >= 4 &&
      !state.appearHit &&
      playerBoxOverlaps(playerX, playerY, playerSize, playerSize, head.x, head.y, mob.size)
    ) {
      onPlayerHit(Math.floor(mob.contactDamage * 1.25), center.x, center.y);
      state.appearHit = true;
    }

    if (elapsed >= APPEAR_FRAME_MS * 4) {
      state.phase = "float";
      state.anim = "idle";
      state.animStartedAt = now;
      state.nextAttackAt = now + 1400 + Math.random() * 600;
      state.preferTeleport = false;
    }
  }
}

function resolveExecutionerSprite(state: ExecutionerBossState) {
  if (state.phase === "dying") {
    const { row, col } = getDeathFrame(state);

    return getExecutionerDeathFrame(row, col);
  }

  if (state.phase === "swing") {
    return getExecutionerAttackingFrame(0, state.animFrame);
  }

  if (state.phase === "vanish" || state.phase === "appear") {
    return getExecutionerSkill1Frame(1, state.animFrame);
  }

  return getExecutionerIdleFrame(state.animFrame);
}

export function drawExecutionerBoss(
  ctx: CanvasRenderingContext2D,
  mob: RuntimeMob,
  state: ExecutionerBossState,
  hitFlash: boolean,
  now: number,
) {
  if (!mob.segments.length || state.phase === "hidden") {
    return;
  }

  const head = mob.segments[0];
  const sprite = resolveExecutionerSprite(state);
  const bob = state.phase === "float" ? Math.sin(now / 220 + state.floatAngle) * 5 : 0;
  const drawX = head.x + (mob.size - EXECUTIONER_DRAW_SIZE) / 2;
  const drawY = head.y + (mob.size - EXECUTIONER_DRAW_SIZE) / 2 + bob;

  ctx.save();

  if (!state.facingRight) {
    ctx.translate(drawX + EXECUTIONER_DRAW_SIZE, drawY);
    ctx.scale(-1, 1);

    if (hitFlash) {
      drawTintedSprite(ctx, sprite, 0, 0, EXECUTIONER_DRAW_SIZE, "#ff4466", 0.45);
    } else {
      drawSprite(ctx, sprite, 0, 0, EXECUTIONER_DRAW_SIZE, EXECUTIONER_DRAW_SIZE);
    }
  } else if (hitFlash) {
    drawTintedSprite(ctx, sprite, drawX, drawY, EXECUTIONER_DRAW_SIZE, "#ff4466", 0.45);
  } else {
    drawSprite(ctx, sprite, drawX, drawY, EXECUTIONER_DRAW_SIZE, EXECUTIONER_DRAW_SIZE);
  }

  ctx.restore();
}
