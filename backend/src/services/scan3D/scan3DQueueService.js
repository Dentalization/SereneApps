import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { reconstructionEngineRegistry } from './engines/reconstructionEngineRegistry.js';
import { scanServiceHeaders } from './engines/pythonServiceEngine.js';
import { resolveExperimentConfiguration } from './experimentConfiguration.js';
import { publicScanState, publicJob, scanEvent } from './scanIntegrity.js';

import { auditedScanUpdate } from './scanAudit.js';
const prisma = new PrismaClient();
export const MAX_SCAN_ATTEMPTS = 3;
export const DEFAULT_SCAN_ENGINE = 'opencv_sparse_sfm';
const problem = (status, message, code) => Object.assign(new Error(message), { status, code });

export function createScanQueue(client, registry = reconstructionEngineRegistry) {
  async function enqueue(scanId, options = {}) {
    let id;
    try { id = BigInt(scanId); } catch { throw problem(400, 'Invalid scan ID'); }
    const scan = await client.imagingStudy.findFirst({ where: { id, modality: '3D_SCAN' } });
    if (!scan) throw problem(404, 'Scan session not found');
    const metadata = scan.metadata || {};
    const previous = metadata.processingJob || {};
    const configuration = options.configuration === undefined ? metadata.experimentConfiguration || {} : options.configuration;
    try { resolveExperimentConfiguration(scan, configuration); }
    catch (error) { throw problem(400, error.message, 'INVALID_EXPERIMENT_CONFIGURATION'); }
    const engine = options.engine || configuration.reconstruction?.engine || previous.reconstructionEngine || DEFAULT_SCAN_ENGINE;
    const descriptor = registry.list().find(item => item.name === engine);
    if (!descriptor || descriptor.isAvailable === false || ['simulation', 'scaffold', 'blocked'].includes(descriptor.implementationStatus)
        || descriptor.synthetic === true || descriptor.isSynthetic === true) {
      throw problem(422, 'Selected reconstruction engine is unavailable for real captures', 'ENGINE_UNAVAILABLE');
    }
    if (['queued', 'processing', 'ready'].includes(scan.status) && (!options.engine || engine === previous.reconstructionEngine) && (options.configuration === undefined || JSON.stringify(configuration) === JSON.stringify(metadata.experimentConfiguration || {}))) {
      return { scan, job: publicJob(previous), idempotent: true };
    }
    if (!['uploaded', 'failed'].includes(scan.status)) throw problem(409, `Cannot enqueue scan in '${scan.status}' status`);
    if (metadata.storageVersion !== 'private_v1' || !metadata.video?.decodeVerified || !metadata.videoFileName || !/^[a-f0-9]{64}$/.test(metadata.checksum || '')) {
      throw problem(422, 'Upload a video verified by the server before reconstruction', 'VIDEO_NOT_VERIFIED');
    }
    try { scanServiceHeaders(); }
    catch (error) { throw problem(503, error.message, error.code || 'SCAN_SERVICE_NOT_CONFIGURED'); }
    const attempts = Number(previous.attempts || 0);
    if (attempts >= MAX_SCAN_ATTEMPTS) throw problem(409, 'Reconstruction attempt limit reached; upload a new recording', 'RETRY_LIMIT_REACHED');
    if (previous.nextAttemptAt && Date.parse(previous.nextAttemptAt) > Date.now()) throw problem(409, 'Retry backoff has not elapsed', 'RETRY_BACKOFF');
    const job = { ...previous, jobId: previous.jobId || `job-3d-${randomUUID()}`, status: 'queued', queuedAt: new Date().toISOString(),
      startedAt: null, completedAt: null, failedAt: null, attempts, maxAttempts: MAX_SCAN_ATTEMPTS,
      progressPercent: 5, currentStage: 'queued', reconstructionEngine: engine, failureReason: null,
      leaseToken: null, leaseExpiresAt: null, logs: scanEvent(previous, attempts ? 'processing_retried' : 'processing_queued') };
    const updatedMetadata = { ...metadata, experimentConfiguration: structuredClone(configuration), processingJob: job,
      assets: null, diagnosticAssets: null, qualityAssessment: null, confidence: null };
    const result = await auditedScanUpdate(client, scan, { id, status: scan.status, metadata: { equals: scan.metadata } }, { status: 'queued', metadata: updatedMetadata }, attempts ? 'processing_retried' : 'processing_queued');
    if (!result.count) throw problem(409, 'Scan changed concurrently; refresh its status', 'SCAN_CONFLICT');
    return { scan: { ...scan, status: 'queued', metadata: updatedMetadata }, job: publicJob(job) };
  }
  async function retry(scanId, options = {}) {
    const scan = await client.imagingStudy.findFirst({ where: { id: BigInt(scanId), modality: '3D_SCAN' } });
    if (!scan) throw problem(404, 'Scan session not found');
    if (scan.status !== 'failed') throw problem(409, 'Only failed scans can be retried');
    return enqueue(scanId, options);
  }
  return { enqueue, retry };
}
const queue = createScanQueue(prisma);
export const enqueueScan = queue.enqueue;
export const retryScan = queue.retry;

export async function getScanJobStatus(scanId) {
  const scan = await prisma.imagingStudy.findFirst({ where: { id: BigInt(scanId), modality: '3D_SCAN' } });
  if (!scan) throw problem(404, 'Scan session not found');
  const { status, metadata } = publicScanState(scan);
  const job = metadata.processingJob || { status: scan.status, progressPercent: 0, currentStage: scan.status, logs: [] };
  return { scanId: scan.id.toString(), scanIdentifier: scan.folderName, status,
    progressPercent: job.progressPercent || 0, currentStage: job.currentStage || status, job,
    assets: metadata.assets, diagnosticMesh: metadata.diagnosticMesh || null, metrics: metadata.metrics || null, lidra: metadata.lidra || null, confidence: null, cameraTrajectory: metadata.cameraTrajectory || [],
    capabilities: metadata.capabilities, provenance: metadata.provenance, performance: metadata.performance || null,
    qualityAssessment: metadata.qualityAssessment || null,
    video: metadata.video || null, failureReason: job.failureReason || null, updatedAt: scan.updatedAt.toISOString() };
}
