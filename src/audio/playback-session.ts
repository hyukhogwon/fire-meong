interface AudioSessionHost {
  readonly audioSession?: { type: string };
}

/** Request media playback during the user's play gesture, without requiring this API. */
export function acquirePlaybackSession(
  host: AudioSessionHost = globalThis.navigator as unknown as AudioSessionHost,
): () => void {
  try {
    const session = host?.audioSession;
    if (!session) return () => {};
    const previous = session.type;
    session.type = "playback";
    let released = false;
    return () => {
      if (released) return;
      released = true;
      try {
        // Do not overwrite a different session selected later (e.g. a phone call).
        if (session.type === "playback") session.type = previous;
      } catch {
        // A browser may reject session changes during shutdown.
      }
    };
  } catch {
    // Unsupported or restricted Audio Session implementations keep the existing path.
    return () => {};
  }
}
