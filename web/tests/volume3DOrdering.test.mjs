import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const sourcePath = path.resolve(
  new URL('../src/pages/dentist-portal/x-core/components/VolumeViewer3D.jsx', import.meta.url).pathname
);

test('projectWorldToViewportCached is declared before prewarmWorldOverlayProjectionCache', () => {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const cachedIndex = source.indexOf('const projectWorldToViewportCached = useCallback(');
  const prewarmIndex = source.indexOf('const prewarmWorldOverlayProjectionCache = useCallback(');

  assert.ok(cachedIndex >= 0, 'expected projectWorldToViewportCached declaration');
  assert.ok(prewarmIndex >= 0, 'expected prewarmWorldOverlayProjectionCache declaration');
  assert.ok(
    cachedIndex < prewarmIndex,
    'projectWorldToViewportCached must be declared before prewarmWorldOverlayProjectionCache to avoid TDZ crashes'
  );
});

test('3d projection updates during interaction without explicit cache clearing', () => {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const projectionEffectStart = source.indexOf('const bumpProjection = () => {');
  const projectionEffectEnd = source.indexOf('// ═══════════════════════════════════════════════════════════════════', projectionEffectStart);
  const projectionEffect = source.slice(projectionEffectStart, projectionEffectEnd);

  assert.match(projectionEffect, /ctx\.interactor\.onInteraction\?\.\(bumpProjection\)/);
  assert.match(projectionEffect, /ctx\.interactor\.onEndInteraction\?\.\(bumpProjection\)/);
  assert.doesNotMatch(projectionEffect, /projectionCacheRef\.current\.cache\.clear\(\)/);
});

test('3d committed measurements have screen overlay lines and draggable label offsets', () => {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const overlaySource = fs.readFileSync(
    path.resolve(
      new URL('../src/pages/dentist-portal/x-core/components/3D/Volume3DOverlayLayer.jsx', import.meta.url).pathname
    ),
    'utf8'
  );

  assert.match(source, /const measurementScreenOverlays = useMemo\(/);
  assert.match(source, /measurementScreenOverlays=\{measurementScreenOverlays\}/);
  assert.match(source, /const onMoveMeasurementLabel = useCallback/);
  assert.match(source, /onMoveMeasurementLabel=\{onMoveMeasurementLabel\}/);
  assert.match(source, /const measurementCount = measurements3D\.length \+ polylineMeasurements\.length/);
  assert.match(source, /const segmentValue = poly\.segments\?\.\[i\]/);
  assert.match(source, /typeof segmentValue === ['"]number['"]/);
  assert.match(overlaySource, /measurementScreenOverlays/);
  assert.match(overlaySource, /onMoveMeasurementLabel/);
});

test('3d world overlay projection ignores stale normalized screen offsets', () => {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const projectionStart = source.indexOf('const projectWorldOverlayAnnotation = useCallback((annotation) => {');
  const projectionEnd = source.indexOf('const pickSurfaceWorldPointFromPointer = useCallback', projectionStart);
  const projectionSource = source.slice(projectionStart, projectionEnd);

  assert.match(projectionSource, /const endWorld = annotation\.coordinates\?\.world_end/);
  assert.match(projectionSource, /const worldRadius = Number\(annotation\.metadata\?\.world_radius_mm \|\| 0\)/);
  assert.doesNotMatch(projectionSource, /screen_tail_offset_norm/);
  assert.doesNotMatch(projectionSource, /screen_radius_norm/);
});
