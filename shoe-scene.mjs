// Lifecycle of the original App/ShoeLacingScene.swift NativeShoeView.
// The accepted decoder, tube builder and renderer own their existing formats/art.
import {decodeShoeMesh, decodeShoeMotion, sampleShoeMotion} from './shoe-assets.mjs';
import {buildShoeTube} from './shoe-tube.mjs';
import {createShoeRenderer} from './shoe-renderer.mjs';

const TITLES = ['Ready to tie!', 'Cross the laces', 'Make a snug knot',
  'Make one bunny ear', 'Wrap the other lace', 'Push a loop through',
  'Pull both ears', 'A beautiful bow!'];
const NAMES = ['LOOSE', 'CROSS_LACES', 'FIRST_KNOT', 'FIRST_LOOP',
  'WRAP_OTHER_LACE', 'SECOND_LOOP', 'PULL_LOOPS', 'TIED'];
const resources = new Map(); // Private immutable decoded inputs; GPU objects are per scene.

function acquire(base, win) {
  const key = base.href;
  let entry = resources.get(key);
  if (!entry) {
    const abort = new AbortController();
    entry = {users: 0, settled: false, abort};
    const timeout = win.setTimeout(() => abort.abort(), 20000);
    const read = async name => {
      const response = await win.fetch(new URL(name, base), {signal: abort.signal});
      if (!response.ok) throw new Error(`Cannot load original shoe ${name} (${response.status})`);
      return response;
    };
    entry.promise = Promise.all([
      read('shoe.mesh').then(r => r.arrayBuffer()).then(decodeShoeMesh),
      read('motion.bin').then(r => r.arrayBuffer()).then(decodeShoeMotion),
      read('threading.json').then(r => r.json()).then(value => {
        if (!Array.isArray(value.paths) || value.paths.length !== 2)
          throw new Error('Original shoe needs two fixed lace paths');
        return value.paths.map(path => buildShoeTube(new Float32Array(path.flat()), .0065));
      }),
      read('shoe.png').then(r => r.blob()).then(async blob => {
        const url = win.URL.createObjectURL(blob), image = new win.Image();
        try { image.src = url; await image.decode(); return image; }
        finally { win.URL.revokeObjectURL(url); }
      }),
    ]).then(([mesh, frames, fixedLaces, texture]) => ({mesh, frames, fixedLaces, texture}))
      .catch(error => { abort.abort(); if (resources.get(key) === entry) resources.delete(key); throw error; })
      .finally(() => { entry.settled = true; win.clearTimeout(timeout); });
    resources.set(key, entry);
  }
  entry.users++;
  let released = false;
  return {promise: entry.promise, release() {
    if (released) return; released = true; entry.users--;
    if (!entry.users && !entry.settled) {
      entry.abort.abort(); if (resources.get(key) === entry) resources.delete(key);
    }
    // Keep the normal original resource set reusable without retaining unlimited URLs.
    for (const [url, cached] of resources) {
      if (resources.size <= 2) break;
      if (!cached.users && cached.settled) resources.delete(url);
    }
  }};
}

export function createShoeScene({document = globalThis.document, stage = 0, transitionId = 0,
  assetBase = new URL('./assets/shoe/', import.meta.url),
  now = () => performance.now(), onState = () => {}, onComplete = () => {}} = {}) {
  const win = document.defaultView;
  function validate(s, id) {
    if (!Number.isInteger(s) || s < 0 || s > 7 || !Number.isSafeInteger(id) || id < 0)
      throw new RangeError('Expected shoe stage 0–7 and a nonnegative transition identity');
  }
  validate(stage, transitionId);
  const el = (tag, className, parent) => {
    const node = document.createElement(tag); node.className = className;
    if (parent) parent.append(node); return node;
  };
  const element = el('section', 'shoe-scene shoe-instructions');
  element.dataset.testid = 'shoe-lacing-scene';
  element.style.cssText = 'display:flex;position:relative;width:100%;height:100%;min-width:0;gap:0;color:rgb(24,63,68)';
  const viewport = el('div', 'shoe-viewport', element);
  viewport.style.cssText = 'position:relative;flex:0 0 68%;height:100%;min-width:0';
  const canvas = el('canvas', 'shoe-canvas', viewport);
  canvas.style.cssText = 'display:block;width:100%;height:100%';
  canvas.setAttribute('role', 'img'); canvas.dataset.testid = 'shoe-lacing-stage';
  canvas.setAttribute('aria-label', 'A sneaker with teal and coral shoelaces');
  const ns = 'http://www.w3.org/2000/svg', overlay = document.createElementNS(ns, 'svg');
  overlay.classList.add('shoe-celebration'); overlay.setAttribute('aria-hidden', 'true');
  overlay.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:none';
  viewport.append(overlay);
  const stars = Array.from({length:12}, (_, i) => {
    const star = document.createElementNS(ns, 'polygon');
    star.setAttribute('fill', i % 3 === 2 ? 'rgb(245,176,26)' : i % 2 === 0 ? 'rgb(8,127,140)' : 'rgb(232,89,70)');
    overlay.append(star); return star;
  });
  const captions = el('div', 'shoe-captions', element);
  captions.style.cssText = 'flex:1;min-width:0;align-self:center;padding-right:8px;text-align:left';
  const title = el('h3', 'shoe-title', captions), caption = el('p', 'shoe-step', captions);
  title.style.cssText = 'font-size:17px;font-weight:700;margin:0 0 4px';
  caption.style.cssText = 'font-size:13px;opacity:.8;margin:0';
  const status = el('span', 'shoe-status', element);
  status.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)';
  status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');

  let renderer, data, disposed = false, failed = null, lost = false, raf = 0;
  let began = null, elapsed = 0, frame = -1, completed = false, lastState = '';
  const media = win.matchMedia?.('(prefers-reduced-motion: reduce)');
  let reduced = !!media?.matches;
  function state() {
    const ready = !!renderer && !failed && !lost && !disposed;
    const pending = transitionId > 0 && !completed && !failed && !disposed;
    const phase = disposed ? 'disposed' : failed ? 'error' : lost ? 'context-lost' : !renderer ? 'loading'
      : pending && elapsed < 1200 ? 'moving' : pending && stage === 7 ? 'celebrating' : 'ready';
    return Object.freeze({stage, transitionId, phase, ready, pending, frame, elapsedMs: elapsed,
      moving: ready && phase === 'moving' && !reduced, celebrating: ready && phase === 'celebrating',
      reducedMotion: reduced, completed, error: failed?.message ?? null});
  }
  function notify() {
    const s = state();
    element.dataset.stage = String(stage); element.dataset.transitionId = String(transitionId);
    element.dataset.phase = s.phase; element.dataset.frame = String(frame);
    element.setAttribute('aria-busy', String(!s.ready || s.pending));
    // Frame changes stay observable without announcing 101 updates to assistive technology.
    const key = [stage, transitionId, s.phase, reduced, completed, s.error].join(':');
    if (key === lastState) return;
    lastState = key;
    status.textContent = s.phase === 'error' ? 'The shoe could not load. Please return and try again.'
      : s.phase === 'loading' ? 'Loading the shoe' : s.phase === 'context-lost' ? 'The shoe display is recovering'
      : s.celebrating ? 'The shoe is tied!' : s.moving ? 'The shoelaces are moving' : TITLES[stage];
    status.dataset.testid = s.celebrating ? 'shoe-lacing-celebration' : s.moving ? 'shoe-lacing-transition' : 'shoe-lacing-status';
    element.dispatchEvent(new win.CustomEvent('shoe-state', {detail:s, bubbles:true}));
    onState(s);
  }
  function cancelFrame() { if (raf) win.cancelAnimationFrame(raf); raf = 0; }
  function fail(error) {
    if (disposed || failed) return;
    failed = error instanceof Error ? error : new Error(String(error)); cancelFrame();
    renderer?.dispose(); renderer = null; overlay.style.display = 'none'; notify();
  }
  function celebration(progress, visible) {
    overlay.style.display = visible ? 'block' : 'none';
    if (!visible) return;
    const width = viewport.clientWidth, height = viewport.clientHeight, size = Math.min(width, height);
    const p = reduced ? 0 : progress, radius = size * (.20 + p * .16);
    overlay.setAttribute('viewBox', `0 0 ${width || 1} ${height || 1}`);
    const outer = Math.max(size * .075, 12) / 2 * (1 - p * .35);
    stars.forEach((star, i) => {
      const angle = i * 2 * Math.PI / 12, x = width * .5 + Math.cos(angle) * radius;
      const y = height * .42 + Math.sin(angle) * radius;
      star.setAttribute('points', Array.from({length:10}, (_, k) => {
        const a = -Math.PI / 2 + k * Math.PI / 5, r = outer * (k % 2 ? .382 : 1);
        return `${x + Math.cos(a) * r},${y + Math.sin(a) * r}`;
      }).join(' '));
      star.setAttribute('opacity', String(1 - p * .85));
    });
  }
  function schedule() {
    if (!raf && !document.hidden && !disposed && !lost && !failed && state().pending)
      raf = win.requestAnimationFrame(() => { raf = 0; redraw(); });
  }
  function redraw() {
    if (disposed || failed || lost || !renderer) return false;
    try {
      elapsed = began === null ? 0 : Math.max(0, now() - began);
      const sample = sampleShoeMotion(data.frames, stage, elapsed, {animate:transitionId > 0, reducedMotion:reduced});
      if (sample.frame !== frame) {
        renderer.draw(buildShoeTube(sample.teal, .0085), buildShoeTube(sample.coral, .0085));
        frame = sample.frame;
      } else renderer.redraw();
      const duration = stage === 7 ? 3000 : 1200;
      const finish = transitionId > 0 && !completed && elapsed >= duration;
      if (finish) completed = true; // Seal identity before calling any external listener.
      celebration(Math.min(1, Math.max(0, (elapsed - 1200) / 1800)),
        transitionId > 0 && stage === 7 && elapsed >= 1200 && !completed);
      const completion = finish ? Object.freeze({stage, transitionId}) : null;
      notify(); schedule();
      if (completion && !disposed && completed && stage === completion.stage && transitionId === completion.transitionId) {
        element.dispatchEvent(new win.CustomEvent('shoe-complete', {detail:completion, bubbles:true}));
        if (!disposed && completed && stage === completion.stage && transitionId === completion.transitionId) onComplete(completion);
      }
      return true;
    } catch (error) { fail(error); return false; }
  }
  function update(nextStage, nextId = 0) {
    validate(nextStage, nextId);
    if (disposed || (stage === nextStage && transitionId === nextId && frame >= 0)) return false;
    if (stage === nextStage && transitionId === nextId && began !== null) return false;
    cancelFrame(); stage = nextStage; transitionId = nextId; elapsed = 0; completed = false; frame = -1;
    began = renderer && !failed ? now() : null;
    title.textContent = TITLES[stage]; caption.textContent = stage === 0 ? 'Match a pair to begin' : `Step ${stage} of 7`;
    element.setAttribute('aria-label', 'Shoe tying: ' + TITLES[stage]);
    canvas.setAttribute('aria-description', NAMES[stage]); canvas.dataset.stageName = NAMES[stage];
    overlay.style.display = 'none'; notify(); redraw(); return true;
  }
  function visibility() { if (document.hidden) cancelFrame(); else redraw(); }
  function motion() { reduced = !!media.matches; frame = -1; redraw(); }
  function contextLost(event) { event.preventDefault(); if (disposed) return; lost = true; cancelFrame(); notify(); }
  function contextRestored() {
    // Renderer restores its own GPU generation synchronously before this microtask.
    win.queueMicrotask(() => { if (!disposed && !failed) { lost = false; frame = -1; redraw(); } });
  }
  function rendererError(event) { fail(event.detail); }
  function dispose() {
    if (disposed) return; disposed = true; cancelFrame(); lease.release(); observer?.disconnect();
    document.removeEventListener('visibilitychange', visibility); win.removeEventListener('resize', redraw);
    media?.removeEventListener?.('change', motion);
    canvas.removeEventListener('webglcontextlost', contextLost);
    canvas.removeEventListener('webglcontextrestored', contextRestored);
    canvas.removeEventListener('shoe-render-error', rendererError);
    renderer?.dispose(); renderer = null; data = null; overlay.style.display = 'none';
    element.dataset.phase = 'disposed'; // No callbacks from a canceled/disposed view.
  }
  const lease = acquire(new URL(assetBase, document.baseURI), win);
  document.addEventListener('visibilitychange', visibility); win.addEventListener('resize', redraw);
  media?.addEventListener?.('change', motion);
  canvas.addEventListener('webglcontextlost', contextLost);
  canvas.addEventListener('webglcontextrestored', contextRestored);
  canvas.addEventListener('shoe-render-error', rendererError);
  const observer = win.ResizeObserver ? new win.ResizeObserver(() => redraw()) : null;
  observer?.observe(viewport);
  update(stage, transitionId);
  const ready = lease.promise.then(value => {
    if (disposed) return false;
    data = value;
    try {
      renderer = createShoeRenderer(canvas, value); began = now();
      return redraw() && !failed;
    } catch (error) { fail(error); return false; }
  }, error => { fail(error); return false; });
  return Object.freeze({element, canvas, ready, update, redraw, dispose, get state() { return state(); }});
}
