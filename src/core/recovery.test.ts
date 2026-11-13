import { describe, it, expect } from "vitest";
import { safeStore } from "./storage";
import { WishBook } from "./wish-book";
import { loadOrCreateIdentity, rerollIdentity } from "./identity";
import { loadVolume, saveVolume, volumeToGain } from "./settings";
import { LogBook } from "./log-book";
import { pondDistance, POND } from "./pond";
import { planShower, meteorFrame, showerElapsed } from "./meteors";
import { tonightMidnightKst, horizontalToScene } from "./sky";
import { marshmallowColor } from "./marshmallow";
import { boostRamps } from "../audio/schedule";
describe("저장 데이터 복구와 순수 로직", () => {
  it("표현할 수 없는 날짜와 손상된 소원을 버린다", () => {
    const s = safeStore();
    s.set(
      "fire-mung:wishes",
      JSON.stringify([
        { text: "깨짐", at: 1e20 },
        { text: "정상", at: 1 },
        null,
        { text: "", at: 2 },
      ]),
    );
    expect(new WishBook(s).list()).toEqual([{ text: "정상", at: 1 }]);
  });
  it("깨진 신원을 재생성하고 다시 뽑아도 id를 유지한다", () => {
    const s = safeStore();
    s.set("fire-mung:identity", "{");
    const a = loadOrCreateIdentity(
      s,
      () => 0,
      () => "id",
    );
    expect(a.id).toBe("id");
    expect(
      loadOrCreateIdentity(
        s,
        () => 0.9,
        () => "other",
      ),
    ).toEqual(a);
    const b = rerollIdentity(s, a, () => 0.9);
    expect(b.id).toBe("id");
    expect(b.name).not.toBe(a.name);
  });
  it("잘못된 볼륨을 복구하고 범위를 제한한다", () => {
    const s = safeStore();
    expect(loadVolume(s)).toBe(0.95);
    s.set("fire-mung:volume", "NaN");
    expect(loadVolume(s)).toBe(0.95);
    saveVolume(s, 2);
    expect(loadVolume(s)).toBe(1);
    expect(volumeToGain(0.5)).toBe(0.25);
  });
  it("장작 쿨타임을 저장하고 만료되면 다시 허용한다", () => {
    const s = safeStore(),
      b = new LogBook(s);
    expect(b.addLog(1000).ok).toBe(true);
    expect(new LogBook(s).addLog(1001).ok).toBe(false);
    expect(b.addLog(601000).ok).toBe(true);
  });
  it("연못 경계를 타원으로 계산한다", () => {
    expect(pondDistance(POND.x, POND.z)).toBe(0);
    expect(pondDistance(POND.x + POND.rx, POND.z)).toBe(1);
  });
  it("유성 40개를 12초 안에 종료하고 보이는 구간만 반환한다", () => {
    const ms = planShower(() => 0.5);
    expect(ms).toHaveLength(40);
    for (const m of ms) {
      expect(m.delay + m.life).toBeLessThanOrEqual(12);
      expect(meteorFrame(m, m.delay + m.life / 2)?.alpha).toBeCloseTo(1);
      expect(meteorFrame(m, 0)).toBeNull();
    }
    expect(showerElapsed(0, 12000)).toBeNull();
  });
  it("한국의 해당 밤 자정과 수평 좌표를 계산한다", () => {
    expect(
      tonightMidnightKst(new Date("2026-11-13T03:00:00Z")).toISOString(),
    ).toBe("2026-11-13T15:00:00.000Z");
    expect(horizontalToScene(90, 0)[1]).toBeCloseTo(1);
  });
  it("마시멜로 색과 부스트 타이밍을 보간한다", () => {
    expect(marshmallowColor(0)).toBe("#fbf6ec");
    expect(marshmallowColor(0.6)).toBe("#d9963e");
    expect(marshmallowColor(1)).toBe("#a8652a");
    expect(boostRamps(10)).toEqual([
      { value: 1, at: 10 },
      { value: 1.8, at: 13 },
      { value: 1.8, at: 25 },
      { value: 1, at: 40 },
    ]);
  });
});
