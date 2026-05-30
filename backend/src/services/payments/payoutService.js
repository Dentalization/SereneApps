import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Calculate available balance dynamically for clinic dentists or practice owners
 */
export async function getAvailableBalance({ client, ownerType, ownerClinicId, ownerDentistId }) {
  const db = client || prisma;

  if (ownerType === 'clinic') {
    // Clinic: Sum settlements (netAmount) - payouts
    const settlements = await db.paymentSettlement.findMany({
      where: { ownerClinicId: BigInt(ownerClinicId), settlementStatus: 'settled' }
    });
    const totalEarned = settlements.reduce((sum, s) => sum + s.netAmount, 0);

    // Sum payouts (payout items processed successfully)
    const payouts = await db.payoutItem.findMany({
      where: { recipientClinicId: BigInt(ownerClinicId), status: 'SUCCESS' }
    });
    const totalPaid = payouts.reduce((sum, p) => sum + p.amount, 0);

    // Sum refund debits
    const refunds = await db.refund.findMany({
      where: {
        paymentIntent: { ownerClinicId: BigInt(ownerClinicId) },
        refundStatus: { in: ['processed', 'refunded'] }
      }
    });
    const totalRefunded = refunds.reduce((sum, r) => sum + r.refundAmount, 0);

    return totalEarned - totalPaid - totalRefunded;
  } else {
    // Dentist (Independent or Clinic Dentist Compensation)
    const dentistId = BigInt(ownerDentistId);
    
    // Check if dentist is clinic-affiliated or independent
    const profile = await db.dentistProfile.findFirst({ where: { userId: dentistId } });
    const isClinicDentist = profile?.dentist_type === 'clinic';

    if (isClinicDentist) {
      // Clinic Dentist: balance = accruals - previousPayouts - refundAdjustments
      const entries = await db.dentistCompensationEntry.findMany({
        where: { dentistId }
      });
      const accruals = entries
        .filter(e => ['ACCRUAL', 'COMMISSION', 'ADJUSTMENT'].includes(e.entryType))
        .reduce((sum, e) => sum + e.amount, 0);
      const previousPayouts = entries
        .filter(e => e.entryType === 'PAYOUT')
        .reduce((sum, e) => sum + e.amount, 0);
      const refundAdjustments = entries
        .filter(e => e.entryType === 'REVERSAL')
        .reduce((sum, e) => sum + e.amount, 0);

      return accruals - previousPayouts - refundAdjustments;
    } else {
      // Independent Dentist: sum settlements (netAmount) - payouts - refunds
      const settlements = await db.paymentSettlement.findMany({
        where: { ownerDentistId: dentistId, settlementStatus: 'settled' }
      });
      const totalEarned = settlements.reduce((sum, s) => sum + s.netAmount, 0);

      const payouts = await db.payoutItem.findMany({
        where: { recipientDentistId: dentistId, status: 'SUCCESS' }
      });
      const totalPaid = payouts.reduce((sum, p) => sum + p.amount, 0);

      const refunds = await db.refund.findMany({
        where: {
          paymentIntent: { ownerDentistId: dentistId },
          refundStatus: { in: ['processed', 'refunded'] }
        }
      });
      const totalRefunded = refunds.reduce((sum, r) => sum + r.refundAmount, 0);

      return totalEarned - totalPaid - totalRefunded;
    }
  }
}

/**
 * Creates and processes a payout batch
 */
export async function createPayoutBatch({ recipientType, items }) {
  return prisma.$transaction(async (tx) => {
    // 1. Calculate total amount
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

    // 2. Validate availability for every item
    for (const item of items) {
      const balance = await getAvailableBalance({
        client: tx,
        ownerType: item.recipientType,
        ownerClinicId: item.recipientClinicId,
        ownerDentistId: item.recipientDentistId
      });

      if (item.amount > balance) {
        throw {
          status: 409,
          code: 'OVERPAYMENT_REJECTED',
          message: `Conflict: Payout amount of ${item.amount} IDR exceeds available balance of ${balance} IDR`
        };
      }
    }

    // 3. Create PayoutBatch
    const batch = await tx.payoutBatch.create({
      data: {
        status: 'INITIATED',
        totalAmount
      }
    });

    // 4. Create PayoutItems
    const createdItems = [];
    for (const item of items) {
      const createdItem = await tx.payoutItem.create({
        data: {
          batchId: batch.id,
          recipientType: item.recipientType,
          recipientClinicId: item.recipientClinicId ? BigInt(item.recipientClinicId) : null,
          recipientDentistId: item.recipientDentistId ? BigInt(item.recipientDentistId) : null,
          amount: item.amount,
          status: 'SUCCESS' // simulate successful payout transfer (e.g. mock Iris disbursement)
        }
      });

      // 5. Update available balance record to decrement availableAmount
      const where = item.recipientType === 'clinic'
        ? { ownerClinicId: BigInt(item.recipientClinicId) }
        : { ownerDentistId: BigInt(item.recipientDentistId) };

      await tx.availableBalance.updateMany({
        where,
        data: {
          availableAmount: { decrement: item.amount }
        }
      });

      // 6. Record financial ledger entry for payout
      await tx.financialLedgerEntry.create({
        data: {
          ownerType: item.recipientType,
          ownerClinicId: item.recipientClinicId ? BigInt(item.recipientClinicId) : null,
          ownerDentistId: item.recipientDentistId ? BigInt(item.recipientDentistId) : null,
          entryType: 'PAYOUT',
          status: 'completed',
          direction: 'debit',
          amount: item.amount,
          source: 'system',
          metadata: { payoutItemId: createdItem.id.toString(), payoutBatchId: batch.id.toString() }
        }
      });

      // 7. If recipient is a clinic dentist, record a compensation payout entry
      if (item.recipientType === 'dentist') {
        const profile = await tx.dentistProfile.findFirst({
          where: { userId: BigInt(item.recipientDentistId) }
        });
        if (profile?.dentist_type === 'clinic') {
          await tx.dentistCompensationEntry.create({
            data: {
              dentistId: BigInt(item.recipientDentistId),
              clinicId: profile.clinic_id,
              entryType: 'PAYOUT',
              amount: item.amount,
              status: 'paid',
              metadata: { payoutItemId: createdItem.id.toString() }
            }
          });

          await tx.financialLedgerEntry.create({
            data: {
              ownerType: 'dentist',
              ownerDentistId: BigInt(item.recipientDentistId),
              entryType: 'COMMISSION_PAID',
              status: 'completed',
              direction: 'debit',
              amount: item.amount,
              source: 'system',
              metadata: { payoutItemId: createdItem.id.toString() }
            }
          });
        }
      }

      createdItems.push(createdItem);
    }

    // Complete the batch
    const completedBatch = await tx.payoutBatch.update({
      where: { id: batch.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
      include: { items: true }
    });

    return completedBatch;
  });
}
