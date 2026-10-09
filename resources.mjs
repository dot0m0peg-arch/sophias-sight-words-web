const nonempty = value => typeof value === 'string' && value.trim().length > 0;
function validSets(sets) {
  if (!Array.isArray(sets) || !sets.length) return false;
  const ids = new Set();
  return sets.every(set => {
    if (!set || !nonempty(set.id) || !nonempty(set.name) || ids.has(set.id) ||
        !Array.isArray(set.words) || !set.words.length || !set.words.every(nonempty)) return false;
    ids.add(set.id);
    return true;
  });
}
function validIndex(index) {
  if (!index || typeof index !== 'object' || Array.isArray(index) || !Object.keys(index).length) return false;
  return Object.entries(index).every(([word, path]) => {
    if (!nonempty(word) || !nonempty(path) || /[:\\?#\x00]/.test(path) || !path.endsWith('.mp3')) return false;
    const parts = path.split('/');
    if (parts.some(part => !part || part === '.' || part === '..')) return false;
    return parts.length === 1 || parts[0] === 'narration';
  });
}
export async function loadSiteResources(fetcher) {
  async function load(path, validate) {
    try {
      const response = await fetcher(path);
      if (!response || response.ok !== true) throw Error('HTTP failure');
      const data = await response.json();
      if (!validate(data)) throw Error('Invalid resource data');
      return data;
    } catch (error) {
      throw Error(`Cannot load ${path}: ${error?.message || String(error)}`);
    }
  }
  const [sets, index] = await Promise.all([
    load('sets.json', validSets), load('narration/index.json', validIndex)
  ]);
  return {sets, index};
}
