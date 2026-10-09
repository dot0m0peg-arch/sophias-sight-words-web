export function createClipPlayer(index, audioFactory) {
  let active = null;
  function detach(run, pause) {
    const audio = run.audio;
    run.audio = null;
    if (!audio) return;
    audio.onended = null;
    audio.onerror = null;
    if (pause) { try { audio.pause(); } catch {} }
  }
  function finish(run, result) {
    if (active !== run) return;
    active = null;
    detach(run, !result);
    run.resolve(result);
  }
  function stop() { if (active) finish(active, false); }
  function play(keys) {
    stop();
    if (!Array.isArray(keys) || !keys.length || keys.some(key =>
      typeof key !== 'string' || !Object.hasOwn(index, key) ||
      typeof index[key] !== 'string' || !index[key])) return Promise.resolve(false);
    const urls = keys.map(key => index[key]);
    return new Promise(resolve => {
      const run = {resolve, audio: null, position: 0};
      active = run;
      function next() {
        if (active !== run) return;
        if (run.position === urls.length) { finish(run, true); return; }
        let audio;
        try {
          audio = audioFactory(urls[run.position++]);
          run.audio = audio;
          audio.currentTime = 0;
          const current = () => active === run && run.audio === audio;
          audio.onended = () => { if (current()) { detach(run, false); next(); } };
          audio.onerror = () => { if (current()) finish(run, false); };
          Promise.resolve(audio.play()).catch(() => { if (current()) finish(run, false); });
        } catch { finish(run, false); }
      }
      next();
    });
  }
  return {play, stop};
}
