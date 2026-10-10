const NAMES = ['Phalaenopsis orchid', 'Vanda orchid', 'toad lily', 'lady slipper orchid'];
const VISUAL_MS = 1300;
const COMPLETE_MS = 1500;

// Presentation only. The caller owns the already-committed garden and learning state.
export function createLetterBloom(options = {}) {
  const doc = options.document || globalThis.document;
  const view = doc.defaultView;
  const media = view.matchMedia?.('(prefers-reduced-motion: reduce)');
  const reduced = () => typeof options.reducedMotion === 'function'
    ? !!options.reducedMotion() : options.reducedMotion ?? !!media?.matches;
  const now = options.now || (() => view.performance.now());
  const later = options.setTimeout || view.setTimeout.bind(view);
  const unschedule = options.clearTimeout || view.clearTimeout.bind(view);
  const hidden = () => doc.visibilityState === 'hidden';
  const assetUrl = options.assetUrl || new URL('./assets/garden_flowers.png', import.meta.url).href;
  let active = null, highestId = 0, disposed = false;

  const elapsed = record => Math.min(COMPLETE_MS, record.elapsed +
    (record.started === null ? 0 : Math.max(0, now() - record.started)));
  function stop(record) {
    if (record.timer !== null) unschedule(record.timer);
    record.timer = null;
    record.animation?.cancel();
    record.animation = null;
  }
  function finish(record) {
    if (disposed || active !== record || record.completed) return;
    stop(record);
    record.elapsed = reduced() ? elapsed(record) : COMPLETE_MS;
    record.started = null;
    record.completed = true;
    record.flower.style.transform = 'scale(1)';
    record.flower.style.opacity = '1';
    record.onComplete?.(record.id);
  }
  function resume(record) {
    if (disposed || active !== record || record.completed || hidden()) return;
    record.started = now();
    if (!reduced() && record.elapsed < VISUAL_MS && record.flower.animate) {
      record.animation = record.flower.animate([
        {transform: 'scale(0)', opacity: 0},
        {transform: 'scale(1)', opacity: 1}
      ], {duration: VISUAL_MS, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'both'});
      record.animation.currentTime = record.elapsed;
      const animation = record.animation;
      animation.ready?.then(() => {
        if (!disposed && active === record && record.animation === animation && !record.completed) {
          animation.currentTime = Math.min(VISUAL_MS, elapsed(record));
        }
      }, () => {});
    }
    record.timer = later(() => {
      record.timer = null;
      if (disposed || active !== record || record.completed) return;
      if (hidden()) { pause(record); return; }
      if (reduced() || elapsed(record) >= COMPLETE_MS) finish(record);
      else { pause(record); resume(record); }
    }, reduced() ? 0 : Math.max(0, COMPLETE_MS - record.elapsed));
  }
  function pause(record) {
    if (record.started !== null) record.elapsed = elapsed(record);
    record.started = null;
    stop(record);
  }
  function synchronize() {
    if (!active || active.completed || disposed) return;
    pause(active);
    resume(active);
  }
  function cancel() {
    if (!active) return;
    stop(active);
    active.flower.remove();
    active = null;
  }
  doc.addEventListener('visibilitychange', synchronize);
  media?.addEventListener?.('change', synchronize);
  return {
    play({target, species, transitionId, onComplete, correct = true, compact = false} = {}) {
      if (disposed || !correct || !Number.isSafeInteger(transitionId) || transitionId <= 0 ||
          !target || target.ownerDocument !== doc || !Number.isFinite(species)) return false;
      if (transitionId < highestId) return false;
      if (transitionId === highestId) {
        if (active?.id === transitionId) {
          active.flower.style.width = active.flower.style.height = compact ? '36px' : '58px';
          if (active.flower.parentNode !== target) target.prepend(active.flower);
        }
        return false;
      }
      cancel();
      highestId = transitionId;
      const index = Math.min(3, Math.max(0, Math.trunc(species)));
      const flower = doc.createElement('span');
      flower.className = 'letter-bloom';
      flower.setAttribute('role', 'img');
      flower.setAttribute('aria-label', NAMES[index]);
      flower.setAttribute('data-species', String(index));
      flower.setAttribute('data-transition-id', String(transitionId));
      Object.assign(flower.style, {
        display: 'block', width: compact ? '36px' : '58px', height: compact ? '36px' : '58px',
        margin: '0 auto', flex: '0 0 auto', maxWidth: '100%', pointerEvents: 'none',
        backgroundImage: 'url("' + assetUrl + '")', backgroundSize: '200% 200%',
        backgroundPosition: (index % 2 ? '100%' : '0%') + ' ' + (index >= 2 ? '100%' : '0%'),
        transformOrigin: '50% 100%', transform: 'scale(1)', opacity: '1'
      });
      target.prepend(flower);
      active = {id: transitionId, flower, onComplete, elapsed: 0, started: null,
        completed: false, animation: null, timer: null};
      resume(active);
      return true;
    },
    isPending() { return !!active && !active.completed; },
    snapshot() {
      return active ? {transitionId: active.id, elapsedMs: elapsed(active), pending: !active.completed} : null;
    },
    cancel,
    dispose() {
      if (disposed) return;
      disposed = true;
      cancel();
      doc.removeEventListener('visibilitychange', synchronize);
      media?.removeEventListener?.('change', synchronize);
    }
  };
}
