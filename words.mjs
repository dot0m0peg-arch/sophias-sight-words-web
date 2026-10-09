export function parseWords(text) {
  const trim = '.:!?"()[]';
  const seen = new Set();
  const result = [];
  for (let word of text.split(/[\s,;]+/)) {
    while (word && trim.includes(word[0])) word = word.slice(1);
    while (word && trim.includes(word.at(-1))) word = word.slice(0, -1);
    if (!word) continue;
    word = word.toLowerCase() === 'i' ? 'I' : word.toLowerCase();
    if (!seen.has(word)) { seen.add(word); result.push(word); }
  }
  return result;
}
export function activeWords(data) {
  const seen = new Set();
  const result = [];
  for (const set of data.sets) {
    if (!set.active) continue;
    for (const word of set.words) {
      const trimmed = word.trim();
      const key = trimmed.toLowerCase();
      if (trimmed && !seen.has(key)) { seen.add(key); result.push(trimmed); }
    }
  }
  return result;
}
export const growthStage = (points) => {
  const stages = [0, 8, 20, 40, 70, 110];
  for (let i = stages.length - 1; i >= 0; i--) {
    if (points >= stages[i]) return i;
  }
  return 0;
};
