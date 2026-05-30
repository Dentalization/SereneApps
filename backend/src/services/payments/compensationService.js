import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Accrues dentist compensation for clinic-affiliated dentist appointments
 */
export async function accrueCompensation({ tx, paymentIntent, snapshot, appointment }) {
  const client = tx || prisma;

  if (paymentIntent.ownerType !== 'clinic' || !paymentIntent.ownerClinicId) {
    return null;
  }

  const dentistId = appointment.dentistId;
  const clinicId = paymentIntent.ownerClinicId;
  const amount = snapshot.dentistShare;

  // Prevent duplicate accrual
  const existing = await client.dentistCompensationEntry.findFirst({
    where: {
      paymentIntentId: paymentIntent.id,
      entryType: 'ACCRUAL'
    }
  });

  if (existing) return existing;

  const entry = await client.dentistCompensationEntry.create({
    data: {
      appointmentId: appointment.id,
      paymentIntentId: paymentIntent.id,
      dentistId,
      clinicId,
      entryType: 'ACCRUAL',
      amount,
      status: 'accrued',
      metadata: {
        snapshotId: snapshot.id.toString(),
        calculatedRatio: '30%'
      }
    }
  });

  // Record into Authoritative Ledger
  await client.financialLedgerEntry.create({
    data: {
      paymentIntentId: paymentIntent.id,
      appointmentId: appointment.id,
      ownerType: 'dentist',
      ownerDentistId: dentistId,
      entryType: 'COMMISSION_ACCRUED',
      status: 'completed',
      direction: 'credit',
      amount,
      currency: paymentIntent.currency || 'IDR',
      source: 'system',
      metadata: {
        compensationEntryId: entry.id.toString(),
        paymentIntentId: paymentIntent.id.toString(),
        appointmentId: appointment.id.toString()
      }
    }
  });

  return entry;
}

/**
 * Processes a compensation payout to a dentist
 */
export async function processPayout({ dentistId, clinicId, amount, metadata = {} }) {
  return prisma.$transaction(async (tx) => {
    const entry = await tx.dentistCompensationEntry.create({
      data: {
        dentistId: BigInt(dentistId),
        clinicId: BigInt(clinicId),
        entryType: 'PAYOUT',
        amount,
        status: 'paid',
        metadata
      }
    });

    await tx.financialLedgerEntry.create({
      data: {
        ownerType: 'dentist',
        ownerDentistId: BigInt(dentistId),
        entryType: 'COMMISSION_PAID',
        status: 'completed',
        direction: 'debit',
        amount,
        source: 'system',
        metadata: {
          compensationEntryId: entry.id.toString()
        }
      }
    });

    return entry;
  });
}
