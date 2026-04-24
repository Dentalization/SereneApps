import express from 'express';
import twilio from 'twilio';
import { handleChatMessageEvent } from '../../services/communications/chatWebhookHandler.js';
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

// Parse as urlencoded (Twilio sends application/x-www-form-urlencoded)
router.post('/', express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const event = req.body;
    
    // Verify Twilio signature
    const url = (process.env.TWILIO_WEBHOOK_BASE_URL || process.env.API_BASE_URL) + '/webhooks/twilio/conversations';
    const signature = req.headers['x-twilio-signature'];
    
    if (process.env.NODE_ENV === 'production' || signature) {
      const valid = twilio.validateRequest(
        process.env.TWILIO_AUTH_TOKEN, 
        signature || '', 
        url, 
        req.body
      );
      if (!valid) {
        console.warn('[TwilioChat Webhook] Invalid signature');
        // We might want to allow it in dev if signature verification is tricky with proxies
        if (process.env.NODE_ENV === 'production') {
           return res.status(403).json({ error: 'Forbidden. Invalid Twilio signature.' });
        }
      }
    }

    const deliveryKey = `msg_${event.MessageSid}_${event.EventType}`;
    
    await guardWebhookIdempotency({
      provider: 'twilio-chat',
      deliveryKey,
      rawBody: event,
      headers: req.headers,
      handler: () => handleChatMessageEvent(event)
    });

    return res.status(200).json({ ok: true });
    
  } catch (error) {
    console.error('Error handling Twilio chat webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
