import express from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyMidtransSignature } from '../services/payments/midtrans.js';
import { applyPaymentStatus } from '../services/payments/status.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @route POST /v1/payments/webhooks
 * @desc Midtrans Notification Webhook
 */
router.post('/', async (req, res) => {
  try {
    const notification = req.body;
    
    // 1. Log notification for debugging
    console.log('[PaymentWebhook] Received Midtrans notification:', {
      order_id: notification.order_id,
      transaction_status: notification.transaction_status,
      timestamp: new Date().toISOString()
    });

    // 2. Verify Signature
    const isVerified = verifyMidtransSignature({
      orderId: notification.order_id,
      statusCode: notification.status_code,
      grossAmount: notification.gross_amount,
      signatureKey: notification.signature_key
    });

    if (!isVerified) {
      console.warn('[PaymentWebhook] ⚠️ Signature verification failed for order:', notification.order_id);
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // 3. Extract IDs from order_id (format: appointment-{id}-intent-{id})
    const orderId = notification.order_id || '';
    const intentMatch = orderId.match(/intent-(\d+)/);
    const intentIdStr = intentMatch ? intentMatch[1] : null;

    if (!intentIdStr) {
      console.error('[PaymentWebhook] ❌ Failed to parse paymentIntentId from order_id:', orderId);
      return res.status(400).json({ error: 'Invalid order_id format' });
    }

    const paymentIntentId = BigInt(intentIdStr);

    // 4. Map Midtrans status to internal status
    const midtransStatus = notification.transaction_status;
    const fraudStatus = notification.fraud_status;

    let internalStatus = 'pending';
    let failureReason = null;

    if (midtransStatus === 'capture') {
      if (fraudStatus === 'challenge') {
        internalStatus = 'requires_action';
      } else if (fraudStatus === 'accept') {
        internalStatus = 'succeeded';
      }
    } else if (midtransStatus === 'settlement') {
      internalStatus = 'succeeded';
    } else if (midtransStatus === 'cancel' || midtransStatus === 'deny' || midtransStatus === 'expire') {
      internalStatus = midtransStatus === 'cancel' ? 'cancelled' : 'failed';
      failureReason = midtransStatus;
    } else if (midtransStatus === 'pending') {
      internalStatus = 'pending';
    }

    // 5. Apply Status Update
    console.log(`[PaymentWebhook] Mapping "${midtransStatus}" -> "${internalStatus}" for intent ${paymentIntentId}`);
    
    await applyPaymentStatus({
      paymentIntentId,
      newStatus: internalStatus,
      providerPaymentId: notification.transaction_id,
      providerResponse: notification,
      failureReason
    });

    // 6. Respond to Midtrans (they expect 200 OK)
    return res.status(200).json({ status: 'OK' });
  } catch (error) {
    console.error('[PaymentWebhook] ❌ Error processing webhook:', error);
    // Even on error, we might want to return 200 to prevent Midtrans from retrying infinitely 
    // if the error is unrecoverable, but 500 is safer for transient database issues.
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
