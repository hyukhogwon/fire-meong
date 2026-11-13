/** How long a marshmallow takes from white to toasted before it is eaten. */
export const TOAST_MS = 60_000;

/** 0..1 while toasting; null when nothing is on the stick (never started or eaten). */
export function toastProgress(
  startedAt: number | null,
  now: number,
): number | null {
  if (startedAt === null) return null;
  const p = (now - startedAt) / TOAST_MS;
  if (p >= 1) return null;
  return Math.max(0, p);
}

const STOPS: Array<[number, [number, number, number]]> = [
  [0, [0xfb, 0xf6, 0xec]], // raw white
  [0.6, [0xd9, 0x96, 0x3e]], // golden (darker so it reads under the orange firelight)
  [1, [0xa8, 0x65, 0x2a]], // toasted brown
];

const hex = (n: number) => Math.round(n).toString(16).padStart(2, "0");

export function marshmallowColor(progress: number): string {
  const p = Math.min(1, Math.max(0, progress));
  for (let i = 1; i < STOPS.length; i++) {
    const [p1, c1] = STOPS[i];
    if (p <= p1) {
      const [p0, c0] = STOPS[i - 1];
      const k = (p - p0) / (p1 - p0);
      return `#${c0.map((v, j) => hex(v + (c1[j] - v) * k)).join("")}`;
    }
  }
  return "#a8652a";
}
