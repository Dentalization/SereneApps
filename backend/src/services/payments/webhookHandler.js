import { verifyMidtransSignature, validateMidtransWebhookPayload } from './midtrans.js';
import { mapMidtransStatus } from './statusMapping.js';
import { applyPaymentStatus, PAYMENT_STATUSES, canTransition } from './status.js';
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
    where: { providerOrderId: orderId }
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

  // Delegate the transition and balance/compensation calculations to applyPaymentStatus
  await applyPaymentStatus({
    paymentIntentId: paymentIntent.id.toString(),
    newStatus: mappedStatus,
    providerPaymentId: transactionId || null,
    providerResponse: body,
    failureReason,
    tx
  });


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
