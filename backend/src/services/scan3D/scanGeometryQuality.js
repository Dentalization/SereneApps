// Engineering publication guardrails. Passing these checks does not establish
// dental anatomy, full-arch coverage, reconstruction accuracy, or clinical use.
export const GEOMETRY_QUALITY_VERSION = 'scan3d_geometry_gate_v1';
export const GEOMETRY_INSUFFICIENT_CODE = 'RECONSTRUCTION_GEOMETRY_INSUFFICIENT';
export const GEOMETRY_INSUFFICIENT_MESSAGE = 'Mesh ini belum merekonstruksi gigi. Lihat bentuk diagnostiknya untuk menelusuri kegagalan, lalu rekam ulang dengan gigi memenuhi frame, sudut pandang beragam, dan gerakan kamera perlahan.';

const MIN_REGISTERED_VIEWS = 3;
const MIN_VERTICES = 100;
const MIN_FACES = 100;
const count = value => Number.isSafeInteger(value) && value >= 0 ? value : null;

export function assessScanGeometry(metadata = {}) {
  const metrics = metadata.metrics || {};
  const mesh = metadata.assets?.mesh || {};
  const registeredFrames = count(metrics.registeredFrames);
  const vertexCount = count(metrics.vertexCount);
  const faceCount = count(metrics.faceCount);
  const meshVertexCount = count(mesh.vertexCount);
  const meshFaceCount = count(mesh.faceCount);
  const reasons = [];

  if (registeredFrames === null || vertexCount === null || faceCount === null) reasons.push('MISSING_GEOMETRY_DIAGNOSTICS');
  if (meshVertexCount === null || meshFaceCount === null) reasons.push('MISSING_MESH_TOPOLOGY_COUNTS');
  if (registeredFrames !== null && registeredFrames < MIN_REGISTERED_VIEWS) reasons.push('TOO_FEW_REGISTERED_VIEWS');
  if (vertexCount !== null && vertexCount < MIN_VERTICES) reasons.push('TOO_FEW_VERTICES');
  if (faceCount !== null && faceCount < MIN_FACES) reasons.push('TOO_FEW_FACES');
  if (meshVertexCount !== null && vertexCount !== null && meshVertexCount !== vertexCount) reasons.push('VERTEX_COUNT_MISMATCH');
  if (meshFaceCount !== null && faceCount !== null && meshFaceCount !== faceCount) reasons.push('FACE_COUNT_MISMATCH');

  return {
    version: GEOMETRY_QUALITY_VERSION,
    status: reasons.length ? 'insufficient' : 'candidate',
    basis: 'engineering_renderability_guardrail_not_dental_validation',
    reasons,
    registeredFrames,
    vertexCount,
    faceCount,
    minimums: { registeredFrames: MIN_REGISTERED_VIEWS, vertexCount: MIN_VERTICES, faceCount: MIN_FACES },
    anatomicalCoverage: 'unavailable',
    validated: false,
    clinicallyValidated: false,
  };
}
