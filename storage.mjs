const KEY = 'sophia.website.family.v1';
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const plain = value => object(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const natural = value => Number.isSafeInteger(value) && value >= 0;
function valid(data) {
  return plain(data) && Array.isArray(data.sets) && data.sets.every(set =>
    object(set) && typeof set.id === 'string' && typeof set.name === 'string' &&
    Array.isArray(set.words) && set.words.every(word => typeof word === 'string') &&
    typeof set.active === 'boolean') &&
    ['progress', 'letterProgress'].every(key => object(data[key]) &&
      Object.values(data[key]).every(object)) &&
    Number.isInteger(data.choices) && data.choices >= 3 && data.choices <= 5 &&
    typeof data.lettersEnabled === 'boolean' && typeof data.muted === 'boolean' &&
    ['trial', 'letterTrial', 'growthPoints', 'gardenTotal'].every(key => natural(data[key])) &&
    data.growthPoints <= 1000000 && Array.isArray(data.gardenFlowers) &&
    data.gardenFlowers.length <= 24 && data.gardenFlowers.every(value =>
      Number.isInteger(value) && value >= 0 && value <= 3);
}
export function createRepository(storage, freshData) {
  return {
    load() {
      let envelope;
      try {
        const raw = storage.getItem(KEY);
        if (raw === null) return freshData();
        envelope = JSON.parse(raw);
      } catch {
        return freshData();
      }
      if (object(envelope) && Number.isInteger(envelope.version) && envelope.version > 1)
        throw new Error('Saved family data uses a newer website version');
      return object(envelope) && envelope.version === 1 && valid(envelope.data)
        ? envelope.data : freshData();
    },
    save(data) {
      if (!valid(data)) throw new TypeError('Invalid family data');
      const serialized = JSON.stringify({version: 1, data});
      storage.setItem(KEY, serialized);
    }
  };
}
