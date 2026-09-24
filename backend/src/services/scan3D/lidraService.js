import path from 'node:path';
import fs from 'node:fs/promises';
import { scanDirectory, confinedExistingFile } from './scanStorage.js';
import { scanServiceHeaders, scanServiceSignal } from './engines/pythonServiceEngine.js';

const HTTP_FAILURE_CODES = {
  400: 'ACQUISITION_REQUEST_INVALID',
  401: 'SCAN_SERVICE_AUTH_FAILED',
  403: 'SCAN_SERVICE_AUTH_FAILED',
  404: 'ACQUISITION_ENDPOINT_UNAVAILABLE',
  422: 'ACQUISITION_CONFIGURATION_INVALID',
  503: 'SCAN_SERVICE_NOT_CONFIGURED',
};

function acquisitionFailureCode(error) {
  if (error.code && Object.values(HTTP_FAILURE_CODES).includes(error.code)) return error.code;
  if (error.code === 'SCAN_SERVICE_NOT_CONFIGURED' || error.code === 'ACQUISITION_SERVICE_UNAVAILABLE') return error.code;
  if (error.name === 'TimeoutError' || error.code === 'ETIMEDOUT' || error.cause?.code === 'ETIMEDOUT') {
    return 'ACQUISITION_TIMEOUT';
  }
  if (['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET', 'EHOSTUNREACH'].includes(error.code)
      || ['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET', 'EHOSTUNREACH'].includes(error.cause?.code)) {
    return 'ACQUISITION_SERVICE_UNAVAILABLE';
  }
  return 'ACQUISITION_UNAVAILABLE';
}

export function unavailableAcquisition(reason, failureCode = 'ACQUISITION_UNAVAILABLE') {
  const unavailable = { status: 'unavailable', reason };
  return { success: false, status: 'unavailable', failureCode, version: 'lidra-measured-2',
    qualityScore: null, frameQuality: unavailable, blur: unavailable, motionBlur: unavailable,
    exposure: unavailable, motion: unavailable, redundancy: unavailable, coverage: unavailable,
    selectedFrames: [], frameSelection: { selectedFramesCount: 0 },
    qualityDecision: { status: 'unavailable', reason }, analyzedAt: new Date().toISOString() };
}

/** Acquisition measurements only; unavailable is never replaced with invented values. */
export async function runLidraAcquisition(study, options = {}) {
  const studyDir = scanDirectory(study);
  const start = performance.now();
  try {
    const video = study.metadata?.video || {};
    const videoPath = await confinedExistingFile(studyDir, video.storagePath || video.fileName || 'raw_video.mp4');
    const outputDir = options.outputDir;
    if (!outputDir || !path.resolve(outputDir).startsWith(`${path.resolve(studyDir)}${path.sep}`)) {
      throw new Error('Acquisition requires an isolated attempt directory');
    }
    await fs.mkdir(outputDir, { recursive: true });
    const response = await fetch(`${process.env.PY_SERVICE_BASE_URL || 'http://127.0.0.1:8000'}/lidra/analyze`, {
      method: 'POST', headers: scanServiceHeaders(), signal: scanServiceSignal(options, 60000),
      body: JSON.stringify({ folderName: study.folderName, videoPath, outputDir,
        attemptId: options.attemptId, scanScope: study.metadata?.scanScope || 'full', configuration: options.configuration || {} }),
    });
    if (!response.ok) {
      const error = new Error(`Acquisition service failed (HTTP ${response.status})`);
      error.code = HTTP_FAILURE_CODES[response.status] ||
        (response.status >= 500 || [408, 429].includes(response.status)
          ? 'ACQUISITION_SERVICE_UNAVAILABLE' : 'ACQUISITION_UNAVAILABLE');
      throw error;
    }
    const report = await response.json();
    if (!['ready', 'rejected', 'unavailable'].includes(report.status) || report.qualityScore != null ||
      report.synthetic === true || !report.qualityDecision) {
      throw new Error('Acquisition service returned a legacy or unverified report');
    }
    return { ...report, durationMs: performance.now() - start, qualityScore: null };
  } catch (error) {
    if (options.signal?.aborted) throw error;
    const failureCode = acquisitionFailureCode(error);
    return { ...unavailableAcquisition(error.message, failureCode), durationMs: performance.now() - start };
  }
}
