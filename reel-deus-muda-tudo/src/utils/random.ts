// Gerador pseudo-aleatório determinístico (mulberry32).
// Necessário porque Remotion pode renderizar cada frame de forma independente:
// Math.random() daria posições diferentes a cada render. Uma seed fixa por
// partícula garante o mesmo resultado sempre.
export const seededRandom = (seed: number) => {
  let t = seed + 0x6d2b79f5;
  return () => {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const randomInRange = (
  seed: number,
  min: number,
  max: number,
): number => {
  const rand = seededRandom(seed)();
  return min + rand * (max - min);
};

export const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
