import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { handleMidtransCallback } from '../src/services/payments/webhookHandler.js';
import crypto from 'node:crypto';

const prisma = new PrismaClient();
const rand = () => Math.floor(Math.random() * 10000000).toString();
const appointmentTimes = (startsAt = new Date()) => ({
  startsAt,
  endsAt: new Date(startsAt.getTime() + 30 * 60 * 1000)
});

test('financial Webhook Replay: idempotency and replay protection', async () => {
  const suffix = rand();

  const dentist = await prisma.user.create({
    data: {
      name: `Dr. Webhook ${suffix}`,
      email: `webhook_${suffix}@test.com`,
      password_hash: 'hash',
      roles: ['dentist']
    }
  });

  const profile = await prisma.dentistProfile.create({
    data: {
      userId: dentist.id,
      title: 'drg.',
      licenseNumber: `LIC-WEB-${suffix}`,
      licenseIssuingBody: 'Kemenkes',
      licenseExpiryDate: new Date(),
      registrationNumber: `REG-WEB-${suffix}`,
      primarySpecialization: 'General',
      educationQualification: 'DDS',
      yearsOfExperience: 5,
      clinicName: 'Webhook Clinic',
      clinicAddress: 'Jl. Webhook 1',
      clinicWorkingHours: '{}',
      dentist_type: 'independent'
    }
  });

  const patient = await prisma.user.create({
    data: {
      name: `Patient Web ${suffix}`,
      email: `patient_web_${suffix}@test.com`,
      password_hash: 'hash',
      roles: ['patient']
    }
  });

  const app = await prisma.appointment.create({
    data: {
      dentistId: dentist.id,
      patientId: patient.id,
      ...appointmentTimes(),
      status: 'scheduled',
      ownerType: 'dentist'
    }
  });

  const orderId = `ORD-WEB-${suffix}`;
  const intent = await prisma.paymentIntent.create({
    data: {
      appointmentId: app.id,
      patientId: patient.id,
      amount: 150000,
      status: 'pending',
      ownerType: 'dentist',
      ownerDentistId: dentist.id,
      providerOrderId: orderId,
      provider: 'midtrans'
    }
  });

  // Construct a valid signature key
  const serverKey = process.env.MIDTRANS_SERVER_KEY || 'dummy-key';
  const grossAmount = '150000.00';
  const statusCode = '200';
  const signaturePayload = `${orderId}${statusCode}${grossAmount}${serverKey}`;
  const signatureKey = crypto ? crypto.createHash('sha512').update(signaturePayload).digest('hex') : 'mock-signature';

  const body = {
    order_id: orderId,
    status_code: statusCode,
    gross_amount: grossAmount,
    signature_key: signatureKey,
    transaction_status: 'settlement',
    transaction_id: `tx-web-${suffix}`,
    payment_type: 'credit_card'
  };

  try {
    // 1. First Webhook Delivery
    const result1 = await prisma.$transaction(async (tx) => {
      return handleMidtransCallback(body, tx);
    });
    assert.ok(result1);
    assert.equal(result1.processed, true);

    // Verify PaymentIntent is now settled
    const reloadedIntent = await prisma.paymentIntent.findUnique({
      where: { id: intent.id }
    });
    assert.equal(reloadedIntent.status, 'settled');

    // 2. Duplicate Webhook Delivery (Replay attempt)
    // The handler should detect that status is already in target status or it is duplicate
    const result2 = await prisma.$transaction(async (tx) => {
      return handleMidtransCallback(body, tx);
    });
    assert.ok(result2);
    assert.equal(result2.skipped, true);
    assert.equal(result2.reason, 'Already in target status');

  } finally {
    // Cleanup
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
