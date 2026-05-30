import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Creates a settlement record for a settled payment intent
 */
export async function createSettlement({
  tx,
  paymentIntent,
  settledAt,
  providerReference
}) {
  const client = tx || prisma;
  const grossAmount = paymentIntent.amount;
  const platformFee = Math.round(grossAmount * 0.1); // 10% Platform fee
  const netAmount = grossAmount - platformFee;

  const existing = await client.paymentSettlement.findFirst({
    where: { paymentIntentId: paymentIntent.id }
  });

  if (existing) {
    return client.paymentSettlement.update({
      where: { id: existing.id },
      data: {
        settlementStatus: 'settled',
        providerReference,
        settledAt: settledAt || new Date()
      }
    });
  }

  return client.paymentSettlement.create({
    data: {
      paymentIntentId: paymentIntent.id,
      ownerType: paymentIntent.ownerType,
      ownerClinicId: paymentIntent.ownerClinicId,
      ownerDentistId: paymentIntent.ownerDentistId,
      grossAmount,
      platformFee,
      netAmount,
      currency: paymentIntent.currency || 'IDR',
      settlementStatus: 'settled',
      providerReference,
      settledAt: settledAt || new Date()
    }
  });
}
