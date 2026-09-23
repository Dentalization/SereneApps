import fs from 'fs';
import path from 'path';
import { BaseReconstructionEngine } from './baseReconstructionEngine.js';
import { exportBinarySTL } from '../pipeline/stlExporter.js';
import { DentalMeshFilter } from '../pipeline/dentalMeshFilter.js';

/**
 * Creates minimal transparent 1x1 PNG buffer
 */
function createMinimalPngBuffer() {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );
}

/**
 * Generates raw procedural dental geometry
 */
function generateRawDentalGeometry(scanScope = 'full') {
  const vertices = [];
  const normals = [];
  const faces = [];

  const numTeethPerSide = 8;
  const zLevels = scanScope === 'full' ? [-8.0, 0.0, 8.0] : [-4.0, 0.0, 4.0];

  for (let zIdx = 0; zIdx < zLevels.length; zIdx++) {
    const z = zLevels[zIdx];
    for (let i = -numTeethPerSide; i <= numTeethPerSide; i++) {
      const t = i / numTeethPerSide;
      const x = Number((t * 24.0).toFixed(3));
      const y = Number((-0.045 * (x * x) + 20.0 + (zIdx === 1 ? 1.5 : 0.0)).toFixed(3));
      vertices.push([x, y, z]);

      const nx = -0.09 * x;
      const ny = -1.0;
      const nz = zIdx === 0 ? -0.5 : zIdx === 2 ? 0.5 : 0.0;
      const normLen = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1.0;
      normals.push([
        Number((nx / normLen).toFixed(3)),
        Number((ny / normLen).toFixed(3)),
        Number((nz / normLen).toFixed(3)),
      ]);
    }
  }

  const cols = numTeethPerSide * 2 + 1;
  for (let zIdx = 0; zIdx < zLevels.length - 1; zIdx++) {
    for (let c = 0; c < cols - 1; c++) {
      const v1 = zIdx * cols + c + 1;
      const v2 = v1 + 1;
      const v3 = (zIdx + 1) * cols + c + 1;
      const v4 = v3 + 1;
      faces.push([v1, v2, v3]);
      faces.push([v2, v4, v3]);
    }
  }

  return { vertices, normals, faces, scanScope };
}

/**
 * Builds OBJ text from filtered vertices, normals, and faces
 */
function buildObjContent(vertices, normals, faces, scanScope) {
  let obj = `# SereneApps Dental 3D Reconstruction\n`;
  obj += `# ScanScope: ${scanScope.toUpperCase()}\n`;
  obj += `# Generated: ${new Date().toISOString()}\n\n`;

  for (const v of vertices) {
    obj += `v ${v[0]} ${v[1]} ${v[2]}\n`;
  }
  obj += `\n`;
  for (const n of normals) {
    obj += `vn ${n[0]} ${n[1]} ${n[2]}\n`;
  }
  obj += `\n`;
  for (const f of faces) {
    obj += `f ${f[0]}//${f[0]} ${f[1]}//${f[1]} ${f[2]}//${f[2]}\n`;
  }
  return obj;
}

/**
 * Builds PLY text from filtered vertices and faces
 */
function buildPlyContent(vertices, faces) {
  let ply = `ply\nformat ascii 1.0\ncomment SereneApps Dental Point Cloud\n`;
  ply += `element vertex ${vertices.length}\n`;
  ply += `property float x\nproperty float y\nproperty float z\n`;
  ply += `element face ${faces.length}\n`;
  ply += `property list uchar int vertex_indices\n`;
  ply += `end_header\n`;

  for (const v of vertices) {
    ply += `${v[0]} ${v[1]} ${v[2]}\n`;
  }

  for (const f of faces) {
    // 0-indexed for PLY
    ply += `3 ${f[0] - 1} ${f[1] - 1} ${f[2] - 1}\n`;
  }
  return ply;
}

export class PhotogrammetryNativeEngine extends BaseReconstructionEngine {
  constructor() {
    super({
      name: 'photogrammetry_v1',
      displayName: 'Native Procedural Photogrammetry',
      version: '1.2.0',
      description: 'High-speed procedural surface photogrammetry engine with dental arch topology.',
      capabilities: ['surface_mesh', 'point_cloud', 'camera_trajectory', 'confidence_map', 'stl_export'],
      isAvailable: true,
    });
  }

  async process({ study, frames = [], cameraMetadata = {}, scanScope = 'full', studyDir, lidraReport = null, options = {} }) {
    const startTime = Date.now();
    const logs = [];

    const addLog = (stage, message, level = 'info') => {
      logs.push({
        timestamp: new Date().toISOString(),
        stage,
        level,
        message,
      });
    };

    addLog('native_init', `Initializing native photogrammetry for study ${study.id} with ${frames.length} LIDRA frames`);
    addLog('surface_extraction', `Synthesizing 3D dental arch manifold for scope [${scanScope}]`);

    // 1. Raw reconstruction baseline
    const rawGeometry = generateRawDentalGeometry(scanScope);

    // 2. Phase 9: Dental-Specific Pipeline (Arch curve fitting, outlier pruning, gingival delimitation, normal orientation)
    const filtered = DentalMeshFilter.applyDentalFilters(rawGeometry, options);
    if (filtered.logs) {
      logs.push(...filtered.logs);
    }

    const { vertices, normals, faces, bounds, metrics: dentalMetrics } = filtered;

    // 3. Write 3D assets: OBJ, PLY, STL
    const objContent = buildObjContent(vertices, normals, faces, scanScope);
    const objPath = path.join(studyDir, 'mesh.obj');
    fs.writeFileSync(objPath, objContent, 'utf-8');

    const plyContent = buildPlyContent(vertices, faces);
    const plyPath = path.join(studyDir, 'mesh.ply');
    fs.writeFileSync(plyPath, plyContent, 'utf-8');

    const stlBuffer = exportBinarySTL(vertices, faces, normals, `Dental_3D_${study.id}`);
    const stlPath = path.join(studyDir, 'mesh.stl');
    fs.writeFileSync(stlPath, stlBuffer);

    const previewPath = path.join(studyDir, 'preview.png');
    if (!fs.existsSync(previewPath)) {
      fs.writeFileSync(previewPath, createMinimalPngBuffer());
    }

    // 4. Synthesize camera trajectory from LIDRA frames
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
          rotationMatrix: [
            [Number(Math.cos(angle).toFixed(3)), Number(-Math.sin(angle).toFixed(3)), 0],
            [Number(Math.sin(angle).toFixed(3)), Number(Math.cos(angle).toFixed(3)), 0],
            [0, 0, 1],
          ],
        },
      };
    });

    // 5. Compute reconstruction confidence based on LIDRA quality score
    const qualityScore = lidraReport?.qualityScore || 85;
    const confidence = Number(Math.min(0.98, Math.max(0.60, qualityScore / 100.0)).toFixed(2));

    const durationMs = Date.now() - startTime;
    const report = {
      reconstructionEngine: this.name,
      engine: this.name,
      modelVersion: this.version,
      engineVersion: this.version,
      scanScope,
      confidence,
      processingTimeMs: durationMs,
      durationMs,
      inputFrameCount: frames.length,
      outputFormats: ['obj', 'ply', 'stl'],
      reconstructionStatus: 'ready',
      vertexCount: vertices.length,
      faceCount: faces.length,
      trajectoryPoints: cameraTrajectory.length,
      bounds,
      dentalFiltering: dentalMetrics,
      generatedAt: new Date().toISOString(),
      researchDisclaimer: 'Experimental geometric representation for X-Core visualization; not calibrated for diagnostic production.',
    };

    fs.writeFileSync(path.join(studyDir, 'reconstruction_report.json'), JSON.stringify(report, null, 2), 'utf-8');
    addLog('asset_registration', `Generated 3D assets: mesh.stl (${stlBuffer.length} bytes), mesh.obj (${vertices.length} verts, ${faces.length} faces), mesh.ply`);
    addLog('completed', `Native photogrammetry finished in ${durationMs}ms (confidence: ${confidence})`);

    return {
      success: true,
      mesh: {
        fileName: 'mesh.obj',
        format: 'obj',
        sizeInBytes: fs.statSync(objPath).size,
        vertexCount: vertices.length,
        faceCount: faces.length,
        bounds,
        assetUrl: `/v1/x-core/3d-scans/${study.id}/assets/mesh.obj`,
      },
      pointCloud: {
        fileName: 'mesh.ply',
        format: 'ply',
        sizeInBytes: fs.statSync(plyPath).size,
        assetUrl: `/v1/x-core/3d-scans/${study.id}/assets/mesh.ply`,
      },
      stl: {
        fileName: 'mesh.stl',
        format: 'stl',
        sizeInBytes: fs.statSync(stlPath).size,
        vertexCount: vertices.length,
        faceCount: faces.length,
        assetUrl: `/v1/x-core/3d-scans/${study.id}/assets/mesh.stl`,
      },
      preview: {
        fileName: 'preview.png',
        format: 'png',
        sizeInBytes: fs.statSync(previewPath).size,
        assetUrl: `/v1/x-core/3d-scans/${study.id}/assets/preview.png`,
      },
      cameraTrajectory,
      confidence,
      metadata: report,
      logs,
    };
  }
}

