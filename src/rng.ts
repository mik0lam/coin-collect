export function createRng(seed: number) {
  let rngState = seed >>> 0;

  return () => {
    rngState = (rngState * 1664525 + 1013904223) >>> 0;
    return rngState / 4294967296;
  };
}

export function hashRoomSeed(value: string) {
  let seed = 0;

  for (let i = 0; i < value.length; i++) {
    seed = (seed * 31 + value.charCodeAt(i)) >>> 0;
  }

  return seed;
}

export function randomPosition(
  rng: () => number,
  playWidth: number,
  playHeight: number,
  margin = 60,
) {
  const maxX = playWidth - margin - 40;
  const maxY = playHeight - margin - 40;

  return {
    x: margin + rng() * Math.max(1, maxX - margin),
    y: margin + rng() * Math.max(1, maxY - margin),
  };
}
