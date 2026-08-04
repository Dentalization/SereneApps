import assert from 'node:assert/strict';
import test from 'node:test';
import { caseItemLabel, resolveSeriesUid, suggestRadiographType } from '../src/features/x-core-analysis/domain.mjs';

test('labels two independent periapicals and a panoramic in display order', () => {
  const items = [
    { id: 'a', radiograph_type: 'PERIAPICAL', tooth_numbers: ['11'] },
    { id: 'b', radiograph_type: 'PERIAPICAL', tooth_numbers: ['36'] },
    { id: 'c', radiograph_type: 'PANORAMIC', tooth_numbers: [] },
  ];
  assert.deepEqual(items.map((item) => caseItemLabel(item, items)), [
    'Periapikal 1 — Gigi 11', 'Periapikal 2 — Gigi 36', 'Panoramik',
  ]);
});

test('uses structured series identity and only suggests metadata classification', () => {
  assert.equal(resolveSeriesUid({ series_uid: 'uid-1', id: 99 }), 'uid-1');
  assert.equal(suggestRadiographType({ originalName: 'patient_pa_11.dcm' }), 'PERIAPICAL');
  assert.equal(suggestRadiographType({ description: 'unknown scan' }), 'OTHER');
});

