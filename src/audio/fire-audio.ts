import { RAIN_CRICKET_SCALE, RAIN_FADE_MS } from "../core/rain";
import { acquirePlaybackSession } from "./playback-session";
import { LoopLayer, CRICKET_MIX } from "./loop-layer";
import { boostRamps, firstGust, nextGust } from "./schedule";
import { volumeToGain } from "../core/settings";
const RAIN_MIX = 0.9;
/** Wind gust level in the mix. */
export const WIND_MIX = 0;
/** Layout of wind-gusts.m4a: six seven-second gusts in 7.5-second slots. */
export const WIND_GUSTS = { count: 6, slot: 7.5, length: 7 } as const;

export class FireAudio {
  private ctx: AudioContext | null = null;
  private releaseSession: (() => void) | null = null;
  private master: GainNode | null = null;
  private boostGain: GainNode | null = null;
  private rainOn = false;
  private rainUnavailable = false;
  private rainGain: GainNode | null = null;
  private cricketGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private windBuffer: AudioBuffer | null = null;
  private windStarted = false;
  private readonly windPlays: number[] = [];
  private readonly windSources = new Set<AudioBufferSourceNode>();
  private fireStartedAt: number | null = null;
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
        rain = ctx.createGain(),
        wind = ctx.createGain(),
        limiter = ctx.createDynamicsCompressor();
      this.master = master;
      this.boostGain = boost;
      master.gain.value = volumeToGain(volume);
      this.cricketGain = cricket;
      this.rainGain = rain;
      this.windGain = wind;
      wind.gain.value = WIND_MIX;
      limiter.threshold.value = -3;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.25;
      boost.connect(master);
      cricket.connect(master);
      rain.connect(master);
      wind.connect(master);
      master.connect(limiter).connect(ctx.destination);
      const load = async (name: string, mp3Only = false) => {
        const format =
          !mp3Only && import.meta.env.VITE_AUDIO_FORMAT === "m4a"
            ? "m4a"
            : "mp3";
        const r = await fetch(
          `${import.meta.env.BASE_URL}audio/${name}.${format}`,
        );
        if (!r.ok) throw Error("음원을 불러오지 못했어요.");
        const b = await ctx.decodeAudioData(await r.arrayBuffer());
        if (b.duration <= 6) throw Error("음원이 너무 짧아요.");
        return b;
      };
      const loadRain = () =>
        load("rain", true).catch((error: unknown) => {
          if (this.ctx === ctx) {
            this.rainUnavailable = true;
            if (this.rainOn) this.setRain(true);
            console.warn("rain unavailable", error);
          }
          return null;
        });
      const waitForRain = this.rainOn;
      const [fire, insects, rainfall] = await Promise.all([
        load("campfire"),
        load("crickets").catch(() => {
          this.onNotice("풀벌레 소리를 불러오지 못해 장작 소리만 재생합니다.");
          return null;
        }),
        waitForRain ? loadRain() : null,
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
      if (rainfall) this.layers.push(new LoopLayer(ctx, rainfall, rain));
      const at = ctx.currentTime + 0.15;
      const raining = this.rainOn && !this.rainUnavailable;
      rain.gain.value = raining ? RAIN_MIX : 0;
      cricket.gain.value = CRICKET_MIX * (raining ? RAIN_CRICKET_SCALE : 1);
      this.layers.forEach((l) => l.start(at));
      this.started = true;
      this.fireStartedAt = at;
      void this.loadWind(ctx);
      if (!waitForRain) {
        void loadRain().then((buffer) => {
          if (!buffer || this.ctx !== ctx || !this.started) return;
          const layer = new LoopLayer(ctx, buffer, rain);
          this.layers.push(layer);
          layer.start(ctx.currentTime + 0.15);
        });
      }
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
  /** Wind gust start times, exposed for verification. */
  get windStarts(): readonly number[] {
    return this.windPlays;
  }
  private async loadWind(ctx: AudioContext): Promise<void> {
    try {
      const response = await fetch(
        `${import.meta.env.BASE_URL}audio/wind-gusts.m4a`,
      );
      if (!response.ok) throw Error("바람 음원을 불러오지 못했어요.");
      const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
      if (this.ctx !== ctx || !this.started) return;
      this.windBuffer = buffer;
      this.startWind();
    } catch (error) {
      if (this.ctx === ctx) console.warn("wind unavailable", error);
    }
  }
  private startWind(): void {
    if (
      !this.ctx ||
      !this.windBuffer ||
      !this.windGain ||
      this.fireStartedAt === null ||
      this.windStarted
    )
      return;
    this.windStarted = true;
    this.playGust(
      firstGust(
        Math.random,
        this.fireStartedAt,
        this.ctx.currentTime,
        WIND_GUSTS.count,
      ),
    );
  }
  private playGust(gust: { at: number; index: number }): void {
    if (!this.ctx || !this.windBuffer || !this.windGain || !this.started)
      return;
    const ctx = this.ctx;
    const source = ctx.createBufferSource();
    source.buffer = this.windBuffer;
    source.connect(this.windGain);
    this.windSources.add(source);
    source.onended = () => {
      this.windSources.delete(source);
      source.disconnect();
      if (this.ctx !== ctx || !this.started) return;
      this.playGust(
        nextGust(Math.random, ctx.currentTime, WIND_GUSTS.count, gust.index),
      );
    };
    source.start(gust.at, gust.index * WIND_GUSTS.slot, WIND_GUSTS.length);
    this.windPlays.push(gust.at);
  }
  setRain(on: boolean) {
    this.rainOn = on;
    if (!this.started || !this.ctx || !this.rainGain || !this.cricketGain)
      return;
    const now = this.ctx.currentTime;
    const end = now + RAIN_FADE_MS / 1000;
    const raining = on && !this.rainUnavailable;
    const targets: Array<[AudioParam, number]> = [
      [this.rainGain.gain, raining ? RAIN_MIX : 0],
      [this.cricketGain.gain, CRICKET_MIX * (raining ? RAIN_CRICKET_SCALE : 1)],
    ];
    for (const [gain, target] of targets) {
      const current = gain.value;
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(current, now);
      gain.linearRampToValueAtTime(target, end);
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
    this.windSources.forEach((source) => {
      source.onended = null;
      source.stop();
      source.disconnect();
    });
    this.windSources.clear();
    this.windStarted = false;
    this.windBuffer = null;
    this.fireStartedAt = null;
    this.layers.forEach((l) => l.stop());
    this.layers = [];
    if (this.ctx) {
      this.ctx.onstatechange = null;
      void this.ctx.close();
    }
    this.ctx = null;
    this.rainUnavailable = false;
    this.rainGain = null;
    this.cricketGain = null;
    this.windGain = null;
    this.releaseSession?.();
    this.releaseSession = null;
  }
  dispose() {
    this.disposed = true;
    this.closeContext();
  }
}
