import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOperatorCaptureReview } from '../src/services/scan3D/operatorCaptureReview.js';
import { parseVideoProbe } from '../src/services/scan3D/videoInspection.js';

test('operator physical-target review remains a bounded, unverified declaration', () => {
  const review = normalizeOperatorCaptureReview({ targetType: 'physical_cast',
    physicalTargetVisible: true, crownSurfacesVisible: true,
    reviewedViews: ['left', 'front', 'front', 'right'], reviewedAt: '2026-09-25T03:00:00Z',
    status: 'clinically_validated', anatomicalCoverage: 100 });
  assert.equal(review.status, 'operator_declared_unverified');
  assert.equal(review.physicalTargetServerVerified, false);
  assert.equal(review.anatomicalCoverage, 'unavailable');
  assert.deepEqual(review.reviewedViews, ['left', 'front', 'right']);
  for (const invalid of [
    { ...review, targetType: 'screen' },
    { ...review, physicalTargetVisible: false },
    { ...review, reviewedViews: ['left', 'FDI_11'] },
    { ...review, reviewedAt: 'x'.repeat(1000) },
  ]) assert.throws(() => normalizeOperatorCaptureReview(invalid), { code: 'INVALID_CAPTURE_REVIEW' });
});

test('server probe records only available frame count and display rotation', () => {
  const base = { streams: [{ codec_type: 'video', codec_name: 'h264', width: 1080, height: 1920,
    avg_frame_rate: '30/1', nb_frames: '450', side_data_list: [{ rotation: -90 }] }],
    format: { duration: '15', format_name: 'mov,mp4,m4a,3gp,3g2,mj2' } };
  const result = parseVideoProbe(base);
  assert.equal(result.frameCount, 450);
  assert.equal(result.rotationDegrees, 270);
  assert.equal(result.fps, 30);
  assert.equal(result.inspectedBy, 'ffprobe');
  const unknown = parseVideoProbe({ ...base, streams: [{ ...base.streams[0], nb_frames: undefined,
    side_data_list: undefined }] });
  assert.equal(unknown.frameCount, null);
  assert.equal(unknown.rotationDegrees, null);
});
