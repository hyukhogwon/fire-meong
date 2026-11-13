import { acquirePlaybackSession } from "./playback-session";
import { LoopLayer, CRICKET_MIX } from "./loop-layer";
import { boostRamps } from "./schedule";
import { volumeToGain } from "../core/settings";
export class FireAudio {
  private ctx: AudioContext | null = null;
  private releaseSession: (() => void) | null = null;
  private master: GainNode | null = null;
  private boostGain: GainNode | null = null;
  private layers: LoopLayer[] = [];
  private started = false;
  private disposed = false;
  constructor(
    private onInterrupted: () => void,
    private onNotice: (message: string) => void,
  ) {}
  async start(volume: number) {
    if (this.disposed) return;
    if (this.started && this.ctx) {
      await this.ctx.resume();
      if (this.ctx.state !== "running")
        throw Error("오디오를 시작할 수 없어요.");
      return;
    }
    this.closeContext();
    this.releaseSession = acquirePlaybackSession();
    try {
      const ctx = new AudioContext({ latencyHint: "playback" });
      this.ctx = ctx;
      // resume during the user gesture, before fetching or decoding assets.
      const resume = ctx.resume();
      const master = ctx.createGain(),
        boost = ctx.createGain(),
        cricket = ctx.createGain(),
        limiter = ctx.createDynamicsCompressor();
      this.master = master;
      this.boostGain = boost;
      master.gain.value = volumeToGain(volume);
      cricket.gain.value = CRICKET_MIX;
      limiter.threshold.value = -3;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.25;
      boost.connect(master);
      cricket.connect(master);
      master.connect(limiter).connect(ctx.destination);
      const load = async (name: string) => {
        const format =
          import.meta.env.VITE_AUDIO_FORMAT === "m4a" ? "m4a" : "mp3";
        const r = await fetch(
          `${import.meta.env.BASE_URL}audio/${name}.${format}`,
        );
        if (!r.ok) throw Error("음원을 불러오지 못했어요.");
        const b = await ctx.decodeAudioData(await r.arrayBuffer());
        if (b.duration <= 6) throw Error("음원이 너무 짧아요.");
        return b;
      };
      const [fire, insects] = await Promise.all([
        load("campfire"),
        load("crickets").catch(() => {
          this.onNotice("풀벌레 소리를 불러오지 못해 장작 소리만 재생합니다.");
          return null;
        }),
      ]);
      await resume;
      if (this.disposed || this.ctx !== ctx) return;
      if (ctx.state !== "running") {
        await ctx.resume();
        if (this.ctx?.state !== "running") throw Error("소리를 다시 켜주세요.");
      }
      this.layers = [
        new LoopLayer(ctx, fire, boost),
        ...(insects ? [new LoopLayer(ctx, insects, cricket)] : []),
      ];
      const at = ctx.currentTime + 0.15;
      this.layers.forEach((l) => l.start(at));
      this.started = true;
      ctx.onstatechange = () => {
        if (
          this.disposed ||
          !this.started ||
          ctx.state === "running" ||
          ctx.state === "closed"
        )
          return;
        this.onInterrupted();
        void ctx.resume().catch(() => {});
      };
    } catch (e) {
      this.closeContext();
      throw e;
    }
  }
  setVolume(v: number) {
    if (this.ctx && this.master)
      this.master.gain.setTargetAtTime(
        volumeToGain(v),
        this.ctx.currentTime,
        0.05,
      );
  }
  boost() {
    if (!this.ctx || !this.boostGain) return;
    const now = this.ctx.currentTime,
      p = this.boostGain.gain;
    if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(now);
    else {
      p.cancelScheduledValues(now);
      p.setValueAtTime(p.value, now);
    }
    for (const r of boostRamps(now)) p.linearRampToValueAtTime(r.value, r.at);
  }
  private closeContext() {
    this.started = false;
    this.layers.forEach((l) => l.stop());
    this.layers = [];
    if (this.ctx) {
      this.ctx.onstatechange = null;
      void this.ctx.close();
    }
    this.ctx = null;
    this.releaseSession?.();
    this.releaseSession = null;
  }
  dispose() {
    this.disposed = true;
    this.closeContext();
  }
}
