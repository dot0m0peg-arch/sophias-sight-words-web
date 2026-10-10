// ParentUI.swift setPanel and Models.swift learningLabel, browser adaptation.
export function learningLabel(progress) {
  if (!progress || !progress.attempts) return 'New';
  if (!progress.level) return 'Practicing recognition';
  return progress.level === 1 ? 'Recognized in practice' : 'Remembered across days';
}
export function describeSet(data, id) {
  const set = data.sets.find(s => s.id === id);
  if (!set) return null;
  const words = set.words.map(word => {
    const p = data.progress[word] || {};
    const attempts = p.attempts || 0, correct = p.correct || 0;
    return {word, attempts, correct, misses:attempts-correct, recentMisses:p.recentMisses || 0,
      independentCorrect:p.independentCorrect || 0, successfulDays:p.successfulDays || 0,
      assistedAttempts:p.assistedAttempts || 0, reviewAtMs:p.reviewAtMs || 0,
      label:learningLabel(p), hasProgress:Object.hasOwn(data.progress, word)};
  });
  const attempts = words.reduce((n,w) => n+w.attempts, 0), correct = words.reduce((n,w) => n+w.correct, 0);
  return {id:set.id, name:set.name, active:set.active, words, attempts, correct, misses:attempts-correct};
}
export function prepareParentAction(data, {kind, setId, word}) {
  const set = data.sets.find(s => s.id === setId);
  if (!set || !['reset-word','reset-set','delete-set'].includes(kind)) return null;
  if (kind === 'reset-word' && (!set.words.includes(word) || !Object.hasOwn(data.progress,word))) return null;
  return Object.freeze({kind, setId, word, baseline:JSON.stringify(data),
    title:kind === 'delete-set' ? `Delete ${set.name}?` : kind === 'reset-set' ? `Reset ${set.name}?` : `Reset “${word}”?`,
    body:kind === 'delete-set' ? 'Remove this word set? Word progress is kept in case you add the words again.' :
      kind === 'reset-set' ? `Clear progress for these ${set.words.length} words? Shared words are reset in other sets too.` :
      "This clears this word's progress in every set."});
}
export function applyParentAction(data, action) {
  if (!action || JSON.stringify(data) !== action.baseline) return {ok:false, reason:'The list or progress changed. Review it and try again.'};
  const set = data.sets.find(s => s.id === action.setId);
  if (!set) return {ok:false, reason:'This list is no longer available.'};
  if (action.kind === 'delete-set') return {ok:true, data:{...data, sets:data.sets.filter(s => s.id !== set.id)}};
  if (!['reset-word','reset-set'].includes(action.kind) || (action.kind === 'reset-word' && !set.words.includes(action.word)))
    return {ok:false, reason:'This word is no longer in the list.'};
  const removed = new Set(action.kind === 'reset-word' ? [action.word] : set.words);
  return {ok:true, data:{...data, progress:Object.fromEntries(Object.entries(data.progress).filter(([k]) => !removed.has(k)))}};
}

// commit(next, expected) is synchronous: compare expected, save, then adopt next.
// No component code mutates the family's current data, including during confirmation.
export function createParentProgressController({getData, commit, isAuthorized, player, resolveClips, onChange = () => {}}) {
  if (typeof isAuthorized !== 'function') throw new TypeError('Parent access gate is required');
  let pending = null, disposed = false, saving = false, voice = 0;
  const allowed = () => !disposed && isAuthorized();
  return {
    request(action) { pending = allowed() && !saving ? prepareParentAction(getData(),action) : null; return pending; },
    cancel() { pending = null; },
    confirm(action) {
      if (!allowed() || saving || !pending || action !== pending) return {ok:false, reason:'Confirmation is no longer active.'};
      pending = null; saving = true;
      try {
        const current = getData(), result = applyParentAction(current,action);
        if (!result.ok) return result;
        if (commit(result.data,current) !== true) return {ok:false, reason:'Progress could not be saved. No reset or deletion was applied.'};
        onChange(); return {ok:true};
      } catch { return {ok:false, reason:'Progress could not be saved. No reset or deletion was applied.'}; }
      finally { saving = false; }
    },
    async listen(word, setId) {
      const token = ++voice;
      if (!allowed()) return {ok:false, reason:'Open the grown-up area to listen.'};
      player.stop();
      const data = getData(), set = data.sets.find(s => s.id === setId);
      if (!set?.words.includes(word)) return {ok:false, reason:'This word is no longer in the list.'};
      if (data.muted) return {ok:false, reason:'Sound is off. Turn it on to hear recordings.'};
      const clips = resolveClips(word);
      if (!clips) return {ok:false, reason:'An original recording is not available for this word. Ask a grown-up to read it together.'};
      let ok = false;
      try { ok = await player.play(clips); } catch {}
      if (!allowed() || token !== voice) return {ok:false, cancelled:true};
      return ok ? {ok:true} : {ok:false, reason:'The recording could not play. Try Listen again.'};
    },
    stop() { voice++; player.stop(); },
    dispose() { if (disposed) return; disposed = true; pending = null; voice++; player.stop(); }
  };
}

export function mountParentProgress(host, options) {
  const doc = host.ownerDocument, {setId, getData, isAuthorized} = options;
  let expanded = false, disposed = false, dialog = null;
  const node = (tag,text='',cls='') => { const n=doc.createElement(tag); n.textContent=text; n.className=cls; return n; };
  const panel = node('section','','parent-progress');
  const status = node('p','','parent-progress-status'); status.setAttribute('role','status');
  const controller = createParentProgressController(options);
  const button = (label, action, disabled=false) => {
    const b=node('button',label); b.type='button'; b.disabled=disabled;
    b.addEventListener('click',()=>{if (!disposed && isAuthorized() && !b.disabled) action();}); return b;
  };
  function close() { if (dialog) { if (dialog.open) dialog.close(); dialog.remove(); dialog=null; } controller.cancel(); }
  function confirm(kind, word) {
    close(); const action=controller.request({kind,setId,word}); if (!action) return;
    const box=node('dialog','','parent-progress-confirm'); dialog=box;
    box.setAttribute('aria-label',action.title);
    box.append(node('h3',action.title),node('p',action.body));
    const cancel=button('Cancel',close), yes=button('Confirm',()=>{
      yes.disabled=true; const result=controller.confirm(action); close();
      if (!disposed) { status.textContent=result.ok ? 'Saved.' : result.reason; draw(); }
    });
    box.append(cancel,yes); box.addEventListener('cancel',e=>{e.preventDefault();close();});
    panel.append(box); box.showModal(); cancel.focus();
  }
  function draw() {
    if (disposed) return;
    if (!isAuthorized()) { close(); controller.stop(); panel.replaceChildren(); return; }
    const set=describeSet(getData(),setId); if (!set) { close(); panel.replaceChildren(); return; }
    const summary=node('p',`${set.attempts} attempts · ${set.correct} correct · ${set.misses} misses`,'parent-set-summary');
    const toggle=button(expanded?'Hide progress':'Progress',()=>{expanded=!expanded;close();draw();});
    toggle.setAttribute('aria-expanded',String(expanded));
    panel.replaceChildren(summary,toggle,status);
    if (expanded) {
      panel.append(node('p','Progress follows each word across all sets. Recognition is practice evidence, not an assessment of reading aloud.'));
      for (const w of set.words) {
        const row=node('section','','parent-word-progress'); row.dataset.word=w.word;
        const title=node('h4',w.word);
        const listen=button('Listen',async()=>{
          status.textContent='Listening…'; const result=await controller.listen(w.word,setId);
          if (!disposed && !result.cancelled) status.textContent=result.ok?'Recording finished.':result.reason;
        },getData().muted);
        listen.setAttribute('aria-label',`Listen to ${w.word}`);
        const reset=button('Reset',()=>confirm('reset-word',w.word),!w.hasProgress);reset.setAttribute('aria-label',`Reset ${w.word}`);
        const actions=node('div','','parent-progress-actions');actions.append(listen,reset);
        row.append(title,actions,node('p',`${w.attempts} attempts · ${w.correct} correct · ${w.misses} misses · ${w.recentMisses} recent misses`),
          node('p',w.label,'parent-learning-label'),node('p',`${w.independentCorrect} unassisted recognition answers · ${w.successfulDays} successful days · ${w.assistedAttempts} supported attempts`));
        if (w.reviewAtMs>0) row.append(node('p',`Next scheduled review: ${new Date(w.reviewAtMs).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'})}`));
        panel.append(row);
      }
      panel.append(button("Reset this set's progress",()=>confirm('reset-set')));
    }
    panel.append(button('Delete set',()=>confirm('delete-set')));
  }
  host.append(panel); draw();
  const hidden=()=>{if(doc.visibilityState==='hidden'){controller.stop();status.textContent='';close();}};
  doc.addEventListener('visibilitychange',hidden);
  return {element:panel, update(){close();controller.stop();draw();},dispose(){if(disposed)return;close();disposed=true;controller.dispose();doc.removeEventListener('visibilitychange',hidden);panel.remove();}};
}

export function createPracticeExplanation(doc, data) {
  const panel=doc.createElement('section');panel.className='parent-progress panel';
  const title=doc.createElement('h2');title.textContent='How practice adapts';panel.append(title);
  for(const text of [
    'A few developing words mix with familiar words. Missed words return after other questions. Successful recognition earns longer reviews across days; slow answers are never penalized.',
    'Progress measures listening-and-choice recognition. Matching twins, visible hints, and muted practice are supported practice, not independent reading. Five taps in one sitting do not prove a word is learned.',
    `Uppercase letters, lowercase letters, and sound examples are remembered separately. ${Object.keys(data.letterProgress).length} letter skills have been practiced.`,
    'Pip grows with completed practice and gets a little extra growth for learning milestones. Growth is an encouragement reward, not a reading score, and never shrinks after mistakes or time away.',
    'Read a short book together each day. Help her connect letters to sounds and blend them; let her tell you what a sentence means. This game supplements that teaching.',
    'Original recordings are used when available. Added words may have no recording in this browser; no new voice is generated.',
    'Learning stays in this browser. Progress does not sync with the iPad, iPhone, or Android app.'
  ]) {const p=doc.createElement('p');p.textContent=text;panel.append(p);}
  return panel;
}
