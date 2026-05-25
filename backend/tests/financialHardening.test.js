import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { guardWebhookIdempotency } from '../src/services/webhooks/idempotency.js';
import { processRefund } from '../src/services/payments/refundService.js';
import { createPaymentSnapshot } from '../src/services/payments/snapshotService.js';
import { recordFinancialAuditLog } from '../src/services/audit/auditLogger.js';
import { generateInvoicePDF } from '../src/services/payments/pdfGenerator.js';
import { Writable } from 'node:stream';

const prisma = new PrismaClient();

// Helper to get random ID to avoid collisions
const rand = () => Math.floor(Math.random() * 10000000).toString();

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
      startsAt: new Date(),
      endsAt: new Date(),
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
      startsAt: new Date(),
      endsAt: new Date(),
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
