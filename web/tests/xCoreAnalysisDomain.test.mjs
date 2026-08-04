import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { caseItemLabel, reportRenderStatusPresentation, resolveSeriesUid, suggestRadiographType } from '../src/features/x-core-analysis/domain.mjs';
import {
  annotationAnchor,
  canonicalRenderDimensions,
  markerPlacements,
} from '../src/features/x-core-analysis/canonicalReportRender.mjs';

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

test('canonical report dimensions preserve source ratio and ignore viewport dimensions', () => {
  const portrait = canonicalRenderDimensions(900, 1500);
  const landscape = canonicalRenderDimensions(3200, 1200);
  assert.deepEqual({ width: portrait.width, height: portrait.height }, { width: 900, height: 1500 });
  assert.deepEqual({ width: landscape.width, height: landscape.height }, { width: 2400, height: 900 });
  assert.equal(landscape.width / landscape.height, 3200 / 1200);
});

test('marker placement follows normalized image coordinates instead of viewport coordinates', () => {
  const annotation = { id: 'a1', type: 'arrow', coordinates: { start: { x: 0.1, y: 0.2 }, end: { x: 0.75, y: 0.6 } } };
  assert.deepEqual(annotationAnchor(annotation), { x: 0.75, y: 0.6 });
  const first = markerPlacements([{ id: 'f1', marker_number: 1, annotation_id: 'a1' }], [annotation], 1000, 500, 1)[0];
  const second = markerPlacements([{ id: 'f1', marker_number: 1, annotation_id: 'a1' }], [annotation], 2000, 1000, 2)[0];
  assert.equal(first.anchor.x, second.anchor.x);
  assert.equal(first.anchor.y, second.anchor.y);
  assert.equal(first.marker_number, 1);
});

test('markers without paired annotations are omitted from canonical render', () => {
  assert.deepEqual(markerPlacements([{ id: 'f1', marker_number: 1, annotation_id: 'missing' }], [], 1000, 800), []);
});

test('workspace exposes explicit ready, stale, invalid, legacy, and missing render states', () => {
  assert.equal(reportRenderStatusPresentation('READY').label, 'Siap untuk laporan');
  assert.equal(reportRenderStatusPresentation('STALE').label, 'Perlu diperbarui');
  assert.equal(reportRenderStatusPresentation('INVALID').tone, 'invalid');
  assert.equal(reportRenderStatusPresentation('LEGACY').tone, 'legacy');
  assert.equal(reportRenderStatusPresentation().tone, 'missing');
});

test('uses structured series identity and only suggests metadata classification', () => {
  assert.equal(resolveSeriesUid({ series_uid: 'uid-1', id: 99 }), 'uid-1');
  assert.equal(suggestRadiographType({ originalName: 'patient_pa_11.dcm' }), 'PERIAPICAL');
  assert.equal(suggestRadiographType({ description: 'unknown scan' }), 'OTHER');
});

test('analysis cases open volume studies through the canonical slice composite flow', async () => {
  const source = await fs.readFile(new URL('../src/pages/dentist-portal/x-core/components/Viewer3D.jsx', import.meta.url), 'utf8');
  assert.match(source, /analysisCaseContext\s*&&\s*activeStudy\?\.selectedSeriesType === '3D Volume'/);
  assert.match(source, /setViewMode\('slice'\)/);
});
