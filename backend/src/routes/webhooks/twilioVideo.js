import express from 'express';
import twilio from 'twilio';
import { handleVideoEvent } from '../../services/communications/videoWebhookHandler.js';
import {
  beginWebhookProcessing,
  recordWebhookRejected,
  markWebhookProcessed,
  markWebhookFailed
} from '../../services/webhooks/idempotency.js';
import { logCommunicationEvent } from '../../services/communications/logging.js';
import {
  getTwilioWebhookAuthToken,
  isWebhookSignatureRequired
} from '../../services/communications/config.js';

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
  const requireSignature = isWebhookSignatureRequired();

  if (!signature && !requireSignature) return true;

  return twilio.validateRequest(
    getTwilioWebhookAuthToken(),
    signature || '',
    getWebhookUrl(req),
    req.body
  );
}

router.post('/', express.urlencoded({ extended: false }), async (req, res) => {
  const event = req.body || {};
  const signature = req.headers['x-twilio-signature'];
  const deliveryKey = [
    event.RoomSid || event.RoomName || 'unknown-room',
    event.StatusCallbackEvent || 'unknown-event',
    event.ParticipantSid || event.ParticipantIdentity || '',
    event.Timestamp || ''
  ].filter(Boolean).join(':');

  try {
    if (!verifyTwilioSignature(req)) {
      await recordWebhookRejected({
        provider: 'twilio-video',
        source: 'twilio-video',
        deliveryKey,
        eventType: event.StatusCallbackEvent,
        resourceId: event.RoomSid || event.RoomName,
        signature,
        rawBody: event,
        headers: req.headers,
        correlationId: event.RoomSid,
        reason: 'TWILIO_SIGNATURE_INVALID'
      });
      logCommunicationEvent('permission_denied', {
        action: 'twilio_video_webhook_signature',
        eventType: event.StatusCallbackEvent,
        roomName: event.RoomName,
        roomSid: event.RoomSid
      }, 'warn');
      return res.status(403).json({ error: 'Forbidden. Invalid Twilio signature.' });
    }

    const { decision, receipt } = await beginWebhookProcessing({
      provider: 'twilio-video',
      source: 'twilio-video',
      deliveryKey,
      eventType: event.StatusCallbackEvent,
      resourceId: event.RoomSid || event.RoomName,
      signature,
      rawBody: event,
      headers: req.headers,
      correlationId: event.RoomSid
    });

    if (decision === 'skip') {
      logCommunicationEvent('webhook_replay_skipped', {
        provider: 'twilio-video',
        deliveryKey,
        receiptId: receipt.id
      });
      return res.status(200).json({ ok: true, replay: true });
    }

    try {
      await handleVideoEvent(event);
      await markWebhookProcessed({ receiptId: receipt.id });
      return res.status(200).json({ ok: true });
    } catch (handlerError) {
      await markWebhookFailed({ receiptId: receipt.id, errorMessage: handlerError.message });
      throw handlerError;
    }
  } catch (error) {
    console.error('Error handling Twilio Video webhook:', error);
    if (error.message === 'WEBHOOK_REPLAY_PAYLOAD_MISMATCH') {
      return res.status(409).json({ error: { code: 'WEBHOOK_REPLAY_PAYLOAD_MISMATCH' } });
    }
    return res.status(error.status || 500).json({ error: 'Internal server error' });
  }
});

export default router;
