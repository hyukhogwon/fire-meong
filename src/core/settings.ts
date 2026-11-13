import type { Store } from "./storage";
export const DEFAULT_VOLUME = 0.95;
export const volumeToGain = (v: number) => v * v;
export function loadVolume(store: Store) {
  const raw = store.get("fire-mung:volume"),
    n = Number(raw);
  return raw === null || raw.trim() === "" || !Number.isFinite(n)
    ? DEFAULT_VOLUME
    : Math.min(1, Math.max(0, n));
}
export function saveVolume(store: Store, v: number) {
  store.set("fire-mung:volume", String(Math.min(1, Math.max(0, v))));
}
