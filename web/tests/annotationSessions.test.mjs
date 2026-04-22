import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deleteLocalAnnotationSession,
  getAnnotationSessionStorageKey,
  loadLocalAnnotationSessions,
  mergeAnnotationSessions,
  saveLocalAnnotationSession,
} from '../src/pages/dentist-portal/x-core/utils/annotationSessions.mjs';

const makeStorage = () => {
  const store = new Map();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
};

test('local annotation sessions save, load, and delete by stable scope', () => {
  global.window = { localStorage: makeStorage() };
  const scope = {
    studyKey: 'folder/with spaces',
    seriesUid: '1.2.3',
    viewerType: 'slice',
  };

  const key = getAnnotationSessionStorageKey(scope);
  assert.match(key, /^xcore\.annotationSessions\./);

  const saved = saveLocalAnnotationSession(scope, {
    note: 'initial review',
    annotations: [{ id: 'a1', type: 'arrow' }],
    featureState: { axis: 'axial', slice_index: 12 },
  });

  assert.equal(loadLocalAnnotationSessions(scope).length, 1);
  assert.equal(loadLocalAnnotationSessions(scope)[0].id, saved.id);

  deleteLocalAnnotationSession(scope, saved.id);
  assert.deepEqual(loadLocalAnnotationSessions(scope), []);
});

test('session merge keeps backend and local snapshots sorted newest first', () => {
  const merged = mergeAnnotationSessions(
    [{ id: 'server-old', snapshot_at: '2026-04-21T00:00:00.000Z' }],
    [{ id: 'local-new', snapshot_at: '2026-04-22T00:00:00.000Z', local: true }]
  );

  assert.deepEqual(merged.map((snapshot) => snapshot.id), ['local-new', 'server-old']);
});

