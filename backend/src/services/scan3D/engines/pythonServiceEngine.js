import path from 'path';
import fs from 'fs';
import { BaseReconstructionEngine } from './baseReconstructionEngine.js';

const PY_SERVICE_BASE_URL = process.env.PY_SERVICE_BASE_URL || 'http://127.0.0.1:8000';

export class PythonServiceEngine extends BaseReconstructionEngine {
  constructor() {
    super({
      name: 'python_reconstruction_service',
      displayName: 'Python FastAPI Reconstruction Service',
      version: '1.1.0',
      description: 'Distributed Python reconstruction worker running OpenCV & NumPy surface synthesis.',
      capabilities: ['surface_mesh', 'point_cloud', 'confidence_map'],
      isAvailable: true,
    });
  }

  async process({ study, frames = [], cameraMetadata = {}, scanScope = 'full', studyDir, lidraReport = null }) {
    const startTime = Date.now();
    const folderName = study.folderName || `SCAN-3D-${study.id}`;
    const rawVideoPath = path.join(studyDir, 'raw_video.mp4');

    const pyResp = await fetch(`${PY_SERVICE_BASE_URL}/reconstruct/3d-scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studyId: study.id.toString(),
        folderName,
        scanScope,
        videoPath: fs.existsSync(rawVideoPath) ? rawVideoPath : null,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!pyResp.ok) {
      throw new Error(`Python service returned HTTP ${pyResp.status}: ${await pyResp.text()}`);
    }

    const pyData = await pyResp.json();
    if (!pyData.success || !pyData.assets) {
      throw new Error('Python reconstruction service did not return valid assets');
    }

    const objPath = path.join(studyDir, 'mesh.obj');
    const plyPath = path.join(studyDir, 'mesh.ply');
    const previewPath = path.join(studyDir, 'preview.png');

    const qualityScore = lidraReport?.qualityScore || 85;
    const confidence = Number(Math.min(0.98, Math.max(0.65, qualityScore / 100.0)).toFixed(2));

    const cameraTrajectory = frames.map((frame, i) => {
      const angle = (i / Math.max(1, frames.length - 1)) * Math.PI - Math.PI / 2;
      return {
        frameIndex: frame.frameIndex ?? i,
        fileName: frame.fileName,
        timestampMs: frame.timestampMs ?? i * 500,
        pose: {
          position: [
            Number((Math.sin(angle) * 35.0).toFixed(2)),
            Number((Math.cos(angle) * 35.0).toFixed(2)),
            Number((15.0).toFixed(2)),
          ],
        },
      };
    });

    return {
      success: true,
      mesh: {
        fileName: pyData.assets.mesh.fileName || 'mesh.obj',
        format: 'obj',
        sizeInBytes: fs.existsSync(objPath) ? fs.statSync(objPath).size : (pyData.assets.mesh.sizeInBytes || 0),
        vertexCount: pyData.assets.mesh.vertexCount,
        faceCount: pyData.assets.mesh.faceCount,
        bounds: pyData.assets.mesh.bounds,
        assetUrl: `/v1/x-core/3d-scans/${study.id}/assets/mesh.obj`,
      },
      pointCloud: {
        fileName: pyData.assets.ply.fileName || 'mesh.ply',
        format: 'ply',
        sizeInBytes: fs.existsSync(plyPath) ? fs.statSync(plyPath).size : (pyData.assets.ply.sizeInBytes || 0),
        assetUrl: `/v1/x-core/3d-scans/${study.id}/assets/mesh.ply`,
      },
      preview: {
        fileName: pyData.assets.preview.fileName || 'preview.png',
        format: 'png',
        sizeInBytes: fs.existsSync(previewPath) ? fs.statSync(previewPath).size : (pyData.assets.preview.sizeInBytes || 0),
        assetUrl: `/v1/x-core/3d-scans/${study.id}/assets/preview.png`,
      },
      cameraTrajectory,
      confidence,
      metadata: {
        engine: this.name,
        version: this.version,
        durationMs: Date.now() - startTime,
        ...pyData.metrics,
      },
      logs: pyData.logs || [],
    };
  }
}
