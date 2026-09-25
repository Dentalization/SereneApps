import path from 'node:path';
import fs from 'node:fs/promises';
import { BaseReconstructionEngine } from './baseReconstructionEngine.js';
import { confinedExistingFile, sha256File } from '../scanStorage.js';

export function scanServiceHeaders() {
  const token = process.env.SCAN3D_SERVICE_TOKEN;
  if (!token) throw Object.assign(new Error('Scan processing service authentication is not configured'), {
    code: 'SCAN_SERVICE_NOT_CONFIGURED', retryable: false,
  });
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export function scanServiceSignal(options = {}, timeoutMs = 120000) {
  const timeout = AbortSignal.timeout(timeoutMs);
  return options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
}

export class PythonServiceEngine extends BaseReconstructionEngine {
  constructor(name = 'opencv_sparse_sfm') {
    super({ name, displayName: 'OpenCV dental ROI SfM and dense stereo (experimental)',
      version: 'opencv-dental-multiview-2.5', implementationStatus: 'experimental', isAvailable: null,
      executionBackend: 'python_opencv_cpu', outputFormats: ['obj', 'ply', 'stl', 'png'],
      capabilities: ['dental_masked_sparse_tracks', 'experimental_cpu_dense_stereo', 'estimated_camera_poses', 'diagnostic_mesh'],
      inputRequirements: ['verified_video', 'operator_annotated_dental_regions', 'sufficient_texture', 'camera_translation', 'authenticated_python_service'],
      description: 'Runs dental-ROI SfM and CPU multi-view stereo when supported; otherwise retains a sparse diagnostic. Arbitrary scale; anatomy and clinical accuracy unvalidated.' });
  }

  async process({ study, studyDir, options = {}, scanScope = 'full', lidraReport }) {
    const started = performance.now();
    const video = study.metadata?.video;
    const videoPath = await confinedExistingFile(studyDir, video?.storagePath || video?.fileName || 'raw_video.mp4');
    const outputDir = path.resolve(options.outputDir || studyDir);
    if (!outputDir.startsWith(`${path.resolve(studyDir)}${path.sep}`)) {
      throw Object.assign(new Error('Reconstruction requires an isolated attempt directory'), { retryable: false });
    }
    await fs.mkdir(outputDir, { recursive: true });
    const baseUrl = process.env.PY_SERVICE_BASE_URL || 'http://127.0.0.1:8000';
    const response = await fetch(`${baseUrl}/reconstruct/3d-scan`, {
      method: 'POST', headers: scanServiceHeaders(), signal: scanServiceSignal(options),
      body: JSON.stringify({ studyId: String(study.id), folderName: study.folderName, scanScope,
        videoPath, outputDir, attemptId: options.attemptId, configuration: options.configuration || {} }),
    });
    if (!response.ok) {
      const err = new Error(`Reconstruction service failed (HTTP ${response.status})`);
      err.code = response.status === 409 ? 'RECONSTRUCTION_BUSY' : 'RECONSTRUCTION_SERVICE_FAILED';
      err.retryable = response.status === 409 || (response.status >= 500 && response.status !== 503);
      throw err;
    }
    const data = await response.json();
    const metadata = data.metadata || data.metrics || {};
    if (!data.success || !data.assets?.mesh || metadata.synthetic !== false || metadata.engine !== 'opencv_sparse_sfm') {
      throw Object.assign(new Error('Reconstruction service returned unverified geometry provenance'), {
        code: 'UNVERIFIED_RECONSTRUCTION', retryable: false,
      });
    }
    const inspectedHash = video?.checksum || video?.sha256;
    const frameIdentity = frames => Array.isArray(frames) && frames.length >= 2
      && frames.every(frame => Number.isInteger(frame.frameIndex) && /^[a-f0-9]{64}$/.test(frame.sha256 || ''))
      ? JSON.stringify(frames.map(frame => [frame.frameIndex, frame.sha256])) : null;
    if (!inspectedHash || metadata.input?.sha256 !== inspectedHash
        || await sha256File(videoPath) !== inspectedHash
        || metadata.geometrySource !== 'image_derived' || !metadata.engineVersion
        || !metadata.coordinateSystem || !metadata.configuration || !metadata.reproducibility) {
      throw Object.assign(new Error('Reconstruction input or execution provenance mismatch'), {
        code: 'RECONSTRUCTION_PROVENANCE_MISMATCH', retryable: false,
      });
    }
    if (lidraReport && (lidraReport.videoMetadata?.sha256 !== inspectedHash
        || !frameIdentity(lidraReport.selectedFrames)
        || frameIdentity(metadata.selectedFrames) !== frameIdentity(lidraReport.selectedFrames))) {
      throw Object.assign(new Error('Reconstruction frames do not match measured acquisition'), {
        code: 'ACQUISITION_FRAME_MISMATCH', retryable: false,
      });
    }
    const supportArtifact = metadata.denseMultiView?.supportArtifact;
    if (metadata.denseMultiView?.status === 'executed') {
      if (supportArtifact?.fileName !== 'vertex_support.npz' || !/^[a-f0-9]{64}$/.test(supportArtifact.sha256 || '')) {
        throw Object.assign(new Error('Dense view-support artifact missing from reconstruction report'), {
          code: 'RECONSTRUCTION_PROVENANCE_MISMATCH', retryable: false,
        });
      }
      const supportFile = await confinedExistingFile(outputDir, supportArtifact.fileName);
      const supportSize = (await fs.stat(supportFile)).size;
      if (supportSize !== supportArtifact.sizeInBytes || await sha256File(supportFile) !== supportArtifact.sha256) {
        throw Object.assign(new Error('Dense view-support artifact checksum mismatch'), {
          code: 'RECONSTRUCTION_ASSET_MISMATCH', retryable: false,
        });
      }
    }
    const wrap = async (asset) => {
      if (!asset) return null;
      if (path.basename(asset.fileName || '') !== asset.fileName) throw new Error('Invalid reconstruction asset filename');
      const localPath = await confinedExistingFile(outputDir, asset.fileName);
      const stat = await fs.stat(localPath);
      if (!stat.size) throw new Error('Empty reconstruction asset');
      const checksum = await sha256File(localPath);
      if (asset.sha256 !== checksum || asset.sizeInBytes !== stat.size) {
        throw Object.assign(new Error('Reconstruction output checksum or size mismatch'), {
          code: 'RECONSTRUCTION_ASSET_MISMATCH', retryable: false,
        });
      }
      return { fileName: asset.fileName, format: path.extname(asset.fileName).slice(1),
        sizeInBytes: stat.size, vertexCount: asset.vertexCount, faceCount: asset.faceCount, bounds: asset.bounds,
        storagePath: path.relative(await fs.realpath(studyDir), localPath), checksum, sha256: checksum, version: checksum,
        assetUrl: `/v1/x-core/3d-scans/${study.id}/assets/${encodeURIComponent(asset.fileName)}`,
        synthetic: false, measurementCapability: 'visualization_only', clinicalStatus: 'experimental',
        units: 'arbitrary', scale: { status: 'unvalidated', units: 'arbitrary' },
        coordinateSystem: metadata.coordinateSystem || 'first_camera_opencv',
      };
    };
    const [mesh, pointCloud, stl, preview] = await Promise.all([
      wrap(data.assets.mesh), wrap(data.assets.ply), wrap(data.assets.stl), wrap(data.assets.preview),
    ]);
    return { success: true, mesh, pointCloud, stl, preview,
      cameraTrajectory: data.cameraTrajectory || [], confidence: null,
      metadata: { ...metadata, engine: 'opencv_sparse_sfm', requestedAdapter: this.name,
        implementationStatus: 'experimental', synthetic: false, validated: false, clinicallyValidated: false,
        measurementCapability: 'visualization_only', clinicalStatus: 'experimental', units: 'arbitrary',
        adapterDurationMs: performance.now() - started }, logs: data.logs || [] };
  }
}
