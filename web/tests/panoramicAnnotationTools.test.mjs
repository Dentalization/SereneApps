import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { validateAnnotationForReview } from '../src/pages/dentist-portal/x-core/utils/annotationQuality.js';
import { drawAnnotations } from '../src/pages/dentist-portal/x-core/utils/reportUtils.js';

const createRecordingContext = () => {
  const calls = [];
  const context = new Proxy({}, {
    get: (_, key) => {
      if (key === 'calls') return calls;
      if (key === 'measureText') return (value) => ({ width: String(value || '').length * 6 });
      return (...args) => calls.push([key, ...args]);
    },
    set: (_, key, value) => {
      calls.push([`set:${key}`, value]);
      return true;
    },
  });
  return context;
};

test('freehand annotations render as open traces instead of closed filled regions', () => {
  const ctx = createRecordingContext();

  drawAnnotations(ctx, [{
    id: 'surface-trace',
    type: 'freehand',
    coordinates: {
      path: [
        { x: 0.1, y: 0.1 },
        { x: 0.4, y: 0.12 },
        { x: 0.8, y: 0.18 },
      ],
    },
  }], 1000, 500);

  const callNames = ctx.calls.map(([name]) => name);
  assert.ok(callNames.includes('stroke'));
  assert.equal(callNames.includes('fill'), false);
  assert.equal(callNames.includes('closePath'), false);
});

test('panoramic Surface tool stores filled regions like slice view', async () => {
  const viewerSource = await readFile(
    'src/pages/dentist-portal/x-core/components/ImageViewer2D.jsx',
    'utf8',
  );
  const canvasSource = await readFile(
    'src/pages/dentist-portal/x-core/components/AnnotationCanvas.jsx',
    'utf8',
  );

  assert.doesNotMatch(viewerSource, /freehandAnnotationType=['"]freehand['"]/);
  assert.match(canvasSource, /freehandAnnotationType\s*=\s*['"]region['"]/);
});

test('panoramic annotation canvas mounts once the image is loaded even while bounds sync catches up', async () => {
  const viewerSource = await readFile(
    'src/pages/dentist-portal/x-core/components/ImageViewer2D.jsx',
    'utf8',
  );

  assert.doesNotMatch(
    viewerSource,
    /imageLoaded\s*&&\s*imageBounds\s*&&\s*viewportSize\.width\s*>\s*0\s*&&\s*viewportSize\.height\s*>\s*0/,
  );
  assert.match(
    viewerSource,
    /imageLoaded\s*&&\s*imageSize\.width\s*>\s*0\s*&&\s*imageSize\.height\s*>\s*0\s*&&\s*viewportSize\.width\s*>\s*0\s*&&\s*viewportSize\.height\s*>\s*0/,
  );
});

test('freehand review validation accepts open two-point image traces', () => {
  const errors = validateAnnotationForReview({
    id: 'freehand-trace',
    type: 'freehand',
    viewer_type: '2d',
    coordinates: {
      path: [
        { x: 0.2, y: 0.3 },
        { x: 0.7, y: 0.35 },
      ],
    },
    metadata: {
      source_width: 2000,
      source_height: 1000,
      finding_type: 'other',
      severity: 'S1',
      tooth_number: '11',
      surface: 'root',
    },
  });

  assert.deepEqual(errors, []);
});

test('panoramic Annotate starts on a drawable tool instead of Select', async () => {
  const viewerSource = await readFile(
    'src/pages/dentist-portal/x-core/components/ImageViewer2D.jsx',
    'utf8',
  );

  assert.match(
    viewerSource,
    /setAnnotationTool\(\s*\(?currentTool\)?\s*=>\s*currentTool\s*===\s*['"]select['"]\s*\?\s*['"]arrow['"]\s*:\s*currentTool\s*\)/,
  );
});

test('panoramic measurement and annotation toolbars expose redo actions', async () => {
  const viewerSource = await readFile(
    'src/pages/dentist-portal/x-core/components/ImageViewer2D.jsx',
    'utf8',
  );

  assert.match(viewerSource, /const\s+\[annotationsRedo,\s*setAnnotationsRedo\]\s*=\s*useState\(\[\]\)/);
  assert.match(viewerSource, /const\s+\[measurementsRedo,\s*setMeasurementsRedo\]\s*=\s*useState\(\[\]\)/);
  assert.match(viewerSource, /const\s+handleRedoAnnotation\s*=\s*useCallback/);
  assert.match(viewerSource, /const\s+handleRedoMeasurement\s*=\s*useCallback/);
  assert.match(viewerSource, /title="Redo Measurement"/);
  assert.match(viewerSource, /title="Redo last annotation"/);
  assert.equal((viewerSource.match(/name="Redo2"/g) || []).length >= 2, true);
});
