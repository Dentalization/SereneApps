const VOLUME_CACHE_VERSION = 2;
const VOLUME_CACHE_SIZE = 3;

function makeLRUCache(maxSize) {
  const map = new Map();

  return {
    has: (key) => map.has(key),
    get(key) {
      if (!map.has(key)) return undefined;
      const value = map.get(key);
      map.delete(key);
      map.set(key, value);
      return value;
    },
    set(key, value) {
      if (map.has(key)) map.delete(key);
      if (map.size >= maxSize) map.delete(map.keys().next().value);
      map.set(key, value);
    },
    delete: (key) => map.delete(key),
    clear: () => map.clear(),
    get size() {
      return map.size;
    },
    keys: () => map.keys(),
  };
}

const browserWindow = typeof window !== 'undefined' ? window : null;
const fallbackCache = makeLRUCache(VOLUME_CACHE_SIZE);

if (browserWindow && (!browserWindow.__volumeCache || browserWindow.__volumeCacheVersion !== VOLUME_CACHE_VERSION)) {
  browserWindow.__volumeCache = makeLRUCache(VOLUME_CACHE_SIZE);
  browserWindow.__volumeCacheVersion = VOLUME_CACHE_VERSION;
  console.log('[volumeCache] Cache initialized - version', VOLUME_CACHE_VERSION);
}

const volumeCache = browserWindow ? browserWindow.__volumeCache : fallbackCache;

export { VOLUME_CACHE_VERSION, volumeCache };
