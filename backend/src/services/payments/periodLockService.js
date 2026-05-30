import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Asserts that a given date is not in a locked accounting period
 */
export async function assertPeriodNotLocked(dateVal) {
  const date = dateVal ? new Date(dateVal) : new Date();
  const periodKey = date.toISOString().slice(0, 7); // "YYYY-MM"

  const period = await prisma.accountingPeriod.findUnique({
    where: { periodKey }
  });

  if (period?.isLocked) {
    throw {
      status: 400,
      code: 'PERIOD_LOCKED',
      message: `Operation rejected: The accounting period for ${periodKey} is locked and closed for modification.`
    };
  }
}

/**
 * Locks an accounting period
 */
export async function lockPeriod({ periodKey, actorId }) {
  return prisma.accountingPeriod.upsert({
    where: { periodKey },
    update: {
      isLocked: true,
      lockedAt: new Date(),
      lockedBy: actorId ? BigInt(actorId) : null
    },
    create: {
      periodKey,
      isLocked: true,
      lockedAt: new Date(),
      lockedBy: actorId ? BigInt(actorId) : null
    }
  });
}
