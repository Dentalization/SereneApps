import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAnnotationDraftBackup,
  getDeletedAnnotationIds,
  readAnnotationDraftBackup,
} from '../src/pages/dentist-portal/x-core/utils/annotationPersistence.mjs';

test('computes explicit deletes without treating unrelated current ids as deleted', () => {
  assert.deepEqual(getDeletedAnnotationIds(new Set(['a1', 'a2', 'a3']), [
    { id: 'a1' },
    { id: 'a3' },
    { id: 'new-local' },
  ]), ['a2']);
});

test('draft backup round-trips pending annotations for next-load recovery', () => {
  const backup = buildAnnotationDraftBackup({
    version: 1,
    updatedAt: '2026-04-22T00:00:00.000Z',
    annotations: [{ id: 'region-1', type: 'region', coordinates: { path: [] } }],
    deletedAnnotationIds: ['old-annotation'],
  });

  assert.deepEqual(readAnnotationDraftBackup(JSON.stringify(backup), 1), backup);
});

test('ignores stale draft backup versions', () => {
  const backup = buildAnnotationDraftBackup({ version: 1, annotations: [{ id: 'a1' }] });
  assert.equal(readAnnotationDraftBackup(JSON.stringify(backup), 2), null);
});
