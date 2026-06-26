import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  normalizeSliceClinicalContext,
  SLICE_CLINICAL_PLANES,
} from '../src/pages/dentist-portal/x-core/utils/annotationClinicalContext.mjs';

test('slice clinical context records plane and stable zero/one-based slice identifiers', () => {
  assert.deepEqual(SLICE_CLINICAL_PLANES, ['axial', 'coronal', 'sagittal']);
  assert.deepEqual(normalizeSliceClinicalContext({
    sliceAxis: 'coronal',
    sliceIndex: 49,
    sliceCount: 200,
  }), {
    viewer_type: 'slice',
    coordinate_context: 'slice_plane',
    anatomical_plane: 'coronal',
    slice_axis: 'coronal',
    slice_index: 49,
    slice_number: 50,
    slice_count: 200,
  });
});

test('stored annotation context remains authoritative when reopening Clinical Tags', () => {
  const context = normalizeSliceClinicalContext({
    sliceAxis: 'axial',
    sliceIndex: 10,
  }, {
    slice_axis: 'sagittal',
    slice_index: 74,
    metadata: { slice_count: 201 },
  });

  assert.equal(context.anatomical_plane, 'sagittal');
  assert.equal(context.slice_index, 74);
  assert.equal(context.slice_number, 75);
  assert.equal(context.slice_count, 201);
});

test('SliceViewer keeps AnnotationCanvas mounted after annotation commits', async () => {
  const source = await readFile(
    'src/pages/dentist-portal/x-core/components/SliceViewer.jsx',
    'utf8',
  );

  assert.doesNotMatch(
    source,
    /annotationPersistence\.loading,\s*annotations\.length,\s*error/,
  );
  assert.match(source, /slice_axis:\s*axisName/);
  assert.match(source, /slice_index:\s*currentSliceIndex/);
  assert.equal((source.match(/clinicalContext=\{\{/g) || []).length, 2);
});

test('Clinical Tags displays slice plane and opens for text annotations', async () => {
  const source = await readFile(
    'src/pages/dentist-portal/x-core/components/AnnotationCanvas.jsx',
    'utf8',
  );

  assert.match(source, /Slice location/);
  assert.match(source, /SLICE_CLINICAL_PLANES\.map/);
  assert.match(source, /Stored as/);

  const textCommitStart = source.indexOf('const commitTextDraft = (value) => {');
  const textCommitEnd = source.indexOf('const handlePointerDown = (event) => {', textCommitStart);
  assert.match(source.slice(textCommitStart, textCommitEnd), /withMetadataDraft\(annotation\)/);
});

test('Slice Viewer annotation toolbar exposes counted undo and redo history', async () => {
  const source = await readFile(
    'src/pages/dentist-portal/x-core/components/SliceViewer.jsx',
    'utf8',
  );

  assert.match(source, /const \[annotationsHistory, setAnnotationsHistory\] = useState\(\[\]\)/);
  assert.match(source, /const \[annotationsRedo, setAnnotationsRedo\] = useState\(\[\]\)/);
  assert.match(source, /const handleRedoAnnotation = useCallback/);
  assert.match(source, /name="Redo2"/);
  assert.match(source, /Undo annotation \(\$\{annotationsHistory\.length\} available\)/);
  assert.match(source, /Redo annotation \(\$\{annotationsRedo\.length\} available\)/);
  assert.match(source, /const AnnotationCounterBadge =/);
  assert.match(source, /const applyPersistenceAnnotationsState = useCallback/);
  assert.match(source, /typeof updater !== 'function'/);
  assert.match(source, /setAnnotations: applyPersistenceAnnotationsState/);
  assert.match(source, /pushAnnotationsState\(\(current\) => \[/);
  assert.match(source, /key === 'z' && event\.shiftKey/);
  assert.match(source, /key === 'y'/);

  const reconciliationStart = source.indexOf('const applyPersistenceAnnotationsState = useCallback');
  const reconciliationEnd = source.indexOf('const pushAnnotationsState = useCallback', reconciliationStart);
  const reconciliationSource = source.slice(reconciliationStart, reconciliationEnd);
  assert.doesNotMatch(reconciliationSource, /setAnnotationsHistory\(/);
  assert.doesNotMatch(reconciliationSource, /setAnnotationsRedo\(/);
  assert.match(source, /initial=\{\{ y: -4, scale: 0\.82 \}\}/);
  assert.match(source, /transition=\{\{ duration: 0\.14/);
  assert.match(source, /h-8 w-8 shrink-0/);
  assert.match(source, /tabular-nums/);
  assert.doesNotMatch(source, /absolute -right-1 -top-1/);
  assert.match(source, /translate-x-1\/3 -translate-y-1\/3/);
});
