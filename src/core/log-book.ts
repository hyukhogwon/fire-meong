import type { Store } from "./storage";
import { remainingMs } from "./cooldown";
export class LogBook {
  constructor(private store: Store) {}
  lastLogAt() {
    const raw = this.store.get("fire-mung:lastLogAt");
    const n = Number(raw);
    return raw !== null && Number.isFinite(n) && n >= 0 ? n : null;
  }
  addLog(now: number) {
    const left = remainingMs(this.lastLogAt(), now);
    if (left) return { ok: false, remainingMs: left } as const;
    this.store.set("fire-mung:lastLogAt", String(now));
    return { ok: true } as const;
  }
}
