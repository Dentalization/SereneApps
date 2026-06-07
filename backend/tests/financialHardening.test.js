import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { guardWebhookIdempotency } from '../src/services/webhooks/idempotency.js';
import { processRefund } from '../src/services/payments/refundService.js';
import { createPaymentSnapshot } from '../src/services/payments/snapshotService.js';
import { recordFinancialAuditLog } from '../src/services/audit/auditLogger.js';
import { generateInvoicePDF } from '../src/services/payments/pdfGenerator.js';
import { Writable } from 'node:stream';
import { reconcilePayment } from '../src/services/payments/reconcileJob.js';

const prisma = new PrismaClient();

// Helper to get random ID to avoid collisions
const rand = () => Math.floor(Math.random() * 10000000).toString();
const appointmentTimes = (startsAt = new Date()) => ({
  startsAt,
  endsAt: new Date(startsAt.getTime() + 30 * 60 * 1000)
});

test('financial hardening: duplicate webhook replay & idempotency', async () => {
  const deliveryKey = `test-key-${rand()}`;
  const payload = { order_id: 'test-order', transaction_id: 'test-tx', transaction_status: 'settlement' };

  // First call
  const result1 = await guardWebhookIdempotency('midtrans', deliveryKey, payload, async (tx) => {
    return { ok: true };
  });

  // Second duplicate call
  const result2 = await guardWebhookIdempotency('midtrans', deliveryKey, payload, async (tx) => {
    return { ok: true };
  });

  assert.ok(result1.ok);
  assert.ok(result2.skipped, 'Second call must be skipped as replay');

  // Cleanup
  await prisma.webhookReceipt.deleteMany({ where: { deliveryKey } }).catch(() => {});
});

test('financial hardening: snapshot immutability', async () => {
  // Create dummy users dynamically to avoid constraint violations
  const suffix = rand();
  const dentist = await prisma.user.create({
    data: {
      name: 'Test Dentist',
      email: `dentist_${suffix}@test.com`,
      password_hash: 'hash',
      roles: ['dentist']
    }
  });

  const patient = await prisma.user.create({
    data: {
      name: 'Test Patient',
      email: `patient_${suffix}@test.com`,
      password_hash: 'hash',
      roles: ['patient']
    }
  });

  const dentistId = dentist.id;
  const patientId = patient.id;

  // Create dummy appointment and payment intent
  const app = await prisma.appointment.create({
    data: {
      dentistId,
      patientId,
      ...appointmentTimes(),
      status: 'scheduled',
      ownerType: 'dentist'
    }
  });

  const intent = await prisma.paymentIntent.create({
    data: {
      appointmentId: app.id,
      patientId,
      amount: 150000,
      status: 'settled',
      ownerType: 'dentist',
      ownerDentistId: dentistId
    }
  });

  const invoice = await prisma.invoice.create({
    data: {
      appointmentId: app.id,
      paymentIntentId: intent.id,
      patientId,
      ownerType: 'dentist',
      ownerDentistId: dentistId,
      subtotal: 150000,
      total: 150000
    }
  });

  try {
    const snapshot = await createPaymentSnapshot({
      tx: prisma,
      paymentIntent: intent,
      invoice,
      appointment: app
    });

    assert.equal(snapshot.paymentIntentId, intent.id);
    assert.equal(snapshot.subtotal, 150000);
    assert.equal(snapshot.platformFee, 15000); // 10%
    assert.equal(snapshot.dentistShare, 135000); // 90%
    assert.equal(snapshot.clinicShare, 0);

    // Clean up snapshot
    await prisma.paymentSnapshot.delete({ where: { id: snapshot.id } });
  } finally {
    // Clean up remaining
    await prisma.invoice.delete({ where: { id: invoice.id } }).catch(() => {});
    await prisma.paymentIntent.delete({ where: { id: intent.id } }).catch(() => {});
    await prisma.appointment.delete({ where: { id: app.id } }).catch(() => {});
    await prisma.user.delete({ where: { id: patientId } }).catch(() => {});
    await prisma.user.delete({ where: { id: dentistId } }).catch(() => {});
  }
});

test('financial hardening: unauthorized refund attempt is blocked', async () => {
  const suffix = rand();
  const dentist = await prisma.user.create({
    data: {
      name: 'Test Dentist',
      email: `dentist_${suffix}@test.com`,
      password_hash: 'hash',
      roles: ['dentist']
    }
  });

  const patient = await prisma.user.create({
    data: {
      name: 'Test Patient',
      email: `patient_${suffix}@test.com`,
      password_hash: 'hash',
      roles: ['patient']
    }
  });

  const dentistId = dentist.id;
  const patientId = patient.id;

  const app = await prisma.appointment.create({
    data: {
      dentistId,
      patientId,
      ...appointmentTimes(),
      status: 'scheduled',
      ownerType: 'dentist'
    }
  });

  const intent = await prisma.paymentIntent.create({
    data: {
      appointmentId: app.id,
      patientId,
      amount: 150000,
      status: 'settled',
      ownerType: 'dentist',
      ownerDentistId: dentistId
    }
  });

  try {
    // Try to refund with an unauthorized role (patient attempting refund)
    await assert.rejects(
      async () => {
        await processRefund({
          paymentIntentId: intent.id,
          refundAmount: 5000,
          refundReason: 'Unauthorized test',
          actorId: patientId, // Patient user ID
          actorRoles: ['patient']
        });
      },
      (err) => {
        return err.status === 403 && err.code === 'FORBIDDEN';
      }
    );
  } finally {
    // Clean up
    await prisma.paymentIntent.delete({ where: { id: intent.id } }).catch(() => {});
    await prisma.appointment.delete({ where: { id: app.id } }).catch(() => {});
    await prisma.user.delete({ where: { id: patientId } }).catch(() => {});
    await prisma.user.delete({ where: { id: dentistId } }).catch(() => {});
  }
});

test('financial hardening: audit log creation and sanitization', async () => {
  const suffix = rand();
  const dentist = await prisma.user.create({
    data: {
      name: 'Test Dentist',
      email: `dentist_${suffix}@test.com`,
      password_hash: 'hash',
      roles: ['dentist']
    }
  });

  const dentistId = dentist.id;

  const metadata = {
    auth_token: 'secret-token-value-12345',
    card_number: '1234-5678-9012-3456',
    normal_field: 'safe-value'
  };

  try {
    const auditLog = await recordFinancialAuditLog({
      actorId: dentistId,
      actorRole: 'dentist',
      entityType: 'invoice',
      entityId: '100',
      action: 'viewed',
      metadata
    });

    assert.ok(auditLog);
    assert.equal(auditLog.action, 'viewed');
    
    // Verify secrets are redacted
    const savedMeta = auditLog.metadata;
    assert.equal(savedMeta.auth_token, '[REDACTED]');
    assert.equal(savedMeta.card_number, '[REDACTED]');
    assert.equal(savedMeta.normal_field, 'safe-value');

    // Clean up
    await prisma.financialAuditLog.delete({ where: { id: auditLog.id } });
  } finally {
    await prisma.user.delete({ where: { id: dentistId } }).catch(() => {});
  }
});

test('financial hardening: PDF generation layout validation', async () => {
  const invoice = {
    id: 123456n,
    reference: 'INV-123456',
    subtotal: 200000,
    discount: 20000,
    tax: 0,
    total: 180000,
    ownerType: 'dentist',
    issuedAt: new Date(),
    dueAt: new Date(),
    patient: { name: 'Adit', email: 'adit@test.com', phone_number: '0812345678' },
    paymentIntent: { status: 'settled', providerOrderId: 'ORD-987' },
    paymentSnapshot: { paymentMethod: 'credit_card' }
  };

  // Mock stream
  let streamFinished = false;
  const mockStream = new Writable({
    write(chunk, encoding, callback) {
      callback();
    }
  });
  mockStream.on('finish', () => {
    streamFinished = true;
  });

  generateInvoicePDF(invoice, mockStream);

  // Wait a bit to check if stream finished
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.ok(streamFinished, 'PDF generation must finish drawing layout to stream');
});

test('financial hardening: reconciliation recovery from requires_action', async () => {
  const suffix = rand();
  const dentist = await prisma.user.create({
    data: {
      name: 'Test Dentist Reconcile',
      email: `dentist_rec_${suffix}@test.com`,
      password_hash: 'hash',
      roles: ['dentist']
    }
  });

  const patient = await prisma.user.create({
    data: {
      name: 'Test Patient Reconcile',
      email: `patient_rec_${suffix}@test.com`,
      password_hash: 'hash',
      roles: ['patient']
    }
  });

  const dentistId = dentist.id;
  const patientId = patient.id;

  const app = await prisma.appointment.create({
    data: {
      dentistId,
      ...appointmentTimes(),
      status: 'scheduled',
      ownerType: 'dentist',
      patientId
    }
  });

  const intent = await prisma.paymentIntent.create({
    data: {
      appointmentId: app.id,
      patientId,
      amount: 150000,
      status: 'requires_action',
      ownerType: 'dentist',
      ownerDentistId: dentistId,
      providerOrderId: `APT-${app.id}-PI-${rand()}`,
      provider: 'midtrans'
    }
  });

  const invoice = await prisma.invoice.create({
    data: {
      appointmentId: app.id,
      paymentIntentId: intent.id,
      patientId,
      ownerType: 'dentist',
      ownerDentistId: dentistId,
      subtotal: 150000,
      total: 150000
    }
  });

  try {
    // Reconcile the payment. The mock Midtrans API will return 'settlement', which maps to settled.
    const reconcileResult = await reconcilePayment(intent.id);
    assert.ok(reconcileResult.reconciled);
    assert.equal(reconcileResult.newStatus, 'settled');

    // Reload the intent and verify DB states
    const updatedIntent = await prisma.paymentIntent.findUnique({
      where: { id: intent.id }
    });
    assert.equal(updatedIntent.status, 'settled');
    assert.equal(updatedIntent.reconciliationStatus, 'reconciled');
  } finally {
    // Clean up
    await prisma.paymentSnapshot.deleteMany({ where: { paymentIntentId: intent.id } }).catch(() => {});
    await prisma.invoice.delete({ where: { id: invoice.id } }).catch(() => {});
    await prisma.paymentIntent.delete({ where: { id: intent.id } }).catch(() => {});
    await prisma.appointment.delete({ where: { id: app.id } }).catch(() => {});
    await prisma.user.delete({ where: { id: patientId } }).catch(() => {});
    await prisma.user.delete({ where: { id: dentistId } }).catch(() => {});
  }
});

test('financial hardening: cross-clinic and cross-dentist revenue isolation', async () => {
  const suffix = rand();
  const dentistA = await prisma.user.create({
    data: {
      name: 'Dentist A',
      email: `dentist_a_${suffix}@test.com`,
      password_hash: 'hash',
      roles: ['dentist']
    }
  });

  const dentistB = await prisma.user.create({
    data: {
      name: 'Dentist B',
      email: `dentist_b_${suffix}@test.com`,
      password_hash: 'hash',
      roles: ['dentist']
    }
  });

  const patient = await prisma.user.create({
    data: {
      name: 'Patient Test Isolation',
      email: `patient_iso_${suffix}@test.com`,
      password_hash: 'hash',
      roles: ['patient']
    }
  });

  let createdClinic = false;
  let clinicProfile = await prisma.clinicProfile.findFirst();
  if (!clinicProfile) {
    clinicProfile = await prisma.clinicProfile.create({
      data: {
        userId: dentistA.id,
        legalName: `Test Clinic ${suffix}`,
        facilityType: 'clinic',
        streetAddress: 'Jalan Test',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        postalCode: '12345',
        phone: '0812345678',
        email: `clinic_${suffix}@test.com`,
        operatingHours: {},
        ownerName: 'Owner Test',
        ownerPosition: 'Director',
        ownerEmail: `owner_${suffix}@test.com`,
        ownerWhatsapp: '0812345678',
        ownerNik: `NIK-${suffix}`,
        ktpFilePath: 'dummy',
        nibNumber: `NIB-${suffix}`,
        nibFilePath: 'dummy',
        npwpNumber: `NPWP-${suffix}`,
        npwpFilePath: 'dummy',
        operationalLicenseFilePath: 'dummy',
        status: 'approved'
      }
    });
    createdClinic = true;
  }

  // Dentist A has settled independent payment
  const appA = await prisma.appointment.create({
    data: {
      dentistId: dentistA.id,
      patientId: patient.id,
      ...appointmentTimes(),
      status: 'completed',
      ownerType: 'dentist'
    }
  });
  const intentA = await prisma.paymentIntent.create({
    data: {
      appointmentId: appA.id,
      patientId: patient.id,
      amount: 100000,
      status: 'settled',
      ownerType: 'dentist',
      ownerDentistId: dentistA.id
    }
  });

  // Dentist B has settled independent payment
  const appB = await prisma.appointment.create({
    data: {
      dentistId: dentistB.id,
      patientId: patient.id,
      ...appointmentTimes(),
      status: 'completed',
      ownerType: 'dentist'
    }
  });
  const intentB = await prisma.paymentIntent.create({
    data: {
      appointmentId: appB.id,
      patientId: patient.id,
      amount: 200000,
      status: 'settled',
      ownerType: 'dentist',
      ownerDentistId: dentistB.id
    }
  });

  // Clinic C payment (handled under clinicProfile.id)
  const appClinic = await prisma.appointment.create({
    data: {
      dentistId: dentistA.id,
      patientId: patient.id,
      ...appointmentTimes(),
      status: 'completed',
      ownerType: 'clinic',
      ownerClinicId: clinicProfile.id
    }
  });
  const intentClinic = await prisma.paymentIntent.create({
    data: {
      appointmentId: appClinic.id,
      patientId: patient.id,
      amount: 300000,
      status: 'settled',
      ownerType: 'clinic',
      ownerClinicId: clinicProfile.id
    }
  });

  try {
    // 1. Check isolation bounds for Dentist A
    const dentistAIntents = await prisma.paymentIntent.findMany({
      where: {
        ownerType: 'dentist',
        ownerDentistId: dentistA.id,
        status: 'settled'
      }
    });
    // Dentist A query must not leakage into Dentist B or Clinic
    assert.equal(dentistAIntents.length, 1);
    assert.equal(dentistAIntents[0].id, intentA.id);

    // 2. Check isolation bounds for Dentist B
    const dentistBIntents = await prisma.paymentIntent.findMany({
      where: {
        ownerType: 'dentist',
        ownerDentistId: dentistB.id,
        status: 'settled'
      }
    });
    assert.equal(dentistBIntents.length, 1);
    assert.equal(dentistBIntents[0].id, intentB.id);

    // 3. Check isolation bounds for Clinic C
    const clinicIntents = await prisma.paymentIntent.findMany({
      where: {
        ownerType: 'clinic',
        ownerClinicId: clinicProfile.id,
        status: 'settled'
      }
    });
    assert.equal(clinicIntents.length, 1);
    assert.equal(clinicIntents[0].id, intentClinic.id);
  } finally {
    // Clean up
    await prisma.paymentIntent.deleteMany({ where: { id: { in: [intentA.id, intentB.id, intentClinic.id] } } }).catch(() => {});
    await prisma.appointment.deleteMany({ where: { id: { in: [appA.id, appB.id, appClinic.id] } } }).catch(() => {});
    if (createdClinic && clinicProfile) {
      await prisma.clinicProfile.delete({ where: { id: clinicProfile.id } }).catch(() => {});
    }
    await prisma.user.deleteMany({ where: { id: { in: [dentistA.id, dentistB.id, patient.id] } } }).catch(() => {});
  }
});
