const LEG_MS = 2100;
const CYCLE_MS = 2 * LEG_MS;

// Animate only dedicated visual wrappers. Keep real buttons and burst shells separate.
export function createWordPopFloat(options = {}) {
  const doc = options.document || globalThis.document;
  const view = doc.defaultView;
  const media = view.matchMedia?.('(prefers-reduced-motion: reduce)');
  const reduced = () => typeof options.reducedMotion === 'function'
    ? !!options.reducedMotion() : options.reducedMotion ?? !!media?.matches;
  const now = options.now || (() => view.performance.now());
  const hidden = () => doc.visibilityState === 'hidden';
  let active = null, highestId = 0, disposed = false;
  const elapsed = r => r.elapsed + (r.started === null ? 0 : Math.max(0, now() - r.started));
  function stop(r) {
    r.animations.forEach(a => a.cancel());
    r.animations = [];
    r.elements.forEach(e => { e.style.transform = 'translateY(0px)'; });
  }
  function pause(r) {
    if (r.started !== null) r.elapsed = elapsed(r);
    r.started = null; stop(r);
  }
  function resume(r) {
    if (disposed || active !== r || hidden() || reduced()) return;
    r.started = now();
    r.animations = r.elements.map((element, index) => {
      if (!element.animate) return null;
      const first = index % 2 ? 4 : -4;
      const animation = element.animate([
        {transform: 'translateY(' + first + 'px)'},
        {transform: 'translateY(' + -first + 'px)'}
      ], {duration: LEG_MS, easing: 'ease-in-out', iterations: Infinity, direction: 'alternate', fill: 'both'});
      animation.currentTime = r.elapsed % CYCLE_MS;
      animation.ready?.then(() => {
        if (!disposed && active === r && r.animations.includes(animation)) {
          animation.currentTime = elapsed(r) % CYCLE_MS;
        }
      }, () => {});
      return animation;
    }).filter(Boolean);
  }
  function synchronize() {
    if (!active || disposed) return;
    pause(active); resume(active);
  }
  function clear() {
    if (!active) return;
    stop(active);
    active = null;
  }
  doc.addEventListener('visibilitychange', synchronize);
  media?.addEventListener?.('change', synchronize);
  return {
    update({choiceId, elements} = {}) {
      if (disposed || !Number.isSafeInteger(choiceId) || choiceId <= 0 ||
          choiceId < highestId || !Array.isArray(elements) || !elements.length ||
          new Set(elements).size !== elements.length ||
          elements.some(e => !e || e.ownerDocument !== doc)) return false;
      if (choiceId === highestId && !active) return false;
      if (active?.id === choiceId) {
        if (elements.length === active.elements.length &&
            elements.every((e, i) => e === active.elements[i])) return false;
        pause(active);
        active.elements = elements.slice();
        active.elements.forEach(e => { e.style.transform = 'translateY(0px)'; });
        resume(active);
        return false;
      }
      clear();
      highestId = choiceId;
      active = {id: choiceId, elements: elements.slice(), elapsed: 0, started: null, animations: []};
      active.elements.forEach(e => { e.style.transform = 'translateY(0px)'; });
      resume(active);
      return true;
    },
    snapshot() { return active ? {choiceId: active.id, elapsedMs: elapsed(active), phaseMs: elapsed(active) % CYCLE_MS} : null; },
    clear,
    dispose() {
      if (disposed) return;
      disposed = true; clear();
      doc.removeEventListener('visibilitychange', synchronize);
      media?.removeEventListener?.('change', synchronize);
    }
  };
}
