import assert from 'node:assert/strict';
import test from 'node:test';
import { captureAnalysisCaseItem } from '../src/features/x-core-analysis/captureAnalysisCaseItem.js';

function canvasStub() {
  const context = {
    fillStyle: '', filter: '',
    fillRect() {}, save() {}, restore() {}, drawImage() {}, scale() {},
  };
  return {
    width: 0,
    height: 0,
    getContext: () => context,
    toDataURL: () => 'data:image/png;base64,ZmFrZS1yZW5kZXI=',
  };
}

test('analysis capture keeps the viewer window state instead of converting it to null', async () => {
  const previousDocument = globalThis.document;
  globalThis.document = { createElement: () => canvasStub() };
  try {
    let captured;
    await captureAnalysisCaseItem({
      imgRef: { current: { complete: true, naturalWidth: 800, naturalHeight: 600 } },
      annotations: [],
      persistence: { hydrated: true, flushPendingSave: async () => ({ annotations: [] }) },
      onCaptureForCase: async (renders) => { captured = renders; },
      analysisCaseContext: { itemId: 'case-item-id' },
      study: { id: 42 },
      seriesUid: 'series-uid',
      windowCenter: 0.42,
      windowWidth: 1.25,
      inverted: true,
    });
    assert.equal(captured.ANNOTATED.metadata.window_center, 0.42);
    assert.equal(captured.ANNOTATED.metadata.window_width, 1.25);
    assert.equal(captured.ANNOTATED.metadata.invert, true);
  } finally {
    globalThis.document = previousDocument;
  }
});

test('analysis capture refuses an unloaded radiograph before canvas rendering', async () => {
  await assert.rejects(() => captureAnalysisCaseItem({
    imgRef: { current: { complete: false, naturalWidth: 0, naturalHeight: 0 } },
    onCaptureForCase: async () => {},
  }), /belum selesai dimuat/i);
});

test('analysis capture preserves the backend annotation-save reason for the user', async () => {
  await assert.rejects(() => captureAnalysisCaseItem({
    imgRef: { current: { complete: true, naturalWidth: 800, naturalHeight: 600 } },
    persistence: {
      hydrated: true,
      flushPendingSave: async () => {
        const error = new Error('Annotation save conflict');
        error.status = 409;
        error.payload = { error: 'Annotation save conflict' };
        throw error;
      },
    },
    onCaptureForCase: async () => {},
  }), /Anotasi belum berhasil disimpan.*Annotation save conflict/i);
});
