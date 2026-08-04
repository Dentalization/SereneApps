import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import {
  assertCaseOwner,
  buildRadiographSectionLabels,
  suggestRadiographType,
  validateCaseItem,
} from '../src/services/xCoreAnalysisCaseDomain.js';
import { buildXCoreAnalysisPdf } from '../src/services/xCoreAnalysisPdf.js';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');

const items = [
  { id: '11111111-1111-4111-8111-111111111111', study_id: '1', series_uid: 'pa-11', viewer_type: '2d', radiograph_type: 'PERIAPICAL', tooth_numbers: ['11'], display_order: 0, findings: 'Temuan 11', measurements: [] },
  { id: '22222222-2222-4222-8222-222222222222', study_id: '2', series_uid: 'pa-36', viewer_type: '2d', radiograph_type: 'PERIAPICAL', tooth_numbers: ['36'], display_order: 1, findings: 'Temuan 36', measurements: [{ label: '3.2 mm' }] },
  { id: '33333333-3333-4333-8333-333333333333', study_id: '3', series_uid: 'pano', viewer_type: '2d', radiograph_type: 'PANORAMIC', tooth_numbers: [], display_order: 2, findings: 'Temuan panoramik', measurements: [] },
];

test('validates structured radiograph metadata and mandatory periapical teeth', () => {
  assert.deepEqual(validateCaseItem(items[0]).errors, []);
  assert.match(validateCaseItem({ ...items[0], tooth_numbers: [] }).errors.join(' '), /requires at least one tooth/i);
  assert.match(validateCaseItem({ ...items[0], tooth_numbers: ['99'] }).errors.join(' '), /invalid FDI/i);
  assert.equal(suggestRadiographType({ description: 'Dental OPG panoramic' }), 'PANORAMIC');
});

test('builds ordered labels for two periapicals and one panoramic', () => {
  assert.deepEqual(buildRadiographSectionLabels(items), [
    'Periapikal 1 — Gigi 11',
    'Periapikal 2 — Gigi 36',
    'Panoramik',
  ]);
});

test('case access rejects a different user', () => {
  assert.doesNotThrow(() => assertCaseOwner('10', 10n));
  assert.throws(() => assertCaseOwner('10', '11'), (error) => error.status === 403 && error.code === 'case_access_denied');
});

test('multi-image PDF consumes every stored item rather than an active image', async () => {
  const imageBuffers = new Map(items.map((item) => [item.id, PNG]));
  const pdf = await buildXCoreAnalysisPdf({
    snapshot: {
      id: 'case-id', report_id: 'report-id', report_version: 1, generated_at: new Date(0).toISOString(),
      patient_id: '20', created_by: '10', title: 'Kasus 3 citra', clinical_data: { complaint: 'nyeri' },
      conclusion: 'Kesimpulan', patient: { name: 'Pasien Uji' }, creator: { name: 'Dokter Uji' }, items,
    },
    imageBuffers,
  });
  assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
  assert.ok(pdf.length > 3000);
  const pageObjects = pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || [];
  assert.equal(pageObjects.length, 5, 'cover + three ordered image sections + conclusion');
});

test('single-image analysis remains supported', async () => {
  const single = [items[0]];
  assert.deepEqual(validateCaseItem(single[0]).errors, []);
  const pdf = await buildXCoreAnalysisPdf({
    snapshot: {
      id: 'single-case', report_id: 'single-report', report_version: 1, generated_at: new Date(0).toISOString(),
      patient_id: '20', created_by: '10', title: 'Kasus satu citra', clinical_data: {}, conclusion: '',
      patient: { name: 'Pasien Uji' }, creator: { name: 'Dokter Uji' }, items: single,
    },
    imageBuffers: new Map([[single[0].id, PNG]]),
  });
  assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
  assert.equal((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length, 3);
});

test('migration defines immutable report versions and per-item snapshots', async () => {
  const migration = await fs.readFile(new URL('../migrations/060_create_xcore_analysis_cases.sql', import.meta.url), 'utf8');
  assert.match(migration, /UNIQUE \(case_id, version\)/);
  assert.match(migration, /annotation_snapshot JSONB NOT NULL/);
  assert.match(migration, /measurement_snapshot JSONB NOT NULL/);
  assert.match(migration, /UNIQUE \(report_id, display_order\)/);
});
