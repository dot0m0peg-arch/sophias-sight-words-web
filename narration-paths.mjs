export function narrationUrls(index) {
  if (!index || typeof index !== 'object' || Array.isArray(index)) throw new TypeError('Invalid narration index');
  return Object.fromEntries(Object.entries(index).map(([key,path]) => {
    const parts = typeof path === 'string' ? path.split('/') : [];
    if (!key.trim() || typeof path !== 'string' || !path.endsWith('.mp3') ||
        /[:\\?#\x00]/.test(path) || parts.some(p => !p || p === '.' || p === '..') ||
        (parts.length > 1 && parts[0] !== 'narration')) throw Error(`Invalid recording path for ${key}`);
    return [key, parts.length > 1 ? path : `narration/${path}`];
  }));
}
