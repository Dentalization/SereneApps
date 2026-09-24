import path from 'node:path';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { runLidraAcquisition } from './lidraService.js';
import { reconstructionEngineRegistry } from './engines/reconstructionEngineRegistry.js';
import { scanDirectory, confinedExistingFile, sha256File } from './scanStorage.js';
import { PROCESSING_VERSION, resolveExperimentConfiguration } from './experimentConfiguration.js';

/** Real acquisition -> named implementation -> immutable attempt assets. No algorithm substitution. */
export async function runReconstruction(study, options = {}) {
  const started = performance.now();
  const cpuStart = process.cpuUsage();
  const rssStart = process.memoryUsage().rss;
  const requestedEngine = options.engine || study.metadata?.reconstructionEngine || reconstructionEngineRegistry.defaultEngineName;
  const engine = reconstructionEngineRegistry.get(requestedEngine);
  if (['scaffold', 'simulation'].includes(engine.implementationStatus) || engine.isAvailable === false) {
    throw Object.assign(new Error(`Engine ${engine.name} cannot process real captures (${engine.implementationStatus})`), {
      code: 'ENGINE_UNAVAILABLE', retryable: false,
    });
  }
  const studyDir = scanDirectory(study);
  const attemptId = options.attemptId || randomUUID();
  const outputDir = path.resolve(options.outputDir || path.join(studyDir, 'attempts', attemptId));
  if (!outputDir.startsWith(`${path.resolve(studyDir)}${path.sep}`)) throw new Error('Invalid attempt directory');
  await fs.mkdir(outputDir, { recursive: true });
  const input = study.metadata?.video;
  if (!input?.checksum && !input?.sha256) {
    throw Object.assign(new Error('Video requires server inspection and checksum before processing'), {
      code: 'VIDEO_NOT_VERIFIED', retryable: false,
    });
  }
  const videoPath = await confinedExistingFile(studyDir, input.storagePath || input.fileName || 'raw_video.mp4');
  const inputChecksum = await sha256File(videoPath);
  if (inputChecksum !== (input.checksum || input.sha256)) {
    throw Object.assign(new Error('Video checksum mismatch'), { code: 'VIDEO_CORRUPT', retryable: false });
  }
  const configuration = resolveExperimentConfiguration(study, options.configuration || study.metadata?.experimentConfiguration || {});
  configuration.reconstruction.engine = requestedEngine;
  const runOptions = { ...options, outputDir, attemptId, configuration };
  const logs = [];
  const log = (stage, message) => logs.push({ timestamp: new Date().toISOString(), stage, level: 'info', message });
  log('pipeline_start', 'Starting experimental video reconstruction');
  const lidra = await runLidraAcquisition(study, runOptions);
  if (lidra.status !== 'ready' || !lidra.selectedFrames?.length) {
    throw Object.assign(new Error(`Acquisition ${lidra.status}: ${lidra.qualityDecision?.reason || 'No usable frames'}`), {
      code: 'ACQUISITION_UNAVAILABLE', retryable: false,
    });
  }
  log('acquisition_complete', `Measured ${lidra.selectedFrames.length} selected video frames; anatomical coverage unavailable`);
  const engineStart = performance.now();
  const result = await engine.process({ study, studyDir, frames: lidra.selectedFrames,
    cameraMetadata: input, scanScope: study.metadata?.scanScope || 'full', lidraReport: lidra, options: runOptions });
  if (!result.success || result.metadata?.synthetic !== false || !result.mesh?.checksum) {
    throw Object.assign(new Error('Unverified reconstruction result rejected'), { code: 'INVALID_RECONSTRUCTION', retryable: false });
  }
  if (options.signal?.aborted) throw new Error('Processing lease lost');
  const completedAt = new Date().toISOString();
  const capabilities = { measurementCapability: 'visualization_only', clinicalStatus: 'experimental',
    validated: false, clinicallyValidated: false, units: 'arbitrary', scale: { status: 'unvalidated' },
    segmentation: 'unavailable', clinicalIntelligence: 'blocked' };
  const provenance = {
    schemaVersion: '1', processingVersion: PROCESSING_VERSION, attemptId,
    scanId: String(study.id), patientId: study.patientId == null ? null : String(study.patientId),
    dentistId: study.dentistId == null ? null : String(study.dentistId),
    clinicId: study.clinicId == null ? null : String(study.clinicId),
    videoChecksum: inputChecksum, videoMetadata: input, captureMetadata: study.metadata?.captureMetadata || null,
    captureTimestamp: study.metadata?.captureMetadata?.captureTimestamp || null,
    engine: result.metadata.engine, engineVersion: result.metadata.engineVersion || result.metadata.version,
    geometrySource: 'image_derived', synthetic: false, units: 'arbitrary', scale: { status: 'uncalibrated' },
    coordinateSystem: result.metadata.coordinateSystem, frameExtractionVersion: lidra.version,
    lidraVersion: lidra.version, requestedConfiguration: configuration,
    configuration: result.metadata.configuration, reproducibility: result.metadata.reproducibility,
    selectedFrames: result.metadata.selectedFrames, cameraIntrinsics: result.metadata.cameraIntrinsics,
    intrinsicsSource: result.metadata.intrinsicsSource, cameraTrajectory: result.cameraTrajectory,
    processingTimestamp: completedAt,
    dentalProcessing: { enabled: false, version: 'identity-1', coordinateTransform: 'identity', rawPreserved: true },
    segmentationModel: null, fdiMethod: null, validation: { status: 'not_evaluated' },
  };
  const assets = { mesh: result.mesh, ply: result.pointCloud, stl: result.stl, preview: result.preview };
  for (const asset of Object.values(assets).filter(Boolean)) {
    asset.provenance = { engine: provenance.engine, engineVersion: provenance.engineVersion,
      processingVersion: PROCESSING_VERSION, videoChecksum: inputChecksum, synthetic: false, geometrySource: 'image_derived' };
  }
  // Raw = delivered reconstruction. No automatic anatomical deformation or filtering.
  const postProcessing = { enabled: false, version: 'identity-1', configuration: {},
    rawAsset: result.mesh, processedAsset: null, coordinateTransform: 'identity' };
  const cpu = process.cpuUsage(cpuStart);
  const timings = {
    status: 'measured', acquisitionMs: lidra.durationMs, reconstructionServiceMs: performance.now() - engineStart,
    serverProcessingMs: performance.now() - started, nodeCpuUserMs: cpu.user / 1000, nodeCpuSystemMs: cpu.system / 1000,
    nodeRssStartBytes: rssStart, nodeRssEndBytes: process.memoryUsage().rss,
    memoryScope: 'Node process snapshots; not reconstruction peak memory',
    assetBytes: Object.values(assets).filter(Boolean).reduce((n, a) => n + a.sizeInBytes, 0),
    gpuMemoryBytes: null, pythonTimings: result.metadata.timings || null, pythonMemory: result.metadata.memory || null,
  };
  log('reconstruction_completed', 'Real video-derived experimental geometry created; scale and accuracy remain unvalidated');
  const manifest = { ...provenance, assets, capabilities, postProcessing, performance: timings };
  await fs.writeFile(path.join(outputDir, 'provenance.json'), JSON.stringify(manifest, null, 2), { flag: 'wx' });
  return { success: true, assets, lidra, confidence: null, cameraTrajectory: result.cameraTrajectory,
    metrics: { ...result.metadata, processingVersion: PROCESSING_VERSION, performance: timings, postProcessing,
      capabilities, provenance }, provenance, capabilities, performance: timings, logs: [...logs, ...(result.logs || [])], completedAt };
}
