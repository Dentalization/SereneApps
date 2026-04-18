import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../../utils/tokens.js';
import { reconcilePayment } from '../../services/payments/reconcileJob.js';

const router = express.Router();
const prisma = new PrismaClient();

function ensureInternalOrOwner(req, res, next) {
   const internalToken = req.headers['x-internal-token'];
   if (internalToken && internalToken === process.env.INTERNAL_SERVICE_TOKEN) {
       req.isInternalCall = true;
       return next();
   }
   
   return authenticateToken(req, res, next);
}

router.get('/:paymentIntentId/status', authenticateToken, async (req, res) => {
  try {
    const paymentIntentId = BigInt(req.params.paymentIntentId);

    const paymentIntent = await prisma.paymentIntent.findUnique({
      where: { id: paymentIntentId }
    });

    if (!paymentIntent) {
      return res.status(404).json({ error: { code: 'PAYMENT_INTENT_NOT_FOUND' } });
    }

    if (paymentIntent.patientId !== BigInt(req.user.id)) {
       return res.status(403).json({ error: { code: 'PAYMENT_ACCESS_DENIED' } });
    }

    return res.status(200).json({
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      provider_order_id: paymentIntent.providerOrderId,
      callback_verified_at: paymentIntent.callbackVerifiedAt,
      last_reconciled_at: paymentIntent.lastReconciledAt
    });
  } catch (error) {
    console.error('[Get Payment Status Error]', error.message);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

router.post('/:paymentIntentId/reconcile', ensureInternalOrOwner, async (req, res) => {
  try {
    const paymentIntentId = BigInt(req.params.paymentIntentId);

    const paymentIntent = await prisma.paymentIntent.findUnique({
       where: { id: paymentIntentId }
    });

    if (!paymentIntent) {
      return res.status(404).json({ error: { code: 'PAYMENT_INTENT_NOT_FOUND' } });
    }

    if (!req.isInternalCall) {
       if (paymentIntent.patientId !== BigInt(req.user.id)) {
          return res.status(403).json({ error: { code: 'PAYMENT_ACCESS_DENIED' } });
       }
    }

    const { reconciled, previousStatus, newStatus, alreadyFinal } = await reconcilePayment(paymentIntentId);
    return res.status(200).json({ reconciled: reconciled || alreadyFinal, previousStatus, newStatus });

  } catch (error) {
    console.error('[Reconcile Payment Endpoint Error]', error.message);
    
    if (error.code === 'MIDTRANS_API_ERROR') {
      return res.status(503).json({ error: { code: 'MIDTRANS_API_ERROR', retryable: true, message: error.message } });
    }
    
    if (error.code === 'PAYMENT_INTENT_NOT_FOUND') {
      return res.status(404).json({ error });
    }
    
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;
