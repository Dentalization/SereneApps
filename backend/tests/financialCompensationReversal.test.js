import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { applyPaymentStatus } from '../src/services/payments/status.js';
import { processRefund } from '../src/services/payments/refundService.js';
import { getAvailableBalance } from '../src/services/payments/payoutService.js';

const prisma = new PrismaClient();
const rand = () => Math.floor(Math.random() * 10000000).toString();
const appointmentTimes = (startsAt = new Date()) => ({
  startsAt,
  endsAt: new Date(startsAt.getTime() + 30 * 60 * 1000)
});

test('financial Compensation Reversal: full payout reversal audit', async () => {
  const suffix = rand();

  // Create Clinic Owner
  const owner = await prisma.user.create({
    data: {
      name: `Clinic Owner ${suffix}`,
      email: `owner_${suffix}@test.com`,
      password_hash: 'hash',
      roles: ['owner']
    }
  });

  const clinic = await prisma.clinicProfile.create({
    data: {
      userId: owner.id,
      legalName: `Clinic Reversal ${suffix}`,
      facilityType: 'clinic',
      streetAddress: 'Jl. Clinic 1',
      city: 'Jakarta',
      province: 'DKI Jakarta',
      postalCode: '12345',
      phone: '0812345678',
      email: `clinic_${suffix}@test.com`,
      operatingHours: {},
      ownerName: 'Owner Rev',
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

  // Create Clinic Dentist
  const dentist = await prisma.user.create({
    data: {
      name: `Dr. Commission ${suffix}`,
      email: `comm_${suffix}@test.com`,
      password_hash: 'hash',
      roles: ['dentist']
    }
  });

  const dentistProfile = await prisma.dentistProfile.create({
    data: {
      userId: dentist.id,
      title: 'drg.',
      licenseNumber: `LIC-REV-${suffix}`,
      licenseIssuingBody: 'Kemenkes',
      licenseExpiryDate: new Date(),
      registrationNumber: `REG-REV-${suffix}`,
      primarySpecialization: 'General',
      educationQualification: 'DDS',
      yearsOfExperience: 5,
      clinicName: `Clinic Reversal ${suffix}`,
      clinicAddress: 'Jl. Clinic 1',
      clinicWorkingHours: '{}',
      dentist_type: 'clinic',
      clinic_id: clinic.id
    }
  });

  const patient = await prisma.user.create({
    data: {
      name: `Patient Rev ${suffix}`,
      email: `patient_rev_${suffix}@test.com`,
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
      ownerType: 'clinic',
      ownerClinicId: clinic.id
    }
  });

  const intent = await prisma.paymentIntent.create({
    data: {
      appointmentId: app.id,
      patientId: patient.id,
      amount: 300000, // 300,000 IDR Gross
      status: 'pending',
      ownerType: 'clinic',
      ownerClinicId: clinic.id,
      providerOrderId: `ORD-REV-${suffix}`,
      provider: 'midtrans'
    }
  });

  try {
    // 1. Settle clinic transaction
    await applyPaymentStatus({
      paymentIntentId: intent.id.toString(),
      newStatus: 'settled',
      providerPaymentId: `pay-rev-${suffix}`
    });

    // Simulate maturation release for dentist compensation
    await prisma.availableBalance.updateMany({
      where: { ownerDentistId: dentist.id },
      data: { availableAmount: 90000 }
    });

    // Verify accrual: 30% of 300,000 = 90,000
    const dentistComp = await getAvailableBalance({
      ownerType: 'dentist',
      ownerDentistId: dentist.id
    });
    assert.equal(dentistComp, 90000, 'Compensation should accrue 90,000');

    // 2. Perform Full Refund of 300,000
    await processRefund({
      paymentIntentId: intent.id.toString(),
      refundAmount: 300000,
      refundReason: 'Full refund test',
      actorId: owner.id.toString(),
      actorRoles: ['owner']
    });

    // 3. Compensation balance must decrease back to 0
    const dentistCompAfter = await getAvailableBalance({
      ownerType: 'dentist',
      ownerDentistId: dentist.id
    });
    assert.equal(dentistCompAfter, 0, 'Dentist compensation balance must be reversed to 0');

    // Reversal entry must exist in compensation table
    const revEntry = await prisma.dentistCompensationEntry.findFirst({
      where: { dentistId: dentist.id, entryType: 'REVERSAL' }
    });
    assert.ok(revEntry);
    assert.equal(revEntry.amount, 90000);

  } finally {
    // Cleanup
    await prisma.refund.deleteMany({ where: { paymentIntentId: intent.id } }).catch(() => {});
    await prisma.dentistCompensationEntry.deleteMany({ where: { dentistId: dentist.id } }).catch(() => {});
    await prisma.paymentSettlement.deleteMany({ where: { paymentIntentId: intent.id } }).catch(() => {});
    await prisma.financialLedgerEntry.deleteMany({ where: { paymentIntentId: intent.id } }).catch(() => {});
    await prisma.invoiceLineItem.deleteMany({ where: { invoice: { paymentIntentId: intent.id } } }).catch(() => {});
    await prisma.invoice.deleteMany({ where: { paymentIntentId: intent.id } }).catch(() => {});
    await prisma.availableBalance.deleteMany({ where: { ownerClinicId: clinic.id } }).catch(() => {});
    await prisma.availableBalance.deleteMany({ where: { ownerDentistId: dentist.id } }).catch(() => {});
    await prisma.paymentIntent.deleteMany({ where: { id: intent.id } }).catch(() => {});
    await prisma.appointment.deleteMany({ where: { id: app.id } }).catch(() => {});
    await prisma.dentistProfile.deleteMany({ where: { id: dentistProfile.id } }).catch(() => {});
    await prisma.clinicProfile.deleteMany({ where: { id: clinic.id } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: [owner.id, dentist.id, patient.id] } } }).catch(() => {});
  }
});
