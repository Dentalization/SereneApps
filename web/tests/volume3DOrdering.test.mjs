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
