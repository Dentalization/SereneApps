import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { runReconstruction } from './reconstructionEngineAdapter.js';
import { scanDirectory } from './scanStorage.js';
import { DEFAULT_SCAN_ENGINE, MAX_SCAN_ATTEMPTS } from './scan3DQueueService.js';
import { EXPERIMENTAL_CAPABILITIES, scanEvent } from './scanIntegrity.js';
import { assessScanGeometry, GEOMETRY_INSUFFICIENT_CODE, GEOMETRY_INSUFFICIENT_MESSAGE } from './scanGeometryQuality.js';

import { auditedScanUpdate } from './scanAudit.js';
const prisma = new PrismaClient();
const LEASE_MS = 60000;
const JOB_TIMEOUT_MS = Math.min(3600000, Math.max(10000, Number(process.env.SCAN3D_JOB_TIMEOUT_MS) || 600000));
const delayFor = attempts => Math.min(300000, 5000 * 2 ** Math.max(0, attempts - 1));
const failureMessage = code => ({
  SCAN_SERVICE_NOT_CONFIGURED: 'The scan processing service is not configured. Contact the system administrator before retrying.',
  SCAN_SERVICE_AUTH_FAILED: 'The scan processing services do not share the same authentication token. Contact the system administrator before retrying.',
  ACQUISITION_ENDPOINT_UNAVAILABLE: 'The scan processing endpoint is missing or outdated. Contact the system administrator before retrying.',
  ACQUISITION_REQUEST_INVALID: 'The scan processing services disagree about the video path or request. Contact the system administrator before retrying.',
  ACQUISITION_CONFIGURATION_INVALID: 'The scan processing configuration was rejected. Review its settings before retrying.',
  ACQUISITION_SERVICE_UNAVAILABLE: 'The scan processing service is unavailable. Retry when it is running.',
  ACQUISITION_TIMEOUT: 'The scan processing service timed out. Retry after it recovers.',
  ACQUISITION_UNAVAILABLE: 'The capture could not be analyzed. Check the processing service and try again.',
  CAPTURE_QUALITY_REJECTED: 'The recording did not provide enough usable distinct frames. Record a new video.',
  CAPTURE_TARGET_SCREEN_SUSPECTED: 'The video appears to record a display. Record physical teeth or a physical dental model directly.',
  DENTAL_REGION_REVIEW_REQUIRED: 'The video was saved, but tooth regions have not been reviewed. Submit reviewed frame regions before reconstruction.',
  VIDEO_NOT_VERIFIED: 'The uploaded video could not be verified. Upload a new recording.',
  VIDEO_CORRUPT: 'The uploaded video changed or is damaged. Upload a new recording.',
  RECONSTRUCTION_TIMEOUT: 'Reconstruction timed out. Retry after the service recovers.',
  ENGINE_UNAVAILABLE: 'The selected reconstruction engine is unavailable. Contact the system administrator.',
})[code] || 'Reconstruction failed. Review the capture and processing configuration before retrying.';

export function createScanWorker(client, reconstruct = runReconstruction, { leaseMs = LEASE_MS, timeoutMs = JOB_TIMEOUT_MS } = {}) {
  async function fencedUpdate(id, token, transform) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const current = await client.imagingStudy.findFirst({ where: { id, status: 'processing', modality: '3D_SCAN' } });
      const job = current?.metadata?.processingJob;
      if (!current || job?.leaseToken !== token || Date.parse(job.leaseExpiresAt) <= Date.now()) return false;
      const data = transform(current);
      const event = data.status === 'ready' ? 'reconstruction_completed' : data.status ? 'processing_failed' : null;
      const result = await auditedScanUpdate(client, current, { id, status: 'processing', metadata: { equals: current.metadata } }, data, event);
      if (result.count) return true;
    }
    return false;
  }

  async function recoverExpired() {
    const studies = await client.imagingStudy.findMany({ where: { modality: '3D_SCAN', status: 'processing' }, orderBy: { updatedAt: 'asc' }, take: 100 });
    for (const study of studies) {
      const job = study.metadata?.processingJob || {};
      const expiry = Date.parse(job.leaseExpiresAt || '');
      if (Number.isFinite(expiry) && expiry > Date.now()) continue;
      const exhausted = Number(job.attempts || 0) >= MAX_SCAN_ATTEMPTS;
      const status = exhausted ? 'failed' : 'queued';
      await auditedScanUpdate(client, study, { id: study.id, status: 'processing', metadata: { equals: study.metadata } }, {
        status, metadata: { ...study.metadata, assets: null, processingJob: { ...job, status,
          failureCode: 'WORKER_LEASE_EXPIRED', failureReason: 'Processing was interrupted. A bounded retry is scheduled when available.',
          recoverable: !exhausted, currentStage: exhausted ? 'failed' : 'retry_queued', leaseToken: null, leaseExpiresAt: null,
          nextAttemptAt: new Date(Date.now() + delayFor(job.attempts || 1)).toISOString(),
          logs: scanEvent(job, 'worker_lease_expired') } },
      }, 'worker_lease_expired');
    }
  }

  async function processStudy(study) {
    const previous = study.metadata?.processingJob || {};
    if (study.status !== 'queued' || Number(previous.attempts || 0) >= MAX_SCAN_ATTEMPTS
        || Date.parse(previous.nextAttemptAt || '') > Date.now()) return { success: false, status: study.status, skipped: true };
    const token = randomUUID();
    const attempts = Number(previous.attempts || 0) + 1;
    const job = { ...previous, status: 'processing', attempts, maxAttempts: MAX_SCAN_ATTEMPTS, leaseToken: token,
      leaseExpiresAt: new Date(Date.now() + leaseMs).toISOString(), startedAt: new Date().toISOString(),
      currentStage: 'processing', progressPercent: 20, logs: scanEvent(previous, 'processing_started', { attempt: attempts }) };
    const claimedStudy = { ...study, status: 'processing', metadata: { ...study.metadata, processingJob: job } };
    const claim = await auditedScanUpdate(client, study, { id: study.id, status: 'queued', metadata: { equals: study.metadata } },
      { status: 'processing', metadata: claimedStudy.metadata }, 'processing_started');
    if (!claim.count) return { success: false, status: 'unclaimed', skipped: true };

    const abort = new AbortController();
    const started = performance.now();
    let heartbeatBusy = false;
    const heartbeat = setInterval(async () => {
      if (heartbeatBusy) return;
      heartbeatBusy = true;
      try {
        const held = await fencedUpdate(study.id, token, current => ({ metadata: { ...current.metadata,
          processingJob: { ...current.metadata.processingJob, leaseExpiresAt: new Date(Date.now() + leaseMs).toISOString() } } }));
        if (!held) abort.abort(Object.assign(new Error('Worker lease lost'), { code: 'LEASE_LOST' }));
      } catch (error) { abort.abort(error); }
      finally { heartbeatBusy = false; }
    }, Math.max(10, Math.floor(leaseMs / 3)));
    heartbeat.unref?.();
    const timeout = setTimeout(() => abort.abort(Object.assign(new Error('Reconstruction timed out'), { code: 'RECONSTRUCTION_TIMEOUT' })), timeoutMs);
    timeout.unref?.();
    try {
      const result = await Promise.race([
        reconstruct(claimedStudy, { engine: job.reconstructionEngine || DEFAULT_SCAN_ENGINE, signal: abort.signal,
          attemptId: token, outputDir: path.join(scanDirectory(claimedStudy), 'attempts', token) }),
        new Promise((_, reject) => abort.signal.addEventListener('abort', () => reject(abort.signal.reason), { once: true })),
      ]);
      if (!result?.success) throw Object.assign(new Error(result?.error || 'Reconstruction failed'), { code: result?.code });
      if (result.provenance?.geometrySource !== 'image_derived' || result.provenance?.synthetic !== false || !result.assets?.mesh) {
        throw Object.assign(new Error('Engine output does not have verified image-derived geometry'), { code: 'INVALID_RECONSTRUCTION' });
      }
      const qualityAssessment = assessScanGeometry(result);
      if (qualityAssessment.status !== 'candidate') {
        const published = await fencedUpdate(study.id, token, current => ({ status: 'failed', metadata: {
          ...current.metadata, assets: null, diagnosticAssets: { mesh: result.assets.mesh }, metrics: result.metrics, lidra: result.lidra,
          cameraTrajectory: result.cameraTrajectory || [], provenance: result.provenance,
          qualityAssessment, confidence: null, capabilities: EXPERIMENTAL_CAPABILITIES,
          clinicalStatus: 'experimental',
          performance: { ...result.performance, serverProcessingMs: performance.now() - started },
          processingJob: { ...current.metadata.processingJob, status: 'failed', failedAt: new Date().toISOString(),
            progressPercent: 100, currentStage: 'geometry_insufficient', leaseToken: null, leaseExpiresAt: null,
            failureReason: GEOMETRY_INSUFFICIENT_MESSAGE, failureCode: GEOMETRY_INSUFFICIENT_CODE,
            recoverable: false,
            logs: scanEvent(current.metadata.processingJob, 'geometry_quality_rejected', { level: 'error', code: GEOMETRY_INSUFFICIENT_CODE }) },
        } }));
        return { success: false, studyId: study.id, status: published ? 'failed' : 'lease_lost',
          error: GEOMETRY_INSUFFICIENT_MESSAGE };
      }
      const published = await fencedUpdate(study.id, token, current => ({ status: 'ready', metadata: {
        ...current.metadata, assets: result.assets, diagnosticAssets: null, metrics: result.metrics, lidra: result.lidra, confidence: null,
        cameraTrajectory: result.cameraTrajectory || [], provenance: result.provenance, qualityAssessment,
        capabilities: EXPERIMENTAL_CAPABILITIES, clinicalStatus: 'experimental',
        performance: { ...result.performance, serverProcessingMs: performance.now() - started },
        processingJob: { ...current.metadata.processingJob, status: 'ready', completedAt: new Date().toISOString(),
          progressPercent: 100, currentStage: 'ready', leaseToken: null, leaseExpiresAt: null,
          failureReason: null, failureCode: null, recoverable: false,
          logs: scanEvent(current.metadata.processingJob, 'reconstruction_completed') },
      } }));
      return { success: published, studyId: study.id, status: published ? 'ready' : 'lease_lost' };
    } catch (error) {
      console.error(`[Scan3DWorker] scan=${study.id} attempt=${attempts} code=${error.code || 'RECONSTRUCTION_FAILED'}`, error.message);
      const permanent = error.retryable === false || ['INVALID_RECONSTRUCTION', 'INVALID_VIDEO', 'ENGINE_UNAVAILABLE', 'VIDEO_NOT_VERIFIED'].includes(error.code);
      const exhausted = attempts >= MAX_SCAN_ATTEMPTS || permanent;
      const status = exhausted ? 'failed' : 'queued';
      const message = exhausted ? failureMessage(error.code) : 'Processing was interrupted. Retrying after a short delay.';
      const saved = await fencedUpdate(study.id, token, current => ({ status, metadata: { ...current.metadata, assets: null,
        qualityAssessment: null,
        performance: { ...current.metadata.performance, lastAttemptMs: performance.now() - started },
        processingJob: { ...current.metadata.processingJob, status, currentStage: exhausted ? 'failed' : 'retry_queued',
          failedAt: exhausted ? new Date().toISOString() : null, progressPercent: exhausted ? 0 : 5,
          failureReason: message, failureCode: error.code || 'RECONSTRUCTION_FAILED', recoverable: !permanent && attempts < MAX_SCAN_ATTEMPTS,
          nextAttemptAt: new Date(Date.now() + delayFor(attempts)).toISOString(), leaseToken: null, leaseExpiresAt: null,
          logs: scanEvent(current.metadata.processingJob, 'processing_failed', { level: 'error', code: error.code || 'RECONSTRUCTION_FAILED' }) },
      } }));
      return { success: false, studyId: study.id, status: saved ? status : 'lease_lost', error: message };
    } finally { clearInterval(heartbeat); clearTimeout(timeout); }
  }

  async function tick() {
    await recoverExpired();
    let afterId;
    for (;;) {
      const studies = await client.imagingStudy.findMany({
        where: { modality: '3D_SCAN', status: 'queued', ...(afterId === undefined ? {} : { id: { gt: afterId } }) },
        orderBy: { id: 'asc' }, take: 100,
      });
      const study = studies.find(item => Number(item.metadata?.processingJob?.attempts || 0) < MAX_SCAN_ATTEMPTS
        && !(Date.parse(item.metadata?.processingJob?.nextAttemptAt || '') > Date.now()));
      if (study) return processStudy(study);
      if (studies.length < 100) return null;
      afterId = studies[studies.length - 1].id;
    }
  }
  return { processStudy, tick, recoverExpired, fencedUpdate };
}
const worker = createScanWorker(prisma);
let running = false;
let interval;
export function startScan3DWorker() {
  if (interval) return;
  interval = setInterval(async () => {
    if (running) return;
    running = true;
    try { await worker.tick(); } catch (error) { console.error('[Scan3DWorker]', error); }
    finally { running = false; }
  }, 2500);
}
export function stopScan3DWorker() { clearInterval(interval); interval = null; }
export const processScanJob = worker.processStudy;
export async function processScanNow(scanId) {
  const study = await prisma.imagingStudy.findFirst({ where: { id: BigInt(scanId), modality: '3D_SCAN' } });
  if (!study) throw new Error('Study not found');
  return worker.processStudy(study);
}
