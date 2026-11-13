import { describe, it, expect } from "vitest";
import { acquirePlaybackSession } from "./playback-session";

describe("사용자가 시작한 모바일 오디오 세션", () => {
  it("미디어 playback으로 요청하고 종료 시 이전 타입을 복원한다", () => {
    const session = { type: "ambient" };
    const release = acquirePlaybackSession({ audioSession: session });
    expect(session.type).toBe("playback");
    release();
    expect(session.type).toBe("ambient");
  });
  it("API가 없는 브라우저에서도 시작과 종료가 가능하다", () => {
    expect(() => acquirePlaybackSession({})()).not.toThrow();
  });
  it("세션 설정이 거부되더라도 오디오 시작을 막지 않는다", () => {
    const session = {
      get type() {
        return "auto";
      },
      set type(_value: string) {
        throw Error("unsupported");
      },
    };
    expect(() =>
      acquirePlaybackSession({ audioSession: session })(),
    ).not.toThrow();
  });
  it("종료 처리가 중복 호출되거나 다른 세션이 활성화돼도 덮어쓰지 않는다", () => {
    const session = { type: "auto" };
    const release = acquirePlaybackSession({ audioSession: session });
    session.type = "play-and-record";
    release();
    expect(session.type).toBe("play-and-record");
    session.type = "playback";
    release();
    expect(session.type).toBe("playback");
  });
});
