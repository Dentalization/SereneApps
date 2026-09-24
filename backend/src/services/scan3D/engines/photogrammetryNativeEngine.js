import fs from 'fs';
import path from 'path';
import { BaseReconstructionEngine } from './baseReconstructionEngine.js';
import { exportBinarySTL } from '../pipeline/stlExporter.js';

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
  let obj = `# SereneApps SYNTHETIC UI FIXTURE — NOT VIDEO RECONSTRUCTION\n`;
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
  let ply = `ply\nformat ascii 1.0\ncomment SereneApps SYNTHETIC UI FIXTURE\n`;
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

/** Historical name retained only for explicit integration fixtures. Never queued. */
export class PhotogrammetryNativeEngine extends BaseReconstructionEngine {
  constructor() {
    super({ name: 'photogrammetry_v1', displayName: 'Synthetic UI fixture (legacy name)',
      version: 'fixture-2', implementationStatus: 'simulation', isAvailable: false,
      executionBackend: 'procedural_geometry', outputFormats: ['obj', 'ply', 'stl'],
      description: 'Procedural geometry fixture; does not reconstruct video or estimate cameras.' });
  }

  async process({ study, scanScope = 'full', studyDir, options = {} }) {
    if (process.env.NODE_ENV === 'production' || options.allowSyntheticFixture !== true) {
      throw Object.assign(new Error('Synthetic fixture is disabled for scan processing'), {
        code: 'SYNTHETIC_ENGINE_FORBIDDEN', retryable: false,
      });
    }
    const { vertices, normals, faces } = generateRawDentalGeometry(scanScope);
    fs.mkdirSync(studyDir, { recursive: true });
    const content = {
      'mesh.obj': buildObjContent(vertices, normals, faces, scanScope),
      'mesh.ply': buildPlyContent(vertices, faces),
      'mesh.stl': exportBinarySTL(vertices, faces, normals, 'SYNTHETIC UI FIXTURE'),
    };
    const asset = (fileName) => ({ fileName, format: fileName.split('.').pop(),
      sizeInBytes: fs.statSync(path.join(studyDir, fileName)).size,
      synthetic: true, measurementCapability: 'visualization_only', units: 'arbitrary' });
    for (const [fileName, data] of Object.entries(content)) fs.writeFileSync(path.join(studyDir, fileName), data);
    const metadata = { engine: this.name, engineVersion: this.version,
      implementationStatus: 'simulation', synthetic: true, geometrySource: 'procedural',
      researchEligible: false, validated: false, clinicalStatus: 'experimental',
      measurementCapability: 'visualization_only', units: 'arbitrary',
      vertexCount: vertices.length, faceCount: faces.length };
    fs.writeFileSync(path.join(studyDir, 'reconstruction_report.json'), JSON.stringify(metadata, null, 2));
    return { success: true, mesh: asset('mesh.obj'), pointCloud: asset('mesh.ply'),
      stl: asset('mesh.stl'), preview: null, cameraTrajectory: [], confidence: null,
      metadata, logs: [{ stage: 'fixture', level: 'warn', timestamp: new Date().toISOString(),
        message: 'Generated procedural integration fixture. Excluded from research evaluation.' }] };
  }
}
