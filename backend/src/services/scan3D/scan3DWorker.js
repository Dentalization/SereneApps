import { PrismaClient } from '@prisma/client';
import { runReconstruction } from './reconstructionEngineAdapter.js';

const prisma = new PrismaClient();

let isRunning = false;
let workerInterval = null;
const WORKER_INTERVAL_MS = 2500; // Check queue every 2.5 seconds

/**
 * Starts the background worker loop for 3D scan reconstruction.
 */
export function startScan3DWorker() {
  if (workerInterval) return;
  console.log('[Scan3DWorker] Starting background 3D scan processing worker...');
  workerInterval = setInterval(async () => {
    if (isRunning) return;
    isRunning = true;
    try {
      await processNextQueuedScan();
    } catch (err) {
      console.error('[Scan3DWorker] Error in processing loop:', err);
    } finally {
      isRunning = false;
    }
  }, WORKER_INTERVAL_MS);
}

/**
 * Stops the background worker loop.
 */
export function stopScan3DWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    console.log('[Scan3DWorker] Stopped background 3D scan processing worker.');
  }
}

/**
 * Finds and processes the next queued 3D scan.
 */
async function processNextQueuedScan() {
  const queuedStudy = await prisma.imagingStudy.findFirst({
    where: {
      modality: '3D_SCAN',
      status: 'queued',
    },
    orderBy: { updatedAt: 'asc' },
  });

  if (!queuedStudy) return;

  await processScanJob(queuedStudy);
}

/**
 * Executes reconstruction for a specific study, updating state machine and logging.
 */
export async function processScanJob(study) {
  const studyId = study.id;
  const currentMetadata = (typeof study.metadata === 'object' && study.metadata) ? study.metadata : {};
  const currentJob = currentMetadata.processingJob || {};
  const attempts = (currentJob.attempts || 0) + 1;
  const maxAttempts = currentJob.maxAttempts || 3;

  // 1. Transition to 'processing' state
  const processingMetadata = {
    ...currentMetadata,
    processingJob: {
      ...currentJob,
      status: 'processing',
      startedAt: new Date().toISOString(),
      attempts,
      progressPercent: 20,
      currentStage: 'processing',
      logs: [
        ...(currentJob.logs || []),
        {
          timestamp: new Date().toISOString(),
          stage: 'worker_lease',
          level: 'info',
          message: `Worker leased scan (attempt ${attempts}/${maxAttempts}). Starting 3D reconstruction.`,
        },
      ],
    },
  };

  await prisma.imagingStudy.update({
    where: { id: studyId },
    data: {
      status: 'processing',
      metadata: processingMetadata,
    },
  });

  try {
    // 2. Run reconstruction engine adapter
    const result = await runReconstruction(study, {
      engine: currentJob.reconstructionEngine || 'photogrammetry_v1',
    });

    if (result.success) {
      // 3. Transition to 'ready' state on success
      const completedMetadata = {
        ...processingMetadata,
        assets: result.assets,
        metrics: result.metrics,
        lidra: result.lidra,
        confidence: result.confidence,
        cameraTrajectory: result.cameraTrajectory,
        processingJob: {
          ...processingMetadata.processingJob,
          status: 'ready',
          completedAt: result.completedAt,
          progressPercent: 100,
          currentStage: 'ready',
          logs: [
            ...(processingMetadata.processingJob.logs || []),
            ...(result.logs || []),
            {
              timestamp: new Date().toISOString(),
              stage: 'pipeline_success',
              level: 'info',
              message: '3D reconstruction pipeline finished successfully. 3D assets registered.',
            },
          ],
        },
      };

      await prisma.imagingStudy.update({
        where: { id: studyId },
        data: {
          status: 'ready',
          metadata: completedMetadata,
        },
      });

      console.log(`[Scan3DWorker] Scan ${studyId} successfully reconstructed and marked READY.`);
      return { success: true, studyId, status: 'ready' };
    } else {
      throw new Error(result.error || 'Reconstruction engine reported failure');
    }
  } catch (err) {
    console.error(`[Scan3DWorker] Error reconstructing scan ${studyId}:`, err);

    const isExhausted = attempts >= maxAttempts;
    const nextStatus = isExhausted ? 'failed' : 'queued';

    const failedMetadata = {
      ...processingMetadata,
      failureReason: err.message,
      processingJob: {
        ...processingMetadata.processingJob,
        status: nextStatus,
        failedAt: isExhausted ? new Date().toISOString() : null,
        failureReason: err.message,
        progressPercent: isExhausted ? 0 : 5,
        currentStage: isExhausted ? 'failed' : 'retry_queued',
        logs: [
          ...(processingMetadata.processingJob.logs || []),
          {
            timestamp: new Date().toISOString(),
            stage: 'error',
            level: 'error',
            message: `Reconstruction error: ${err.message}. ${isExhausted ? 'Max retry attempts reached.' : 'Will retry.'}`,
          },
        ],
      },
    };

    await prisma.imagingStudy.update({
      where: { id: studyId },
      data: {
        status: nextStatus,
        metadata: failedMetadata,
      },
    });

    return { success: false, studyId, status: nextStatus, error: err.message };
  }
}

/**
 * Manually trigger processing for a specific scan ID immediately (bypassing next interval).
 */
export async function processScanNow(scanId) {
  const parsedId = typeof scanId === 'bigint' ? scanId : BigInt(scanId);
  const study = await prisma.imagingStudy.findFirst({
    where: { id: parsedId, modality: '3D_SCAN' },
  });

  if (!study) {
    throw new Error('Study not found');
  }

  return await processScanJob(study);
}
