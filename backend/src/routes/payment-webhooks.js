import express from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyMidtransSignature } from '../services/payments/midtrans.js';
import { hashWebhookPayload } from '../services/webhooks/idempotency.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @route POST /v1/payments/webhooks
 * @desc Midtrans Notification Webhook (Alternate endpoint)
 */
router.post('/', express.json(), async (req, res) => {
  const body = req.body;
  const correlationId = body.order_id || '';
  
  console.log('[PaymentWebhook Ingestion]', { correlationId, status: body.transaction_status });

  try {
    // 1. Verify Midtrans signature key
    const isVerified = verifyMidtransSignature({
      orderId: body.order_id,
      statusCode: body.status_code,
      grossAmount: body.gross_amount,
      signatureKey: body.signature_key
    });

    if (!isVerified) {
      console.warn('[PaymentWebhook Ingestion] ⚠️ Signature verification failed for order:', body.order_id);
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Include the transaction_status in deliveryKey to support lifecycle status changes safely
    const deliveryKey = `${body.order_id}_${body.transaction_id}_${body.transaction_status}`;

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
        providerEventId: body.order_id,
        providerTransactionId: body.transaction_id,
        orderId: body.order_id,
        retryCount: 0
      }
    });

    console.log('[PaymentWebhook Ingested successfully]', { correlationId, deliveryKey });
    return res.status(200).json({ ok: true, status: 'pending' });

  } catch (error) {
    console.error('[PaymentWebhook Ingestion Error]', { correlationId, error: error.message });
    return res.status(200).json({ ok: true, failed: true, reason: error.message });
  }
});

export default router;
