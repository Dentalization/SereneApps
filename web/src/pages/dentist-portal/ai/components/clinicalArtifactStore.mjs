export const CLINICAL_ARTIFACT_DB_NAME = 'serene.deepdental.clinical-artifacts';
export const CLINICAL_ARTIFACT_STORE_NAME = 'sessionArtifacts';
export const CLINICAL_ARTIFACT_DB_VERSION = 1;
export const DEFAULT_CLINICAL_ARTIFACT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — matches cloud session retention

function createEntry({ sessionId, entry, now, retentionMs }) {
  const createdAt = now();
  return {
    id: `${sessionId}:${createdAt}:${Math.random().toString(36).slice(2)}`,
    sessionId,
    createdAt,
    retention: {
      policy: 'local-indexeddb-session-cache',
      expiresAt: createdAt + retentionMs,
    },
    ...entry,
  };
}

export function createMemoryClinicalArtifactStore({
  now = () => Date.now(),
  retentionMs = DEFAULT_CLINICAL_ARTIFACT_RETENTION_MS,
} = {}) {
  const entries = new Map();

  return {
    async saveSessionEntry(sessionId, entry = {}) {
      const saved = createEntry({ sessionId, entry, now, retentionMs });
      entries.set(saved.id, saved);
      return saved;
    },
    async getSessionEntries(sessionId) {
      return Array.from(entries.values())
        .filter((entry) => entry.sessionId === sessionId && entry.retention.expiresAt > now())
        .sort((a, b) => a.createdAt - b.createdAt);
    },
    async deleteSession(sessionId) {
      for (const [id, entry] of entries) {
        if (entry.sessionId === sessionId) entries.delete(id);
      }
    },
    async clearAll() {
      entries.clear();
    },
    async purgeExpired() {
      const current = now();
      for (const [id, entry] of entries) {
        if (entry.retention.expiresAt <= current) entries.delete(id);
      }
    },
  };
}

function openClinicalArtifactDb(indexedDBImpl) {
  return new Promise((resolve, reject) => {
    const request = indexedDBImpl.open(CLINICAL_ARTIFACT_DB_NAME, CLINICAL_ARTIFACT_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CLINICAL_ARTIFACT_STORE_NAME)) {
        const store = db.createObjectStore(CLINICAL_ARTIFACT_STORE_NAME, { keyPath: 'id' });
        store.createIndex('sessionId', 'sessionId', { unique: false });
        store.createIndex('expiresAt', 'retention.expiresAt', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export function createIndexedDbClinicalArtifactStore({
  indexedDBImpl = typeof indexedDB !== 'undefined' ? indexedDB : null,
  now = () => Date.now(),
  retentionMs = DEFAULT_CLINICAL_ARTIFACT_RETENTION_MS,
} = {}) {
  if (!indexedDBImpl) {
    return createMemoryClinicalArtifactStore({ now, retentionMs });
  }

  const dbPromise = openClinicalArtifactDb(indexedDBImpl);

  return {
    async saveSessionEntry(sessionId, entry = {}) {
      const db = await dbPromise;
      const saved = createEntry({ sessionId, entry, now, retentionMs });
      const tx = db.transaction(CLINICAL_ARTIFACT_STORE_NAME, 'readwrite');
      tx.objectStore(CLINICAL_ARTIFACT_STORE_NAME).put(saved);
      await txDone(tx);
      return saved;
    },
    async getSessionEntries(sessionId) {
      const db = await dbPromise;
      const tx = db.transaction(CLINICAL_ARTIFACT_STORE_NAME, 'readonly');
      const index = tx.objectStore(CLINICAL_ARTIFACT_STORE_NAME).index('sessionId');
      const request = index.getAll(sessionId);
      const result = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
      await txDone(tx);
      return result
        .filter((entry) => entry.retention?.expiresAt > now())
        .sort((a, b) => a.createdAt - b.createdAt);
    },
    async deleteSession(sessionId) {
      const db = await dbPromise;
      const tx = db.transaction(CLINICAL_ARTIFACT_STORE_NAME, 'readwrite');
      const store = tx.objectStore(CLINICAL_ARTIFACT_STORE_NAME);
      const index = store.index('sessionId');
      const request = index.getAllKeys(sessionId);
      request.onsuccess = () => {
        (request.result || []).forEach((key) => store.delete(key));
      };
      await txDone(tx);
    },
    async clearAll() {
      const db = await dbPromise;
      const tx = db.transaction(CLINICAL_ARTIFACT_STORE_NAME, 'readwrite');
      tx.objectStore(CLINICAL_ARTIFACT_STORE_NAME).clear();
      await txDone(tx);
    },
    async purgeExpired() {
      const db = await dbPromise;
      const current = now();
      const tx = db.transaction(CLINICAL_ARTIFACT_STORE_NAME, 'readwrite');
      const store = tx.objectStore(CLINICAL_ARTIFACT_STORE_NAME);
      const request = store.index('expiresAt').openCursor(IDBKeyRange.upperBound(current));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        cursor.delete();
        cursor.continue();
      };
      await txDone(tx);
    },
  };
}

export const clinicalArtifactStore = createIndexedDbClinicalArtifactStore();
