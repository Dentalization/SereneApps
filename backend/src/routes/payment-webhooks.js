import express from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyMidtransSignature } from '../services/payments/midtrans.js';
import { applyPaymentStatus } from '../services/payments/status.js';

const router = express.Router();
const prisma = new PrismaClient();

router.post('/midtrans', express.json({ type: '*/*' }), async (req, res) => {
  try {
    const body = req.body || {};
    const {
      order_id: orderId,
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

    const paymentIntent = await prisma.paymentIntent.findFirst({
      where: { providerPaymentId: body.token || body.transaction_id || body.order_id || orderId },
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
      providerPaymentId: body.transaction_id || body.token || orderId,
      providerResponse: body
    });

    return res.json({
      paymentIntent: result.paymentIntent.id.toString(),
      appointmentStatus: result.appointmentStatus
    });
  } catch (error) {
    console.error('Midtrans webhook error:', error);
    if (error.status) {
      return res.status(error.status).json({ error: error.message.toLowerCase() });
    }
    return res.status(500).json({ error: 'failed to process webhook' });
  }
});

export default router;
