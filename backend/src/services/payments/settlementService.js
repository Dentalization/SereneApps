import { PrismaClient } from '@prisma/client';
import { recordSettlementInBalance } from './balanceService.js';
import { FINANCIAL_OWNER_TYPES, normalizeFinancialOwnerType } from './ownership.js';

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

  const ownerType = normalizeFinancialOwnerType(paymentIntent.ownerType) || FINANCIAL_OWNER_TYPES.INDEPENDENT_DENTIST;
  let clinicShare = 0;
  let dentistShare = 0;

  if (ownerType === FINANCIAL_OWNER_TYPES.CLINIC) {
    dentistShare = Math.round(grossAmount * 0.3); // 30% dentist compensation accrual
    clinicShare = grossAmount - platformFee - dentistShare; // 60% clinic share
  } else {
    dentistShare = grossAmount - platformFee; // 90% independent dentist share
    clinicShare = 0;
  }

  // Reject inconsistent settlements
  if (grossAmount !== (platformFee + clinicShare + dentistShare)) {
    throw new Error(`FINANCIAL_INCONSISTENCY: Gross amount ${grossAmount} does not equal split parts (Platform: ${platformFee}, Clinic: ${clinicShare}, Dentist: ${dentistShare})`);
  }

  const netAmount = grossAmount - platformFee;

  let settlement;
  const existing = await client.paymentSettlement.findFirst({
    where: { paymentIntentId: paymentIntent.id }
  });

  if (existing) {
    settlement = await client.paymentSettlement.update({
      where: { id: existing.id },
      data: {
        settlementStatus: 'settled',
        providerReference,
        settledAt: settledAt || new Date()
      }
    });
  } else {
    settlement = await client.paymentSettlement.create({
      data: {
        paymentIntentId: paymentIntent.id,
        ownerType: paymentIntent.ownerType,
        ownerClinicId: paymentIntent.ownerClinicId,
        ownerDentistId: paymentIntent.ownerDentistId,
        grossAmount,
        platformFee,
        clinicShare,
        dentistShare,
        netAmount,
        currency: paymentIntent.currency || 'IDR',
        settlementStatus: 'settled',
        payoutStatus: 'unpaid',
        providerReference,
        settledAt: settledAt || new Date()
      }
    });
  }

  // Update Pending Balance for the owner
  await recordSettlementInBalance({
    tx: client,
    ownerType: paymentIntent.ownerType,
    ownerClinicId: paymentIntent.ownerClinicId,
    ownerDentistId: paymentIntent.ownerDentistId,
    netAmount
  });

  return settlement;
}
