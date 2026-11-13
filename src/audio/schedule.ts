/** Seconds two consecutive plays of the loop overlap. */
export const CROSSFADE_S = 3;

export interface LoopPlay {
  start: number;
  fadeInEnd: number;
  fadeOutStart: number;
  stop: number;
}

/** The i-th play of a crossfaded loop, in AudioContext time. */
export function loopPlay(
  bufferDuration: number,
  startAt: number,
  i: number,
): LoopPlay {
  const step = bufferDuration - CROSSFADE_S;
  const start = startAt + i * step;
  return {
    start,
    fadeInEnd: start + CROSSFADE_S,
    fadeOutStart: start + step,
    stop: start + bufferDuration,
  };
}

export function loopSchedule(
  bufferDuration: number,
  startAt: number,
  count: number,
): LoopPlay[] {
  return Array.from({ length: count }, (_, i) =>
    loopPlay(bufferDuration, startAt, i),
  );
}

export const BOOST = { gain: 1.8, riseS: 3, holdS: 12, decayS: 15 } as const;

export function boostRamps(now: number): Array<{ value: number; at: number }> {
  const { gain, riseS, holdS, decayS } = BOOST;
  return [
    { value: 1, at: now },
    { value: gain, at: now + riseS },
    { value: gain, at: now + riseS + holdS },
    { value: 1, at: now + riseS + holdS + decayS },
  ];
}

/** Seconds of lead time given to a play that had to be re-anchored. */
export const LATE_LEAD_S = 0.1;

/**
 * If the i-th play would start in the past (e.g. the main thread was frozen
 * and `onended` arrived late), returns a new anchor so it starts just after
 * `now`; otherwise returns `startAt` unchanged.
 */
export function reanchorIfLate(
  startAt: number,
  bufferDuration: number,
  i: number,
  now: number,
): number {
  if (loopPlay(bufferDuration, startAt, i).start >= now + LATE_LEAD_S)
    return startAt;
  return now + LATE_LEAD_S - i * (bufferDuration - CROSSFADE_S);
}
