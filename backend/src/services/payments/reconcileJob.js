import { PrismaClient } from '@prisma/client';
import midtransService from './midtransService.js';
import { mapMidtransStatus } from './statusMapping.js';
import { PAYMENT_STATUSES, canTransition } from './status.js';
import { applyPaymentStatus } from './status.js';

const prisma = new PrismaClient();

export async function reconcilePayment(paymentIntentId) {
  const intentIdBigInt = typeof paymentIntentId === 'bigint' ? paymentIntentId : BigInt(paymentIntentId);

  // 1. Load payment_intents by id
  const paymentIntent = await prisma.paymentIntent.findUnique({
    where: { id: intentIdBigInt }
  });

  if (!paymentIntent) {
    throw { code: 'PAYMENT_INTENT_NOT_FOUND', message: 'Payment intent not found.' };
  }

  const previousStatus = paymentIntent.status;
  await prisma.paymentIntent.update({
    where: { id: intentIdBigInt },
    data: {
      reconciliationStatus: 'reconciling',
      reconciliationAttempts: { increment: 1 },
      reconciliationError: null,
      lastReconciledAt: new Date()
    }
  });

  // 2. Already final
  if ([PAYMENT_STATUSES.SETTLED, PAYMENT_STATUSES.FAILED, PAYMENT_STATUSES.REFUNDED, PAYMENT_STATUSES.PARTIAL_REFUND, PAYMENT_STATUSES.CANCELLED, PAYMENT_STATUSES.EXPIRED].includes(previousStatus)) {
    await prisma.paymentIntent.update({
      where: { id: intentIdBigInt },
      data: { reconciliationStatus: 'finalized', lastReconciledAt: new Date() }
    });
    return { alreadyFinal: true, previousStatus, newStatus: previousStatus };
  }

  // 3. Status check from Midtrans directly
  let midtransStatus;
  try {
    midtransStatus = await midtransService.getTransactionStatus(paymentIntent.providerOrderId);
  } catch (err) {
    if (err?.statusCode === 404 && canTransition(previousStatus, PAYMENT_STATUSES.EXPIRED)) {
      await applyPaymentStatus({
        paymentIntentId: intentIdBigInt,
        newStatus: PAYMENT_STATUSES.EXPIRED,
        providerResponse: { error: err.message || 'MIDTRANS_ORDER_NOT_FOUND' },
        failureReason: 'provider_not_found'
      });
      await prisma.paymentIntent.update({
        where: { id: intentIdBigInt },
        data: { reconciliationStatus: 'reconciled', reconciliationError: null, lastReconciledAt: new Date() }
      });
      return { reconciled: true, previousStatus, newStatus: PAYMENT_STATUSES.EXPIRED };
    }
    await prisma.paymentIntent.update({
      where: { id: intentIdBigInt },
      data: {
        reconciliationStatus: 'failed',
        reconciliationError: err?.message?.slice?.(0, 255) || 'MIDTRANS_STATUS_ERROR'
      }
    });
    throw err;
  }

  // 4. Map Midtrans response identically handling identical webhooks logic
  const { internalStatus: mappedStatus, failureReason } = mapMidtransStatus({
    transactionStatus: midtransStatus.transaction_status,
    fraudStatus: midtransStatus.fraud_status
  });

  if (!canTransition(previousStatus, mappedStatus) && previousStatus !== mappedStatus) {
    await prisma.paymentIntent.update({
      where: { id: intentIdBigInt },
      data: {
        reconciliationStatus: 'skipped',
        reconciliationError: 'RECONCILE_TRANSITION_INVALID'
      }
    });
    return { reconciled: false, previousStatus, newStatus: previousStatus };
  }

  if (mappedStatus !== previousStatus) {
    await applyPaymentStatus({
      paymentIntentId: intentIdBigInt,
      newStatus: mappedStatus,
      providerPaymentId: midtransStatus.transaction_id || paymentIntent.providerPaymentId,
      providerResponse: midtransStatus,
      failureReason
    });
  }

  await prisma.paymentIntent.update({
    where: { id: intentIdBigInt },
    data: { reconciliationStatus: 'reconciled', lastReconciledAt: new Date(), reconciliationError: null }
  });

  console.log('[ReconcileJob]', {
    paymentIntentId: String(paymentIntentId),
    previousStatus,
    newStatus: mappedStatus,
    provider_order_id: paymentIntent.providerOrderId
  });

  return { reconciled: true, previousStatus, newStatus: mappedStatus };
}

export async function runReconcileBatch() {
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);

  const intents = await prisma.paymentIntent.findMany({
    where: {
      status: { in: ['pending', 'requires_action', 'paid'] },
      createdAt: { lt: fiveMinAgo },
      OR: [
        { lastReconciledAt: null },
        { lastReconciledAt: { lt: thirtyMinAgo } }
      ],
      reconciliationAttempts: { lt: 8 }
    },
    take: 20
  });

  const errors = [];
  let processed = 0;

  for (const intent of intents) {
    try {
       await reconcilePayment(intent.id);
       processed++;
    } catch (err) {
       console.warn(`[ReconcileBatch] Failed reconciling intent ${intent.id}:`, err.message);
       errors.push({ id: String(intent.id), error: err.message });
    }
  }

  return { processed, errors };
}

export function startReconcileScheduler() {
  console.log('[ReconcileScheduler] Synchronous loop initialized.');
  return setInterval(runReconcileBatch, 15 * 60 * 1000);
}
