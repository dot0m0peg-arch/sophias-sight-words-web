// Browser orchestration; collaborators keep the native learning rules in their modules.
export function mountApp(root, d) {
  const doc = root.ownerDocument;
  let data = d.repository.load(), screen = 'home', game = 'find', question = null;
  let generation = 0, busy = false, heard = false, helped = false, feedback = '', saveError = '';
  let skill = 'word', trial = 0, started = 0, disposed = false, selectedTwin = null, twinItems = [];
  let race = d.createRace(), train = [], shoe = 0, gate = [4, 7];
  const now = d.now || Date.now;
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
  const go = target => { cancel(); screen = target; question = null; feedback = ''; render(); };
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
    screen = 'play'; render(); void listen();
  }
  function choose(id) {
    if (!d.availableGames(data.lettersEnabled).some(x => x.id === id)) return;
    game = id; race = d.startRace(d.createRace()); train = []; shoe = 0; next();
  }
  function answer(word, index) {
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
    feedback = correct ? 'You found it!' : `Let’s look together: ${question.target}`;
    if (game === 'train' && correct) { train = d.advanceTrain(train, question.target, true); feedback = train.length === 5 ? 'Five in a row! Fireworks!' : `All aboard, ${question.target}!`; }
    if (correct && game === 'twins') shoe = d.advanceShoeLacing(shoe, true);
    if (game === 'race') race = d.answerRace(race, correct);
    commit(updated); cancel(); render();
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
      if (game === 'race') {
        const track = node('div', '', 'tracks');
        for (let i = 0; i < 16; i++) { const lane = node('div', '', 'lane'); const horse = image(`unicorn_${i}_0`, i === 0 ? 'Your unicorn' : `Unicorn ${i}`); horse.style.left = `${(i === 0 ? race.progress : d.opponentProgress(i - 1, race.elapsedMs)) * 85}%`; lane.append(horse); track.append(lane); }
        shell.append(track, node('p', race.phase === 'finished' ? `Finished in place ${race.place}` : `${d.secondsLeft(race)} seconds left`));
      }
      if (game === 'train') {
        const scene = node('div', '', 'train'); scene.setAttribute('aria-label', `Train has ${train.length} word cars`);
        const count = node('p', `${train.length} / 5`, 'train-count'); count.setAttribute('aria-label', `${train.length} of 5 word cars`);
        train.forEach((word, i) => { const car = node('span', word, 'wagon'); car.setAttribute('aria-label', `Train car ${i + 1}: ${word}`); scene.append(car); });
        shell.append(count, scene);
      }
      if (game === 'twins') {
        const titles = ['Ready to tie!', 'Cross the laces', 'Make a snug knot', 'Make one bunny ear', 'Wrap the other lace', 'Push a loop through', 'Pull both ears', 'A beautiful bow!'];
        const scene = node('section', '', 'shoe-instructions');
        scene.setAttribute('aria-label', `Shoe tying: ${titles[shoe]}`);
        scene.append(node('h3', titles[shoe]), node('p', shoe === 0 ? 'Match a pair to begin' : `Step ${shoe} of 7`, 'scene'));
        shell.append(scene);
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
      values.forEach((word, i) => choices.append(button(word, () => answer(word, i), `choice${selectedTwin === i ? ' correct' : ''}${feedback && word === question.target ? ' correct' : ''}`, busy || !!feedback || (game === 'race' && race.phase === 'finished'))));
      shell.append(choices, node('p', busy ? 'Listening…' : feedback, 'status'));
      if (feedback || (game === 'race' && race.phase === 'finished')) shell.append(button(game === 'race' && race.phase === 'finished' ? 'Race again' : 'Next', () => { if (game === 'race' && race.phase === 'finished') race = d.startRace(d.createRace()); if (train.length === 5) train = []; next(); }));
      growth(shell);
    }
    root.replaceChildren(shell);
  }
  const tick = () => {
    if (!disposed && screen === 'play' && game === 'race' && !busy && !feedback && doc.visibilityState !== 'hidden') { race = d.tickRace(race, 100); render(); }
  };
  const timer = d.setInterval ? d.setInterval(tick, 100) : null;
  const hidden = () => { if (doc.visibilityState === 'hidden') { cancel(); helped = true; render(); } };
  doc.addEventListener('visibilitychange', hidden); render();
  return {dispose() { disposed = true; cancel(); doc.removeEventListener('visibilitychange', hidden); if (timer !== null) d.clearInterval(timer); },
    getState() { return structuredClone({data, screen, game, feedback, busy, heard, helped}); }};
}

export async function bootstrap(root, env = globalThis) {
  const names = ['words', 'family-data', 'storage', 'question', 'record', 'games', 'prompts', 'rewards', 'garden', 'audio', 'player', 'race', 'parent-settings', 'resources', 'narration-paths'];
  const modules = await Promise.all(names.map(name => import(`./${name}.mjs`)));
  const d = Object.assign({}, ...modules);
  const {sets, index} = await d.loadSiteResources(path => env.fetch(path, {cache: 'no-cache'}));
  d.repository = d.createRepository(env.localStorage, () => d.freshData(sets));
  d.player = d.createClipPlayer(d.narrationUrls(index), url => new env.Audio(url));
  d.indexKeys = new Set(Object.keys(index)); d.setInterval = env.setInterval.bind(env); d.clearInterval = env.clearInterval.bind(env);
  d.newId = () => env.crypto.randomUUID();
  return mountApp(root, d);
}
if (typeof document !== 'undefined') {
  const root = document.getElementById('app');
  if (root) bootstrap(root).catch(() => { const p = document.createElement('p'); p.className = 'warning'; p.textContent = 'The game could not open. Your saved progress has been preserved. Please try reloading or ask a grown-up for help.'; root.replaceChildren(p); });
}
