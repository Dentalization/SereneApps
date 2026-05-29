import express from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyMidtransSignature, validateMidtransWebhookPayload } from '../services/payments/midtrans.js';
import { hashWebhookPayload } from '../services/webhooks/idempotency.js';
import { recordFinancialAuditLog } from '../services/audit/auditLogger.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @route POST /v1/payments/webhooks
 * @desc Midtrans Notification Webhook (Alternate endpoint)
 */
router.post('/', express.json(), async (req, res) => {
  const body = req.body;
  let payload;
  try {
    payload = validateMidtransWebhookPayload(body);
  } catch (error) {
    await recordFinancialAuditLog({
      actorId: null,
      actorRole: 'system',
      entityType: 'webhook_receipt',
      entityId: 'midtrans',
      action: 'webhook_payload_invalid',
      metadata: { error: error.message }
    });
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const { orderId, statusCode, grossAmount, transactionStatus, transactionId } = payload;
  const correlationId = orderId || '';

  console.log('[PaymentWebhook Ingestion]', { correlationId, status: transactionStatus });

  try {
    // 1. Verify Midtrans signature key
    const isVerified = verifyMidtransSignature({
      orderId,
      statusCode,
      grossAmount,
      signatureKey: payload.signatureKey
    });

    if (!isVerified) {
      await recordFinancialAuditLog({
        actorId: null,
        actorRole: 'system',
        entityType: 'webhook_receipt',
        entityId: orderId,
        action: 'webhook_signature_invalid',
        metadata: { orderId, transactionStatus, statusCode }
      });
      console.warn('[PaymentWebhook Ingestion] ⚠️ Signature verification failed for order:', orderId);
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Include the transaction_status in deliveryKey to support lifecycle status changes safely
    const deliveryKey = `${orderId}_${transactionId || 'unknown'}_${transactionStatus}`;

    // 2. Ingest payload by inserting WebhookReceipt in 'pending' status
    const payloadHash = hashWebhookPayload(body);
    
    const existing = await prisma.webhookReceipt.findUnique({
      where: {
        provider_deliveryKey: {
          provider: 'midtrans',
          deliveryKey
        }
      }
    });

    if (existing) {
      if (existing.payloadHash !== payloadHash) {
        await recordFinancialAuditLog({
          actorId: null,
          actorRole: 'system',
          entityType: 'webhook_receipt',
          entityId: deliveryKey,
          action: 'webhook_payload_hash_mismatch',
          metadata: { orderId, transactionStatus }
        });
        return res.status(409).json({ ok: false, error: 'Webhook payload mismatch' });
      }
      console.log('[PaymentWebhook Ingestion] Duplicate delivery key ignored:', deliveryKey);
      return res.status(200).json({ ok: true, skipped: true, reason: 'Duplicate event' });
    }

    await prisma.webhookReceipt.create({
      data: {
        provider: 'midtrans',
        deliveryKey,
        payloadHash,
        rawPayload: body || {},
        status: 'pending',
        processingStatus: 'pending',
        providerEventId: orderId,
        providerTransactionId: transactionId,
        orderId,
        correlationId: orderId,
        signature: payload.signatureKey,
        retryCount: 0
      }
    });

    console.log('[PaymentWebhook Ingested successfully]', { correlationId, deliveryKey });
    await recordFinancialAuditLog({
      actorId: null,
      actorRole: 'system',
      entityType: 'webhook_receipt',
      entityId: deliveryKey,
      action: 'webhook_received',
      metadata: { orderId, transactionStatus, statusCode }
    });
    return res.status(200).json({ ok: true, status: 'pending' });

  } catch (error) {
    console.error('[PaymentWebhook Ingestion Error]', { correlationId, error: error.message });
    await recordFinancialAuditLog({
      actorId: null,
      actorRole: 'system',
      entityType: 'webhook_receipt',
      entityId: correlationId || 'midtrans',
      action: 'webhook_ingestion_failed',
      metadata: { error: error.message }
    });
    return res.status(200).json({ ok: true, failed: true, reason: 'Webhook ingestion failed' });
  }
});

export default router;
