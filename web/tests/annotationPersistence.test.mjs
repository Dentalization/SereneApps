import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildAnnotationDraftBackup,
  getDeletedAnnotationIds,
  readAnnotationDraftBackup,
} from '../src/pages/dentist-portal/x-core/utils/annotationPersistence.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const persistentAnnotationsSource = () => fs.readFileSync(
  path.join(__dirname, '../src/pages/dentist-portal/x-core/hooks/usePersistentAnnotations.js'),
  'utf8'
);

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

test('persistent annotation hook loads backend records for read-only studies but blocks saves', () => {
  const source = persistentAnnotationsSource();
  const studyIdForApiBody = source.slice(
    source.indexOf('const studyIdForApi'),
    source.indexOf('const studyKeyForStorage')
  );
  assert.match(studyIdForApiBody, /if \(!study\) return '';/);
  assert.doesNotMatch(studyIdForApiBody, /readOnly/);
  assert.match(source, /const canSaveToApi = Boolean\(studyId && !study\?\.readOnly\);/);
  assert.match(source, /if \(!enabled \|\| !canSaveToApi \|\| !seriesUid \|\| !viewerType \|\| !hydratedRef\.current\)/);
});
