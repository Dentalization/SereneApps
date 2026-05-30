import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { applyPaymentStatus } from '../src/services/payments/status.js';
import { handleMidtransCallback } from '../src/services/payments/webhookHandler.js';
import { lockPeriod } from '../src/services/payments/periodLockService.js';
import crypto from 'node:crypto';

const prisma = new PrismaClient();
const rand = () => Math.floor(Math.random() * 10000000).toString();

test('financial Closed Period: lock validations and webhook adjustment routing', async () => {
  const suffix = rand();
  const pastDate = new Date('2026-03-15T12:00:00Z');
  const pastPeriodKey = '2026-03';

  const dentist = await prisma.user.create({
    data: {
      name: `Dr. Locked ${suffix}`,
      email: `locked_${suffix}@test.com`,
      password_hash: 'hash',
      roles: ['dentist']
    }
  });

  const profile = await prisma.dentistProfile.create({
    data: {
      userId: dentist.id,
      title: 'drg.',
      licenseNumber: `LIC-LCK-${suffix}`,
      licenseIssuingBody: 'Kemenkes',
      licenseExpiryDate: new Date(),
      registrationNumber: `REG-LCK-${suffix}`,
      primarySpecialization: 'General',
      educationQualification: 'DDS',
      yearsOfExperience: 5,
      clinicName: 'Locked Clinic',
      clinicAddress: 'Jl. Locked 1',
      clinicWorkingHours: '{}',
      dentist_type: 'independent'
    }
  });

  const patient = await prisma.user.create({
    data: {
      name: `Patient Lck ${suffix}`,
      email: `patient_lck_${suffix}@test.com`,
      password_hash: 'hash',
      roles: ['patient']
    }
  });

  const app = await prisma.appointment.create({
    data: {
      dentistId: dentist.id,
      patientId: patient.id,
      startsAt: pastDate,
      endsAt: pastDate,
      status: 'scheduled',
      ownerType: 'dentist',
      createdAt: pastDate
    }
  });

  const orderId = `ORD-LCK-${suffix}`;
  const intent = await prisma.paymentIntent.create({
    data: {
      appointmentId: app.id,
      patientId: patient.id,
      amount: 100000,
      status: 'pending',
      ownerType: 'dentist',
      ownerDentistId: dentist.id,
      providerOrderId: orderId,
      provider: 'midtrans',
      createdAt: pastDate
    }
  });

  try {
    // 1. Lock the past period
    await lockPeriod({ periodKey: pastPeriodKey, actorId: dentist.id });

    // 2. Attempt manual status transition. Must reject with PERIOD_LOCKED.
    await assert.rejects(
      async () => {
        await applyPaymentStatus({
          paymentIntentId: intent.id.toString(),
          newStatus: 'settled',
          providerPaymentId: `pay-lck-manual-${suffix}`
        });
      },
      (err) => err.code === 'PERIOD_LOCKED'
    );

    // 3. Process incoming late webhook callback. Must succeed (to activate teledentistry rooms),
    // but its ledger entries and settlements must be dated in the current unlocked period.
    const serverKey = process.env.MIDTRANS_SERVER_KEY || 'dummy-key';
    const grossAmount = '100000.00';
    const statusCode = '200';
    const signaturePayload = `${orderId}${statusCode}${grossAmount}${serverKey}`;
    const signatureKey = crypto.createHash('sha512').update(signaturePayload).digest('hex');

    const webhookBody = {
      order_id: orderId,
      status_code: statusCode,
      gross_amount: grossAmount,
      signature_key: signatureKey,
      transaction_status: 'settlement',
      transaction_id: `tx-lck-web-${suffix}`,
      payment_type: 'credit_card'
    };

    const webhookResult = await prisma.$transaction(async (tx) => {
      return handleMidtransCallback(webhookBody, tx);
    });
    assert.ok(webhookResult);

    // Verify ledger entry date is in the current month (active period)
    const ledger = await prisma.financialLedgerEntry.findFirst({
      where: { paymentIntentId: intent.id }
    });
    assert.ok(ledger);
    // Ledger entry date must be today (not 2026-03)
    const ledgerMonth = ledger.createdAt.toISOString().slice(0, 7);
    const todayMonth = new Date().toISOString().slice(0, 7);
    assert.equal(ledgerMonth, todayMonth, 'Ledger entry must be written in the current period');

  } finally {
    // Cleanup
    await prisma.accountingPeriod.deleteMany({ where: { periodKey: pastPeriodKey } }).catch(() => {});
    await prisma.paymentSettlement.deleteMany({ where: { paymentIntentId: intent.id } }).catch(() => {});
    await prisma.financialLedgerEntry.deleteMany({ where: { paymentIntentId: intent.id } }).catch(() => {});
    await prisma.invoiceLineItem.deleteMany({ where: { invoice: { paymentIntentId: intent.id } } }).catch(() => {});
    await prisma.invoice.deleteMany({ where: { paymentIntentId: intent.id } }).catch(() => {});
    await prisma.availableBalance.deleteMany({ where: { ownerDentistId: dentist.id } }).catch(() => {});
    await prisma.paymentIntent.deleteMany({ where: { id: intent.id } }).catch(() => {});
    await prisma.appointment.deleteMany({ where: { id: app.id } }).catch(() => {});
    await prisma.dentistProfile.deleteMany({ where: { id: profile.id } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: [dentist.id, patient.id] } } }).catch(() => {});
  }
});
