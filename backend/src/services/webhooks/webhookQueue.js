import { PrismaClient } from '@prisma/client';
import { handleMidtransCallback } from '../payments/webhookHandler.js';
import { recordFinancialAuditLog } from '../audit/auditLogger.js';

const prisma = new PrismaClient();

let isRunning = false;
let workerInterval = null;

export function startWebhookWorker() {
  if (workerInterval) return;
  console.log('[WebhookWorker] Starting background processing loop...');
  workerInterval = setInterval(async () => {
    if (isRunning) return;
    isRunning = true;
    try {
      await processPendingWebhooks();
    } catch (err) {
      console.error('[WebhookWorker] Error in processing loop:', err);
    } finally {
      isRunning = false;
    }
  }, 2000); // Check every 2s
}

export function stopWebhookWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    console.log('[WebhookWorker] Stopped background processing loop.');
  }
}

async function processPendingWebhooks() {
  const pendingReceipts = await prisma.webhookReceipt.findMany({
    where: {
      status: 'pending',
      retryCount: { lt: 5 }
    },
    orderBy: { receivedAt: 'asc' },
    take: 10
  });

  for (const receipt of pendingReceipts) {
    await processReceipt(receipt);
  }
}

export async function processReceipt(receipt) {
  const receiptId = receipt.id;
  
  // Update status to processing
  await prisma.webhookReceipt.update({
    where: { id: receiptId },
    data: {
      status: 'processing',
      processingStatus: 'processing',
      attempts: { increment: 1 },
      retryCount: { increment: 1 }
    }
  });

  try {
    let result;
    if (receipt.provider === 'midtrans') {
      const payload = receipt.rawPayload || {};
      // Run within transaction context
      result = await prisma.$transaction(async (tx) => {
        return await handleMidtransCallback(payload, tx);
      });
    } else {
      throw new Error(`Unsupported provider: ${receipt.provider}`);
    }

    await prisma.webhookReceipt.update({
      where: { id: receiptId },
      data: {
        status: 'processed',
        processingStatus: 'processed',
        processedAt: new Date(),
        lastError: null
      }
    });

    // Write audit log
    await recordFinancialAuditLog({
      actorId: null,
      actorRole: 'system',
      entityType: 'webhook_receipt',
      entityId: receiptId.toString(),
      action: 'webhook_processed',
      metadata: {
        provider: receipt.provider,
        deliveryKey: receipt.deliveryKey,
        result
      }
    });

  } catch (err) {
    const errorMsg = err.message || JSON.stringify(err);
    console.error(`[WebhookWorker] Failed to process receipt ${receiptId}:`, err);

    const nextAttemptAt = new Date(Date.now() + 10_000 * Math.pow(2, receipt.retryCount)); // Exponential backoff

    await prisma.webhookReceipt.update({
      where: { id: receiptId },
      data: {
        status: receipt.retryCount >= 4 ? 'dead_letter' : 'failed',
        processingStatus: receipt.retryCount >= 4 ? 'dead_letter' : 'failed',
        lastError: errorMsg,
        nextAttemptAt: receipt.retryCount >= 4 ? null : nextAttemptAt
      }
    });

    await recordFinancialAuditLog({
      actorId: null,
      actorRole: 'system',
      entityType: 'webhook_receipt',
      entityId: receiptId.toString(),
      action: receipt.retryCount >= 4 ? 'webhook_dlq' : 'webhook_failed',
      metadata: {
        provider: receipt.provider,
        deliveryKey: receipt.deliveryKey,
        error: errorMsg,
        attempts: receipt.retryCount + 1
      }
    });
  }
}
