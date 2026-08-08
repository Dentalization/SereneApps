import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import sharp from 'sharp';
import {
  assertCaseOwner,
  buildRadiographSectionLabels,
  computeSourceInstanceKey,
  suggestRadiographType,
  validateCaseItem,
} from '../src/services/xCoreAnalysisCaseDomain.js';
import {
  computeAnalysisFingerprint,
  normalizeRenderMetadata,
  normalizeStructuredFindings,
  resolveRenderFreshness,
  validateFindingAnnotationLinks,
} from '../src/services/xCoreAnalysisReportDomain.js';
import { buildXCoreAnalysisPdf } from '../src/services/xCoreAnalysisPdf.js';
import { validateRenderImage } from '../src/services/xCoreAnalysisReportStorage.js';
import { buildXCoreExampleFixture } from './fixtures/xcoreExampleFixture.js';

const annotationIds = ['annotation-pa-11', 'annotation-pa-36', 'annotation-pano'];
const items = [
  { id: '11111111-1111-4111-8111-111111111111', study_id: '1', series_uid: 'pa-11', viewer_type: '2d', radiograph_type: 'PERIAPICAL', tooth_numbers: ['11'], display_order: 0 },
  { id: '22222222-2222-4222-8222-222222222222', study_id: '2', series_uid: 'pa-36', viewer_type: '2d', radiograph_type: 'PERIAPICAL', tooth_numbers: ['36'], display_order: 1 },
  { id: '33333333-3333-4333-8333-333333333333', study_id: '3', series_uid: 'pano', viewer_type: '2d', radiograph_type: 'PANORAMIC', tooth_numbers: [], display_order: 2 },
].map((item, index) => ({
  ...item,
  study_date: '2026-08-04',
  title: index === 2 ? 'Panoramik fixture' : `Periapikal fixture ${index + 1}`,
  findings: null,
  structured_findings: [{
    id: `${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}-${index + 1}${index + 1}${index + 1}${index + 1}-4${index + 1}${index + 1}${index + 1}-8${index + 1}${index + 1}${index + 1}-${String(index + 1).repeat(12)}`,
    marker_number: 1,
    annotation_id: annotationIds[index],
    tooth_numbers: item.tooth_numbers,
    region: item.tooth_numbers.length ? `Gigi ${item.tooth_numbers[0]}` : 'Regio posterior',
    title: 'Temuan fixture',
    description: `Uraian temuan fixture ${index + 1}`,
    display_order: 0,
  }],
  annotations: [{ id: annotationIds[index], type: 'circle', coordinates: { start: { x: 0.3, y: 0.3 }, end: { x: 0.5, y: 0.5 } } }],
  measurements: index < 2 ? [{ id: `measurement-${index}`, label: 'Garis referensi', metadata: { value_label: `${index + 3},2 mm` } }] : [],
}));

const toDataUrl = (buffer) => `data:image/png;base64,${buffer.toString('base64')}`;

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

test('marker numbers are stable, unique per image, and may restart on the next image', () => {
  const first = normalizeStructuredFindings(items[0].structured_findings);
  const reloaded = normalizeStructuredFindings(JSON.parse(JSON.stringify(first)));
  const second = normalizeStructuredFindings(items[1].structured_findings);
  assert.equal(reloaded[0].marker_number, 1);
  assert.equal(second[0].marker_number, 1);
  assert.throws(() => normalizeStructuredFindings([...first, { ...first[0], id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }]), (error) => error.code === 'duplicate_finding_marker');
});

test('every report marker must reference an annotation in the same radiograph', () => {
  assert.deepEqual(validateFindingAnnotationLinks(items[0].structured_findings, items[0].annotations), []);
  const issues = validateFindingAnnotationLinks(items[0].structured_findings, []);
  assert.equal(issues[0].code, 'finding_annotation_not_found');
});

test('render metadata keeps CLEAN and ANNOTATED distinct and validates marker count and scope', () => {
  const base = {
    report_render_version: 2,
    case_item_id: items[0].id,
    study_id: items[0].study_id,
    series_uid: items[0].series_uid,
    viewer_type: items[0].viewer_type,
    marker_count: 1,
  };
  assert.equal(normalizeRenderMetadata({ ...base, marker_count: 0 }, { item: items[0], renderType: 'CLEAN' }).render_type, 'CLEAN');
  assert.equal(normalizeRenderMetadata(base, { item: items[0], renderType: 'ANNOTATED' }).render_type, 'ANNOTATED');
  assert.throws(
    () => normalizeRenderMetadata({ ...base, marker_count: 0 }, { item: items[0], renderType: 'ANNOTATED' }),
    (error) => error.code === 'render_marker_count_mismatch',
  );
  assert.throws(
    () => normalizeRenderMetadata({ ...base, case_item_id: items[1].id }, { item: items[0], renderType: 'ANNOTATED' }),
    (error) => error.code === 'render_scope_mismatch',
  );
  assert.throws(
    () => normalizeRenderMetadata({ ...base, render_type: 'CLEAN' }, { item: items[0], renderType: 'ANNOTATED' }),
    (error) => error.code === 'render_scope_mismatch',
  );
  // Phase 6: instance-level mismatch check
  assert.throws(
    () => normalizeRenderMetadata(
      { ...base, source_instance_key: 'series:pa-11:image:1' },
      { item: { ...items[0], source_instance_key: 'series:pa-11:image:0' }, renderType: 'ANNOTATED' }
    ),
    (error) => error.code === 'render_scope_mismatch',
  );
  const normalizedWithKind = normalizeRenderMetadata(
    { ...base, source_kind: 'STATIC_JPG' },
    { item: { ...items[0], source_kind: 'STATIC_JPG' }, renderType: 'ANNOTATED' }
  );
  assert.equal(normalizedWithKind.source_kind, 'STATIC_JPG');
});

test('fingerprint changes after annotation or finding changes and marks render stale', () => {
  const fingerprint = computeAnalysisFingerprint(items[0], items[0].annotations);
  const changed = computeAnalysisFingerprint({ ...items[0], structured_findings: [{ ...items[0].structured_findings[0], description: 'Berubah' }] }, items[0].annotations);
  assert.notEqual(fingerprint, changed);
  assert.equal(resolveRenderFreshness({ latestAnnotated: { analysis_fingerprint: fingerprint }, currentFingerprint: changed }).status, 'STALE');
  assert.equal(resolveRenderFreshness({ latestAnnotated: { analysis_fingerprint: fingerprint }, currentFingerprint: fingerprint }).status, 'READY');
});

test('render validation rejects 1x1 and uniform images', async () => {
  const onePixel = await sharp({ create: { width: 1, height: 1, channels: 3, background: '#000000' } }).png().toBuffer();
  await assert.rejects(() => validateRenderImage(toDataUrl(onePixel)), (error) => error.code === 'render_dimensions_too_small');
  const uniform = await sharp({ create: { width: 512, height: 512, channels: 3, background: '#050505' } }).png().toBuffer();
  await assert.rejects(() => validateRenderImage(toDataUrl(uniform)), (error) => error.code === 'render_nearly_uniform');
});

test('valid dark radiograph texture is not rejected as a black placeholder', async () => {
  const noise = Buffer.alloc(512 * 512);
  for (let y = 0; y < 512; y += 1) {
    for (let x = 0; x < 512; x += 1) noise[(y * 512) + x] = 4 + (((Math.floor(x / 8) * 7) + (Math.floor(y / 8) * 11) + ((x * y) % 13)) % 45);
  }
  const dark = await sharp(noise, { raw: { width: 512, height: 512, channels: 1 } }).png().toBuffer();
  const validated = await validateRenderImage(toDataUrl(dark));
  assert.equal(validated.width, 512);
  assert.ok(validated.validation.mean < 32);
  assert.ok(validated.validation.entropy > 2);
});

test('multi-image PDF uses all actual repository fixture images with adaptive orientation', async () => {
  const fixture = await buildXCoreExampleFixture();
  const buffers = [fixture.annotated.pa11, fixture.annotated.pa36, fixture.annotated.pano];
  const metadata = await Promise.all(buffers.map(async (buffer) => {
    const image = await sharp(buffer).metadata();
    return { report_render_version: 2, render_width: image.width, render_height: image.height, marker_count: 1 };
  }));
  const snapshotItems = items.map((item, index) => ({ ...item, render_metadata: metadata[index] }));
  const pdf = await buildXCoreAnalysisPdf({
    snapshot: {
      id: 'case-id', report_id: 'report-id', report_version: 2, report_status: 'DRAFT', generated_at: new Date(0).toISOString(),
      patient_id: '20', created_by: '10', title: 'Kasus 3 citra', clinical_data: { chief_complaint: 'fixture non-klinis' },
      conclusion: 'Kesimpulan fixture', patient: { name: 'Subjek Fixture' }, creator: { name: 'Penguji' }, items: snapshotItems,
    },
    imageBuffers: new Map(snapshotItems.map((item, index) => [item.id, buffers[index]])),
  });
  assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
  assert.ok(pdf.length > 100_000, 'actual radiograph resources should be embedded');
  const source = pdf.toString('latin1');
  assert.equal((source.match(/\/Type\s*\/Page\b/g) || []).length, 5, 'cover + three image sections + conclusion');
  assert.ok((source.match(/\/Subtype\s*\/Image\b/g) || []).length >= 4, 'logo plus three radiographs are embedded');
  assert.match(source, /\/MediaBox\s*\[0 0 841\.89 595\.28\]/, 'panoramic page is landscape A4');
  assert.match(source, /\/MediaBox\s*\[0 0 595\.28 841\.89\]/, 'periapical pages are portrait A4');
});

test('single-image analysis remains supported', async () => {
  const fixture = await buildXCoreExampleFixture();
  const image = await sharp(fixture.annotated.pa11).metadata();
  const single = [{ ...items[0], render_metadata: { render_width: image.width, render_height: image.height } }];
  const pdf = await buildXCoreAnalysisPdf({
    snapshot: {
      id: 'single-case', report_id: 'single-report', report_version: 1, report_status: 'DRAFT', generated_at: new Date(0).toISOString(),
      patient_id: '20', created_by: '10', title: 'Kasus satu citra', clinical_data: {}, conclusion: '',
      patient: { name: 'Subjek Fixture' }, creator: { name: 'Penguji' }, items: single,
    },
    imageBuffers: new Map([[single[0].id, fixture.annotated.pa11]]),
  });
  assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
  assert.equal((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length, 3);
});

test('long findings flow onto continuation pages instead of being clipped', async () => {
  const fixture = await buildXCoreExampleFixture();
  const image = await sharp(fixture.annotated.pa11).metadata();
  const longItem = {
    ...items[0],
    structured_findings: [{
      ...items[0].structured_findings[0],
      description: 'Uraian temuan panjang untuk menguji aliran teks laporan tanpa pemotongan. '.repeat(180),
    }],
    render_metadata: { render_width: image.width, render_height: image.height },
  };
  const pdf = await buildXCoreAnalysisPdf({
    snapshot: {
      id: 'long-case', report_id: 'long-report', report_version: 1, report_status: 'DRAFT', generated_at: new Date(0).toISOString(),
      patient_id: '20', created_by: '10', title: 'Kasus temuan panjang', clinical_data: {}, conclusion: 'Kesimpulan',
      patient: { name: 'Subjek Fixture' }, creator: { name: 'Penguji' }, items: [longItem],
    },
    imageBuffers: new Map([[longItem.id, fixture.annotated.pa11]]),
  });
  const pageCount = (pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length;
  assert.ok(pageCount >= 4, 'a long finding should create at least one continuation page');
});

test('migration preserves legacy pointers and adds immutable typed render history', async () => {
  const migration = await fs.readFile(new URL('../migrations/061_enhance_xcore_report_render.sql', import.meta.url), 'utf8');
  assert.match(migration, /xcore_analysis_case_item_renders/);
  assert.match(migration, /render_type IN \('CLEAN', 'ANNOTATED'\)/);
  assert.match(migration, /UNIQUE \(case_item_id, render_type, checksum, analysis_fingerprint\)/);
  assert.match(migration, /structured_findings JSONB/);
  assert.match(migration, /clean_render_storage_path/);
  assert.doesNotMatch(migration, /DROP TABLE xcore_analysis/);
});

test('computes canonical source instance keys according to precedence rules', () => {
  assert.equal(computeSourceInstanceKey({ series_uid: 'uid-1', sop_instance_uid: 'sop.1.2.3' }), 'sop:sop.1.2.3');
  assert.equal(computeSourceInstanceKey({ series_uid: 'uid-1', sop_instance_uid: 'sop.1.2.3', frame_index: 2 }), 'sop:sop.1.2.3:frame:2');
  assert.equal(computeSourceInstanceKey({ series_uid: 'uid-1', image_index: 5 }), 'series:uid-1:image:5');
  assert.equal(computeSourceInstanceKey({ series_uid: 'uid-1' }), 'series:uid-1:legacy');
});

test('instance-level imaging migration 062 adds columns and unique constraints', async () => {
  const migration = await fs.readFile(new URL('../migrations/062_xcore_instance_level_imaging.sql', import.meta.url), 'utf8');
  assert.match(migration, /ADD COLUMN IF NOT EXISTS sop_instance_uid/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS source_instance_key/);
  assert.match(migration, /xcore_analysis_case_items_instance_unique/);
});

