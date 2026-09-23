import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('Phase 10: 3D Scan X-Core Integration Contract', async (t) => {
  await t.test('VTK STLReader correctly parses binary dental mesh buffer without error', () => {
    const vtkSTLReader = require('@kitware/vtk.js/IO/Geometry/STLReader').default;
    const vtkMapper = require('@kitware/vtk.js/Rendering/Core/Mapper').default;
    const vtkActor = require('@kitware/vtk.js/Rendering/Core/Actor').default;

    // Create a mock binary STL buffer (84 bytes = 80-byte header + 1 triangle)
    const triangleCount = 1;
    const buffer = Buffer.alloc(84 + triangleCount * 50);
    Buffer.from('SereneApps Test Dental STL'.padEnd(80, ' ')).copy(buffer, 0, 0, 80);
    buffer.writeUInt32LE(triangleCount, 80);

    // Write 1 triangle facet
    let offset = 84;
    // Normal [0, 0, 1]
    buffer.writeFloatLE(0.0, offset);
    buffer.writeFloatLE(0.0, offset + 4);
    buffer.writeFloatLE(1.0, offset + 8);
    // V1 [0, 0, 0]
    buffer.writeFloatLE(0.0, offset + 12);
    buffer.writeFloatLE(0.0, offset + 16);
    buffer.writeFloatLE(0.0, offset + 20);
    // V2 [10, 0, 0]
    buffer.writeFloatLE(10.0, offset + 24);
    buffer.writeFloatLE(0.0, offset + 28);
    buffer.writeFloatLE(0.0, offset + 32);
    // V3 [0, 10, 0]
    buffer.writeFloatLE(0.0, offset + 36);
    buffer.writeFloatLE(10.0, offset + 40);
    buffer.writeFloatLE(0.0, offset + 44);
    // Attribute byte count = 0
    buffer.writeUInt16LE(0, offset + 48);

    // Convert Buffer to ArrayBuffer
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

    const reader = vtkSTLReader.newInstance();
    reader.parseAsArrayBuffer(arrayBuffer);
    const polyData = reader.getOutputData();

    assert(polyData, 'PolyData must be generated');
    assert.equal(polyData.getNumberOfPoints(), 3, 'Should have 3 points for 1 triangle');

    const mapper = vtkMapper.newInstance();
    mapper.setInputData(polyData);

    const actor = vtkActor.newInstance();
    actor.setMapper(mapper);

    assert(actor.getProperty(), 'Actor must have properties');
    actor.getProperty().setRepresentation(2); // Surface
    assert.equal(actor.getProperty().getRepresentation(), 2);
  });

  await t.test('Gallery contract discovers 3D_SCAN modality and creates synthetic series', () => {
    const gallery = read('src/pages/dentist-portal/x-core/components/Gallery.jsx');

    assert.match(gallery, /if\s*\(study\?\.modality\s*===\s*['"]3D_SCAN['"]\)/);
    assert.match(gallery, /modality:\s*['"]3D_SCAN['"]/);
    assert.match(gallery, /type:\s*['"]3D Mesh['"]/);
    assert.match(gallery, /\/v1\/x-core\/3d-scans\/\$\{study\.id\}\/assets\/preview\.png/);
    assert.match(gallery, /3D Scan Mesh/);
  });

  await t.test('Viewer3D contract mounts Scan3DMeshViewer for 3D_SCAN scans', () => {
    const viewer = read('src/pages/dentist-portal/x-core/components/Viewer3D.jsx');

    assert.match(viewer, /import Scan3DMeshViewer from ['"]\.\/3D\/Scan3DMeshViewer['"]/);
    assert.match(viewer, /if\s*\(modality\s*===\s*['"]3D_SCAN['"]/);
    assert.match(viewer, /<Scan3DMeshViewer/);
  });

  await t.test('Scan3DMeshViewer implements loading, processing, failed, and ready states', () => {
    const meshViewer = read('src/pages/dentist-portal/x-core/components/3D/Scan3DMeshViewer.jsx');

    assert.match(meshViewer, /vtkSTLReader/);
    assert.match(meshViewer, /vtkOrientationMarkerWidget/);
    assert.match(meshViewer, /vtkAnnotatedCubeActor/);
    assert.match(meshViewer, /COLOR_PRESETS/);
    assert.match(meshViewer, /VIEW_PRESETS/);
    assert.match(meshViewer, /handleResetView/);
    assert.match(meshViewer, /setRepresentation/);
    assert.match(meshViewer, /Rekonstruksi 3D Berjalan/);
    assert.match(meshViewer, /Coba Lagi Rekonstruksi 3D/);
  });
});
