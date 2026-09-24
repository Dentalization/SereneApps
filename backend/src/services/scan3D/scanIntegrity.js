export const EXPERIMENTAL_CAPABILITIES = Object.freeze({ measurement: 'visualization_only', measurementCapability: 'visualization_only', units: 'arbitrary', scale: { status: 'unvalidated', units: 'arbitrary' }, validated: false, clinicallyValidated: false, clinicalStatus: 'experimental', scaleValidated: false, diagnosticUseAllowed: false });

export function clientScanMetadata(metadata = {}) {
  // Never accept asset registries, engine results, processing state or clinical claims from a client.
  const clean = {};
  for (const key of ['captureProtocol', 'device', 'platform', 'capturedAt', 'clientCaptureMetadata']) {
    if (metadata[key] !== undefined) clean[key] = metadata[key];
  }
  return clean;
}

export function publicScanMetadata(metadata = {}) {
  const { processingJob, ...publicMetadata } = metadata;
  const real = metadata.provenance?.geometrySource === 'image_derived' && metadata.provenance?.synthetic === false;
  const measuredAcquisition = metadata.lidra?.version === 'lidra_measured_v2'
    && ['ready', 'rejected', 'unavailable'].includes(metadata.lidra?.status);
  const assets = real ? Object.fromEntries(Object.entries(metadata.assets || {}).map(([key, asset]) => [key,
    asset && typeof asset === 'object' ? { ...asset, capabilities: EXPERIMENTAL_CAPABILITIES, clinicalStatus: 'experimental' } : asset])) : null;
  return { ...publicMetadata, assets, metrics: real ? metadata.metrics || null : null,
    lidra: measuredAcquisition ? { ...metadata.lidra, qualityScore: null } : {
      status: 'unavailable', qualityScore: null, coverage: { status: 'unavailable' },
      reason: 'No measured acquisition report is registered; legacy estimates are not measurements',
    }, cameraTrajectory: real ? metadata.cameraTrajectory || [] : [], confidence: null, capabilities: EXPERIMENTAL_CAPABILITIES, clinicalStatus: 'experimental',
    provenance: metadata.provenance || { geometrySource: 'unknown', synthetic: null, validationStatus: 'unvalidated' },
    processingJob: processingJob ? publicJob(processingJob) : undefined };
}

export function publicJob(job = {}) {
  const { leaseToken, leaseExpiresAt, logs, ...safe } = job;
  return { ...safe, logs: (logs || []).map(({ timestamp, stage, level, event }) => ({ timestamp, stage, level, event })) };
}

export function scanEvent(job, event, details = {}) {
  return [...(job?.logs || []), { timestamp: new Date().toISOString(), event, stage: event, level: 'info', ...details }].slice(-200);
}

export function associatedPatientWhere(dentistId) {
  return { roles: { has: 'patient' }, OR: [
    { patientAppointments: { some: { dentistId } } },
    { patientStudies: { some: { dentistId } } },
  ] };
}

export function assertRealSegmentation(data, scanId) {
  const p = data?.provenance;
  if (!p || p.synthetic !== false || p.source !== 'image_derived' || p.scanId !== String(scanId)
      || !p.method || !p.modelVersion || !p.createdAt || !Array.isArray(data.instances)
      || /procedural|placeholder|arch_heuristic/i.test(`${p.method} ${p.engine || ''}`)
      || data.instances.some(instance => !instance.geometryReference || !instance.source || !instance.segmentationMethod
        || (instance.fdi != null && !instance.fdiMethod))) {
    throw Object.assign(new Error('Tooth segmentation is unavailable: no verified tooth instance implementation'), { status: 503, code: 'SEGMENTATION_UNAVAILABLE' });
  }
  return data;
}
