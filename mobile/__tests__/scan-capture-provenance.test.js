import { buildScanCaptureMetadata } from '../src/utils/scanCaptureMetadata';

test('requested camera settings never become actual FPS, codec or media resolution', () => {
  const result = buildScanCaptureMetadata({ platform: 'ios', osVersion: '18', requested: { resolution: '1080p', facing: 'back' },
    startedAt: '2026-09-24T00:00:00Z', elapsedMs: 4321, sizeInBytes: 1000, viewport: { width: 300, height: 600 } });
  expect(result.requested.resolution).toBe('1080p');
  expect(result.media.resolution).toBeNull();
  expect(result.media.fps).toBeNull();
  expect(result.media.durationMs).toBeNull();
  expect(result.observed.elapsedDurationMs).toBe(4321);
  expect(result.observed.durationSource).toBe('client_monotonic_elapsed_estimate');
  expect(result.observed.fileSizeBytes).toBe(1000);
  expect(result.serverVerified).toBe(false);
  expect(result.device).toEqual({ model: null });
});

test('unreadable file size stays unavailable instead of an invented bitrate estimate', () => {
  const result = buildScanCaptureMetadata({ sizeInBytes: 0, elapsedMs: NaN });
  expect(result.observed.fileSizeBytes).toBeNull();
  expect(result.observed.elapsedDurationMs).toBeNull();
});
