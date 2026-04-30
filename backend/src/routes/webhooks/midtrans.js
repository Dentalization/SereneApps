import express from 'express';
import { handleMidtransCallback } from '../../services/payments/webhookHandler.js';
import { guardWebhookIdempotency } from '../../services/webhooks/idempotency.js';
import { logCommunicationEvent } from '../../services/communications/logging.js';

const router = express.Router();

router.post('/', express.json(), async (req, res) => {
  const body = req.body;
  const correlationId = body.order_id;
  
  console.log('[Midtrans Webhook Received]', { correlationId, status: body.transaction_status });

  try {
    const deliveryKey = `${body.order_id}_${body.transaction_id}`;

    const result = await guardWebhookIdempotency(
      'midtrans',
      deliveryKey,
      body,
      async (tx) => await handleMidtransCallback(body, tx)
    );

    if (result?.skipped) {
      logCommunicationEvent('webhook_replay_skipped', {
        provider: 'midtrans',
        deliveryKey,
        correlationId
      });
    }
    
    console.log('[Midtrans Webhook Processed]', { correlationId, event: body.transaction_status });
    return res.status(200).json({ ok: true });
    
  } catch (error) {
    console.error('[Midtrans Webhook Error]', { correlationId, error: error.message });
    
    if (error.code === 'PAYMENT_SIGNATURE_INVALID') {
      return res.status(400).json({ error: { code: 'PAYMENT_SIGNATURE_INVALID' } });
    }
    
    // Always return 200 for valid signature business errors, to avoid infinite retries
    return res.status(200).json({ ok: true, failed: true, reason: error.message });
  }
});

export default router;
