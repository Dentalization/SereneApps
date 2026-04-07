import crypto from 'crypto';
import { Prisma, PrismaClient } from '@prisma/client';

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

    return {
      decision: existing.status === WEBHOOK_STATUS.PROCESSED ? 'skip' : 'replay',
      receipt: existing
    };
  }
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
