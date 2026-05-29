import { PrismaClient } from '@prisma/client';
import { FINANCIAL_OWNER_TYPES, normalizeFinancialOwnerType } from './ownership.js';

const prisma = new PrismaClient();

/**
 * Capture and store an immutable financial snapshot for a settled payment.
 */
export async function createPaymentSnapshot({ tx, paymentIntent, invoice, appointment }) {
  const db = tx || prisma;

  // 1. Prevent duplicate snapshot creation
  const existing = await db.paymentSnapshot.findUnique({
    where: { paymentIntentId: paymentIntent.id }
  });
  if (existing) return existing;

  // 2. Determine base fee / amount details
  const subtotal = paymentIntent.amount;
  const finalPaidAmount = subtotal;
  const tax = 0;
  const discount = 0;

  // 3. Determine consultation fee
  let consultationFee = subtotal;
  if (appointment?.dentistId) {
    const dentistProfile = await db.dentistProfile.findFirst({
      where: { userId: appointment.dentistId }
    });
    if (dentistProfile?.consultationFee) {
      consultationFee = dentistProfile.consultationFee;
    }
  }

  // 4. Calculate shares based on ownership model
  const ownerType = normalizeFinancialOwnerType(paymentIntent.ownerType) || FINANCIAL_OWNER_TYPES.INDEPENDENT_DENTIST;
  let platformFee = Math.round(subtotal * 0.1); // 10% platform fee
  let clinicShare = 0;
  let dentistShare = 0;

  if (ownerType === FINANCIAL_OWNER_TYPES.CLINIC) {
    dentistShare = Math.round(subtotal * 0.3); // 30% dentist share
    clinicShare = subtotal - platformFee - dentistShare; // 60% clinic share (ensuring sum matches total)
  } else {
    dentistShare = subtotal - platformFee; // 90% dentist share
    clinicShare = 0;
  }

  const paymentMethod = paymentIntent.providerResponse?.payment_type || 'credit_card';
  const settlementTimestamp = new Date();
  const currency = paymentIntent.currency || 'IDR';
  const pricingVersion = 'v1';

  // 5. Create immutable snapshot
  const snapshot = await db.paymentSnapshot.create({
    data: {
      paymentIntentId: paymentIntent.id,
      invoiceId: invoice?.id || null,
      consultationFee,
      subtotal,
      tax,
      discount,
      platformFee,
      clinicShare,
      dentistShare,
      finalPaidAmount,
      paymentMethod,
      settlementTimestamp,
      currency,
      pricingVersion
    }
  });

  console.log('[SnapshotService] Captured financial snapshot:', {
    snapshotId: snapshot.id.toString(),
    paymentIntentId: paymentIntent.id.toString(),
    ownerType,
    subtotal,
    platformFee,
    dentistShare,
    clinicShare
  });

  return snapshot;
}
