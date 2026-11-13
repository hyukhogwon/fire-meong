export const COOLDOWN_MS = 600_000;
export function remainingMs(
  lastAt: number | null,
  now: number,
  cooldownMs = COOLDOWN_MS,
) {
  return lastAt === null
    ? 0
    : Math.min(cooldownMs, Math.max(0, lastAt + cooldownMs - now));
}
export function formatRemaining(ms: number) {
  const s = Math.ceil(ms / 1000),
    m = Math.floor(s / 60),
    h = Math.floor(m / 60);
  return h
    ? `${h}:${String(m % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
