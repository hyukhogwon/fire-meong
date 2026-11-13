import type { Store } from "./storage";
import { remainingMs } from "./cooldown";
export const WISH_COOLDOWN_MS = 10_800_000;
export const WISH_MAX_LENGTH = 100;
export interface Wish {
  text: string;
  at: number;
}
export class WishBook {
  constructor(private store: Store) {}
  list(): Wish[] {
    try {
      const data: unknown = JSON.parse(
        this.store.get("fire-mung:wishes") ?? "[]",
      );
      return Array.isArray(data)
        ? data
            .filter(
              (w): w is Wish =>
                !!w &&
                typeof w.text === "string" &&
                !!w.text.trim() &&
                Number.isFinite(w.at) &&
                w.at >= 0 &&
                Number.isFinite(new Date(w.at).getTime()),
            )
            .sort((a, b) => b.at - a.at)
        : [];
    } catch {
      return [];
    }
  }
  remainingMs(now: number) {
    return remainingMs(this.list()[0]?.at ?? null, now, WISH_COOLDOWN_MS);
  }
  wish(text: string, now: number) {
    text = text.trim().slice(0, WISH_MAX_LENGTH);
    if (!text) return { ok: false, reason: "empty" } as const;
    const remaining = this.remainingMs(now);
    if (remaining)
      return { ok: false, reason: "cooldown", remainingMs: remaining } as const;
    this.store.set(
      "fire-mung:wishes",
      JSON.stringify([{ text, at: now }, ...this.list()]),
    );
    return { ok: true } as const;
  }
}
