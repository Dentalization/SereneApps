import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildClinicalHistoryItems,
  createWorkspaceRaceGuard,
  filterClinicalHistoryItems,
  getCaseStatusMeta,
  validateWorkspaceImages,
} from '../src/pages/dentist-portal/ai/components/caseWorkspaceModels.mjs';

test('clinical history merges chat sessions and case-linked sessions with case metadata', () => {
  const sessions = [
    {
      id: 'session-1',
      created_at: '2026-05-07T08:00:00.000Z',
      updated_at: '2026-05-07T09:00:00.000Z',
      metadata: { title: 'Chat-only oral hygiene question' },
      last_message_preview: 'Patient asked about sensitivity',
    },
    {
      id: 'session-2',
      created_at: '2026-05-07T08:30:00.000Z',
      updated_at: '2026-05-07T10:00:00.000Z',
      metadata: { title: 'Old title from chat' },
    },
  ];
  const cases = [
    {
      id: 'case-1',
      session_id: 'session-2',
      title: 'Bitewing caries case',
      patient_name: 'Ayu L.',
      patient_code: 'P-882',
      status: 'pending_clinician_review',
      updated_at: '2026-05-07T10:05:00.000Z',
      image_count: 3,
      timeline_linked: true,
      has_low_quality_images: true,
      last_message_preview: 'AI suggested caries marker',
      finding_labels: ['caries', 'periapical radiolucency'],
    },
  ];

  const items = buildClinicalHistoryItems({ sessions, cases });

  assert.equal(items.length, 2);
  assert.equal(items[0].type, 'case');
  assert.equal(items[0].id, 'case-1');
  assert.equal(items[0].sessionId, 'session-2');
  assert.equal(items[0].patientLabel, 'Ayu L.');
  assert.equal(items[0].imageCount, 3);
  assert.equal(items[0].timelineLinked, true);
  assert.equal(items[0].hasLowQualityImages, true);
  assert.equal(items[1].type, 'chat');
  assert.equal(items[1].title, 'Chat-only oral hygiene question');
});

test('clinical history filters by status, images, low quality, and finding search terms', () => {
  const items = buildClinicalHistoryItems({
    sessions: [],
    cases: [
      { id: 'case-draft', title: 'Draft', status: 'draft', image_count: 0, finding_labels: [] },
      { id: 'case-low', title: 'Low quality case', patient_code: 'PX-9', status: 'pending_clinician_review', image_count: 2, has_low_quality_images: true, finding_labels: ['caries'] },
      { id: 'case-export', title: 'Exported perio report', status: 'exported', image_count: 4, timeline_linked: true, finding_labels: ['periodontitis'] },
    ],
  });

  assert.deepEqual(filterClinicalHistoryItems(items, { filter: 'draft' }).map((item) => item.id), ['case-draft']);
  assert.deepEqual(filterClinicalHistoryItems(items, { filter: 'has_images' }).map((item) => item.id), ['case-low', 'case-export']);
  assert.deepEqual(filterClinicalHistoryItems(items, { filter: 'low_quality' }).map((item) => item.id), ['case-low']);
  assert.deepEqual(filterClinicalHistoryItems(items, { query: 'caries' }).map((item) => item.id), ['case-low']);
  assert.deepEqual(filterClinicalHistoryItems(items, { query: 'PX-9' }).map((item) => item.id), ['case-low']);
});

test('workspace image validation blocks invalid files and flags duplicate images before upload', () => {
  const files = [
    { name: 'a.jpg', type: 'image/jpeg', size: 1024, lastModified: 1 },
    { name: 'a-copy.jpg', type: 'image/jpeg', size: 1024, lastModified: 1 },
    { name: 'notes.pdf', type: 'application/pdf', size: 500, lastModified: 2 },
    { name: 'huge.png', type: 'image/png', size: 20 * 1024 * 1024, lastModified: 3 },
  ];

  const result = validateWorkspaceImages(files, {
    maxSizeBytes: 12 * 1024 * 1024,
    existingFingerprints: new Set(),
  });

  assert.equal(result.accepted.length, 1);
  assert.equal(result.rejected.length, 3);
  assert.deepEqual(result.rejected.map((entry) => entry.reason), [
    'duplicate_image',
    'unsupported_file_type',
    'file_too_large',
  ]);
});

test('race guard ignores stale session and case loads after users switch quickly', () => {
  const guard = createWorkspaceRaceGuard();
  const first = guard.start('session-a');
  const second = guard.start('session-b');

  assert.equal(first.isActive(), false);
  assert.equal(second.isActive(), true);
  assert.equal(guard.currentKey(), 'session-b');

  second.cancel();
  assert.equal(second.isActive(), false);
});

test('case status metadata uses explicit clinical labels', () => {
  assert.equal(getCaseStatusMeta('pending_clinician_review').label, 'Pending review');
  assert.equal(getCaseStatusMeta('verified').label, 'Verified');
  assert.equal(getCaseStatusMeta('exported').label, 'Exported');
  assert.equal(getCaseStatusMeta('unknown-status').label, 'Draft');
});
