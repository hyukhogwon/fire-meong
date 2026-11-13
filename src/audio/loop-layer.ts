import { reanchorIfLate, loopPlay, CROSSFADE_S } from "./schedule";
const CURVE_POINTS = 64;
const FADE_IN = Float32Array.from({ length: CURVE_POINTS }, (_, i) =>
  Math.sin(((i / (CURVE_POINTS - 1)) * Math.PI) / 2),
);
const FADE_OUT = Float32Array.from({ length: CURVE_POINTS }, (_, i) =>
  Math.cos(((i / (CURVE_POINTS - 1)) * Math.PI) / 2),
);

/** Crickets just under the fire (about 3 dB quieter), set by ear. */
export const CRICKET_MIX = 0.9;

/**
 * One recording looped forever with equal-power crossfades between repeats,
 * so encoder padding at the file edges is never heard. Everything is
 * scheduled on the audio clock — no JS timers — so a hidden, throttled tab
 * keeps looping correctly.
 */
export class LoopLayer {
  private startAt = 0;
  private stopped = false;
  private sources = new Set<AudioBufferSourceNode>();
  stop() {
    this.stopped = true;
    for (const s of this.sources) {
      s.onended = null;
      s.stop();
      s.disconnect();
    }
    this.sources.clear();
  }
  /** Start times of scheduled plays, exposed for verification. */
  readonly playStarts: number[] = [];

  constructor(
    private readonly ctx: AudioContext,
    private readonly buffer: AudioBuffer,
    private readonly output: AudioNode,
  ) {}

  start(at: number): void {
    this.startAt = at;
    this.schedule(0);
    this.schedule(1);
  }

  private schedule(i: number): void {
    if (this.stopped) return;
    const buffer = this.buffer;
    this.startAt = reanchorIfLate(
      this.startAt,
      buffer.duration,
      i,
      this.ctx.currentTime,
    );
    const play = loopPlay(buffer.duration, this.startAt, i);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    this.sources.add(source);
    const fade = this.ctx.createGain();
    try {
      fade.gain.setValueCurveAtTime(FADE_IN, play.start, CROSSFADE_S);
      fade.gain.setValueCurveAtTime(FADE_OUT, play.fadeOutStart, CROSSFADE_S);
    } catch (err) {
      // Never let an automation error break the loop chain; play unfaded.
      console.warn("fade scheduling failed", err);
    }
    source.connect(fade).connect(this.output);
    source.onended = () => {
      if (!this.sources.delete(source)) return;
      source.disconnect();
      fade.disconnect();
      this.schedule(i + 2);
    };
    source.start(play.start);
    source.stop(play.stop);
    this.playStarts.push(play.start);
  }
}
