import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { verifyBalances } from '../src/services/payments/financialIntegrityService.js';
import { applyPaymentStatus } from '../src/services/payments/status.js';
import { processRefund } from '../src/services/payments/refundService.js';

const prisma = new PrismaClient();
const rand = () => Math.floor(Math.random() * 10000000).toString();

test('financial Balance Reconciliation: test verification and drift detection', async () => {
  const suffix = rand();

  // Create Independent Dentist Actor
  const dentist = await prisma.user.create({
    data: {
      name: `Dr. Reconcile ${suffix}`,
      email: `reconcile_${suffix}@test.com`,
      password_hash: 'hash',
      roles: ['dentist']
    }
  });

  const profile = await prisma.dentistProfile.create({
    data: {
      userId: dentist.id,
      title: 'drg.',
      licenseNumber: `LIC-REC-${suffix}`,
      licenseIssuingBody: 'Kemenkes',
      licenseExpiryDate: new Date(),
      registrationNumber: `REG-REC-${suffix}`,
      primarySpecialization: 'General',
      educationQualification: 'DDS',
      yearsOfExperience: 5,
      clinicName: 'Reconcile Clinic',
      clinicAddress: 'Jl. Reconcile 1',
      clinicWorkingHours: '{}',
      dentist_type: 'independent'
    }
  });

  const patient = await prisma.user.create({
    data: {
      name: `Patient Rec ${suffix}`,
      email: `patient_rec_${suffix}@test.com`,
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
      amount: 200000,
      status: 'pending',
      ownerType: 'dentist',
      ownerDentistId: dentist.id,
      providerOrderId: `ORD-REC-${suffix}`,
      provider: 'midtrans'
    }
  });

  try {
    // Clear available balances to ensure clean test state
    await prisma.availableBalance.deleteMany().catch(() => {});

    // 1. Initial State: Balance table might not have record yet or balance is 0. Audit must be valid.
    let audit = await verifyBalances();
    assert.equal(audit.valid, true);

    // 2. Settle the payment intent
    await applyPaymentStatus({
      paymentIntentId: intent.id.toString(),
      newStatus: 'settled',
      providerPaymentId: `pay-rec-${suffix}`
    });

    // 3. Maturation Release (Simulate by direct update)
    await prisma.availableBalance.updateMany({
      where: { ownerDentistId: dentist.id },
      data: { availableAmount: 180000 } // 200k - 10% platform fee
    });

    // Verify after maturation
    audit = await verifyBalances();
    let currentDrift = audit.discrepancies.filter(d => d.ownerDentistId === dentist.id.toString());
    assert.equal(currentDrift.length, 0, 'Dynamic computed balances and AvailableBalance table must match for this dentist');

    // 4. Refund part of transaction
    await processRefund({
      paymentIntentId: intent.id.toString(),
      refundAmount: 50000,
      refundReason: 'Reconcile partial refund',
      actorId: dentist.id.toString(),
      actorRoles: ['dentist']
    });

    // Verify after refund
    audit = await verifyBalances();
    currentDrift = audit.discrepancies.filter(d => d.ownerDentistId === dentist.id.toString());
    assert.equal(currentDrift.length, 0, 'Balances must reconcile perfectly after partial refund');

    // 5. Force discrepancy / drift manually in the DB to test integrity detection
    await prisma.availableBalance.updateMany({
      where: { ownerDentistId: dentist.id },
      data: { availableAmount: 100000 } // set incorrect value manually
    });

    audit = await verifyBalances();
    currentDrift = audit.discrepancies.filter(d => d.ownerDentistId === dentist.id.toString());
    assert.equal(currentDrift.length, 1, 'Audit must fail if there is manually induced balance drift');
    assert.equal(currentDrift[0].drift, 100000 - 130000); // Stored - Computed (100k - 130k = -30k)

  } finally {
    // Cleanup
    await prisma.refund.deleteMany({ where: { paymentIntentId: intent.id } }).catch(() => {});
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
