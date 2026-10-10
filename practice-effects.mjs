// Native SophiaAppView prompt/feedback effects, with explicit browser lifecycle.
// No learning or storage writes. The app owns round identity and real scene gates.
export function feedbackSpeech(game, target, correct) {
  if (game === 'letters') {
    const letter = target.toUpperCase();
    return correct ? `Great job! The letter is ${letter}.` : `Let's look again. The letter is ${letter}. ${letter}.`;
  }
  return correct ? `Great job! ${target}.` : `Let's look again. This is ${target}. ${target}.`;
}

export function createPracticeEffects({play, stop, prompt, onAdvance, onState = () => {},
  setTimeout: later = globalThis.setTimeout, clearTimeout: clear = globalThis.clearTimeout}) {
  let round = null, revision = 0, timer = null, disposed = false;
  let env = {visible:true, muted:false, canPrompt:true, terminal:false, saveError:false};
  const snapshot = () => round ? {...round, ...env} : null;
  const emit = () => { if (!disposed) onState(snapshot()); };
  function invalidate() {
    revision++;
    if (timer !== null) clear(timer);
    timer = null;
    stop();
    if (round) { round.busy = false; round.pending = false; }
  }
  const active = (id, rev) => !disposed && round?.id === id && revision === rev;
  const eligible = () => round && env.visible && !env.saveError && !round.advanced;
  function gap() {
    if (!eligible() || !round.feedback || round.busy || !round.animationReady || env.terminal || !env.canPrompt) return;
    const id = round.id, rev = revision;
    timer = later(() => {
      timer = null;
      if (!active(id, rev) || !eligible() || round.busy || !round.animationReady || env.terminal || !env.canPrompt) return;
      round.advanced = true;
      // Mark before invoking application code: duplicate/reentrant callbacks are inert.
      emit();
      onAdvance(id);
    }, round.correct ? 600 : 2000);
  }
  async function speak(feedback) {
    if (!eligible() || (!feedback && (!env.canPrompt || env.terminal))) return;
    const id = round.id, rev = revision;
    round.pending = false;
    if (env.muted) {
      if (!feedback) { round.heard = false; round.helped = true; }
      emit();
      if (feedback) gap();
      return;
    }
    round.busy = true; emit();
    let completed = false;
    try { completed = await play(feedback ? feedbackSpeech(round.game, round.target, round.correct) : prompt(round)); }
    catch { completed = false; }
    if (!active(id, rev) || !eligible()) return;
    round.busy = false;
    if (!feedback) { round.heard = completed === true; round.helped ||= !completed; }
    round.audioAvailable = completed === true;
    emit();
    if (feedback) gap();
  }
  function resume(immediate = false) {
    if (!eligible()) { emit(); return; }
    if (round.feedback) { void speak(true); return; }
    if (!env.canPrompt || env.terminal || env.muted) {
      if (env.muted) { round.heard = false; round.helped = true; }
      emit(); return;
    }
    if (immediate) { void speak(false); return; }
    round.pending = true; emit();
    const id = round.id, rev = revision;
    timer = later(() => { timer = null; if (active(id, rev)) void speak(false); }, 350);
  }
  return {
    enterRound({id, game, target, trial = 0}) {
      if (disposed) return false;
      if (id === undefined || id === null || typeof target !== 'string' || !target) throw new TypeError('A round needs identity and target');
      invalidate();
      round = {id, game, target, trial, feedback:false, correct:null, animationReady:true,
        advanced:false, busy:false, pending:false, heard:false, helped:env.muted, audioAvailable:null};
      resume(); return true;
    },
    answer({id, correct, animationReady = true}) {
      if (disposed || !round || round.id !== id || round.feedback || round.advanced) return false;
      invalidate();
      round.feedback = true; round.correct = !!correct; round.animationReady = !!animationReady;
      resume(); return true;
    },
    completeAnimation(id) {
      if (disposed || !round || round.id !== id || !round.feedback || round.animationReady) return false;
      round.animationReady = true; emit(); gap(); return true;
    },
    environment(patch) {
      if (disposed) return;
      const changed = Object.keys(env).some(k => typeof patch[k] === 'boolean' && env[k] !== patch[k]);
      if (!changed) return;
      const interrupted = round && (round.pending || round.busy);
      invalidate();
      for (const key of Object.keys(env)) if (typeof patch[key] === 'boolean') env[key] = patch[key];
      if (round && (interrupted || env.muted)) { round.heard = false; round.helped = true; }
      resume();
    },
    listen() {
      if (disposed || !eligible() || env.muted || (!round.feedback && (!env.canPrompt || env.terminal))) return false;
      invalidate(); resume(true); return true;
    },
    cancel() { if (disposed) return; invalidate(); round = null; emit(); },
    dispose() { if (disposed) return; invalidate(); round = null; disposed = true; },
    snapshot
  };
}
