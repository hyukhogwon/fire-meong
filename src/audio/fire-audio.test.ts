import { afterEach, describe, it, expect, vi } from "vitest";
import { FireAudio } from "./fire-audio";
afterEach(() => vi.unstubAllGlobals());
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
