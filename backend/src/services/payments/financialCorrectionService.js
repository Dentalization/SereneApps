import { PrismaClient } from '@prisma/client';
import { assertPeriodNotLocked } from './periodLockService.js';

const prisma = new PrismaClient();

/**
 * Creates an ownership correction request
 */
export async function createCorrectionRequest({
  paymentIntentId,
  requestedBy,
  newOwnerType,
  newOwnerClinicId,
  newOwnerDentistId,
  reason
}) {
  const intent = await prisma.paymentIntent.findUnique({
    where: { id: BigInt(paymentIntentId) }
  });

  if (!intent) {
    throw { status: 404, code: 'PAYMENT_INTENT_NOT_FOUND', message: 'Payment intent not found' };
  }

  return prisma.ownershipCorrectionRequest.create({
    data: {
      paymentIntentId: BigInt(paymentIntentId),
      requestedBy: BigInt(requestedBy),
      status: 'pending',
      oldOwnerType: intent.ownerType,
      oldOwnerClinicId: intent.ownerClinicId,
      oldOwnerDentistId: intent.ownerDentistId,
      newOwnerType,
      newOwnerClinicId: newOwnerClinicId ? BigInt(newOwnerClinicId) : null,
      newOwnerDentistId: newOwnerDentistId ? BigInt(newOwnerDentistId) : null,
      reason
    }
  });
}

/**
 * Executes a correction request inside a prisma transaction
 */
export async function approveAndExecuteCorrection(requestId, actorId) {
  return prisma.$transaction(async (tx) => {
    // Temporarily bypass immutability triggers for this correction transaction
    await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica';");

    const request = await tx.ownershipCorrectionRequest.findUnique({
      where: { id: BigInt(requestId) }
    });

    if (!request) {
      throw { status: 404, code: 'REQUEST_NOT_FOUND', message: 'Correction request not found' };
    }

    // Assert period not locked before executing ownership correction
    await assertPeriodNotLocked(request.createdAt);

    if (request.status !== 'pending') {
      throw { status: 400, code: 'REQUEST_NOT_PENDING', message: 'Request is already processed' };
    }

    // 1. Update the request status
    await tx.ownershipCorrectionRequest.update({
      where: { id: request.id },
      data: { status: 'approved' }
    });

    // 2. Update the PaymentIntent
    await tx.paymentIntent.update({
      where: { id: request.paymentIntentId },
      data: {
        ownerType: request.newOwnerType,
        ownerClinicId: request.newOwnerClinicId,
        ownerDentistId: request.newOwnerDentistId
      }
    });

    // 3. Update related Invoices
    await tx.invoice.updateMany({
      where: { paymentIntentId: request.paymentIntentId },
      data: {
        ownerType: request.newOwnerType,
        ownerClinicId: request.newOwnerClinicId,
        ownerDentistId: request.newOwnerDentistId
      }
    });

    // 4. Update related Settlements
    await tx.paymentSettlement.updateMany({
      where: { paymentIntentId: request.paymentIntentId },
      data: {
        ownerType: request.newOwnerType,
        ownerClinicId: request.newOwnerClinicId,
        ownerDentistId: request.newOwnerDentistId
      }
    });

    // 5. Create OwnershipCorrectionLog
    const log = await tx.ownershipCorrectionLog.create({
      data: {
        paymentIntentId: request.paymentIntentId,
        requestId: request.id,
        correctedBy: BigInt(actorId),
        oldOwnerType: request.oldOwnerType,
        oldOwnerClinicId: request.oldOwnerClinicId,
        oldOwnerDentistId: request.oldOwnerDentistId,
        newOwnerType: request.newOwnerType,
        newOwnerClinicId: request.newOwnerClinicId,
        newOwnerDentistId: request.newOwnerDentistId,
        reason: request.reason
      }
    });

    // 6. Record financial ledger adjustment entries
    await tx.financialLedgerEntry.create({
      data: {
        paymentIntentId: request.paymentIntentId,
        ownerType: request.newOwnerType,
        ownerClinicId: request.newOwnerClinicId,
        ownerDentistId: request.newOwnerDentistId,
        entryType: 'ADJUSTMENT',
        status: 'completed',
        direction: 'adjustment',
        amount: 0, // ownership correction does not mutate the face value, just ownership
        source: 'system',
        metadata: {
          action: 'ownership_correction',
          correctionLogId: log.id.toString(),
          reason: request.reason,
          old: {
            ownerType: request.oldOwnerType,
            ownerClinicId: request.oldOwnerClinicId?.toString(),
            ownerDentistId: request.oldOwnerDentistId?.toString()
          },
          new: {
            ownerType: request.newOwnerType,
            ownerClinicId: request.newOwnerClinicId?.toString(),
            ownerDentistId: request.newOwnerDentistId?.toString()
          }
        }
      }
    });

    return log;
  });
}
