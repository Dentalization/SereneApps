import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Calculate available balance dynamically for clinic dentists or practice owners
 */
export async function getAvailableBalance({ client, ownerType, ownerClinicId, ownerDentistId }) {
  const db = client || prisma;
  
  const where = ownerType === 'clinic'
    ? { ownerClinicId: BigInt(ownerClinicId) }
    : { ownerDentistId: BigInt(ownerDentistId) };

  const balance = await db.availableBalance.findFirst({ where });
  return balance ? balance.availableAmount : 0;
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
      const whereLock = item.recipientType === 'clinic'
        ? { ownerClinicId: BigInt(item.recipientClinicId) }
        : { ownerDentistId: BigInt(item.recipientDentistId) };

      let balanceRecord = await tx.availableBalance.findFirst({
        where: whereLock
      });
      if (!balanceRecord) {
        balanceRecord = await tx.availableBalance.create({
          data: {
            ownerType: item.recipientType,
            ownerClinicId: item.recipientClinicId ? BigInt(item.recipientClinicId) : null,
            ownerDentistId: item.recipientDentistId ? BigInt(item.recipientDentistId) : null,
            availableAmount: 0,
            pendingAmount: 0,
            currency: 'IDR'
          }
        });
      }

      // Concurrency protection: Acquire raw SELECT FOR UPDATE lock
      await tx.$executeRaw`SELECT id FROM available_balances WHERE id = ${balanceRecord.id} FOR UPDATE`;

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
