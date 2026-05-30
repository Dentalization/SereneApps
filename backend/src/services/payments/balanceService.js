import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const FINANCIAL_HOLD_DAYS = process.env.FINANCIAL_HOLD_DAYS ? parseInt(process.env.FINANCIAL_HOLD_DAYS, 10) : 3;

/**
 * Record settlement amount in Pending Balance
 */
export async function recordSettlementInBalance({ tx, ownerType, ownerClinicId, ownerDentistId, netAmount }) {
  const client = tx || prisma;
  const where = ownerType === 'clinic' 
    ? { ownerClinicId: BigInt(ownerClinicId) }
    : { ownerDentistId: BigInt(ownerDentistId) };

  const existing = await client.availableBalance.findFirst({ where });

  if (existing) {
    return client.availableBalance.update({
      where: { id: existing.id },
      data: {
        pendingAmount: { increment: netAmount }
      }
    });
  }

  return client.availableBalance.create({
    data: {
      ownerType,
      ownerClinicId: ownerClinicId ? BigInt(ownerClinicId) : null,
      ownerDentistId: ownerDentistId ? BigInt(ownerDentistId) : null,
      pendingAmount: netAmount,
      availableAmount: 0,
      currency: 'IDR'
    }
  });
}

/**
 * Worker: Releases matured pending amounts to available balance
 */
export async function releaseMaturedBalances({ tx } = {}) {
  const client = tx || prisma;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - FINANCIAL_HOLD_DAYS);

  // Find all settled records where payoutStatus is 'unpaid' and settledAt <= cutoffDate
  const maturedSettlements = await client.paymentSettlement.findMany({
    where: {
      settlementStatus: 'settled',
      payoutStatus: 'unpaid',
      settledAt: { lte: cutoffDate }
    }
  });

  let processedCount = 0;

  for (const settlement of maturedSettlements) {
    await client.$transaction(async (subTx) => {
      // 1. Move from pending to available
      const where = settlement.ownerType === 'clinic'
        ? { ownerClinicId: settlement.ownerClinicId }
        : { ownerDentistId: settlement.ownerDentistId };

      const balance = await subTx.availableBalance.findFirst({ where });

      if (balance) {
        // Ensure pending doesn't go below 0 (clip to 0)
        const newPending = Math.max(0, balance.pendingAmount - settlement.netAmount);
        await subTx.availableBalance.update({
          where: { id: balance.id },
          data: {
            pendingAmount: newPending,
            availableAmount: { increment: settlement.netAmount }
          }
        });
      } else {
        // If no balance record exists (should not happen normally), create it with matured funds available
        await subTx.availableBalance.create({
          data: {
            ownerType: settlement.ownerType,
            ownerClinicId: settlement.ownerClinicId,
            ownerDentistId: settlement.ownerDentistId,
            pendingAmount: 0,
            availableAmount: settlement.netAmount,
            currency: settlement.currency
          }
        });
      }

      // 2. Mark settlement status as AVAILABLE
      await subTx.paymentSettlement.update({
        where: { id: settlement.id },
        data: {
          payoutStatus: 'available'
        }
      });

      processedCount++;
    });
  }

  return { processedCount };
}
