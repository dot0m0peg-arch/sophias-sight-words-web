export function createTrainArrivalClock(now) {
  let active = null;
  let nextId = 0;

  return {
    start(word, carCount, source) {
      const startMs = now();
      const id = ++nextId;
      active = {
        id, word, carCount,
        source: source === null ? null : { ...source },
        startMs,
        elapsedMs: 0
      };
      return id;
    },

    snapshot() {
      if (active === null) return null;
      const currentMs = now();
      if (Number.isFinite(currentMs)) {
        active.elapsedMs = Math.max(
          0, currentMs - active.startMs, active.elapsedMs
        );
      }
      return {
        id: active.id,
        word: active.word,
        carCount: active.carCount,
        source: active.source === null ? null : { ...active.source },
        elapsedMs: active.elapsedMs
      };
    },

    finish(id) {
      if (active === null || active.id !== id) return false;
      active = null;
      return true;
    },

    cancel() {
      active = null;
    }
  };
}
