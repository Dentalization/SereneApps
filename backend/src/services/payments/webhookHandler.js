import crypto from 'crypto';

export async function handleMidtransCallback(body, tx) {
  const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
  
  // Step 1 — Signature verification
  const hashString = `${body.order_id}${body.status_code}${body.gross_amount}${serverKey}`;
  const signature = crypto.createHash('sha512').update(hashString).digest('hex');
  
  if (signature.toLowerCase() !== (body.signature_key || '').toLowerCase()) {
    throw { code: 'PAYMENT_SIGNATURE_INVALID', message: 'Signature mismatch', retryable: false };
  }

  // Step 2 — Status mapping
  let mappedStatus;
  const rawStatus = body.transaction_status;
  const fraudStatus = body.fraud_status;

  if (rawStatus === 'settlement' || (rawStatus === 'capture' && fraudStatus === 'accept')) {
    mappedStatus = 'succeeded';
  } else if (rawStatus === 'deny' || rawStatus === 'expire' || rawStatus === 'cancel') {
    mappedStatus = 'failed';
  } else if (rawStatus === 'pending' || rawStatus === 'authorize') {
    return { skipped: true, reason: 'pending status' };
  } else {
    // Unhandled arbitrary status — treat as failed safely to prevent lingering holds
    mappedStatus = 'failed';
  }

  // Step 3 — Update payment_intents
  const paymentIntent = await tx.paymentIntent.findUnique({
    where: { providerOrderId: body.order_id }
  });

  if (!paymentIntent) {
    throw { code: 'PAYMENT_INTENT_NOT_FOUND', retryable: false };
  }

  await tx.paymentIntent.update({
    where: { id: paymentIntent.id },
    data: {
      status: mappedStatus,
      callbackVerifiedAt: new Date()
    }
  });

  // Step 4 — Emit outbox event
  if (mappedStatus === 'succeeded' || mappedStatus === 'failed') {
    const eventType = mappedStatus === 'succeeded' ? 'payment_settled' : 'payment_failed';
    
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
