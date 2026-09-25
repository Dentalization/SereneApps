// Engineering publication guardrails. Passing these checks does not establish
// dental anatomy, full-arch coverage, reconstruction accuracy, or clinical use.
export const GEOMETRY_QUALITY_VERSION = 'scan3d_dental_evidence_gate_v4';
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
  const dental = metadata.lidra?.dentalEvidence || metrics.dentalEvidence || {};
  const geometry = metrics.geometryEvidence || {};
  if (metadata.lidra?.captureTarget?.status === 'suspected_display_capture') reasons.push('CAPTURE_TARGET_SCREEN_SUSPECTED');
  if (dental.status !== 'operator_annotated_unverified') reasons.push('DENTAL_REGION_UNVERIFIED');
  if (metadata.lidra?.qualityDecision?.status !== 'accepted_for_experimental_geometry') reasons.push('CAPTURE_NOT_DENTAL_READY');
  if (geometry.pointSource !== 'dense_multiview_stereo' || count(geometry.contributingViews) === null || geometry.contributingViews < 3) {
    reasons.push('GEOMETRY_STILL_BEST_PAIR');
  }
  if (geometry.denseStatus !== 'executed' || count(geometry.denseSupportedPoints) === null || geometry.denseSupportedPoints < 100) {
    reasons.push('DENSE_MULTIVIEW_NOT_EXECUTED');
  }
  if (geometry.meshFromDense !== true) reasons.push('MESH_NOT_FROM_DENSE_OBSERVATIONS');
  const bundle = metrics.multiViewSparse?.bundleAdjustment || {};
  const retainedGoodInitial = bundle.status === 'initial_solution_retained'
    && Number.isFinite(bundle.initialMedianReprojectionPx) && bundle.initialMedianReprojectionPx <= 1
    && Number.isFinite(bundle.initialRobustLoss) && bundle.initialRobustLoss <= 1
    && count(bundle.evaluatedTracks) !== null && bundle.evaluatedTracks >= 20;
  if (bundle.status !== 'executed' && !retainedGoodInitial) reasons.push('BUNDLE_ADJUSTMENT_NOT_EXECUTED');
  const supportArtifact = metrics.denseMultiView?.supportArtifact || {};
  if (!/^[a-f0-9]{64}$/.test(supportArtifact.sha256 || '')
    || count(metrics.denseMultiView?.minimumIndependentViewCount) === null
    || metrics.denseMultiView.minimumIndependentViewCount < 3
    || count(metrics.denseMultiView?.minimumSupportingPairCount) === null
    || metrics.denseMultiView.minimumSupportingPairCount < 2) {
    reasons.push('VERTEX_VIEW_SUPPORT_UNVERIFIED');
  }
  const toothSupport = metrics.perToothSupport || {};
  if (geometry.perToothCoverageStatus !== 'observed_multiview_support_only'
    || toothSupport.status !== 'observed_multiview_support_only'
    || !Array.isArray(toothSupport.teeth) || toothSupport.teeth.length === 0
    || !Array.isArray(toothSupport.missingExpectedTeeth) || toothSupport.missingExpectedTeeth.length > 0
    || toothSupport.teeth.some(tooth => count(tooth.verticesInThreeOrMoreViews) === null
      || tooth.verticesInThreeOrMoreViews < 10 || count(tooth.facesWithThreeViewVertexSupport) === null
      || tooth.facesWithThreeViewVertexSupport < 10)) {
    reasons.push('PER_TOOTH_OBSERVED_PATCH_UNAVAILABLE');
  }
  const topology = metrics.meshTopology || {};
  if (count(topology.nonManifoldEdges) === null || topology.nonManifoldEdges > 0) reasons.push('NON_MANIFOLD_TOPOLOGY');
  if (count(topology.inconsistentWindingEdges) === null || topology.inconsistentWindingEdges > 0) reasons.push('INCONSISTENT_FACE_WINDING');
  if (topology.selfIntersections?.status !== 'evaluated' || count(topology.selfIntersections.count) === null
    || topology.selfIntersections.count > 0) reasons.push('SELF_INTERSECTIONS_UNVERIFIED');

  return {
    version: GEOMETRY_QUALITY_VERSION,
    status: reasons.length ? 'insufficient' : 'candidate',
    basis: 'observed_dental_geometry_guardrail_not_experimental_or_clinical_validation',
    reasons,
    registeredFrames,
    vertexCount,
    faceCount,
    minimums: { registeredFrames: MIN_REGISTERED_VIEWS, vertexCount: MIN_VERTICES, faceCount: MIN_FACES },
    anatomicalCoverage: 'unavailable',
    dentalEvidenceStatus: dental.status || 'unavailable',
    geometryEvidence: geometry,
    validated: false,
    clinicallyValidated: false,
  };
}
