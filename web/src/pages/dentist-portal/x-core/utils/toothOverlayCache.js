const TOOTH_OVERLAY_CACHE_VERSION = 1;
const TOOTH_OVERLAY_CACHE_SIZE = 4;

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
const fallbackCache = makeLRUCache(TOOTH_OVERLAY_CACHE_SIZE);

if (
  browserWindow
  && (!browserWindow.__toothOverlayCache || browserWindow.__toothOverlayCacheVersion !== TOOTH_OVERLAY_CACHE_VERSION)
) {
  browserWindow.__toothOverlayCache = makeLRUCache(TOOTH_OVERLAY_CACHE_SIZE);
  browserWindow.__toothOverlayCacheVersion = TOOTH_OVERLAY_CACHE_VERSION;
}

const toothOverlayCache = browserWindow ? browserWindow.__toothOverlayCache : fallbackCache;

export { TOOTH_OVERLAY_CACHE_VERSION, toothOverlayCache };
