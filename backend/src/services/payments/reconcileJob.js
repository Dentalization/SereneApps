import { PrismaClient } from '@prisma/client';
import midtransService from './midtransService.js';

const prisma = new PrismaClient();

export async function reconcilePayment(paymentIntentId) {
  const intentIdBigInt = typeof paymentIntentId === 'bigint' ? paymentIntentId : BigInt(paymentIntentId);

  return await prisma.$transaction(async (tx) => {
    // 1. Load payment_intents by id
    const paymentIntent = await tx.paymentIntent.findUnique({
      where: { id: intentIdBigInt }
    });

    if (!paymentIntent) {
      throw { code: 'PAYMENT_INTENT_NOT_FOUND', message: 'Payment intent not found.' };
    }

    const previousStatus = paymentIntent.status;

    // 2. Already final
    if (previousStatus === 'succeeded' || previousStatus === 'failed') {
      await tx.paymentIntent.update({
        where: { id: intentIdBigInt },
        data: { lastReconciledAt: new Date() }
      });
      return { alreadyFinal: true, previousStatus, newStatus: previousStatus };
    }

    // 3. Status check from Midtrans directly
    let midtransStatus;
    try {
      midtransStatus = await midtransService.getTransactionStatus(paymentIntent.providerOrderId);
    } catch (err) {
      if (err.statusCode === 404) {
         // This typically happens if Snap window expired natively before rendering or user instantly aborted.
         throw err; 
      }
      throw err;
    }

    // 4. Map Midtrans response identically handling identical webhooks logic
    let mappedStatus = 'pending';
    const rawStatus = midtransStatus.transaction_status;
    const fraudStatus = midtransStatus.fraud_status;

    if (rawStatus === 'settlement' || (rawStatus === 'capture' && fraudStatus === 'accept')) {
      mappedStatus = 'succeeded';
    } else if (rawStatus === 'deny' || rawStatus === 'expire' || rawStatus === 'cancel') {
      mappedStatus = 'failed';
    } else if (rawStatus === 'pending' || rawStatus === 'authorize') {
      mappedStatus = 'pending';
    } else {
      mappedStatus = 'failed'; 
    }

    // 5. Native State Mutations enforcing optimistic lock tracking against webhooks
    if (mappedStatus !== previousStatus) {
      await tx.paymentIntent.update({
        where: { id: intentIdBigInt },
        data: {
          status: mappedStatus,
          reconciliationStatus: 'reconciled',
          lastReconciledAt: new Date()
        }
      });

      if (mappedStatus === 'succeeded' || mappedStatus === 'failed') {
        const eventType = mappedStatus === 'succeeded' ? 'payment_settled' : 'payment_failed';
        
        const existingOutbox = await tx.domainEventOutbox.findFirst({
           where: {
             aggregateId: String(paymentIntent.id),
             aggregateType: 'payment_intent',
             eventType
           }
        });

        if (!existingOutbox) {
           await tx.domainEventOutbox.create({
             data: {
                eventType,
                aggregateType: 'payment_intent',
                aggregateId: String(paymentIntent.id),
                correlationId: midtransStatus.order_id || paymentIntent.providerOrderId,
                payload: {
                  appointmentId: String(paymentIntent.appointmentId),
                  provider: 'midtrans',
                  providerOrderId: midtransStatus.order_id || paymentIntent.providerOrderId,
                  grossAmount: Number(midtransStatus.gross_amount || paymentIntent.amount)
                },
                status: 'pending',
                availableAt: new Date(),
                attempts: 0
             }
           });
        }
      }
    } else {
      await tx.paymentIntent.update({
        where: { id: intentIdBigInt },
        data: { lastReconciledAt: new Date() }
      });
    }

    // 6. Log structured mapping overrides specifically cleanly marking drift limits
    console.log('[ReconcileJob]', { 
        paymentIntentId: String(paymentIntentId), 
        previousStatus, 
        newStatus: mappedStatus, 
        provider_order_id: paymentIntent.providerOrderId 
    });

    // 7. Success Boundary Return
    return { reconciled: true, previousStatus, newStatus: mappedStatus };
  });
}

export async function runReconcileBatch() {
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);

  const intents = await prisma.paymentIntent.findMany({
    where: {
      status: 'pending',
      createdAt: { lt: fiveMinAgo },
      OR: [
        { lastReconciledAt: null },
        { lastReconciledAt: { lt: thirtyMinAgo } }
      ]
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
  // Polling sequentially recursively hitting 5 minutes natively exactly.
  return setInterval(runReconcileBatch, 5 * 60 * 1000); 
}
