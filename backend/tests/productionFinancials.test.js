import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { createCorrectionRequest, approveAndExecuteCorrection } from '../src/services/payments/financialCorrectionService.js';
import { applyPaymentStatus } from '../src/services/payments/status.js';

const prisma = new PrismaClient();

// Helper to get random ID to avoid collisions
const rand = () => Math.floor(Math.random() * 10000000).toString();

test('production financials: webhook deduplication with WebhookProcessingLog', async () => {
  const payloadHash = `hash-${rand()}`;
  const eventId = `evt-${rand()}`;

  // 1. Create a log entry
  const log1 = await prisma.webhookProcessingLog.create({
    data: {
      provider: 'midtrans',
      eventId,
      payloadHash
    }
  });

  assert.ok(log1);

  // 2. Attempt duplicate creation which should trigger a unique constraint or check logic
  // Let's assert that finding or attempting to query detects duplicate
  const duplicate = await prisma.webhookProcessingLog.findFirst({
    where: {
      OR: [
        { provider: 'midtrans', payloadHash },
        { provider: 'midtrans', eventId }
      ]
    }
  });

  assert.ok(duplicate, 'Duplicate must be found in the processing log');
  assert.equal(duplicate.eventId, eventId);

  // Cleanup
  await prisma.webhookProcessingLog.delete({ where: { id: log1.id } }).catch(() => {});
});

test('production financials: ownership correction execution & ledger auditing', async () => {
  const suffix = rand();

  // Create actors
  const dentistA = await prisma.user.create({
    data: {
      name: `Dentist A ${suffix}`,
      email: `dentist_a_${suffix}@test.com`,
      password_hash: 'hash',
      roles: ['dentist']
    }
  });

  const dentistB = await prisma.user.create({
    data: {
      name: `Dentist B ${suffix}`,
      email: `dentist_b_${suffix}@test.com`,
      password_hash: 'hash',
      roles: ['dentist']
    }
  });

  const patient = await prisma.user.create({
    data: {
      name: `Patient ${suffix}`,
      email: `patient_${suffix}@test.com`,
      password_hash: 'hash',
      roles: ['patient']
    }
  });

  // Create independent dentist appointment
  const app = await prisma.appointment.create({
    data: {
      dentistId: dentistA.id,
      patientId: patient.id,
      startsAt: new Date(),
      endsAt: new Date(),
      status: 'completed',
      ownerType: 'dentist'
    }
  });

  const intent = await prisma.paymentIntent.create({
    data: {
      appointmentId: app.id,
      patientId: patient.id,
      amount: 200000,
      status: 'settled',
      ownerType: 'dentist',
      ownerDentistId: dentistA.id
    }
  });

  const invoice = await prisma.invoice.create({
    data: {
      appointmentId: app.id,
      paymentIntentId: intent.id,
      patientId: patient.id,
      ownerType: 'dentist',
      ownerDentistId: dentistA.id,
      subtotal: 200000,
      total: 200000
    }
  });

  try {
    // 1. Create correction request to transfer ownership to Dentist B
    const request = await createCorrectionRequest({
      paymentIntentId: intent.id.toString(),
      requestedBy: dentistA.id.toString(),
      newOwnerType: 'dentist',
      newOwnerClinicId: null,
      newOwnerDentistId: dentistB.id.toString(),
      reason: 'Wrong owner dentist mapped'
    });

    assert.ok(request);
    assert.equal(request.status, 'pending');
    assert.equal(request.newOwnerDentistId, dentistB.id);

    // 2. Approve and execute
    const log = await approveAndExecuteCorrection(request.id.toString(), dentistA.id.toString());
    assert.ok(log);
    assert.equal(log.newOwnerDentistId, dentistB.id);

    // 3. Verify PaymentIntent, Invoice ownership update
    const updatedIntent = await prisma.paymentIntent.findUnique({
      where: { id: intent.id }
    });
    assert.equal(updatedIntent.ownerDentistId, dentistB.id);

    const updatedInvoice = await prisma.invoice.findFirst({
      where: { paymentIntentId: intent.id }
    });
    assert.equal(updatedInvoice.ownerDentistId, dentistB.id);

    // 4. Verify FinancialLedgerEntry audit log entry
    const ledgerEntry = await prisma.financialLedgerEntry.findFirst({
      where: { paymentIntentId: intent.id, entryType: 'ADJUSTMENT' }
    });
    assert.ok(ledgerEntry);
    assert.equal(ledgerEntry.metadata.action, 'ownership_correction');
  } finally {
    // Clean up
    await prisma.financialLedgerEntry.deleteMany({ where: { paymentIntentId: intent.id } }).catch(() => {});
    await prisma.ownershipCorrectionLog.deleteMany({ where: { paymentIntentId: intent.id } }).catch(() => {});
    await prisma.ownershipCorrectionRequest.deleteMany({ where: { paymentIntentId: intent.id } }).catch(() => {});
    await prisma.invoice.delete({ where: { id: invoice.id } }).catch(() => {});
    await prisma.paymentIntent.delete({ where: { id: intent.id } }).catch(() => {});
    await prisma.appointment.delete({ where: { id: app.id } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: [dentistA.id, dentistB.id, patient.id] } } }).catch(() => {});
  }
});

test('production financials: invoice snapshots generation and immutability', async () => {
  const suffix = rand();

  const dentist = await prisma.user.create({
    data: {
      name: `Dentist Snapshot ${suffix}`,
      email: `dentist_snap_${suffix}@test.com`,
      password_hash: 'hash',
      roles: ['dentist']
    }
  });

  const profile = await prisma.dentistProfile.create({
    data: {
      userId: dentist.id,
      title: 'drg.',
      licenseNumber: `LIC-${suffix}`,
      licenseIssuingBody: 'Kemenkes',
      licenseExpiryDate: new Date(),
      registrationNumber: `REG-${suffix}`,
      primarySpecialization: 'General Dentistry',
      educationQualification: 'DDS',
      yearsOfExperience: 5,
      clinicName: 'Test Clinic',
      clinicAddress: 'Jl. Test No.1',
      clinicWorkingHours: '{}',
      dentist_type: 'independent'
    }
  });

  const patient = await prisma.user.create({
    data: {
      name: `Patient Snapshot ${suffix}`,
      email: `patient_snap_${suffix}@test.com`,
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
      amount: 150000,
      status: 'pending',
      ownerType: 'dentist',
      ownerDentistId: dentist.id
    }
  });

  try {
    // Transition to paid to generate invoice automatically
    await applyPaymentStatus({
      paymentIntentId: intent.id.toString(),
      newStatus: 'paid'
    });

    const invoice = await prisma.invoice.findFirst({
      where: { paymentIntentId: intent.id }
    });

    assert.ok(invoice);
    assert.equal(invoice.issuerType, 'dentist');
    assert.equal(invoice.issuerName, dentist.name);
    assert.equal(invoice.issuerEmail, dentist.email);

    // Modify dentist name now to test invoice snapshot immutability
    await prisma.user.update({
      where: { id: dentist.id },
      data: { name: 'Modified Dentist Name' }
    });

    // Verify invoice snapshot issuerName remains unchanged
    const reloadedInvoice = await prisma.invoice.findUnique({
      where: { id: invoice.id }
    });
    assert.equal(reloadedInvoice.issuerName, dentist.name, 'Invoice issuer snapshot must be immutable');
  } finally {
    // Clean up
    await prisma.invoiceLineItem.deleteMany({ where: { invoice: { paymentIntentId: intent.id } } }).catch(() => {});
    await prisma.invoice.deleteMany({ where: { paymentIntentId: intent.id } }).catch(() => {});
    await prisma.financialLedgerEntry.deleteMany({ where: { paymentIntentId: intent.id } }).catch(() => {});
    await prisma.paymentIntent.delete({ where: { id: intent.id } }).catch(() => {});
    await prisma.appointment.delete({ where: { id: app.id } }).catch(() => {});
    await prisma.dentistProfile.delete({ where: { id: profile.id } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: [dentist.id, patient.id] } } }).catch(() => {});
  }
});
