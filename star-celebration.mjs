const DURATION_MS = 1400;

// Native decoration: intentionally no completion callback or learning gate.
export function createStarCelebration(options = {}) {
  const doc = options.document || globalThis.document;
  const view = doc.defaultView;
  const media = view.matchMedia?.('(prefers-reduced-motion: reduce)');
  const reduced = () => typeof options.reducedMotion === 'function'
    ? !!options.reducedMotion() : options.reducedMotion ?? !!media?.matches;
  const now = options.now || (() => view.performance.now());
  const later = options.setTimeout || view.setTimeout.bind(view);
  const unschedule = options.clearTimeout || view.clearTimeout.bind(view);
  const hidden = () => doc.visibilityState === 'hidden';
  let active = null, highestId = 0, disposed = false;
  const elapsed = r => Math.min(DURATION_MS, r.elapsed +
    (r.started === null ? 0 : Math.max(0, now() - r.started)));
  function stop(r) {
    if (r.timer !== null) unschedule(r.timer);
    r.timer = null;
    r.animations.forEach(a => a.cancel());
    r.animations = [];
  }
  function finish(r) {
    if (disposed || active !== r) return;
    stop(r);
    r.elapsed = DURATION_MS;
    r.started = null;
    r.completed = true;
  }
  function pause(r) {
    if (r.started !== null) r.elapsed = elapsed(r);
    r.started = null;
    stop(r);
  }
  function resume(r) {
    if (disposed || active !== r || r.completed || hidden()) return;
    if (reduced() || r.elapsed >= DURATION_MS) { finish(r); return; }
    r.started = now();
    r.animations = r.stars.map((star, i) => {
      if (!star.animate) return null;
      const animation = star.animate([
        {fontSize: '28px', transform: 'translateY(20px)', opacity: 1},
        {fontSize: '44px', transform: 'translateY(' + (i % 2 ? -43 : -67) + 'px)', opacity: 0.65}
      ], {duration: DURATION_MS, easing: 'ease-out', fill: 'both'});
      animation.currentTime = r.elapsed;
      animation.ready?.then(() => {
        if (!disposed && active === r && r.animations.includes(animation) && !r.completed) {
          animation.currentTime = Math.min(DURATION_MS, elapsed(r));
        }
      }, () => {});
      return animation;
    }).filter(Boolean);
    r.timer = later(() => {
      r.timer = null;
      if (disposed || active !== r) return;
      if (hidden()) { pause(r); return; }
      if (elapsed(r) >= DURATION_MS) finish(r);
      else { pause(r); resume(r); }
    }, DURATION_MS - r.elapsed);
  }
  function synchronize() {
    if (!active || active.completed || disposed) return;
    pause(active); resume(active);
  }
  function clear() {
    if (!active) return;
    stop(active);
    active.overlay.remove();
    active = null;
  }
  doc.addEventListener('visibilitychange', synchronize);
  media?.addEventListener?.('change', synchronize);
  return {
    show({host, celebrationId, game, correct, stars, feedback = true} = {}) {
      if (disposed) return false;
      if (!feedback || !correct || game === 'train' || !Number.isSafeInteger(stars) ||
          stars <= 0 || stars % 5 !== 0) { clear(); return false; }
      if (!host || host.ownerDocument !== doc ||
          !Number.isSafeInteger(celebrationId) || celebrationId <= 0 || celebrationId < highestId) return false;
      if (celebrationId === highestId) {
        if (active?.id === celebrationId && active.overlay.parentNode !== host) host.append(active.overlay);
        return false;
      }
      clear();
      highestId = celebrationId;
      const overlay = doc.createElement('div');
      overlay.className = 'star-celebration';
      overlay.setAttribute('aria-hidden', 'true');
      overlay.setAttribute('data-celebration-id', String(celebrationId));
      Object.assign(overlay.style, {position: 'absolute', inset: '0', display: 'flex',
        alignItems: 'center', justifyContent: 'center', gap: '22px', pointerEvents: 'none'});
      const children = Array.from({length: 5}, (_, i) => {
        const star = doc.createElement('span');
        star.textContent = '★';
        Object.assign(star.style, {display: 'inline-block', fontFamily: 'system-ui, sans-serif',
          fontWeight: '400', fontSize: '44px', lineHeight: 'normal',
          color: i % 2 ? '#f17860' : '#ffcf69', transform: 'translateY(' + (i % 2 ? -43 : -67) + 'px)',
          opacity: '0.65', pointerEvents: 'none'});
        overlay.append(star);
        return star;
      });
      host.append(overlay);
      active = {id: celebrationId, overlay, stars: children, elapsed: 0,
        started: null, completed: false, animations: [], timer: null};
      resume(active);
      return true;
    },
    snapshot() { return active ? {celebrationId: active.id, elapsedMs: elapsed(active)} : null; },
    clear,
    dispose() {
      if (disposed) return;
      disposed = true; clear();
      doc.removeEventListener('visibilitychange', synchronize);
      media?.removeEventListener?.('change', synchronize);
    }
  };
}
