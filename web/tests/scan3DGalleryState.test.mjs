import assert from 'node:assert/strict';
import test from 'node:test';
import { formatGalleryStudy, scan3DGalleryState } from '../src/pages/dentist-portal/x-core/components/scan3DGalleryState.mjs';

const baseStudy = {
  id: '1468',
  modality: '3D_SCAN',
  patientId: '10089',
  patient: { name: 'Test Patient' },
  originalName: 'Dental 3D Scan - Test Patient',
  metadata: {},
};

test('failed or pending 3D capture is not represented as a reconstructed mesh', () => {
  const failed = scan3DGalleryState({ ...baseStudy, status: 'failed', metadata: {
    processingJob: { failureReason: 'ACQUISITION_UNAVAILABLE' },
  } });
  assert.equal(failed.isReady, false);
  assert.equal(failed.seriesType, '3D Capture');
  assert.equal(failed.previewUrl, null);
  assert.equal(failed.seriesStatus, 'failed');
  assert.equal(failed.failureReason, 'ACQUISITION_UNAVAILABLE');

  const waiting = scan3DGalleryState({ ...baseStudy, status: 'created' });
  assert.equal(waiting.seriesStatus, 'pending');
  assert.equal(waiting.isCapturePending, true);
  assert.equal(waiting.previewUrl, null);
});

test('ready status requires an image-derived, checksummed mesh before Gallery shows mesh', () => {
  const unverified = scan3DGalleryState({ ...baseStudy, status: 'ready' });
  assert.equal(unverified.isReady, false);
  assert.equal(unverified.seriesStatus, 'failed');

  const verified = scan3DGalleryState({ ...baseStudy, status: 'ready', metadata: {
    provenance: { geometrySource: 'image_derived', synthetic: false },
    qualityAssessment: { status: 'candidate', anatomicalCoverage: 'unavailable' },
    assets: { mesh: { fileName: 'mesh.obj', sha256: 'a'.repeat(64) } },
  } });
  assert.equal(verified.isReady, true);
  assert.equal(verified.seriesType, '3D Mesh Eksperimental');
  assert.equal(verified.previewUrl, '/api/v1/x-core/3d-scans/1468/assets/preview.png');
});

test('sparse quality assessment never appears as a ready mesh in Gallery', () => {
  const scan = { ...baseStudy, status: 'ready', metadata: {
    provenance: { geometrySource: 'image_derived', synthetic: false },
    qualityAssessment: { status: 'insufficient', registeredFrames: 2, vertexCount: 86, faceCount: 94 },
    processingJob: { failureCode: 'RECONSTRUCTION_GEOMETRY_INSUFFICIENT', failureReason: 'Mesh belum memadai' },
    assets: { mesh: { fileName: 'mesh.obj', sha256: 'a'.repeat(64) } },
  } };
  const state = scan3DGalleryState(scan);
  assert.equal(state.isReady, false);
  assert.equal(state.isInsufficient, true);
  assert.equal(state.previewUrl, null);
  assert.equal(formatGalleryStudy(scan).statusDisplay, 'Mesh Belum Memadai');
});

test('linked patient name does not become the scan filename', () => {
  const formatted = formatGalleryStudy({ ...baseStudy, status: 'failed' });
  assert.equal(formatted.patientName, 'Test Patient');
  assert.equal(formatted.originalName, 'Dental 3D Scan - Test Patient');
  assert.equal(formatted.patientIdDisplay, 'P-10089');
  assert.equal(formatted.statusDisplay, 'Failed');
});

test('an unverified live status never shows a cached mesh as ready', () => {
  const state = scan3DGalleryState({ ...baseStudy, status: 'ready', scanStatusUnavailable: true, metadata: {
    provenance: { geometrySource: 'image_derived', synthetic: false },
    assets: { mesh: { fileName: 'mesh.obj', sha256: 'a'.repeat(64) } },
  } });
  assert.equal(state.seriesStatus, 'unavailable');
  assert.equal(state.isReady, false);
  assert.equal(state.previewUrl, null);
});
