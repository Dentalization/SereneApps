import express from 'express';
import twilioVideoWebhook from './webhooks/twilioVideo.js';
import twilioConversationsWebhook from './webhooks/twilioConversations.js';
import midtransWebhook from './webhooks/midtrans.js';

const router = express.Router();

// Mount sub-webhook routers
router.use('/twilio/video', twilioVideoWebhook);
router.use('/twilio/conversations', twilioConversationsWebhook);
router.use('/midtrans', midtransWebhook);

export default router;
