import express from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyMidtransSignature } from '../services/payments/midtrans.js';
import { applyPaymentStatus } from '../services/payments/status.js';
import {
  beginWebhookProcessing,
  markWebhookFailed,
  markWebhookProcessed
} from '../services/webhooks/idempotency.js';

const router = express.Router();
const prisma = new PrismaClient();

router.post('/midtrans', express.json({ type: '*/*' }), async (req, res) => {
  let receipt = null;
  try {
    const body = req.body || {};
    const {
      order_id: orderId,
      transaction_id: transactionId,
      transaction_status: transactionStatus,
      fraud_status: fraudStatus,
      status_code: statusCode,
      gross_amount: grossAmount,
      signature_key: signatureKey
    } = body;

    if (!orderId || !signatureKey || !statusCode || !grossAmount) {
      return res.status(400).json({ error: 'invalid payload' });
    }

    const validSignature = verifyMidtransSignature({
      orderId,
      statusCode,
      grossAmount,
      signatureKey
    });

    if (!validSignature) {
      return res.status(400).json({ error: 'invalid signature' });
    }

    const guard = await beginWebhookProcessing({
      provider: 'midtrans',
      source: 'snap_callback',
      deliveryKey: transactionId || `${orderId}:${transactionStatus}:${fraudStatus || 'none'}`,
      eventType: transactionStatus,
      resourceId: orderId,
      signature: signatureKey,
      rawBody: body,
      headers: req.headers,
      correlationId: req.get('X-Correlation-Id') || req.get('X-Request-Id') || null
    });

    receipt = guard.receipt;
    if (guard.decision === 'skip') {
      return res.json({ ok: true, duplicate: true });
    }

    const paymentIntent = await prisma.paymentIntent.findFirst({
      where: {
        OR: [
          { providerOrderId: orderId },
          { providerPaymentId: transactionId || body.token || orderId }
        ]
      },
      select: { id: true }
    });

    if (!paymentIntent) {
      return res.status(404).json({ error: 'payment intent not found' });
    }

    let mappedStatus = 'pending';
    switch (transactionStatus) {
      case 'capture':
      case 'settlement':
        mappedStatus = 'succeeded';
        break;
      case 'pending':
        mappedStatus = 'requires_action';
        break;
      case 'deny':
      case 'cancel':
      case 'expire':
        mappedStatus = 'failed';
        break;
      default:
        mappedStatus = 'pending';
    }

    if (transactionStatus === 'capture' && fraudStatus === 'challenge') {
      mappedStatus = 'requires_action';
    }

    const result = await applyPaymentStatus({
      paymentIntentId: paymentIntent.id,
      newStatus: mappedStatus,
      providerPaymentId: transactionId || body.token || orderId,
      providerResponse: body
    });

    await prisma.paymentIntent.update({
      where: { id: paymentIntent.id },
      data: {
        providerOrderId: orderId,
        callbackVerifiedAt: new Date(),
        reconciliationStatus: mappedStatus === 'succeeded' ? 'verified' : 'pending'
      }
    });

    if (receipt) {
      await markWebhookProcessed({ receiptId: receipt.id });
    }

    return res.json({
      paymentIntent: result.paymentIntent.id.toString(),
      appointmentStatus: result.appointmentStatus,
      duplicate: result.noOp === true
    });
  } catch (error) {
    console.error('Midtrans webhook error:', error);
    if (receipt?.id) {
      await markWebhookFailed({
        receiptId: receipt.id,
        errorMessage: error.message
      }).catch((markError) => {
        console.error('Failed to update webhook receipt status:', markError);
      });
    }
    if (error.status) {
      return res.status(error.status).json({ error: error.message.toLowerCase() });
    }
    return res.status(500).json({ error: 'failed to process webhook' });
  }
});

export default router;
