export const PROCESSING_VERSION = 'scan3d-research-2';

/** Resolve only supported operations. Unsupported options must not silently disappear. */
export function resolveExperimentConfiguration(study, requested = {}) {
  if (!requested || typeof requested !== 'object' || Array.isArray(requested)) throw new Error('Invalid experiment configuration');
  const allowed = ['schemaVersion', 'captureProtocol', 'capture', 'cameraIntrinsics', 'frameSampling', 'reconstruction', 'postProcessing', 'validation'];
  for (const key of Object.keys(requested)) if (!allowed.includes(key)) throw new Error(`Unsupported experiment configuration: ${key}`);
  if (requested.postProcessing?.enabled) throw new Error('Dental post-processing is disabled until an explicit research transform is implemented');
  if (requested.validation?.registration && !['none', 'rigid', 'rigid_icp'].includes(requested.validation.registration)) {
    throw new Error('Only rigid research registration is supported');
  }
  return {
    schemaVersion: '1', captureProtocol: requested.captureProtocol || 'unspecified',
    capture: { device: study.metadata?.captureMetadata || null, verifiedVideo: study.metadata?.video || null,
      requested: requested.capture || null },
    frameSampling: requested.frameSampling || { strategy: 'uniform', maxFrames: 24 },
    ...(requested.cameraIntrinsics ? { cameraIntrinsics: requested.cameraIntrinsics } : {}),
    reconstruction: { engine: requested.reconstruction?.engine || 'opencv_sparse_sfm',
      parameters: requested.reconstruction?.parameters || {} },
    postProcessing: { enabled: false, version: 'identity-1', coordinateTransform: 'identity' },
    validation: { reference: requested.validation?.reference || null,
      registration: requested.validation?.registration || 'rigid_icp',
      metrics: requested.validation?.metrics || [], status: 'not_evaluated' },
  };
}
