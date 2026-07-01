import { drawSprite } from "./sprites";
import {
  getImpalerAttackFrame,
  getImpalerCounterFrame,
  getImpalerDeathFrame,
  getImpalerDrawSize,
  getImpalerIdleFrame,
  getImpalerWalkFrame,
  IMPALER_ATTACK_FRAME_COUNTS,
  IMPALER_ATTACK_KEYS,
  IMPALER_COUNTER_FRAME_COUNT,
  IMPALER_DEATH_FRAME_COUNT,
  IMPALER_DRAW_H,
  IMPALER_FRAME_MS,
  type ImpalerAttackKey,
  type ImpalerFrame,
} from "./impalerSprites";
import type { ImpalerBossState, RuntimeMob } from "./types";

const COUNTER_FRAME_COUNT = IMPALER_COUNTER_FRAME_COUNT;
const HURT_MS = COUNTER_FRAME_COUNT * IMPALER_FRAME_MS;

function bossCenter(mob: RuntimeMob) {
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

function updateFacing(state: ImpalerBossState, centerX: number, playerX: number, playerW: number) {
  const pcx = playerX + playerW / 2;
  state.facingRight = pcx >= centerX;
}

function lungeTowardPlayer(
  mob: RuntimeMob,
  state: ImpalerBossState,
  playerX: number,
  playerY: number,
  playerW: number,
  playerH: number,
  dt: number,
  speedMult: number,
  clamp: (mob: RuntimeMob) => void,
) {
  const head = mob.segments[0];
  const center = bossCenter(mob);
  const pcx = playerX + playerW / 2;
  const pcy = playerY + playerH / 2;
  const dx = pcx - center.x;
  const dy = pcy - center.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const move = mob.speed * speedMult * dt;

  head.x += (dx / dist) * move;
  head.y += (dy / dist) * move;
  clamp(mob);
  updateFacing(state, bossCenter(mob).x, playerX, playerW);
}

function getAttackDurationMs(attack: ImpalerAttackKey) {
  return IMPALER_ATTACK_FRAME_COUNTS[attack] * IMPALER_FRAME_MS;
}

function getAttackHitWindow(attack: ImpalerAttackKey) {
  const frames = IMPALER_ATTACK_FRAME_COUNTS[attack];
  const start = Math.floor(frames * 0.35);
  const end = Math.floor(frames * 0.72);
  return { start, end };
}

function getImpalerAttackPool(mob: RuntimeMob): ImpalerAttackKey[] {
  if (mob.maxHp > 0 && mob.hp / mob.maxHp > 0.5) {
    return ["attack1", "attack2"];
  }

  return [...IMPALER_ATTACK_KEYS];
}

export function createImpalerBossState(): ImpalerBossState {
  const now = performance.now();

  return {
    phase: "idle",
    animFrame: 0,
    animStartedAt: now,
    facingRight: true,
    nextAttackAt: now + 1400,
    phaseStartedAt: now,
    attackIndex: 0,
    attackHit: false,
    deathHandled: false,
    hurtUntil: 0,
    currentAttack: "attack1",
  };
}

export function clearImpalerEffects() {}

export function triggerImpalerHurt(state: ImpalerBossState) {
  if (state.phase === "dying" || state.phase === "hurt" || state.phase === "attack") {
    return;
  }

  state.phase = "hurt";
  state.phaseStartedAt = performance.now();
  state.animStartedAt = performance.now();
  state.hurtUntil = performance.now() + HURT_MS;
  state.animFrame = 0;
}

export function startImpalerDeath(state: ImpalerBossState) {
  state.phase = "dying";
  state.phaseStartedAt = performance.now();
  state.animStartedAt = performance.now();
  state.animFrame = 0;
}

export function isImpalerDeathComplete(state: ImpalerBossState) {
  if (state.phase !== "dying") {
    return false;
  }

  return performance.now() - state.phaseStartedAt > IMPALER_DEATH_FRAME_COUNT * IMPALER_FRAME_MS + 200;
}

export function isImpalerBossContactActive(state: ImpalerBossState) {
  return state.phase === "idle" || state.phase === "walk";
}

export function updateImpalerBoss(
  mob: RuntimeMob,
  state: ImpalerBossState,
  playerX: number,
  playerY: number,
  playerW: number,
  playerH: number,
  dt: number,
  clamp: (mob: RuntimeMob) => void,
  onPlayerHit: (damage: number, sourceX: number, sourceY: number) => void,
) {
  if (!mob.segments.length) {
    return;
  }

  const head = mob.segments[0];
  const center = bossCenter(mob);
  const pcx = playerX + playerW / 2;
  const pcy = playerY + playerH / 2;
  const now = performance.now();

  updateFacing(state, center.x, playerX, playerW);

  if (state.phase === "dying") {
    state.animFrame = Math.min(
      IMPALER_DEATH_FRAME_COUNT - 1,
      Math.floor((now - state.phaseStartedAt) / IMPALER_FRAME_MS),
    );
    return;
  }

  if (state.phase === "hurt") {
    state.animFrame = Math.min(
      COUNTER_FRAME_COUNT - 1,
      Math.floor((now - state.phaseStartedAt) / IMPALER_FRAME_MS),
    );

    lungeTowardPlayer(mob, state, playerX, playerY, playerW, playerH, dt, 2.8, clamp);

    if (now >= state.hurtUntil) {
      state.phase = "idle";
      state.animStartedAt = now;
      state.nextAttackAt = now + 700;
    }

    return;
  }

  if (state.phase === "attack") {
    const attack = state.currentAttack;
    const duration = getAttackDurationMs(attack);
    const elapsed = now - state.phaseStartedAt;
    const frames = IMPALER_ATTACK_FRAME_COUNTS[attack];
    state.animFrame = Math.min(frames - 1, Math.floor(elapsed / IMPALER_FRAME_MS));

    const { start, end } = getAttackHitWindow(attack);
    const inHitWindow = state.animFrame >= start && state.animFrame <= end;
    const lungeMult = inHitWindow ? 1.5 : 0.7;

    if (attack !== "attack5") {
      lungeTowardPlayer(mob, state, playerX, playerY, playerW, playerH, dt, lungeMult, clamp);
    }

    if (
      inHitWindow &&
      !state.attackHit &&
      playerBoxOverlaps(playerX, playerY, playerW, playerH, head.x, head.y, mob.size)
    ) {
      onPlayerHit(Math.floor(mob.contactDamage * 2.65), center.x, center.y);
      state.attackHit = true;
    }

    if (elapsed >= duration) {
      state.phase = "idle";
      state.animStartedAt = now;
      state.nextAttackAt = now + 900 + Math.random() * 600;
      const pool = getImpalerAttackPool(mob);
      state.attackIndex = (state.attackIndex + 1) % pool.length;
    }

    return;
  }

  const dx = pcx - center.x;
  const dy = pcy - center.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const chase = dist > IMPALER_DRAW_H * 0.55;

  if (chase) {
    state.phase = "walk";
    state.animFrame = Math.floor((now / IMPALER_FRAME_MS) % 6);
    head.x += (dx / dist) * mob.speed * 1.3 * dt;
    head.y += (dy / dist) * mob.speed * 1.3 * dt;
    clamp(mob);
    updateFacing(state, bossCenter(mob).x, playerX, playerW);
  } else {
    state.phase = "idle";
    state.animFrame = Math.floor((now / (IMPALER_FRAME_MS * 1.6)) % 4);
    updateFacing(state, center.x, playerX, playerW);
  }

  if (now >= state.nextAttackAt && dist < IMPALER_DRAW_H * 2.4) {
    const pool = getImpalerAttackPool(mob);
    state.currentAttack = pool[state.attackIndex % pool.length]!;
    state.phase = "attack";
    state.phaseStartedAt = now;
    state.animStartedAt = now;
    state.animFrame = 0;
    state.attackHit = false;
    updateFacing(state, center.x, playerX, playerW);
  }
}

function drawAnchoredFrame(
  ctx: CanvasRenderingContext2D,
  frame: ImpalerFrame,
  feetX: number,
  feetY: number,
  facingRight: boolean,
  hitFlash: boolean,
) {
  const { drawW, drawH, scale } = getImpalerDrawSize(frame);
  const drawX = feetX - frame.feetX * scale;
  const drawY = feetY - drawH;

  ctx.save();

  if (!facingRight) {
    ctx.translate(feetX, drawY);
    ctx.scale(-1, 1);
    drawSprite(ctx, frame.canvas, -frame.feetX * scale, 0, drawW, drawH);

    if (hitFlash) {
      ctx.fillStyle = "#ff4466";
      ctx.globalAlpha = 0.45;
      ctx.fillRect(-frame.feetX * scale, 0, drawW, drawH);
      ctx.globalAlpha = 1;
    }
  } else {
    drawSprite(ctx, frame.canvas, drawX, drawY, drawW, drawH);

    if (hitFlash) {
      ctx.fillStyle = "#ff4466";
      ctx.globalAlpha = 0.45;
      ctx.fillRect(drawX, drawY, drawW, drawH);
      ctx.globalAlpha = 1;
    }
  }

  ctx.restore();
}

export function drawImpalerBoss(
  ctx: CanvasRenderingContext2D,
  mob: RuntimeMob,
  state: ImpalerBossState,
  hitFlash: boolean,
) {
  if (!mob.segments.length) {
    return;
  }

  const head = mob.segments[0];
  const feetX = head.x + mob.size / 2;
  const feetY = head.y + mob.size;
  let frame: ImpalerFrame;

  if (state.phase === "dying") {
    frame = getImpalerDeathFrame(state.animFrame);
  } else if (state.phase === "hurt") {
    frame = getImpalerCounterFrame(state.animFrame);
  } else if (state.phase === "attack") {
    frame = getImpalerAttackFrame(state.currentAttack, state.animFrame);
  } else if (state.phase === "walk") {
    frame = getImpalerWalkFrame(state.animFrame);
  } else {
    frame = getImpalerIdleFrame(state.animFrame);
  }

  drawAnchoredFrame(ctx, frame, feetX, feetY, state.facingRight, hitFlash);
}
