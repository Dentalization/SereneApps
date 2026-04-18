import express from 'express';
import twilio from 'twilio';
import { handleVideoEvent } from '../../services/communications/videoWebhookHandler.js';
import { 
  beginWebhookProcessing, 
  markWebhookProcessed, 
  markWebhookFailed 
} from '../../services/webhooks/idempotency.js';

const router = express.Router();

async function guardWebhookIdempotency(opts) {
  const { provider, deliveryKey, handler, rawBody, headers } = opts;
  
  const { decision, receipt } = await beginWebhookProcessing({
    provider,
    deliveryKey,
    rawBody,
    headers
  });

  if (decision === 'skip') return { processed: true };

  try {
    const result = await handler();
    await markWebhookProcessed({ receiptId: receipt.id });
    return result;
  } catch (err) {
    if (receipt) {
      await markWebhookFailed({ receiptId: receipt.id, errorMessage: err.message });
    }
    throw err;
  }
}

// 1. Parse as urlencoded (Twilio sends application/x-www-form-urlencoded)
router.post('/', express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const event = req.body;
    
    // 2. Verify Twilio signature
    const url = process.env.TWILIO_WEBHOOK_BASE_URL + '/webhooks/twilio/video';
    const signature = req.headers['x-twilio-signature'];
    
    if (process.env.NODE_ENV === 'production' || signature) {
      const valid = twilio.validateRequest(
        process.env.TWILIO_AUTH_TOKEN, 
        signature || '', 
        url, 
        req.body
      );
      if (!valid) {
        return res.status(403).json({ error: 'Forbidden. Invalid Twilio signature.' });
      }
    }

    // 3. Call guardWebhookIdempotency
    const deliveryKey = `${event.RoomSid}_${event.StatusCallbackEvent}_${event.ParticipantSid || ''}`;
    
    await guardWebhookIdempotency({
      provider: 'twilio-video',
      deliveryKey,
      rawBody: event,
      headers: req.headers,
      handler: () => handleVideoEvent(event)
    });

    // 5. Log structured
    console.log('[TwilioVideo Webhook]', {
      roomName: event.RoomName,
      roomSid: event.RoomSid,
      event: event.StatusCallbackEvent
    });

    // 4. Return 200 { ok: true }
    return res.status(200).json({ ok: true });
    
  } catch (error) {
    console.error('Error handling Twilio video webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
