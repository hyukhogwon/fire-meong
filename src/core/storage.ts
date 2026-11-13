export interface Store {
  get(key: string): string | null;
  set(key: string, value: string): void;
}
export function safeStore(backing?: Storage): Store {
  const memory = new Map<string, string>();
  if (!backing)
    try {
      backing = globalThis.localStorage;
    } catch {}
  return {
    get(key) {
      if (memory.has(key)) return memory.get(key)!;
      try {
        return backing?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    set(key, value) {
      memory.set(key, value);
      try {
        backing?.setItem(key, value);
      } catch {}
    },
  };
}
