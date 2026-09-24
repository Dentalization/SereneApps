import path from 'node:path';
import fs from 'node:fs/promises';
import { scanDirectory, confinedExistingFile } from './scanStorage.js';
import { scanServiceHeaders, scanServiceSignal } from './engines/pythonServiceEngine.js';

export function unavailableAcquisition(reason) {
  const unavailable = { status: 'unavailable', reason };
  return { success: false, status: 'unavailable', version: 'lidra-measured-2',
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
    if (!response.ok) throw new Error(`Acquisition service failed (HTTP ${response.status})`);
    const report = await response.json();
    if (!['ready', 'rejected', 'unavailable'].includes(report.status) || report.qualityScore != null ||
      report.synthetic === true || !report.qualityDecision) {
      throw new Error('Acquisition service returned a legacy or unverified report');
    }
    return { ...report, durationMs: performance.now() - start, qualityScore: null };
  } catch (error) {
    if (options.signal?.aborted) throw error;
    return { ...unavailableAcquisition(error.message), durationMs: performance.now() - start };
  }
}
