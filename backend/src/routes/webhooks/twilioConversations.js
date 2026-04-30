import express from 'express';
import twilio from 'twilio';
import { handleChatMessageEvent } from '../../services/communications/chatWebhookHandler.js';
import {
  beginWebhookProcessing,
  markWebhookProcessed,
  markWebhookFailed
} from '../../services/webhooks/idempotency.js';
import { logCommunicationEvent } from '../../services/communications/logging.js';

const router = express.Router();

function getWebhookUrl(req) {
  const base = (process.env.TWILIO_WEBHOOK_BASE_URL || process.env.API_BASE_URL || '').replace(/\/$/, '');
  if (base) {
    const apiPrefix = `/${process.env.API_VERSION || 'v1'}`;
    const path = base.endsWith(apiPrefix) && req.originalUrl.startsWith(`${apiPrefix}/`)
      ? req.originalUrl.slice(apiPrefix.length)
      : req.originalUrl;
    return `${base}${path}`;
  }
  return `${req.protocol}://${req.get('host')}${req.originalUrl}`;
}

function verifyTwilioSignature(req) {
  const signature = req.headers['x-twilio-signature'];
  const requireSignature = process.env.NODE_ENV === 'production' || process.env.TWILIO_WEBHOOK_REQUIRE_SIGNATURE === 'true';

  if (!signature && !requireSignature) return true;
  if (!process.env.TWILIO_AUTH_TOKEN) {
    const error = new Error('TWILIO_WEBHOOK_AUTH_TOKEN_MISSING');
    error.status = 500;
    throw error;
  }

  return twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN,
    signature || '',
    getWebhookUrl(req),
    req.body
  );
}

router.post('/', express.urlencoded({ extended: false }), async (req, res) => {
  const event = req.body || {};
  const signature = req.headers['x-twilio-signature'];
  const deliveryKey = [
    event.EventType || 'unknown',
    event.MessageSid || event.ConversationSid || event.Source || 'unknown',
    event.DateCreated || event.Timestamp || ''
  ].join(':');

  try {
    if (!verifyTwilioSignature(req)) {
      logCommunicationEvent('permission_denied', {
        action: 'twilio_conversations_webhook_signature',
        eventType: event.EventType,
        conversationSid: event.ConversationSid
      }, 'warn');
      return res.status(403).json({ error: 'Forbidden. Invalid Twilio signature.' });
    }

    const { decision, receipt } = await beginWebhookProcessing({
      provider: 'twilio-conversations',
      source: 'twilio-conversations',
      deliveryKey,
      eventType: event.EventType,
      resourceId: event.MessageSid || event.ConversationSid,
      signature,
      rawBody: event,
      headers: req.headers,
      correlationId: event.ConversationSid
    });

    if (decision === 'skip') {
      logCommunicationEvent('webhook_replay_skipped', {
        provider: 'twilio-conversations',
        deliveryKey,
        receiptId: receipt.id
      });
      return res.status(200).json({ ok: true, replay: true });
    }

    try {
      await handleChatMessageEvent(event);
      await markWebhookProcessed({ receiptId: receipt.id });
      return res.status(200).json({ ok: true });
    } catch (handlerError) {
      await markWebhookFailed({ receiptId: receipt.id, errorMessage: handlerError.message });
      throw handlerError;
    }
  } catch (error) {
    console.error('Error handling Twilio Conversations webhook:', error);
    return res.status(error.status || 500).json({ error: 'Internal server error' });
  }
});

export default router;
