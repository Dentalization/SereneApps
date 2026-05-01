import crypto from 'crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { logCommunicationEvent } from '../communications/logging.js';

const prisma = new PrismaClient();

export const WEBHOOK_STATUS = Object.freeze({
  PROCESSING: 'processing',
  PROCESSED: 'processed',
  FAILED: 'failed',
  IGNORED: 'ignored'
});

export function hashWebhookPayload(rawBody) {
  const serialized = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody || {});
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

export function normalizeWebhookHeaders(headers = {}) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => {
      if (Array.isArray(value)) {
        return [key, value.join(',')];
      }
      if (value === undefined) {
        return [key, null];
      }
      return [key, value];
    })
  );
}

function stringifyReceiptId(receipt) {
  return receipt?.id?.toString?.() ?? null;
}

function logWebhookReceipt(eventType, metadata, level = 'info') {
  logCommunicationEvent(eventType, metadata, level);
}

export async function beginWebhookProcessing({
  provider,
  source,
  deliveryKey,
  eventType,
  resourceId,
  signature,
  rawBody,
  headers = {},
  correlationId
}) {
  if (!provider) {
    throw new Error('WEBHOOK_PROVIDER_REQUIRED');
  }
  if (!deliveryKey) {
    throw new Error('WEBHOOK_DELIVERY_KEY_REQUIRED');
  }

  const payloadHash = hashWebhookPayload(rawBody);

  try {
    const receipt = await prisma.webhookReceipt.create({
      data: {
        provider,
        source: source || null,
        deliveryKey,
        eventType: eventType || null,
        resourceId: resourceId || null,
        signature: signature || null,
        payloadHash,
        correlationId: correlationId || null,
        rawPayload: typeof rawBody === 'string' ? { raw: rawBody } : (rawBody || {}),
        headers: normalizeWebhookHeaders(headers),
        status: WEBHOOK_STATUS.PROCESSING
      }
    });

    return {
      decision: 'process',
      receipt
    };
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
      throw error;
    }

    const existing = await prisma.webhookReceipt.findUnique({
      where: {
        provider_deliveryKey: {
          provider,
          deliveryKey
        }
      }
    });

    if (!existing) {
      throw error;
    }

    if (existing.payloadHash !== payloadHash) {
      await prisma.webhookReceipt.update({
        where: { id: existing.id },
        data: {
          attempts: { increment: 1 },
          lastError: 'WEBHOOK_REPLAY_PAYLOAD_MISMATCH'
        }
      }).catch(() => null);
      logWebhookReceipt('webhook_payload_hash_mismatch', {
        provider,
        source: source || null,
        deliveryKey,
        receiptId: stringifyReceiptId(existing),
        eventType: eventType || existing.eventType,
        resourceId: resourceId || existing.resourceId
      }, 'warn');
      const mismatch = new Error('WEBHOOK_REPLAY_PAYLOAD_MISMATCH');
      mismatch.status = 409;
      mismatch.receipt = existing;
      throw mismatch;
    }

    if (existing.status !== WEBHOOK_STATUS.PROCESSED) {
      await prisma.webhookReceipt.update({
        where: { id: existing.id },
        data: {
          status: WEBHOOK_STATUS.PROCESSING,
          attempts: { increment: 1 },
          lastError: null,
          nextAttemptAt: null
        }
      }).catch(() => null);
    }

    const decision = existing.status === WEBHOOK_STATUS.PROCESSED ? 'skip' : 'replay';
    logWebhookReceipt(decision === 'skip' ? 'webhook_replay_skipped' : 'webhook_replay_retry', {
      provider,
      source: source || existing.source,
      deliveryKey,
      receiptId: stringifyReceiptId(existing),
      eventType: eventType || existing.eventType,
      resourceId: resourceId || existing.resourceId,
      attempts: existing.attempts
    }, decision === 'skip' ? 'info' : 'warn');

    return { decision, receipt: existing };
  }
}

export async function recordWebhookRejected({
  provider,
  source,
  deliveryKey,
  eventType,
  resourceId,
  signature,
  rawBody,
  headers = {},
  correlationId,
  reason
}) {
  const payloadHash = hashWebhookPayload(rawBody);
  const safeReason = String(reason || 'WEBHOOK_REJECTED').slice(0, 160);

  let receipt = null;
  try {
    const existing = await prisma.webhookReceipt.findUnique({
      where: { provider_deliveryKey: { provider, deliveryKey } }
    });
    if (existing) {
      if (existing.payloadHash !== payloadHash) {
        logWebhookReceipt('webhook_payload_hash_mismatch', {
          provider,
          source: source || existing.source,
          deliveryKey,
          receiptId: stringifyReceiptId(existing),
          eventType: eventType || existing.eventType,
          resourceId: resourceId || existing.resourceId
        }, 'warn');
      }
      receipt = await prisma.webhookReceipt.update({
        where: { id: existing.id },
        data: {
          attempts: { increment: 1 },
          lastError: safeReason,
          status: existing.status === WEBHOOK_STATUS.PROCESSED ? existing.status : WEBHOOK_STATUS.IGNORED,
          headers: normalizeWebhookHeaders(headers)
        }
      });
    } else {
      receipt = await prisma.webhookReceipt.create({
        data: {
          provider,
          source: source || null,
          deliveryKey,
          eventType: eventType || null,
          resourceId: resourceId || null,
          signature: signature || null,
          payloadHash,
          correlationId: correlationId || null,
          rawPayload: typeof rawBody === 'string' ? { raw: rawBody } : (rawBody || {}),
          headers: normalizeWebhookHeaders(headers),
          status: WEBHOOK_STATUS.IGNORED,
          lastError: safeReason,
          processedAt: new Date()
        }
      });
    }
  } catch (error) {
    logWebhookReceipt('webhook_rejected_receipt_failed', {
      provider,
      deliveryKey,
      eventType,
      resourceId,
      reason: safeReason,
      error: error.message
    }, 'warn');
  }

  logWebhookReceipt('webhook_signature_invalid', {
    provider,
    source: source || null,
    deliveryKey,
    receiptId: stringifyReceiptId(receipt),
    eventType,
    resourceId,
    reason: safeReason
  }, 'warn');

  return receipt;
}

export async function markWebhookProcessed({ receiptId, status = WEBHOOK_STATUS.PROCESSED }) {
  return prisma.webhookReceipt.update({
    where: { id: BigInt(receiptId) },
    data: {
      status,
      processedAt: new Date(),
      lastError: null
    }
  });
}

export async function markWebhookFailed({ receiptId, errorMessage, nextAttemptAt }) {
  return prisma.webhookReceipt.update({
    where: { id: BigInt(receiptId) },
    data: {
      status: WEBHOOK_STATUS.FAILED,
      attempts: { increment: 1 },
      lastError: errorMessage || 'WEBHOOK_PROCESSING_FAILED',
      nextAttemptAt: nextAttemptAt || new Date(Date.now() + 60_000)
    }
  });
}

export async function guardWebhookIdempotency(provider, deliveryKey, payload, handler) {
  const payloadHash = hashWebhookPayload(payload);
  const existing = await prisma.webhookReceipt.findUnique({
    where: {
      provider_deliveryKey: { provider, deliveryKey }
    }
  });

  if (existing && existing.payloadHash !== payloadHash) {
    await prisma.webhookReceipt.update({
      where: { id: existing.id },
      data: {
        attempts: { increment: 1 },
        lastError: 'WEBHOOK_REPLAY_PAYLOAD_MISMATCH'
      }
    }).catch(() => null);
    logWebhookReceipt('webhook_payload_hash_mismatch', {
      provider,
      deliveryKey,
      receiptId: stringifyReceiptId(existing)
    }, 'warn');
    const mismatch = new Error('WEBHOOK_REPLAY_PAYLOAD_MISMATCH');
    mismatch.status = 409;
    throw mismatch;
  }

  if (existing && existing.status === WEBHOOK_STATUS.PROCESSED) {
    logWebhookReceipt('webhook_replay_skipped', {
      provider,
      deliveryKey,
      receiptId: stringifyReceiptId(existing)
    });
    return { skipped: true };
  }

  return await prisma.$transaction(async (tx) => {
    let receiptId;

    if (!existing) {
      const created = await tx.webhookReceipt.create({
        data: {
          provider,
          deliveryKey,
          payloadHash,
          rawPayload: typeof payload === 'string' ? { raw: payload } : (payload || {}),
          status: WEBHOOK_STATUS.PROCESSING
        }
      });
      receiptId = created.id;
    } else {
      receiptId = existing.id;
      await tx.webhookReceipt.update({
        where: { id: receiptId },
        data: {
          status: WEBHOOK_STATUS.PROCESSING,
          lastError: null,
          attempts: { increment: 1 }
        }
      });
    }

    try {
      const result = await handler(tx);
      
      await tx.webhookReceipt.update({
        where: { id: receiptId },
        data: {
          status: WEBHOOK_STATUS.PROCESSED,
          processedAt: new Date()
        }
      });
      
      return result;
    } catch (error) {
      await tx.webhookReceipt.update({
        where: { id: receiptId },
        data: {
          status: WEBHOOK_STATUS.FAILED,
          lastError: error.message || 'HANDLER_EXECUTION_FAILED',
          nextAttemptAt: new Date(Date.now() + 60_000) // retry in 1m if needed
        }
      });
      throw error;
    }
  });
}
