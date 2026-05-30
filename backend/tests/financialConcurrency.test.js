import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { applyPaymentStatus } from '../src/services/payments/status.js';
import { createPayoutBatch, getAvailableBalance } from '../src/services/payments/payoutService.js';

const prisma = new PrismaClient();
const rand = () => Math.floor(Math.random() * 10000000).toString();

test('financial Concurrency: stress test 50 concurrent payouts', async () => {
  const suffix = rand();

  const dentist = await prisma.user.create({
    data: {
      name: `Dr. Concurrent ${suffix}`,
      email: `concurrent_${suffix}@test.com`,
      password_hash: 'hash',
      roles: ['dentist']
    }
  });

  const profile = await prisma.dentistProfile.create({
    data: {
      userId: dentist.id,
      title: 'drg.',
      licenseNumber: `LIC-CON-${suffix}`,
      licenseIssuingBody: 'Kemenkes',
      licenseExpiryDate: new Date(),
      registrationNumber: `REG-CON-${suffix}`,
      primarySpecialization: 'General',
      educationQualification: 'DDS',
      yearsOfExperience: 5,
      clinicName: 'Concurrent Clinic',
      clinicAddress: 'Jl. Concurrent 1',
      clinicWorkingHours: '{}',
      dentist_type: 'independent'
    }
  });

  const patient = await prisma.user.create({
    data: {
      name: `Patient Con ${suffix}`,
      email: `patient_con_${suffix}@test.com`,
      password_hash: 'hash',
      roles: ['patient']
    }
  });

  const app = await prisma.appointment.create({
    data: {
      dentistId: dentist.id,
      patientId: patient.id,
      startsAt: new Date(),
      endsAt: new Date(),
      status: 'scheduled',
      ownerType: 'dentist'
    }
  });

  const intent = await prisma.paymentIntent.create({
    data: {
      appointmentId: app.id,
      patientId: patient.id,
      amount: 150000, // 150k gross -> 135k net after 10% platform fee
      status: 'pending',
      ownerType: 'dentist',
      ownerDentistId: dentist.id,
      providerOrderId: `ORD-CON-${suffix}`,
      provider: 'midtrans'
    }
  });

  try {
    // 1. Settle transaction
    await applyPaymentStatus({
      paymentIntentId: intent.id.toString(),
      newStatus: 'settled',
      providerPaymentId: `pay-con-${suffix}`
    });

    // Simulate maturation release
    await prisma.availableBalance.updateMany({
      where: { ownerDentistId: dentist.id },
      data: { availableAmount: 135000 }
    });

    const balanceBefore = await getAvailableBalance({
      ownerType: 'dentist',
      ownerDentistId: dentist.id
    });
    assert.equal(balanceBefore, 135000);

    // 2. Dispatch 50 concurrent payout requests of 100,000 IDR each
    // Available balance is 135,000, so exactly ONE payout of 100k can succeed.
    // The rest must be rejected with 409 Conflict.
    const payoutPromises = [];
    for (let i = 0; i < 50; i++) {
      payoutPromises.push(
        createPayoutBatch({
          recipientType: 'dentist',
          items: [
            {
              recipientType: 'dentist',
              recipientDentistId: dentist.id.toString(),
              amount: 100000
            }
          ]
        }).then(
          (res) => ({ success: true, result: res }),
          (err) => ({ success: false, error: err })
        )
      );
    }

    const results = await Promise.all(payoutPromises);

    const successes = results.filter((r) => r.success);
    const failures = results.filter((r) => !r.success);

    console.log(`[Concurrency Test] Successes: ${successes.length}, Failures: ${failures.length}`);

    // Assertions
    assert.equal(successes.length, 1, 'Exactly one payout request must succeed');
    assert.equal(failures.length, 49, '49 concurrent payout requests must fail due to insufficient funds');

    // Verify remaining balance is exactly 35,000
    const balanceAfter = await getAvailableBalance({
      ownerType: 'dentist',
      ownerDentistId: dentist.id
    });
    assert.equal(balanceAfter, 35000);

  } finally {
    // Cleanup
    await prisma.payoutItem.deleteMany({ where: { recipientDentistId: dentist.id } }).catch(() => {});
    await prisma.payoutBatch.deleteMany({ where: { items: { some: { recipientDentistId: dentist.id } } } }).catch(() => {});
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
