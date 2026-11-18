import type { Store } from './storage';

/** How long the scene and sound take to turn from clear to rain, or back. */
export const RAIN_FADE_MS = 3_000;
/** Flame size and firelight while it rains, as a share of a clear night. */
export const RAIN_FIRE_SCALE = 0.6;
/** Crickets mostly fall silent in the rain. */
export const RAIN_CRICKET_SCALE = 0.1;
/** How much of the stars and Milky Way still shows through the clouds. */
export const RAIN_SKY_SCALE = 0.3;

const KEY = 'fire-mung:rain';

export interface RainState {
  on: boolean;
  /** Wall-clock time of the last toggle; null when the page opened in this state. */
  changedAt: number | null;
  /** Level at the moment of the last toggle, so a reversal carries on from there. */
  from: number;
}

export function initialRain(on: boolean): RainState {
  return { on, changedAt: null, from: on ? 1 : 0 };
}

const smoothstep = (p: number) => p * p * (3 - 2 * p);

/** 0 (clear) .. 1 (full rain), easing over `RAIN_FADE_MS` after each toggle. */
export function rainLevel(s: RainState, now: number): number {
  const target = s.on ? 1 : 0;
  if (s.changedAt === null) return target;
  const p = Math.min(1, Math.max(0, (now - s.changedAt) / RAIN_FADE_MS));
  if (p === 1) return target;
  return s.from + (target - s.from) * smoothstep(p);
}

export function toggleRain(s: RainState, now: number): RainState {
  return { on: !s.on, changedAt: now, from: rainLevel(s, now) };
}

export function loadRain(store: Store): boolean {
  return store.get(KEY) === '1';
}

export function saveRain(store: Store, on: boolean): void {
  store.set(KEY, on ? '1' : '0');
}
