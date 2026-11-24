import { afterEach, describe, it, expect, vi } from "vitest";
import { FireAudio, WIND_GUSTS } from "./fire-audio";
import { FIRST_GUST_S, GUST_GAP_S } from "./schedule";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe("FireAudio의 모바일 세션 수명", () => {
  it("AudioContext 생성 전에 playback을 지정하고 생성 실패 시 되돌린다", async () => {
    const session = { type: "ambient" };
    let typeAtCreation = "";
    vi.stubGlobal("navigator", { audioSession: session });
    vi.stubGlobal(
      "AudioContext",
      class {
        constructor() {
          typeAtCreation = session.type;
          throw Error("device unavailable");
        }
      },
    );
    const audio = new FireAudio(
      () => {},
      () => {},
    );
    await expect(audio.start(0.5)).rejects.toThrow("device unavailable");
    expect(typeAtCreation).toBe("playback");
    expect(session.type).toBe("ambient");
    audio.dispose();
    expect(session.type).toBe("ambient");
  });
});

describe("간헐적인 바람 돌풍", () => {
  it("불 시작 5초 뒤 한 구간을 재생하고 끝나면 다른 구간을 예약한다", () => {
    const sources: Array<{
      onended: (() => void) | null;
      startArgs?: number[];
    }> = [];
    const ctx = {
      currentTime: 2,
      createBufferSource() {
        const source = {
          buffer: null,
          onended: null as (() => void) | null,
          connect() {},
          disconnect() {},
          stop() {},
          start(...args: number[]) {
            source.startArgs = args;
          },
          startArgs: undefined as number[] | undefined,
        };
        sources.push(source);
        return source;
      },
    };
    vi.spyOn(Math, "random").mockReturnValue(0);
    const audio = new FireAudio(
      () => {},
      () => {},
    );
    Object.assign(audio, {
      ctx,
      started: true,
      windBuffer: {},
      windGain: {},
      fireStartedAt: 2,
    });

    Reflect.get(audio, "startWind").call(audio);
    expect(sources[0].startArgs).toEqual([
      2 + FIRST_GUST_S,
      0,
      WIND_GUSTS.length,
    ]);

    ctx.currentTime = 100;
    sources[0].onended?.();
    expect(sources[1].startArgs).toEqual([
      100 + GUST_GAP_S.min,
      WIND_GUSTS.slot,
      WIND_GUSTS.length,
    ]);
  });
});
