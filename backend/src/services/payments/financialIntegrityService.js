import { PrismaClient } from '@prisma/client';
import { getAvailableBalance } from './payoutService.js';

const prisma = new PrismaClient();

/**
 * Audit balance integrity by comparing the static AvailableBalance table
 * against the dynamic query of ledger settlements, payouts, and refunds.
 */
export async function verifyBalances() {
  const balances = await prisma.availableBalance.findMany();
  const discrepancies = [];

  for (const bal of balances) {
    const computed = await getAvailableBalance({
      client: prisma,
      ownerType: bal.ownerType,
      ownerClinicId: bal.ownerClinicId,
      ownerDentistId: bal.ownerDentistId
    });

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
