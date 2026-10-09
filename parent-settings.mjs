import {parseWords} from './words.mjs';
export function saveWordSet(data, edit) {
  const name = edit.name.trim();
  if (!name) return {data, error: 'Give this set a name.'};
  const words = parseWords(edit.wordsText);
  if (!words.length) return {data, error: 'Add at least one word.'};
  const index = data.sets.findIndex(set => set.id === edit.id);
  const existing = index >= 0 ? data.sets[index] : null;
  const saved = {id: existing ? existing.id : edit.newId, name, words,
    active: existing ? existing.active : true};
  const sets = data.sets.slice();
  if (existing) sets[index] = saved;
  else sets.push(saved);
  return {data: {...data, sets}, error: null};
}
export function toggleWordSet(data, id, active) {
  return {...data, sets: data.sets.map(set => set.id === id ? {...set, active} : set)};
}
export function updatePracticeSettings(data, patch) {
  const next = {...data};
  if ([3,4,5].includes(patch.choices)) next.choices = patch.choices;
  for (const key of ['muted','lettersEnabled']) {
    if (typeof patch[key] === 'boolean') next[key] = patch[key];
  }
  return next;
}
export const parentGateMatches = (left, right, text) => text.trim() === String(left + right);
