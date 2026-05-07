import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createMemoryClinicalArtifactStore,
  DEFAULT_CLINICAL_ARTIFACT_RETENTION_MS,
} from '../src/pages/dentist-portal/ai/components/clinicalArtifactStore.mjs';

test('clinical artifact store saves session entries with explicit retention metadata', async () => {
  const store = createMemoryClinicalArtifactStore({ now: () => 1000 });

  await store.saveSessionEntry('session-1', {
    userImageName: 'scan.jpg',
    userImageBlob: { type: 'image/jpeg', size: 1234 },
    visualFindings: { detections: [{ label: 'caries' }] },
  });

  const entries = await store.getSessionEntries('session-1');
  assert.equal(entries.length, 1);
  assert.equal(entries[0].sessionId, 'session-1');
  assert.equal(entries[0].retention.expiresAt, 1000 + DEFAULT_CLINICAL_ARTIFACT_RETENTION_MS);
  assert.equal(entries[0].visualFindings.detections[0].label, 'caries');
});

test('clinical artifact store clears sensitive entries when a session is deleted', async () => {
  const store = createMemoryClinicalArtifactStore({ now: () => 1000 });

  await store.saveSessionEntry('session-1', { userImageName: 'a.jpg' });
  await store.saveSessionEntry('session-2', { userImageName: 'b.jpg' });
  await store.deleteSession('session-1');

  assert.deepEqual(await store.getSessionEntries('session-1'), []);
  assert.equal((await store.getSessionEntries('session-2')).length, 1);
});

test('clinical artifact store purges expired entries', async () => {
  let now = 1000;
  const store = createMemoryClinicalArtifactStore({ now: () => now });

  await store.saveSessionEntry('session-1', { userImageName: 'a.jpg' });
  now = 1000 + DEFAULT_CLINICAL_ARTIFACT_RETENTION_MS + 1;
  await store.purgeExpired();

  assert.deepEqual(await store.getSessionEntries('session-1'), []);
});
