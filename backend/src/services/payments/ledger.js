import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function recordLedgerEntry({ paymentIntentId, entryType, status, amount, metadata = {} }) {
  return prisma.paymentLedger.create({
    data: {
      paymentIntentId: BigInt(paymentIntentId),
      entryType,
      status,
      amount,
      metadata
    }
  });
}

export async function recordLedgerEntryIfMissing({ paymentIntentId, entryType, status, amount, metadata = {} }) {
  const intentId = BigInt(paymentIntentId);
  const existing = await prisma.paymentLedger.findFirst({
    where: {
      paymentIntentId: intentId,
      entryType,
      status,
      amount
    }
  });
  if (existing) return existing;
  return recordLedgerEntry({ paymentIntentId: intentId, entryType, status, amount, metadata });
}

export async function listLedgerEntries(paymentIntentId) {
  return prisma.paymentLedger.findMany({
    where: { paymentIntentId: BigInt(paymentIntentId) },
    orderBy: { createdAt: 'desc' }
  });
}
