import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Audit balance integrity by comparing the static AvailableBalance table
 * against the dynamic query of ledger settlements, payouts, and refunds.
 */
export async function verifyBalances() {
  const balances = await prisma.availableBalance.findMany();
  const discrepancies = [];

  for (const bal of balances) {
    let computed = 0;
    if (bal.ownerType === 'clinic') {
      const settlements = await prisma.paymentSettlement.findMany({
        where: { ownerClinicId: bal.ownerClinicId, settlementStatus: 'settled' }
      });
      const totalEarned = settlements.reduce((sum, s) => sum + s.netAmount, 0);

      const payouts = await prisma.payoutItem.findMany({
        where: { recipientClinicId: bal.ownerClinicId, status: 'SUCCESS' }
      });
      const totalPaid = payouts.reduce((sum, p) => sum + p.amount, 0);

      const refunds = await prisma.refund.findMany({
        where: {
          paymentIntent: { ownerClinicId: bal.ownerClinicId },
          refundStatus: { in: ['processed', 'refunded'] }
        }
      });
      const totalRefunded = refunds.reduce((sum, r) => sum + r.refundAmount, 0);

      computed = totalEarned - totalPaid - totalRefunded;
    } else {
      const dentistId = bal.ownerDentistId;
      const profile = await prisma.dentistProfile.findFirst({ where: { userId: dentistId } });
      const isClinicDentist = profile?.dentist_type === 'clinic';

      if (isClinicDentist) {
        const entries = await prisma.dentistCompensationEntry.findMany({
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

        computed = accruals - previousPayouts - refundAdjustments;
      } else {
        const settlements = await prisma.paymentSettlement.findMany({
          where: { ownerDentistId: dentistId, settlementStatus: 'settled' }
        });
        const totalEarned = settlements.reduce((sum, s) => sum + s.netAmount, 0);

        const payouts = await prisma.payoutItem.findMany({
          where: { recipientDentistId: dentistId, status: 'SUCCESS' }
        });
        const totalPaid = payouts.reduce((sum, p) => sum + p.amount, 0);

        const refunds = await prisma.refund.findMany({
          where: {
            paymentIntent: { ownerDentistId: dentistId },
            refundStatus: { in: ['processed', 'refunded'] }
          }
        });
        const totalRefunded = refunds.reduce((sum, r) => sum + r.refundAmount, 0);

        computed = totalEarned - totalPaid - totalRefunded;
      }
    }

    if (bal.availableAmount !== computed) {
      discrepancies.push({
        ownerType: bal.ownerType,
        ownerClinicId: bal.ownerClinicId ? bal.ownerClinicId.toString() : null,
        ownerDentistId: bal.ownerDentistId ? bal.ownerDentistId.toString() : null,
        storedAvailableAmount: bal.availableAmount,
        computedAvailableAmount: computed,
        drift: bal.availableAmount - computed
      });
    }
  }

  return {
    valid: discrepancies.length === 0,
    discrepancies
  };
}
