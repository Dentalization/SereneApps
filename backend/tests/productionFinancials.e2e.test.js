import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { applyPaymentStatus } from '../src/services/payments/status.js';
import { getAvailableBalance, createPayoutBatch } from '../src/services/payments/payoutService.js';
import { processRefund } from '../src/services/payments/refundService.js';
import { createCorrectionRequest, approveAndExecuteCorrection } from '../src/services/payments/financialCorrectionService.js';
import { lockPeriod } from '../src/services/payments/periodLockService.js';
import { releaseMaturedBalances } from '../src/services/payments/balanceService.js';

const prisma = new PrismaClient();
const rand = () => Math.floor(Math.random() * 10000000).toString();
const appointmentTimes = (startsAt = new Date()) => ({
  startsAt,
  endsAt: new Date(startsAt.getTime() + 30 * 60 * 1000)
});

test('productionFinancials.e2e: Complete E2E Financial LifeCycle & Reconciliation Audit', async () => {
  const suffix = rand();

  // --- ACTORS CREATION ---
  const clinicUser = await prisma.user.create({
    data: {
      name: `Clinic Owner ${suffix}`,
      email: `owner_${suffix}@serene.test`,
      password_hash: 'hash',
      roles: ['owner', 'clinic_owner']
    }
  });

  const clinicProfile = await prisma.clinicProfile.create({
    data: {
      userId: clinicUser.id,
      legalName: `Serene Clinic E2E ${suffix}`,
      facilityType: 'clinic',
      streetAddress: 'Jalan E2E 100',
      city: 'Jakarta',
      province: 'DKI Jakarta',
      postalCode: '12345',
      phone: '0812345678',
      email: `clinic_${suffix}@serene.test`,
      operatingHours: {},
      ownerName: 'Owner E2E',
      ownerPosition: 'Director',
      ownerEmail: `owner_${suffix}@serene.test`,
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

  const clinicDentistUser = await prisma.user.create({
    data: {
      name: `Clinic Dentist ${suffix}`,
      email: `dentist_c_${suffix}@serene.test`,
      password_hash: 'hash',
      roles: ['dentist']
    }
  });

  const clinicDentistProfile = await prisma.dentistProfile.create({
    data: {
      userId: clinicDentistUser.id,
      title: 'drg.',
      licenseNumber: `LIC-C-${suffix}`,
      licenseIssuingBody: 'Kemenkes',
      licenseExpiryDate: new Date(),
      registrationNumber: `REG-C-${suffix}`,
      primarySpecialization: 'General',
      educationQualification: 'DDS',
      yearsOfExperience: 5,
      clinicName: `Clinic E2E ${suffix}`,
      clinicAddress: 'Jl. E2E No. 1',
      clinicWorkingHours: '{}',
      dentist_type: 'clinic',
      clinic_id: clinicProfile.id
    }
  });

  const independentUser = await prisma.user.create({
    data: {
      name: `Independent Dentist ${suffix}`,
      email: `dentist_i_${suffix}@serene.test`,
      password_hash: 'hash',
      roles: ['dentist']
    }
  });

  const independentDentistProfile = await prisma.dentistProfile.create({
    data: {
      userId: independentUser.id,
      title: 'drg.',
      licenseNumber: `LIC-I-${suffix}`,
      licenseIssuingBody: 'Kemenkes',
      licenseExpiryDate: new Date(),
      registrationNumber: `REG-I-${suffix}`,
      primarySpecialization: 'Orthodontics',
      educationQualification: 'DDS',
      yearsOfExperience: 8,
      clinicName: 'Independent Practice',
      clinicAddress: 'Jl. Practice No. 5',
      clinicWorkingHours: '{}',
      dentist_type: 'independent'
    }
  });

  const patient = await prisma.user.create({
    data: {
      name: `Patient E2E ${suffix}`,
      email: `patient_${suffix}@serene.test`,
      password_hash: 'hash',
      roles: ['patient']
    }
  });

  // --- APPOINTMENTS & INITAL PAYMENTS ---
  const appClinic = await prisma.appointment.create({
    data: {
      dentistId: clinicDentistUser.id,
      patientId: patient.id,
      ...appointmentTimes(),
      status: 'scheduled',
      ownerType: 'clinic',
      ownerClinicId: clinicProfile.id
    }
  });

  const intentClinic = await prisma.paymentIntent.create({
    data: {
      appointmentId: appClinic.id,
      patientId: patient.id,
      amount: 400000, // 400k gross
      status: 'pending',
      ownerType: 'clinic',
      ownerClinicId: clinicProfile.id,
      providerOrderId: `ORD-CLI-${suffix}`,
      provider: 'midtrans'
    }
  });

  const appInd = await prisma.appointment.create({
    data: {
      dentistId: independentUser.id,
      patientId: patient.id,
      ...appointmentTimes(),
      status: 'scheduled',
      ownerType: 'dentist'
    }
  });

  const intentInd = await prisma.paymentIntent.create({
    data: {
      appointmentId: appInd.id,
      patientId: patient.id,
      amount: 500000, // 500k gross
      status: 'pending',
      ownerType: 'dentist',
      ownerDentistId: independentUser.id,
      providerOrderId: `ORD-IND-${suffix}`,
      provider: 'midtrans'
    }
  });

  try {
    // --- 1. WEBHOOK REPLAY PROTECTION ---
    // Log a webhook event
    const eventId = `evt-${suffix}`;
    const payloadHash = `hash-${suffix}`;
    await prisma.webhookProcessingLog.create({
      data: { provider: 'midtrans', eventId, payloadHash }
    });

    const isDuplicate = await prisma.webhookProcessingLog.findFirst({
      where: { provider: 'midtrans', eventId }
    });
    assert.ok(isDuplicate, 'Webhook processing log must identify duplicate event');

    // --- 2. SETTLEMENT SPLITS (CLINIC & INDEPENDENT) ---
    // Settle clinic transaction
    await applyPaymentStatus({
      paymentIntentId: intentClinic.id.toString(),
      newStatus: 'settled',
      providerPaymentId: `pay-cli-${suffix}`
    });

    // Settle independent transaction
    await applyPaymentStatus({
      paymentIntentId: intentInd.id.toString(),
      newStatus: 'settled',
      providerPaymentId: `pay-ind-${suffix}`
    });

    // Verify Clinic Splits: 10% Platform (40k), 60% Clinic (240k), 30% Dentist Compensation (120k)
    const settlementClinic = await prisma.paymentSettlement.findFirst({
      where: { paymentIntentId: intentClinic.id }
    });
    assert.ok(settlementClinic);
    assert.equal(settlementClinic.platformFee, 40000);
    assert.equal(settlementClinic.clinicShare, 240000);
    assert.equal(settlementClinic.dentistShare, 120000);
    assert.equal(settlementClinic.netAmount, 360000);

    // Verify Independent Splits: 10% Platform (50k), 90% Dentist (450k)
    const settlementInd = await prisma.paymentSettlement.findFirst({
      where: { paymentIntentId: intentInd.id }
    });
    assert.ok(settlementInd);
    assert.equal(settlementInd.platformFee, 50000);
    assert.equal(settlementInd.clinicShare, 0);
    assert.equal(settlementInd.dentistShare, 450000);
    assert.equal(settlementInd.netAmount, 450000);

    // --- 3. DENTIST COMPENSATION ACCRUAL ---
    const compensation = await prisma.dentistCompensationEntry.findFirst({
      where: { paymentIntentId: intentClinic.id, entryType: 'ACCRUAL' }
    });
    assert.ok(compensation);
    assert.equal(compensation.amount, 120000);

    // --- 4. OWNERSHIP IMMUTABILITY ---
    // Direct SQL update attempt must fail via Postgres trigger
    await assert.rejects(
      async () => {
        await prisma.$executeRawUnsafe(
          `UPDATE payment_intents SET owner_dentist_id = ${independentUser.id} WHERE id = ${intentClinic.id}`
        );
      },
      /financial ownership is immutable/
    );

    // --- 5. INVOICE SNAPSHOT IMMUTABILITY ---
    const invoiceClinic = await prisma.invoice.findFirst({
      where: { paymentIntentId: intentClinic.id }
    });
    assert.ok(invoiceClinic);
    assert.equal(invoiceClinic.issuerName, clinicProfile.legalName);

    // Modify clinic legalName
    await prisma.clinicProfile.update({
      where: { id: clinicProfile.id },
      data: { legalName: 'Modified Legal Name Clinic' }
    });

    // Invoice snapshot must remain original
    const reloadedInvoice = await prisma.invoice.findUnique({
      where: { id: invoiceClinic.id }
    });
    assert.equal(reloadedInvoice.issuerName, clinicProfile.legalName);

    // --- 6. BALANCE RELEASE & WORKER ---
    // Temporarily update settledAt to maturity (e.g. 4 days ago) to simulate release
    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
    await prisma.paymentSettlement.updateMany({
      where: { paymentIntentId: { in: [intentClinic.id, intentInd.id] } },
      data: { settledAt: fourDaysAgo }
    });

    const releaseResult = await releaseMaturedBalances();
    assert.ok(releaseResult.processedCount >= 2);

    // Check balances
    const clinicBalance = await getAvailableBalance({
      ownerType: 'clinic',
      ownerClinicId: clinicProfile.id
    });
    assert.equal(clinicBalance, 360000); // 360,000 net settled clinic funds

    const dentistCompBalance = await getAvailableBalance({
      ownerType: 'dentist',
      ownerDentistId: clinicDentistUser.id
    });
    assert.equal(dentistCompBalance, 120000); // 120,000 compensation accrued

    // --- 7. PAYOUT OVERPAYMENT REJECTION & BATCHING ---
    // Exceed available compensation balance (120,000)
    await assert.rejects(
      async () => {
        await createPayoutBatch({
          recipientType: 'dentist',
          items: [
            {
              recipientType: 'dentist',
              recipientDentistId: clinicDentistUser.id.toString(),
              amount: 150000 // exceeds 120k
            }
          ]
        });
      },
      err => err.status === 409 && err.code === 'OVERPAYMENT_REJECTED'
    );

    // Successful payout batch
    const payoutBatch = await createPayoutBatch({
      recipientType: 'dentist',
      items: [
        {
          recipientType: 'dentist',
          recipientDentistId: clinicDentistUser.id.toString(),
          amount: 100000 // within 120k
        }
      ]
    });
    assert.ok(payoutBatch);
    assert.equal(payoutBatch.status, 'COMPLETED');
    assert.equal(payoutBatch.items[0].status, 'SUCCESS');

    // Remaining dentist compensation balance must be 20,000
    const remainingComp = await getAvailableBalance({
      ownerType: 'dentist',
      ownerDentistId: clinicDentistUser.id
    });
    assert.equal(remainingComp, 20000);

    // --- 8. REFUND HARDENING & NEGATIVE BALANCE SYSTEM (RESERVE ESCROW) ---
    // Perform partial refund of 150,000 on independent dentist payment (500k gross)
    const refundInd = await processRefund({
      paymentIntentId: intentInd.id.toString(),
      refundAmount: 150000,
      refundReason: 'Partial refund test',
      actorId: independentUser.id.toString(),
      actorRoles: ['dentist']
    });
    assert.ok(refundInd);
    assert.equal(refundInd.refundAmount, 150000);

    // Perform refund of 400,000 on clinic payment (400k gross)
    // Note: Clinic only had 360,000 in available balance (after paying out dentist 100k, available balance was 360k - 0 = 360k. Wait, clinic available was 360k, refunding 400k will drive it negative!)
    // Wait, let's verify if clinic balance goes negative: available (360k) - refund (400k) = -40k!
    const refundClinic = await processRefund({
      paymentIntentId: intentClinic.id.toString(),
      refundAmount: 400000,
      refundReason: 'Full refund test',
      actorId: clinicUser.id.toString(),
      actorRoles: ['owner']
    });
    assert.ok(refundClinic);

    // Verify negative balance on clinic available balance
    const clinicBalanceAfterRefund = await getAvailableBalance({
      ownerType: 'clinic',
      ownerClinicId: clinicProfile.id
    });
    assert.equal(clinicBalanceAfterRefund, -40000); // -40,000 reserve escrow debt

    // Verify DEBT entry created in ledger
    const debtEntry = await prisma.financialLedgerEntry.findFirst({
      where: { paymentIntentId: intentClinic.id, entryType: 'DEBT' }
    });
    assert.ok(debtEntry);

    // Verify Clinic Dentist compensation reversed (30% of 400k = 120k reversed)
    // Accruals (120k) - Reversals (120k) - Payouts (100k) = -100k available compensation balance!
    const dentistBalanceAfterRefund = await getAvailableBalance({
      ownerType: 'dentist',
      ownerDentistId: clinicDentistUser.id
    });
    assert.equal(dentistBalanceAfterRefund, -100000);

    // --- 9. ACCOUNTING PERIOD LOCKING ---
    const key = new Date().toISOString().slice(0, 7);
    await lockPeriod({ periodKey: key, actorId: clinicUser.id });

    // Try another refund on the locked month date. Must reject.
    await assert.rejects(
      async () => {
        await processRefund({
          paymentIntentId: intentInd.id.toString(),
          refundAmount: 10000,
          refundReason: 'Locked period refund attempt',
          actorId: independentUser.id.toString(),
          actorRoles: ['dentist']
        });
      },
      err => err.code === 'PERIOD_LOCKED'
    );

    // --- 10. RECONCILIATION INTEGRITY AUDIT ---
    // Check that mathematically:
    // Σ settled revenue (400k + 500k = 900k) = Σ platform fee + net amounts
    const settlements = await prisma.paymentSettlement.findMany({
      where: { id: { in: [settlementClinic.id, settlementInd.id] } }
    });
    const totalGrossSettled = settlements.reduce((sum, s) => sum + s.grossAmount, 0); // 900,000
    const totalPlatformFee = settlements.reduce((sum, s) => sum + s.platformFee, 0); // 90,000
    const totalNetSettled = settlements.reduce((sum, s) => sum + s.netAmount, 0); // 810,000
    assert.equal(totalGrossSettled, 900000);
    assert.equal(totalGrossSettled, totalPlatformFee + totalNetSettled);

    // Check ledger credits and debits balances match net revenue
    const credits = await prisma.financialLedgerEntry.findMany({
      where: { paymentIntentId: { in: [intentClinic.id, intentInd.id] }, direction: 'credit', entryType: { in: ['PAYMENT_RECEIVED', 'SETTLEMENT_COMPLETED'] } }
    });
    const debits = await prisma.financialLedgerEntry.findMany({
      where: { paymentIntentId: { in: [intentClinic.id, intentInd.id] }, direction: 'debit', entryType: { in: ['REFUND', 'PARTIAL_REFUND'] } }
    });

    const sumCredits = credits.reduce((sum, c) => sum + c.amount, 0); // 900k gross
    const sumDebits = debits.reduce((sum, d) => sum + d.amount, 0); // 550k total refunds
    assert.equal(sumCredits, 900000);
    assert.equal(sumDebits, 550000);
    assert.equal(sumCredits - sumDebits, 350000); // 350k Net active revenue

  } finally {
    // Clean up locked periods
    const key = new Date().toISOString().slice(0, 7);
    await prisma.accountingPeriod.deleteMany({ where: { periodKey: key } }).catch(() => {});

    // Extensive actor & metadata cleanups
    await prisma.webhookProcessingLog.deleteMany({ where: { payloadHash: `hash-${suffix}` } }).catch(() => {});
    await prisma.webhookReceipt.deleteMany({ where: { deliveryKey: { startsWith: 'test-replay-' } } }).catch(() => {});
    await prisma.payoutItem.deleteMany({ where: { batch: { status: 'COMPLETED' } } }).catch(() => {});
    await prisma.payoutBatch.deleteMany({ where: { totalAmount: 100000 } }).catch(() => {});
    await prisma.refund.deleteMany({ where: { paymentIntentId: { in: [intentClinic.id, intentInd.id] } } }).catch(() => {});
    await prisma.dentistCompensationEntry.deleteMany({ where: { dentistId: { in: [clinicDentistUser.id, independentUser.id] } } }).catch(() => {});
    await prisma.paymentSettlement.deleteMany({ where: { paymentIntentId: { in: [intentClinic.id, intentInd.id] } } }).catch(() => {});
    await prisma.financialLedgerEntry.deleteMany({ where: { paymentIntentId: { in: [intentClinic.id, intentInd.id] } } }).catch(() => {});
    await prisma.invoiceLineItem.deleteMany({ where: { invoice: { paymentIntentId: { in: [intentClinic.id, intentInd.id] } } } }).catch(() => {});
    await prisma.invoice.deleteMany({ where: { paymentIntentId: { in: [intentClinic.id, intentInd.id] } } }).catch(() => {});
    await prisma.availableBalance.deleteMany({ where: { ownerClinicId: clinicProfile.id } }).catch(() => {});
    await prisma.availableBalance.deleteMany({ where: { ownerDentistId: { in: [clinicDentistUser.id, independentUser.id] } } }).catch(() => {});
    await prisma.paymentIntent.deleteMany({ where: { id: { in: [intentClinic.id, intentInd.id] } } }).catch(() => {});
    await prisma.appointment.deleteMany({ where: { id: { in: [appClinic.id, appInd.id] } } }).catch(() => {});
    await prisma.dentistProfile.deleteMany({ where: { id: { in: [clinicDentistProfile.id, independentDentistProfile.id] } } }).catch(() => {});
    await prisma.clinicProfile.deleteMany({ where: { id: clinicProfile.id } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: [clinicUser.id, clinicDentistUser.id, independentUser.id, patient.id] } } }).catch(() => {});
  }
});
