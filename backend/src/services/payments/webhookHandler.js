import { verifyMidtransSignature, validateMidtransWebhookPayload } from './midtrans.js';
import { mapMidtransStatus } from './statusMapping.js';
import { PAYMENT_STATUSES, canTransition, resolveActiveAppointmentId } from './status.js';
import { recordFinancialEntry, ensureInvoiceForPaymentIntent } from './financials.js';
import { createPaymentSnapshot } from './snapshotService.js';
import { recordFinancialAuditLog } from '../audit/auditLogger.js';

export async function handleMidtransCallback(body, tx) {
  const {
    orderId,
    statusCode,
    grossAmount,
    grossAmountValue,
    signatureKey,
    transactionStatus,
    transactionId
  } = validateMidtransWebhookPayload(body);

  const signatureValid = verifyMidtransSignature({
    orderId,
    statusCode,
    grossAmount,
    signatureKey
  });
  if (!signatureValid) {
    await recordFinancialAuditLog({
      actorId: null,
      actorRole: 'system',
      entityType: 'webhook_receipt',
      entityId: orderId,
      action: 'webhook_signature_invalid',
      metadata: { orderId, transactionStatus, statusCode }
    });
    throw { code: 'PAYMENT_SIGNATURE_INVALID', message: 'Signature mismatch', retryable: false };
  }

  // Step 2 — Status mapping
  const { internalStatus: mappedStatus, failureReason } = mapMidtransStatus({
    transactionStatus,
    fraudStatus: body.fraud_status
  });

  if (mappedStatus === PAYMENT_STATUSES.PENDING) {
    return { skipped: true, reason: 'pending status' };
  }

  // Step 3 — Update payment_intents
  const paymentIntent = await tx.paymentIntent.findUnique({
    where: { providerOrderId: orderId },
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
    console.warn(`[WebhookHandler] Ignored invalid status transition: "${paymentIntent.status}" -> "${mappedStatus}" for order ${orderId}`);
    return { processed: true, mappedStatus, skipped: true, reason: 'Invalid status transition' };
  }

  if (paymentIntent.amount !== grossAmountValue) {
    await recordFinancialAuditLog({
      actorId: null,
      actorRole: 'system',
      entityType: 'payment_intent',
      entityId: paymentIntent.id.toString(),
      action: 'webhook_amount_mismatch',
      metadata: {
        orderId,
        expectedAmount: paymentIntent.amount,
        grossAmount: grossAmountValue
      }
    });
    throw { code: 'PAYMENT_AMOUNT_MISMATCH', message: 'Gross amount mismatch', retryable: false };
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
      activeAppointmentId: resolveActiveAppointmentId(mappedStatus, paymentIntent.appointmentId),
      providerPaymentId: paymentIntent.providerPaymentId || transactionId || null,
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

    if (invoice?.id) {
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: mappedStatus === PAYMENT_STATUSES.SETTLED ? 'settled' : 'paid',
          paidAt: invoice.paidAt || new Date()
        }
      }).catch(() => null);
    }

    if (mappedStatus === PAYMENT_STATUSES.SETTLED) {
      // Create immutable financial snapshot on settlement
      await createPaymentSnapshot({
        tx,
        paymentIntent: updatedIntent,
        invoice,
        appointment: paymentIntent.appointment
      });
    }
  }

  if ([PAYMENT_STATUSES.REFUNDED, PAYMENT_STATUSES.PARTIAL_REFUND].includes(mappedStatus)) {
    const rawRefundAmount = Number(body.refund_amount ?? body.refundAmount ?? body.refund_amounts?.[0]?.amount);
    const refundAmount = Number.isFinite(rawRefundAmount) && rawRefundAmount > 0
      ? Math.round(rawRefundAmount)
      : paymentIntent.amount;

    const existingLedger = await tx.paymentLedger.findFirst({
      where: {
        paymentIntentId: paymentIntent.id,
        entryType: 'refund',
        status: mappedStatus,
        amount: refundAmount
      }
    });

    if (!existingLedger) {
      await tx.paymentLedger.create({
        data: {
          paymentIntentId: paymentIntent.id,
          entryType: 'refund',
          status: mappedStatus,
          amount: refundAmount,
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
      amount: refundAmount,
      source: paymentIntent.provider || 'midtrans',
      metadata: mergedProviderResponse
    });

    const providerRefundReference = body.refund_key || body.refund_id || body.refund_reference || transactionId || null;
    if (providerRefundReference) {
      const existingRefund = await tx.refund.findFirst({
        where: {
          paymentIntentId: paymentIntent.id,
          providerRefundReference: String(providerRefundReference)
        }
      });
      if (!existingRefund) {
        await tx.refund.create({
          data: {
            paymentIntentId: paymentIntent.id,
            refundAmount,
            refundReason: failureReason || 'Midtrans refund notification',
            refundStatus: 'refunded',
            providerRefundReference: String(providerRefundReference),
            refundRequestedAt: new Date(),
            refundedAt: new Date()
          }
        });
      }
    }

    await tx.invoice.updateMany({
      where: { paymentIntentId: paymentIntent.id },
      data: { status: mappedStatus }
    }).catch(() => null);
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
         correlationId: orderId,
         payload: {
           appointmentId: String(paymentIntent.appointmentId), 
           provider: 'midtrans',
           providerOrderId: orderId,
           grossAmount: grossAmountValue
         },
        status: 'pending',
        availableAt: new Date(),
        attempts: 0
      }
    });
  }

  return { processed: true, mappedStatus };
}
