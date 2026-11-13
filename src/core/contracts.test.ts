import { describe, it, expect } from "vitest";
import { remainingMs, formatRemaining } from "./cooldown";
import { safeStore } from "./storage";
import { WishBook } from "./wish-book";
import { toastProgress } from "./marshmallow";
import { auroraLevel, togglePick } from "./aurora";
import { loopPlay, reanchorIfLate } from "../audio/schedule";
describe("시간과 저장 계약", () => {
  it("장작 쿨타임을 실제 시간으로 계산하고 시계 역행을 제한한다", () => {
    expect(remainingMs(1000, 301000)).toBe(300000);
    expect(remainingMs(1000, 0)).toBe(600000);
    expect(remainingMs(null, 0)).toBe(0);
    expect(formatRemaining(1)).toBe("00:01");
    expect(formatRemaining(10800000)).toBe("3:00:00");
  });
  it("저장소 접근이 거부돼도 세션 중 쓴 값을 읽는다", () => {
    const s = safeStore({
      getItem() {
        throw Error();
      },
      setItem() {
        throw Error();
      },
    } as unknown as Storage);
    s.set("a", "b");
    expect(s.get("a")).toBe("b");
  });
  it("빈 소원은 거절하고 길이 제한 및 3시간 쿨타임을 저장한다", () => {
    const s = safeStore();
    const b = new WishBook(s);
    expect(b.wish(" ", 1000).ok).toBe(false);
    expect(b.wish("별".repeat(120), 1000).ok).toBe(true);
    expect(b.list()[0].text).toHaveLength(100);
    expect(new WishBook(s).remainingMs(1001)).toBe(10799999);
    expect(b.wish("또", 1002).ok).toBe(false);
    expect(b.wish("다음", 10801000).ok).toBe(true);
  });
  it("숨긴 탭에서 돌아오면 효과가 종료된다", () => {
    expect(toastProgress(0, 60000)).toBeNull();
    expect(auroraLevel(0, 30000)).toBe(0);
    expect(auroraLevel(0, 1000)).toBe(0.5);
    expect(togglePick(["green", "blue"], "pink")).toEqual(["green", "blue"]);
  });
  it("루프는 3초 겹치고 늦은 예약은 미래로 재기준한다", () => {
    const a = loopPlay(30, 1, 0),
      b = loopPlay(30, 1, 1);
    expect(a.stop - b.start).toBe(3);
    const anchor = reanchorIfLate(1, 30, 2, 100);
    expect(loopPlay(30, anchor, 2).start).toBeCloseTo(100.1);
  });
});
