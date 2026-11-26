import { describe, expect, it } from "vitest";
import {
  FIRST_GUST_S,
  GUST_GAP_S,
  LATE_LEAD_S,
  firstGust,
  nextGust,
} from "./schedule";

describe("nextGust", () => {
  const always = (v: number) => () => v;

  it("45~100초 뒤에 다음 돌풍을 예약한다", () => {
    expect(nextGust(always(0), 100, 6, -1).at).toBe(100 + GUST_GAP_S.min);
    expect(nextGust(always(0.999999), 100, 6, -1).at).toBeCloseTo(
      100 + GUST_GAP_S.max,
      3,
    );
  });

  it("직전에 재생한 돌풍을 건너뛴다", () => {
    for (let last = 0; last < 6; last++) {
      for (let k = 0; k < 6; k++) {
        const gust = nextGust(always((k + 0.5) / 6), 0, 6, last);
        expect(gust.index).not.toBe(last);
        expect(gust.index).toBeGreaterThanOrEqual(0);
        expect(gust.index).toBeLessThan(6);
      }
    }
  });

  it("돌풍이 하나뿐이어도 선택한다", () => {
    expect(nextGust(always(0.5), 0, 1, 0).index).toBe(0);
  });
});

describe("firstGust", () => {
  it("불 시작 5초 뒤에 첫 돌풍이 분다", () => {
    expect(FIRST_GUST_S).toBe(5);
    expect(firstGust(() => 0, 10, 10.5, 6).at).toBe(15);
  });

  it("늦게 로드되면 오디오 시계의 바로 다음에 재생한다", () => {
    expect(firstGust(() => 0, 10, 20, 6).at).toBeCloseTo(20 + LATE_LEAD_S, 9);
  });
});
