import express from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyMidtransSignature } from '../services/payments/midtrans.js';
import { applyPaymentStatus } from '../services/payments/status.js';
import { mapMidtransStatus } from '../services/payments/statusMapping.js';

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

    // 3. Resolve paymentIntentId from order_id (formats: appointment-{id}-intent-{id} OR provider_order_id)
    const orderId = notification.order_id || '';
    let paymentIntentId = null;

    const intentMatch = orderId.match(/intent-(\d+)/);
    if (intentMatch) {
      paymentIntentId = BigInt(intentMatch[1]);
    } else {
      // Fallback search in DB by providerOrderId
      const intent = await prisma.paymentIntent.findUnique({
        where: { providerOrderId: orderId }
      });
      if (intent) {
        paymentIntentId = intent.id;
      }
    }

    if (!paymentIntentId) {
      console.error('[PaymentWebhook] ❌ Failed to resolve paymentIntentId from order_id:', orderId);
      return res.status(400).json({ error: 'Invalid order_id or payment intent not found' });
    }

    // 4. Map Midtrans status to internal status
    const { internalStatus, failureReason } = mapMidtransStatus({
      transactionStatus: notification.transaction_status,
      fraudStatus: notification.fraud_status
    });

    // 5. Apply Status Update
    console.log(`[PaymentWebhook] Mapping "${notification.transaction_status}" -> "${internalStatus}" for intent ${paymentIntentId}`);
    
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
