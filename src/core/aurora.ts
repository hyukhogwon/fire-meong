/** How long a pinch of aurora powder keeps the fire coloured. */
export const AURORA_MS = 30_000;
export const AURORA_MAX_PICK = 2;
const FADE_IN_MS = 2_000;
const FADE_OUT_MS = 5_000;

export interface AuroraColor {
  id: string;
  label: string;
  /** sRGB `#rrggbb`, shared by the swatch and the flame. */
  hex: string;
}

export const AURORA_COLORS: readonly AuroraColor[] = [
  { id: "green", label: "초록", hex: "#3dff6e" },
  { id: "teal", label: "청록", hex: "#2ee6d6" },
  { id: "blue", label: "파랑", hex: "#3d7bff" },
  { id: "purple", label: "보라", hex: "#a45cff" },
  { id: "pink", label: "분홍", hex: "#ff5fc8" },
  { id: "red", label: "빨강", hex: "#ff3b3b" },
];

/** Picks or unpicks a colour; a pick beyond the limit is ignored. */
export function togglePick(picked: readonly string[], id: string): string[] {
  if (picked.includes(id)) return picked.filter((p) => p !== id);
  if (picked.length >= AURORA_MAX_PICK) return [...picked];
  return [...picked, id];
}

/** Milliseconds of coloured flame left; 0 when nothing is burning. */
export function auroraRemainingMs(
  startedAt: number | null,
  now: number,
): number {
  if (startedAt === null) return 0;
  return Math.min(AURORA_MS, Math.max(0, AURORA_MS - (now - startedAt)));
}

/** 0..1 strength of the coloured flame: fades in, holds, fades out. */
export function auroraLevel(startedAt: number | null, now: number): number {
  if (startedAt === null) return 0;
  const elapsed = now - startedAt;
  if (elapsed <= 0 || elapsed >= AURORA_MS) return 0;
  return Math.min(1, elapsed / FADE_IN_MS, (AURORA_MS - elapsed) / FADE_OUT_MS);
}
