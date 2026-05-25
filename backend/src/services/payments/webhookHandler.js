import crypto from 'crypto';
import { mapMidtransStatus } from './statusMapping.js';
import { PAYMENT_STATUSES, canTransition } from './status.js';
import { recordFinancialEntry, ensureInvoiceForPaymentIntent } from './financials.js';
import { createPaymentSnapshot } from './snapshotService.js';

export async function handleMidtransCallback(body, tx) {
  const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
  
  // Step 1 — Signature verification
  const hashString = `${body.order_id}${body.status_code}${body.gross_amount}${serverKey}`;
  const signature = crypto.createHash('sha512').update(hashString).digest('hex');
  
  if (signature.toLowerCase() !== (body.signature_key || '').toLowerCase()) {
    throw { code: 'PAYMENT_SIGNATURE_INVALID', message: 'Signature mismatch', retryable: false };
  }

  // Step 2 — Status mapping
  const { internalStatus: mappedStatus, failureReason } = mapMidtransStatus({
    transactionStatus: body.transaction_status,
    fraudStatus: body.fraud_status
  });

  if (mappedStatus === PAYMENT_STATUSES.PENDING) {
    return { skipped: true, reason: 'pending status' };
  }

  // Step 3 — Update payment_intents
  const paymentIntent = await tx.paymentIntent.findUnique({
    where: { providerOrderId: body.order_id },
    include: {
      appointment: true,
      patient: { select: { id: true, name: true, email: true, phone_number: true } }
    }
  });

  if (!paymentIntent) {
    throw { code: 'PAYMENT_INTENT_NOT_FOUND', retryable: false };
  }

  // Enforce Monotonic status transition check
  if (paymentIntent.status === mappedStatus) {
    return { processed: true, mappedStatus, skipped: true, reason: 'Already in target status' };
  }

  if (!canTransition(paymentIntent.status, mappedStatus)) {
    console.warn(`[WebhookHandler] Ignored invalid status transition: "${paymentIntent.status}" -> "${mappedStatus}" for order ${body.order_id}`);
    return { processed: true, mappedStatus, skipped: true, reason: 'Invalid status transition' };
  }

  const mergedProviderResponse = {
    ...(paymentIntent.providerResponse || {}),
    ...body,
    ...(failureReason ? { failureReason } : {})
  };

  const updatedIntent = await tx.paymentIntent.update({
    where: { id: paymentIntent.id },
    data: {
      status: mappedStatus,
      callbackVerifiedAt: new Date(),
      providerResponse: mergedProviderResponse,
      metadata: failureReason
        ? { ...(paymentIntent.metadata || {}), failureReason }
        : paymentIntent.metadata
    }
  });

  if ([PAYMENT_STATUSES.PAID, PAYMENT_STATUSES.SETTLED].includes(mappedStatus)) {
    const entryType = mappedStatus === PAYMENT_STATUSES.SETTLED ? 'settlement' : 'charge';
    const existingLedger = await tx.paymentLedger.findFirst({
      where: {
        paymentIntentId: paymentIntent.id,
        entryType,
        status: mappedStatus,
        amount: paymentIntent.amount
      }
    });

    if (!existingLedger) {
      await tx.paymentLedger.create({
        data: {
          paymentIntentId: paymentIntent.id,
          entryType,
          status: mappedStatus,
          amount: paymentIntent.amount,
          metadata: mergedProviderResponse
        }
      });
    }

    await recordFinancialEntry({
      tx,
      paymentIntent: updatedIntent,
      appointment: paymentIntent.appointment,
      entryType,
      status: mappedStatus,
      direction: 'credit',
      amount: paymentIntent.amount,
      source: paymentIntent.provider || 'midtrans',
      metadata: mergedProviderResponse
    });

    const invoice = await ensureInvoiceForPaymentIntent({
      tx,
      paymentIntent: updatedIntent,
      appointment: paymentIntent.appointment,
      patient: paymentIntent.patient
    });

    // Create immutable financial snapshot on settlement
    await createPaymentSnapshot({
      tx,
      paymentIntent: updatedIntent,
      invoice,
      appointment: paymentIntent.appointment
    });
  }

  if ([PAYMENT_STATUSES.REFUNDED, PAYMENT_STATUSES.PARTIAL_REFUND].includes(mappedStatus)) {
    const existingLedger = await tx.paymentLedger.findFirst({
      where: {
        paymentIntentId: paymentIntent.id,
        entryType: 'refund',
        status: mappedStatus,
        amount: paymentIntent.amount
      }
    });

    if (!existingLedger) {
      await tx.paymentLedger.create({
        data: {
          paymentIntentId: paymentIntent.id,
          entryType: 'refund',
          status: mappedStatus,
          amount: paymentIntent.amount,
          metadata: mergedProviderResponse
        }
      });
    }

    await recordFinancialEntry({
      tx,
      paymentIntent: updatedIntent,
      appointment: paymentIntent.appointment,
      entryType: 'refund',
      status: mappedStatus,
      direction: 'debit',
      amount: paymentIntent.amount,
      source: paymentIntent.provider || 'midtrans',
      metadata: mergedProviderResponse
    });
  }

  // Step 4 — Emit outbox event
  if ([PAYMENT_STATUSES.PAID, PAYMENT_STATUSES.SETTLED, PAYMENT_STATUSES.FAILED, PAYMENT_STATUSES.CANCELLED, PAYMENT_STATUSES.EXPIRED].includes(mappedStatus)) {
    const eventType = mappedStatus === PAYMENT_STATUSES.FAILED || mappedStatus === PAYMENT_STATUSES.CANCELLED || mappedStatus === PAYMENT_STATUSES.EXPIRED
      ? 'payment_failed'
      : 'payment_settled';
    
    await tx.domainEventOutbox.create({
      data: {
        eventType,
        aggregateType: 'payment_intent',
        aggregateId: String(paymentIntent.id),
        correlationId: body.order_id,
        payload: {
          appointmentId: String(paymentIntent.appointmentId), 
          provider: 'midtrans',
          providerOrderId: body.order_id,
          grossAmount: Number(body.gross_amount)
        },
        status: 'pending',
        availableAt: new Date(),
        attempts: 0
      }
    });
  }

  return { processed: true, mappedStatus };
}
