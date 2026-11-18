import { describe, expect, it } from "vitest";
import { initialRain, loadRain, rainLevel, saveRain, toggleRain } from "./rain";
import { safeStore } from "./storage";

describe("rain", () => {
  it("opens at full rain when already enabled", () => {
    expect(rainLevel(initialRain(true), 0)).toBe(1);
  });

  it("turns on over three seconds", () => {
    const rain = toggleRain(initialRain(false), 0);
    expect([0, 1500, 3000].map((now) => rainLevel(rain, now))).toEqual([
      0, 0.5, 1,
    ]);
  });

  it("eases into the transition", () => {
    expect(rainLevel(toggleRain(initialRain(false), 0), 750)).toBeLessThan(
      0.25,
    );
  });

  it("turns off over three seconds", () => {
    const rain = toggleRain(initialRain(true), 0);
    expect([0, 1500, 3000].map((now) => rainLevel(rain, now))).toEqual([
      1, 0.5, 0,
    ]);
  });

  it("reverses from the current level", () => {
    const on = toggleRain(initialRain(false), 0);
    const off = toggleRain(on, 1500);
    expect([1500, 3000, 4500].map((now) => rainLevel(off, now))).toEqual([
      0.5, 0.25, 0,
    ]);
  });

  it("clamps elapsed time when the clock moves backwards", () => {
    expect(rainLevel(toggleRain(initialRain(false), 1000), 0)).toBe(0);
  });

  it("stores and restores the preference", () => {
    const store = safeStore();
    saveRain(store, true);
    expect(store.get("fire-mung:rain")).toBe("1");
    expect(loadRain(store)).toBe(true);
    saveRain(store, false);
    expect(store.get("fire-mung:rain")).toBe("0");
    expect(loadRain(store)).toBe(false);
  });

  it("defaults to clear for missing and invalid values", () => {
    const store = safeStore();
    expect(loadRain(store)).toBe(false);
    store.set("fire-mung:rain", "true");
    expect(loadRain(store)).toBe(false);
  });
});
