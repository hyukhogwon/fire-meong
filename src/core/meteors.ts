import type { Rng } from "./rng";

/** How long the meteor shower after a wish lasts. */
export const SHOWER_MS = 12_000;
const COUNT = 40;

/**
 * One meteor in view coordinates (x, y in -1..1, like NDC): it streaks from
 * `from` to `to` starting `delay` seconds into the shower and lasting `life`.
 */
export interface Meteor {
  delay: number;
  life: number;
  from: [number, number];
  to: [number, number];
}

/** Seconds since the shower started, or null when none is running. */
export function showerElapsed(
  startedAt: number | null,
  now: number,
): number | null {
  if (startedAt === null) return null;
  const ms = now - startedAt;
  if (ms < 0 || ms >= SHOWER_MS) return null;
  return ms / 1000;
}

/** Meteors fanning out from a radiant above the top-right of the view. */
export function planShower(rand: Rng): Meteor[] {
  const total = SHOWER_MS / 1000;
  const meteors: Meteor[] = [];
  for (let i = 0; i < COUNT; i++) {
    const life = 0.6 + rand() * 0.7;
    // Denser in the middle of the shower, sparse at the edges.
    const u = (i + rand()) / COUNT;
    const delay = Math.min(
      total - life,
      (0.5 - Math.cos(Math.PI * u) / 2) * (total - 1.4) + 0.2,
    );
    // Only the top third of the view is open sky (lower rays hit ground or trees).
    const from: [number, number] = [-0.95 + rand() * 1.9, 0.55 + rand() * 0.43];
    // Direction away from the radiant (1.3, 1.6), with a little scatter.
    const dx = from[0] - 1.3;
    const dy = from[1] - 1.6;
    const len = Math.hypot(dx, dy);
    const travel = 0.25 + rand() * 0.3;
    const to: [number, number] = [
      from[0] + (dx / len) * travel,
      from[1] + (dy / len) * travel,
    ];
    meteors.push({ delay, life, from, to });
  }
  return meteors;
}

/** Where the head and tail are along the path (0..1) and how bright, or null if not visible. */
export function meteorFrame(
  m: Meteor,
  elapsed: number,
): { head: number; tail: number; alpha: number } | null {
  const t = (elapsed - m.delay) / m.life;
  if (t < 0 || t > 1) return null;
  const head = t;
  const tail = Math.max(0, t - 0.35);
  return { head, tail, alpha: Math.sin(Math.PI * t) };
}
