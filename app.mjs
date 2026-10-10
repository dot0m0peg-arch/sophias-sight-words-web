// Browser orchestration; collaborators keep the native learning rules in their modules.
import {createShoeScene} from './shoe-scene.mjs';
import {createTrainArrivalClock} from './train-arrival-clock.mjs';
import {drawTrainScene} from './train-canvas.mjs';
import {trainMotionPhase} from './train-motion-phase.mjs';
import {trainMotionFlight} from './train-motion-flight.mjs';
import {trainMotionFireworks} from './train-motion-fireworks.mjs';
export function mountApp(root, d) {
  const doc = root.ownerDocument;
  let data = d.repository.load(), screen = 'home', game = 'find', question = null;
  let generation = 0, busy = false, heard = false, helped = false, feedback = '', saveError = '';
  let skill = 'word', trial = 0, started = 0, disposed = false, selectedTwin = null, twinItems = [];
  let race = d.createRace(), train = [], shoe = 0, gate = [4, 7];
  let raceHorses = [], raceClock = null;
  let stars = 0;
  let popIndex = null, popStarted = 0, popAnimations = [];
  const now = d.now || Date.now;
  const trainArrival = createTrainArrivalClock(now);
  let trainFrame = null, trainView = null, trainGeneration = 0, trainCarsAlpha = 1;
  const view = doc.defaultView;
  let shoeScene = null, shoeTransitionId = 0, shoeNextButton = null;
  const shoePending = () => game === 'twins' && !!shoeScene?.state.pending;
  const resetShoe = () => { shoeScene?.dispose(); shoeScene = null; shoeNextButton = null; shoeTransitionId = 0; };
  const shoeStateChanged = () => {
    if (!disposed && shoeNextButton) shoeNextButton.disabled = shoePending();
  };
  const requestFrame = d.requestAnimationFrame || view?.requestAnimationFrame.bind(view);
  const cancelFrame = d.cancelAnimationFrame || view?.cancelAnimationFrame.bind(view);
  const reducedTrainMotion = () => !!d.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const stopTrainFrame = () => {
    trainGeneration++;
    if (trainFrame !== null) cancelFrame?.(trainFrame);
    trainFrame = null; trainView = null;
  };
  const resetTrain = () => { stopTrainFrame(); trainArrival.cancel(); trainCarsAlpha = 1; };
  const trainPending = () => {
    const arrival = trainArrival.snapshot();
    return !!arrival && !trainMotionPhase(arrival.elapsedMs, arrival.carCount, reducedTrainMotion()).done;
  };
  const trainSource = button => {
    if (game !== 'train') return null;
    const r = button.getBoundingClientRect(), s = button.closest('.shell').getBoundingClientRect();
    return {x:r.x-s.x, y:r.y-s.y, width:r.width, height:r.height};
  };
  // Rendering owns frame scheduling only. Learning is committed exclusively in answer().
  function drawTrainFrame(token = trainGeneration) {
    if (disposed || token !== trainGeneration || !trainView || screen !== 'play' || game !== 'train') return;
    trainFrame = null;
    const {canvas, scene, shell, nextButton} = trainView, ctx = canvas.getContext('2d');
    if (!ctx) return;
    const box = shell.getBoundingClientRect(), track = scene.getBoundingClientRect();
    const width = box.width, height = box.height, scale = view?.devicePixelRatio || 1;
    if (!(width > 0 && height > 0)) return;
    if (canvas.width !== Math.round(width * scale) || canvas.height !== Math.round(height * scale)) {
      canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
    }
    ctx.setTransform(scale,0,0,scale,0,0); ctx.clearRect(0,0,width,height);
    const area = {x:track.x-box.x,y:track.y-box.y,width:track.width,height:track.height};
    // The renderer is the authority for slot geometry; never duplicate it in the app.
    const layout = drawTrainScene(ctx, area, []);
    if (!layout) return;
    const arrival = trainArrival.snapshot(), frame = {carsAlpha:trainCarsAlpha};
    let phase = null;
    if (arrival) {
      phase = trainMotionPhase(arrival.elapsedMs, arrival.carCount, reducedTrainMotion());
      frame.carsAlpha = phase.carsAlpha;
      if (phase.phase === 'flight') {
        const source = arrival.source || {x:area.x+area.width/2-80*layout.unit,y:area.y+area.height+100*layout.unit,width:160*layout.unit,height:100*layout.unit};
        frame.moving = trainMotionFlight(source, layout.slots[arrival.carCount-1], layout.unit, phase.flight);
      }
      if (phase.phase === 'burst') frame.particles = trainMotionFireworks(layout.slots, layout.unit, phase.burst);
    }
    ctx.clearRect(0,0,width,height); drawTrainScene(ctx, area, train, frame);
    if (phase?.done && trainArrival.finish(arrival.id)) trainCarsAlpha = phase.carsAlpha;
    if (nextButton) nextButton.disabled = !!phase && !phase.done;
    if (arrival && !phase.done && doc.visibilityState !== 'hidden' && requestFrame) {
      trainFrame = requestFrame(() => drawTrainFrame(token));
    }
  }
  const node = (tag, text = '', cls = '') => {
    const n = doc.createElement(tag); n.textContent = text; n.className = cls; return n;
  };
  const button = (text, action, cls = '', disabled = false) => {
    const b = node('button', text, cls); b.type = 'button'; b.disabled = disabled;
    b.addEventListener('click', () => { if (!b.disabled && !disposed) action(); }); return b;
  };
  const image = (name, alt, cls = '') => {
    const n = node('img', '', cls); n.src = `assets/${name}.png`; n.alt = alt; return n;
  };
  const cancel = () => { generation++; d.player.stop(); busy = false; heard = false; };
  const commit = next => {
    try { d.repository.save(next); data = next; saveError = ''; return true; }
    catch { saveError = 'Progress could not be saved. Please ask a parent to check browser storage.'; return false; }
  };
  const resetPop = () => { popIndex = null; popAnimations.forEach(a => a.cancel()); popAnimations = []; };
  const go = target => { resetShoe(); resetTrain(); resetPop(); cancel(); screen = target; question = null; feedback = ''; render(); };
  function growth(container) {
    const names = ['Seedling', 'Little sprout', 'Leaf buddy', 'Flower crown', 'Garden wings', 'Rainbow friend'];
    const milestones = [0, 8, 20, 40, 70, 110], stage = d.growthStage(data.growthPoints);
    const panel = node('div', '', 'companion'); panel.append(image('meshy_pip', 'Pip the smiling sprout'));
    const text = node('div', `Pip: ${names[stage]} · ${data.growthPoints} growth`, 'growth');
    const meter = node('progress'); meter.max = 1;
    meter.value = stage < 5 ? Math.min(Math.max((data.growthPoints - milestones[stage]) / (milestones[stage + 1] - milestones[stage]), 0), 1) : 1;
    meter.setAttribute('aria-label', `Pip’s growth toward ${names[stage < 5 ? stage + 1 : stage]}`);
    meter.setAttribute('aria-valuetext', `${Math.floor(meter.value * 100)} percent`);
    text.append(meter);
    if (stage < 5) text.append(node('p', `${milestones[stage + 1] - data.growthPoints} growth to ${names[stage + 1]}`, 'small'));
    panel.append(text); container.append(panel);
  }
  async function listen() {
    if (!question || disposed || feedback) return;
    cancel(); const token = generation; helped ||= data.muted;
    const text = d.questionPrompt(game, question.target, trial);
    const clips = d.resolveClipTexts(text, d.indexKeys);
    if (data.muted || !clips) { helped = true; heard = false; render(); return; }
    busy = true; render();
    let completed = false;
    try { completed = await d.player.play(clips); } catch { completed = false; }
    if (token !== generation || disposed || screen !== 'play') return;
    busy = false; heard = completed; helped ||= !completed; started = now(); render();
  }
  function next() {
    if (trainPending() || shoePending()) return;
    resetTrain(); resetPop();
    if (game === 'train' && feedback.startsWith('Let’s look together:')) train = [];
    cancel(); feedback = ''; selectedTwin = null; trial = data.letterTrial;
    skill = d.questionSkill(game, trial);
    question = d.nextQuestion(data, {skill, nowMs: now()});
    if (!question) { screen = 'picker'; render(); return; }
    if (skill === 'upper') question = {target: question.target.toUpperCase(), choices: question.choices.map(x => x.toUpperCase())};
    // Native resetTwinItems shuffles once per new question, never on a redraw.
    twinItems = game === 'twins' ? question.choices.flatMap(w => [w, w]) : [];
    for (let i = twinItems.length - 1; i > 0; i--) {
      const j = Math.floor((d.randomUnit || Math.random)() * (i + 1));
      [twinItems[i], twinItems[j]] = [twinItems[j], twinItems[i]];
    }
    helped = data.muted; started = now(); shoe = d.resetShoeAfterCelebration(shoe);
    if (shoe === 0) shoeTransitionId = 0;
    screen = 'play'; render(); void listen();
  }
  function choose(id) {
    if (!d.availableGames(data.lettersEnabled).some(x => x.id === id)) return;
    resetShoe(); resetTrain(); game = id; race = d.startRace(d.createRace()); train = []; shoe = 0; next();
  }
  function answer(word, index, source = null) {
    if (busy || feedback || !question || screen !== 'play' || disposed) return;
    if (game === 'race' && race.phase !== 'running') return;
    const correct = word === question.target;
    if (game === 'twins' && correct) {
      if (selectedTwin === null) { selectedTwin = index; render(); return; }
      if (selectedTwin === index) return;
    }
    const independent = d.isIndependentAnswer({usedVisualHelp: helped, muted: data.muted,
      voiceReady: heard, game, choices: question.choices});
    let updated = d.recordAnswer(data, question.target, correct, Math.max(0, now() - started), {skill, independent, nowMs: now()});
    if (correct && game === 'letters') updated = d.plantGardenFlower(updated, question.target).data;
    // Keep the round locked on a storage failure; never record the same tap twice.
    if (correct) stars++;
    feedback = correct ? (stars % 5 === 0 ? 'Five bright stars!' : 'You found it!') : `Let’s look together: ${question.target}`;
    if (game === 'train' && correct) { train = d.advanceTrain(train, question.target, true); trainCarsAlpha = 1; trainArrival.start(question.target, train.length, source); feedback = train.length === 5 ? 'Five in a row! Fireworks!' : `All aboard, ${question.target}!`; }
    if (correct && game === 'twins') { shoe = d.advanceShoeLacing(shoe, true); shoeTransitionId++; }
    if (game === 'race') race = d.answerRace(race, correct);
    commit(updated); cancel();
    if (d.shouldStartWordPopBurst(game, word, question.target, false)) { popIndex = index; popStarted = now(); }
    render();
  }
  function toolbar(shell, title, back) {
    const bar = node('div', '', 'toolbar'); bar.append(button('Back', () => go(back), 'light'), node('h1', title)); shell.append(bar);
  }
  function renderParent(shell) {
    toolbar(shell, 'Parent area', 'home');
    const panel = node('div', '', 'panel');
    panel.append(node('h2', 'Practice settings'));
    const count = node('select');
    for (const n of [3, 4, 5]) { const opt = node('option', `${n} choices`); opt.value = String(n); count.append(opt); }
    count.value = String(data.choices); count.addEventListener('change', () => { commit(d.updatePracticeSettings(data, {choices: Number(count.value)})); render(); });
    panel.append(count, button(data.muted ? 'Sound off — turn on' : 'Sound on — turn off', () => { commit(d.updatePracticeSettings(data, {muted: !data.muted})); render(); }, 'light'),
      button(data.lettersEnabled ? 'Letter Garden enabled' : 'Letter Garden disabled', () => { commit(d.updatePracticeSettings(data, {lettersEnabled: !data.lettersEnabled})); render(); }, 'light'));
    shell.append(panel);
    for (const set of data.sets) {
      const row = node('div', '', 'panel'); row.append(node('h2', set.name), node('p', set.words.join(', '), 'words'),
        button(set.active ? 'Active — turn off' : 'Inactive — turn on', () => { commit(d.toggleWordSet(data, set.id, !set.active)); render(); }, 'light'));
      const form = node('form'), name = node('input'), words = node('textarea');
      name.type = 'text'; name.value = set.name; name.setAttribute('aria-label', 'Set name'); words.value = set.words.join(', '); words.setAttribute('aria-label', 'Words');
      const save = node('button', 'Save this list'); save.type = 'submit'; form.append(name, words, save);
      form.addEventListener('submit', e => { e.preventDefault(); const result = d.saveWordSet(data, {id: set.id, name: name.value, wordsText: words.value});
        if (result.error) { saveError = result.error; render(); } else { commit(result.data); render(); } });
      row.append(form); shell.append(row);
    }
    const create = node('form', '', 'panel'), name = node('input'), words = node('textarea');
    name.type = 'text'; name.setAttribute('aria-label', 'New list name'); words.setAttribute('aria-label', 'New list words');
    const add = node('button', 'Add word list'); add.type = 'submit'; create.append(node('h2', 'New word list'), name, words, add);
    create.addEventListener('submit', e => { e.preventDefault(); const result = d.saveWordSet(data, {id: null, newId: d.newId(), name: name.value, wordsText: words.value});
      if (result.error) { saveError = result.error; render(); } else { commit(result.data); render(); } }); shell.append(create);
    shell.append(node('p', 'Progress stays in this browser for your family. It does not import Sofia’s personal saves.', 'privacy'));
  }
  function render() {
    if (disposed) return;
    shoeNextButton = null;
    if (screen !== 'play' || game !== 'twins') resetShoe();
    stopTrainFrame();
    popAnimations.forEach(a => a.cancel()); popAnimations = [];
    raceHorses = []; raceClock = null;
    const shell = node('div', '', `shell ${screen === 'home' ? 'home' : ''}`);
    if (saveError) shell.append(node('p', saveError, 'warning'));
    if (screen === 'home') {
      shell.append(node('h1', 'Sophia’s Sight Words'));
      const hero = node('div', '', 'hero'); hero.append(image('meshy_garden', 'Word garden', 'garden'), image('meshy_pip', 'Pip', 'pip')); shell.append(hero);
      growth(shell); shell.append(node('p', 'Listen. Discover. Grow.'));
      const actions = node('div', '', 'actions'); actions.append(button('▶ PLAY', () => go('picker')), button('For grown-ups', () => go('gate'), 'secondary')); shell.append(actions);
    } else if (screen === 'picker') {
      toolbar(shell, 'Choose a game!', 'home'); const grid = node('div', '', 'grid');
      for (const g of d.availableGames(data.lettersEnabled)) { const b = button(g.title, () => choose(g.id), 'tile'); b.append(node('span', g.mark, 'mark')); grid.append(b); }
      shell.append(grid); if (!d.activeWords(data).length) shell.append(node('p', 'Ask a grown-up to turn on a word list.', 'warning'));
    } else if (screen === 'gate') {
      toolbar(shell, 'For grown-ups', 'home'); const form = node('form', '', 'gate'), input = node('input'); input.type = 'text'; input.inputMode = 'numeric'; input.setAttribute('aria-label', 'Answer');
      const submit = node('button', 'Open parent area'); submit.type = 'submit';
      form.append(node('p', `What is ${gate[0]} + ${gate[1]}?`), input, submit);
      form.addEventListener('submit', e => { e.preventDefault(); if (d.parentGateMatches(...gate, input.value)) { saveError = ''; go('parent'); } else { saveError = 'Try again'; render(); } }); shell.append(form);
    } else if (screen === 'parent') renderParent(shell);
    else if (screen === 'play' && question) {
      toolbar(shell, d.gameTitle(game), 'picker'); shell.className += ` game ${game}`;
      shell.append(button(data.muted ? 'Sound off' : 'Sound on', () => {
        const muted = !data.muted;
        if (commit(d.updatePracticeSettings(data, {muted}))) {
          if (muted || busy) helped = true;
          cancel();
        }
        render();
      }, 'light'));
      // A target becomes visible only when listening evidence cannot be independent.
      shell.append(node('h2', helped || feedback || game === 'twins' ? d.questionPrompt(game, question.target, trial) : 'Listen, then choose.'));
      if (helped) shell.append(node('p', 'Visual practice: this prompt is muted, unsupported, or could not play. It will not count as independent listening.', 'warning'));
      shell.append(button('Listen again', () => void listen(), 'light', busy || !!feedback), button('Show me', () => { helped = true; render(); }, 'light', busy || !!feedback));
      if (game !== 'train') {
        const count = node('p', `★ ${stars}`, 'star-count');
        count.setAttribute('aria-label', `${stars} stars`); shell.append(count);
      }
      if (game === 'race') {
        const track = node('div', '', 'tracks');
        for (let i = 0; i < 16; i++) { const lane = node('div', '', 'lane'); const horse = image(`unicorn_${i}_0`, i === 0 ? 'Your unicorn' : `Unicorn ${i}`); horse.style.left = `${(i === 0 ? race.progress : d.opponentProgress(i - 1, race.elapsedMs)) * 85}%`; lane.append(horse); track.append(lane); raceHorses.push(horse); }
        raceClock = node('p', race.phase === 'finished' ? `Finished in place ${race.place}` : `${d.secondsLeft(race)} seconds left`);
        shell.append(track, raceClock);
      }
      if (game === 'train') {
        const scene = node('div', '', 'train train-track'); scene.setAttribute('aria-label', `Train has ${train.length} word cars`);
        Object.assign(scene.style, {display:'block',height:'125px',minHeight:'125px',background:'transparent'});
        const count = node('p', `${train.length} / 5`, 'train-count'); count.setAttribute('aria-label', `${train.length} of 5 word cars`);
        train.forEach((word, i) => {
          const car = node('span', word, 'wagon'); car.setAttribute('aria-label', `Train car ${i + 1}: ${word}`);
          Object.assign(car.style, {position:'absolute',width:'1px',height:'1px',padding:'0',border:'0',overflow:'hidden',clipPath:'inset(50%)'});
          scene.append(car);
        });
        const canvas = node('canvas', '', 'train-canvas'); canvas.setAttribute('aria-hidden','true');
        Object.assign(canvas.style, {position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'1'});
        Object.assign(shell.style, {position:'relative',display:'block',background:'transparent'}); shell.append(count, scene, canvas);
        trainView = {canvas,scene,shell,nextButton:null};
      }
      if (game === 'twins') {
        // Keep the original WebGL scene and identity across harmless DOM redraws.
        if (!shoeScene) shoeScene = createShoeScene({document:doc, stage:shoe,
          transitionId:shoeTransitionId, now:() => view.performance.now(), onState:shoeStateChanged});
        shoeScene.update(shoe, shoeTransitionId);
        const area = node('div', '', 'shoe-scene-area'); area.append(shoeScene.element); shell.append(area);
        // shoe-complete bubbles from the retained scene with {stage, transitionId}.
        // Future feedback scheduling can subscribe without writing learning twice.
      }
      if (game === 'letters') {
        const garden = node('section', '', 'letter-garden');
        garden.setAttribute('aria-label', `Sophia's flower garden: ${data.gardenTotal} flowers grown. ${Math.min(data.gardenFlowers.length, 7)} flowers visible.`);
        garden.style.background = '#e5f3e4'; garden.style.borderRadius = '22px'; garden.style.padding = '12px';
        garden.append(node('p', `Sophia's flower garden • ${data.gardenTotal} grown`));
        const bed = node('div', '', 'garden-bed');
        bed.style.display = 'flex'; bed.style.justifyContent = 'center'; bed.style.borderBottom = '10px solid #b86640';
        if (!data.gardenFlowers.length) bed.append(node('p', 'Find a letter to grow your first flower!'));
        const names = ['Phalaenopsis orchid', 'Vanda orchid', 'toad lily', 'lady slipper orchid'];
        for (const species of data.gardenFlowers.slice(-7)) {
          const index = Math.min(Math.max(species, 0), 3);
          const flower = node('div', '', 'garden-flower');
          flower.setAttribute('role', 'img'); flower.setAttribute('aria-label', names[index]);
          flower.style.width = 'min(76px, 14.285%)'; flower.style.aspectRatio = '1';
          flower.style.backgroundImage = 'url("assets/garden_flowers.png")'; flower.style.backgroundSize = '200% 200%';
          flower.style.backgroundPosition = `${index % 2 ? 100 : 0}% ${index >= 2 ? 100 : 0}%`;
          bed.append(flower);
        }
        garden.append(bed); shell.append(garden);
      }
      const choices = node('div', '', 'choices');
      const values = game === 'twins' ? twinItems : question.choices;
      values.forEach((word, i) => {
        const b = button(word, () => answer(word, i, trainSource(b)), `choice${selectedTwin === i ? ' correct' : ''}${feedback && word === question.target ? ' correct' : ''}`, busy || !!feedback || (game === 'race' && race.phase === 'finished'));
        if (game === 'pop') {
          // Native choiceButton fades/expands only the shell; the word stays readable.
          b.style.position = 'relative'; b.style.isolation = 'isolate'; b.style.background = 'transparent';
          b.style.border = '0'; b.style.boxShadow = 'none'; b.style.transform = 'none'; b.style.opacity = '1';
          const layer = node('span', '', 'pop-shell'); layer.setAttribute('aria-hidden', 'true');
          Object.assign(layer.style, {position:'absolute',inset:'0',zIndex:'-1',pointerEvents:'none',borderRadius:'inherit',background:i === popIndex ? '#dcefd9' : '#e2f4f1',border:`3px solid ${i === popIndex ? 'var(--teal)' : '#cfe5db'}`,boxShadow:'0 4px 0 #cadcd7'});
          if (i === popIndex) {
            const duration = d.wordPopBurstDurationSeconds * 1000;
            const reduced = !!d.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
            const progress = reduced ? 1 : Math.min(1, Math.max(0, now() - popStarted) / duration);
            const state = d.wordPopBurstPresentation(progress), end = d.wordPopBurstPresentation(1);
            layer.style.transform = `scale(${end.shellScale})`; layer.style.opacity = String(end.shellAlpha);
            if (progress < 1 && layer.animate) popAnimations.push(layer.animate([
              {transform:`scale(${state.shellScale})`,opacity:state.shellAlpha},
              {transform:`scale(${end.shellScale})`,opacity:end.shellAlpha}
            ], {duration:duration * (1 - progress),easing:'linear',fill:'forwards'}));
          }
          b.append(layer);
        }
        choices.append(b);
      });
      shell.append(choices, node('p', busy ? 'Listening…' : feedback, 'status'));
      if (feedback || (game === 'race' && race.phase === 'finished')) {
        const nextButton = button(game === 'race' && race.phase === 'finished' ? 'Race again' : 'Next', () => {
          if (trainPending() || shoePending()) return;
          if (game === 'race' && race.phase === 'finished') race = d.startRace(d.createRace());
          if (train.length === 5) train = []; next();
        }, '', trainPending() || shoePending());
        if (game === 'twins') shoeNextButton = nextButton;
        if (trainView) trainView.nextButton = nextButton;
        shell.append(nextButton);
      }
      growth(shell);
    }
    root.replaceChildren(shell);
    shoeScene?.redraw();
    if (trainView) drawTrainFrame();
  }
  const tick = () => {
    if (!disposed && screen === 'play' && game === 'race' && !busy && !feedback && doc.visibilityState !== 'hidden') {
      race = d.tickRace(race, 100);
      if (race.phase === 'finished') render();
      else {
        raceHorses.forEach((horse, i) => { horse.style.left = `${(i === 0 ? race.progress : d.opponentProgress(i - 1, race.elapsedMs)) * 85}%`; });
        if (raceClock) raceClock.textContent = `${d.secondsLeft(race)} seconds left`;
      }
    }
  };
  const timer = d.setInterval ? d.setInterval(tick, 100) : null;
  const hidden = () => { if (doc.visibilityState === 'hidden') { cancel(); helped = true; render(); } else if (trainView) render(); };
  const resized = () => { if (trainView && !disposed) { render(); } };
  view?.addEventListener('resize', resized);
  doc.addEventListener('visibilitychange', hidden); render();
  return {dispose() { disposed = true; resetShoe(); resetTrain(); resetPop(); cancel(); view?.removeEventListener('resize', resized); doc.removeEventListener('visibilitychange', hidden); if (timer !== null) d.clearInterval(timer); },
    getState() { return structuredClone({data, screen, game, feedback, busy, heard, helped, shoe:shoeScene?.state ?? null}); }};
}

export async function bootstrap(root, env = globalThis) {
  const names = ['words', 'family-data', 'storage', 'question', 'record', 'games', 'prompts', 'rewards', 'garden', 'audio', 'player', 'race', 'parent-settings', 'resources', 'narration-paths'];
  const modules = await Promise.all(names.map(name => import(`./${name}.mjs`)));
  const d = Object.assign({}, ...modules);
  const {sets, index} = await d.loadSiteResources(path => env.fetch(path, {cache: 'no-cache'}));
  d.repository = d.createRepository(env.localStorage, () => d.freshData(sets));
  d.player = d.createClipPlayer(d.narrationUrls(index), url => new env.Audio(url));
  d.indexKeys = new Set(Object.keys(index)); d.setInterval = env.setInterval.bind(env); d.clearInterval = env.clearInterval.bind(env);
  d.matchMedia = env.matchMedia?.bind(env);
  d.newId = () => env.crypto.randomUUID();
  return mountApp(root, d);
}
if (typeof document !== 'undefined') {
  const root = document.getElementById('app');
  if (root) bootstrap(root).catch(() => { const p = document.createElement('p'); p.className = 'warning'; p.textContent = 'The game could not open. Your saved progress has been preserved. Please try reloading or ask a grown-up for help.'; root.replaceChildren(p); });
}
