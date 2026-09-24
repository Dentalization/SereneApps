/** Controlled geometry is ONLY a parser/interaction software fixture, never reconstruction evidence. */
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { platform, arch, release } from 'node:os';
import { createMeasurementsState, setTool, handlePick, TOOLS } from '../src/pages/dentist-portal/x-core/components/3D/scan3DMeasurements.mjs';
const require = createRequire(import.meta.url);
const vtkSTLReader = require('@kitware/vtk.js/IO/Geometry/STLReader').default;
const results = [];
for (const faces of [1000, 25000, 100000, 500000]) {
  const bytes = Buffer.alloc(84 + faces * 50);
  bytes.writeUInt32LE(faces, 80);
  for (let i = 0; i < faces; i++) {
    const offset = 84 + i * 50;
    const x = i % 1000;
    const y = Math.floor(i / 1000);
    bytes.writeFloatLE(1, offset + 8);
    [[x,y,0],[x+1,y,0],[x,y+1,0]].flat().forEach((value,j)=>bytes.writeFloatLE(value,offset+12+j*4));
  }
  const array = bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
  const before = process.memoryUsage();
  const started = performance.now();
  const reader = vtkSTLReader.newInstance();
  reader.parseAsArrayBuffer(array);
  const mesh = reader.getOutputData();
  const parseMs = performance.now() - started;
  const after = process.memoryUsage();
  results.push({fixture:'synthetic_planar_triangles_software_verification_only',faces,bytes:array.byteLength,
    parsedVertices:mesh.getNumberOfPoints(),parsedFaces:mesh.getNumberOfPolys(),parseMs,
    processRssDeltaBytes:after.rss-before.rss,heapDeltaBytes:after.heapUsed-before.heapUsed,
    memoryScope:'Node process deltas, GC dependent; excludes browser/GPU',fps:null,renderMs:null});
  mesh.delete();reader.delete();
}
const stateTimings=[];
for (const count of [1,100,1000]) {
  let state=setTool(createMeasurementsState(),TOOLS.POINT);
  const started=performance.now();
  for(let i=0;i<count;i++) state=handlePick(state,[i,0,0]).state;
  stateTimings.push({annotationCount:count,stateUpdateMs:performance.now()-started,scope:'pure state reducer only, not browser annotation latency'});
}
const report={status:'software_verification_only',datasetStatus:'DATASET_UNAVAILABLE',timestamp:new Date().toISOString(),
  environment:{node:process.version,platform:platform(),arch:arch(),release:release()},results,stateTimings,
  limitations:['No smartphone or clinical geometry','No browser rendering, FPS, GPU memory or camera interaction measurement','Single runs without statistical inference','No maximum supported mesh size established']};
writeFileSync(new URL('../../reports/scan3d/viewer-fixture-profile.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
