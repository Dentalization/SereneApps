import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

function parseBigIntId(value) {
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

/**
 * Enqueues an uploaded 3D scan session for asynchronous reconstruction.
 */
export async function enqueueScan(scanId, options = {}) {
  const parsedId = parseBigIntId(scanId);
  if (!parsedId) {
    const error = new Error('Invalid scan ID');
    error.status = 400;
    throw error;
  }

  const scan = await prisma.imagingStudy.findFirst({
    where: { id: parsedId, modality: '3D_SCAN' },
  });

  if (!scan) {
    const error = new Error('Scan session not found');
    error.status = 404;
    throw error;
  }

  // Only allow enqueuing from valid prior states (uploaded, failed, or captured)
  const allowedStatuses = ['uploaded', 'captured', 'failed', 'created', 'pending_capture'];
  if (!allowedStatuses.includes(scan.status)) {
    const error = new Error(`Cannot enqueue scan in '${scan.status}' status`);
    error.status = 400;
    throw error;
  }

  const currentMetadata = (typeof scan.metadata === 'object' && scan.metadata) ? scan.metadata : {};
  const currentJob = currentMetadata.processingJob || {};
  const existingAttempts = currentJob.attempts || 0;

  const jobId = currentJob.jobId || `job-3d-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const engine = options.engine || currentMetadata.reconstructionEngine || 'photogrammetry_v1';

  const processingJob = {
    jobId,
    status: 'queued',
    queuedAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    failedAt: null,
    attempts: existingAttempts,
    maxAttempts: options.maxAttempts || 3,
    progressPercent: 5,
    currentStage: 'queued',
    reconstructionEngine: engine,
    failureReason: null,
    logs: [
      ...(currentJob.logs || []),
      {
        timestamp: new Date().toISOString(),
        stage: 'queue',
        level: 'info',
        message: `Scan placed in asynchronous reconstruction queue with engine [${engine}]`,
      },
    ],
  };

  const updatedMetadata = {
    ...currentMetadata,
    processingJob,
  };

  const updatedScan = await prisma.imagingStudy.update({
    where: { id: scan.id },
    data: {
      status: 'queued',
      metadata: updatedMetadata,
    },
    include: {
      patient: {
        select: { id: true, name: true, phone_number: true, email: true },
      },
    },
  });

  return {
    scan: updatedScan,
    job: processingJob,
  };
}

/**
 * Retrieves the asynchronous processing status, progress, stage, and logs for a scan.
 */
export async function getScanJobStatus(scanId) {
  const parsedId = parseBigIntId(scanId);
  if (!parsedId) {
    const error = new Error('Invalid scan ID');
    error.status = 400;
    throw error;
  }

  const scan = await prisma.imagingStudy.findFirst({
    where: { id: parsedId, modality: '3D_SCAN' },
    select: {
      id: true,
      folderName: true,
      status: true,
      metadata: true,
      sizeInBytes: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!scan) {
    const error = new Error('Scan session not found');
    error.status = 404;
    throw error;
  }

  const metadata = (typeof scan.metadata === 'object' && scan.metadata) ? scan.metadata : {};
  const processingJob = metadata.processingJob || {
    status: scan.status,
    progressPercent: scan.status === 'ready' ? 100 : scan.status === 'queued' ? 5 : 0,
    currentStage: scan.status,
    logs: [],
  };

  return {
    scanId: scan.id.toString(),
    scanIdentifier: scan.folderName,
    status: scan.status,
    progressPercent: processingJob.progressPercent || 0,
    currentStage: processingJob.currentStage || scan.status,
    job: processingJob,
    assets: metadata.assets || null,
    video: metadata.video || null,
    failureReason: processingJob.failureReason || metadata.failureReason || null,
    updatedAt: scan.updatedAt.toISOString(),
  };
}

/**
 * Retries a failed scan reconstruction.
 */
export async function retryScan(scanId, options = {}) {
  const parsedId = parseBigIntId(scanId);
  if (!parsedId) {
    const error = new Error('Invalid scan ID');
    error.status = 400;
    throw error;
  }

  const scan = await prisma.imagingStudy.findFirst({
    where: { id: parsedId, modality: '3D_SCAN' },
  });

  if (!scan) {
    const error = new Error('Scan session not found');
    error.status = 404;
    throw error;
  }

  if (scan.status !== 'failed') {
    const error = new Error(`Only failed scans can be retried. Current status is '${scan.status}'`);
    error.status = 400;
    throw error;
  }

  const currentMetadata = (typeof scan.metadata === 'object' && scan.metadata) ? scan.metadata : {};
  const currentJob = currentMetadata.processingJob || {};
  const attempts = (currentJob.attempts || 0) + 1;

  return await enqueueScan(scan.id, {
    ...options,
    maxAttempts: (currentJob.maxAttempts || 3) + 1,
  });
}
