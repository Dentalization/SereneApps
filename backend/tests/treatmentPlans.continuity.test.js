import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import {
  createTreatmentPlan,
  sendTreatmentPlan,
  respondToTreatmentPlan
} from '../src/services/treatmentPlans.js';

const prisma = new PrismaClient();

const rand = () => Math.floor(Math.random() * 10000000).toString();

async function cleanup({ planId, appointmentId, dentistId, patientId }) {
  if (planId) {
    await prisma.invoiceLineItem.deleteMany({
      where: { invoice: { treatmentPlanId: planId } }
    }).catch(() => {});
    await prisma.invoice.deleteMany({ where: { treatmentPlanId: planId } }).catch(() => {});
    await prisma.treatmentItem.deleteMany({ where: { treatmentPlanId: planId } }).catch(() => {});
    await prisma.treatmentPlan.deleteMany({ where: { id: planId } }).catch(() => {});
  }
  if (appointmentId) {
    await prisma.invoiceLineItem.deleteMany({
      where: { invoice: { appointmentId } }
    }).catch(() => {});
    await prisma.invoice.deleteMany({ where: { appointmentId } }).catch(() => {});
    await prisma.paymentIntent.deleteMany({ where: { appointmentId } }).catch(() => {});
    await prisma.appointment.deleteMany({ where: { id: appointmentId } }).catch(() => {});
  }
  if (patientId) await prisma.user.deleteMany({ where: { id: patientId } }).catch(() => {});
  if (dentistId) await prisma.user.deleteMany({ where: { id: dentistId } }).catch(() => {});
}

test('treatment plan continuity: send creates linked invoice and patient approval keeps billing linkage', async () => {
  const suffix = rand();
  let dentist;
  let patient;
  let appointment;
  let plan;

  try {
    dentist = await prisma.user.create({
      data: {
        name: 'Continuity Dentist',
        email: `continuity_dentist_${suffix}@test.com`,
        password_hash: 'hash',
        roles: ['dentist']
      }
    });

    patient = await prisma.user.create({
      data: {
        name: 'Continuity Patient',
        email: `continuity_patient_${suffix}@test.com`,
        password_hash: 'hash',
        roles: ['patient']
      }
    });

    appointment = await prisma.appointment.create({
      data: {
        dentistId: dentist.id,
        patientId: patient.id,
        startsAt: new Date(Date.now() + 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 90 * 60 * 1000),
        status: 'scheduled',
        ownerType: 'dentist'
      }
    });

    plan = await createTreatmentPlan({
      db: prisma,
      dentistId: dentist.id,
      patientId: patient.id,
      payload: {
        appointmentId: appointment.id,
        diagnosisSummary: 'Occlusal caries on molar 36 with plaque buildup.',
        clinicalNotes: 'Patient reports sensitivity to cold.',
        patientFriendlySummary: 'One filling and scaling are recommended.',
        priority: 'HIGH',
        currency: 'IDR',
        items: [
          {
            toothNumber: '36',
            procedureCode: 'REST-001',
            procedureName: 'Composite filling',
            category: 'Restoration',
            description: 'Restore molar 36 with composite resin.',
            clinicalReason: 'Caries detected on occlusal surface.',
            priority: 'HIGH',
            estimatedCost: 350000,
            estimatedDurationMinutes: 45,
            phase: 'Phase 1'
          },
          {
            areaLabel: 'full mouth',
            procedureName: 'Scaling',
            category: 'Scaling',
            description: 'Full-mouth scaling.',
            clinicalReason: 'Plaque and calculus buildup.',
            priority: 'MEDIUM',
            estimatedCost: 250000,
            estimatedDurationMinutes: 30,
            phase: 'Phase 1'
          }
        ]
      }
    });

    assert.equal(plan.status, 'DRAFT');
    assert.equal(plan.patientId, patient.id.toString());
    assert.equal(plan.dentistId, dentist.id.toString());
    assert.equal(plan.appointmentId, appointment.id.toString());
    assert.equal(plan.estimatedTotal, 600000);
    assert.equal(plan.items.length, 2);
    assert.equal(plan.items[0].procedureName, 'Composite filling');

    const sent = await sendTreatmentPlan({
      db: prisma,
      dentistId: dentist.id,
      treatmentPlanId: plan.id
    });

    assert.equal(sent.status, 'SENT');
    assert.ok(sent.sentAt);
    assert.equal(sent.invoice.treatmentPlanId, plan.id);
    assert.equal(sent.invoice.appointmentId, appointment.id.toString());
    assert.equal(sent.invoice.status, 'issued');
    assert.equal(sent.invoice.subtotal, 600000);
    assert.equal(sent.invoice.total, 600000);

    const invoiceItems = await prisma.invoiceLineItem.findMany({
      where: { invoiceId: BigInt(sent.invoice.id) },
      orderBy: { id: 'asc' }
    });
    assert.equal(invoiceItems.length, 2);
    assert.equal(invoiceItems[0].description, 'Composite filling');
    assert.equal(invoiceItems[0].unitPrice, 350000);

    const approved = await respondToTreatmentPlan({
      db: prisma,
      patientId: patient.id,
      treatmentPlanId: plan.id,
      decision: 'approve'
    });

    assert.equal(approved.status, 'APPROVED');
    assert.ok(approved.approvedAt);
    assert.equal(approved.invoice.status, 'approved');
    assert.ok(approved.invoice.approvedAt);
    assert.equal(approved.invoice.treatmentPlanId, plan.id);
  } finally {
    await cleanup({
      planId: plan?.id,
      appointmentId: appointment?.id,
      dentistId: dentist?.id,
      patientId: patient?.id
    });
  }
});
