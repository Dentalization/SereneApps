/** Client observations are untrusted; the server inspects the uploaded media. */
export function buildScanCaptureMetadata({ platform, osVersion, deviceModel, requested, sizeInBytes,
  startedAt, elapsedMs, viewport }) {
  return {
    schemaVersion: 'capture-1',
    source: 'client_capture',
    serverVerified: false,
    device: { model: deviceModel || null }, // Never collect serial, advertising ID or device ID.
    platform,
    osVersion: String(osVersion ?? ''),
    captureTimestamp: startedAt,
    requested: { ...requested },
    observed: {
      fileSizeBytes: Number.isFinite(sizeInBytes) && sizeInBytes > 0 ? sizeInBytes : null,
      elapsedDurationMs: Number.isFinite(elapsedMs) ? Math.max(0, Math.round(elapsedMs)) : null,
      durationSource: 'client_monotonic_elapsed_estimate',
      orientation: viewport?.width > viewport?.height ? 'landscape' : 'portrait',
      orientationSource: 'screen_dimensions_not_video_rotation',
    },
    media: { resolution: null, fps: null, durationMs: null, codec: null, container: null, lens: null,
      stabilization: null, exposure: null, autofocus: null },
    mediaStatus: 'awaiting_server_inspection',
  };
}
