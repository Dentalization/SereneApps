import { resolvePaymentOwner } from './ownership.js';

function calculateFinancialSplit(amount, ownerType = 'dentist') {
  const grossAmount = Number.isFinite(Number(amount)) ? Math.max(0, Math.round(Number(amount))) : 0;
  const platformFee = Math.round(grossAmount * 0.1);
  if (ownerType === 'clinic') {
    const dentistShare = Math.round(grossAmount * 0.3);
    const clinicShare = grossAmount - platformFee - dentistShare;
    return { platformFee, dentistShare, clinicShare, grandTotal: grossAmount };
  }
  return {
    platformFee,
    dentistShare: grossAmount - platformFee,
    clinicShare: 0,
    grandTotal: grossAmount
  };
}

function getTreatmentPlanIdFromIntent(paymentIntent = {}) {
  const metadata = paymentIntent.metadata && typeof paymentIntent.metadata === 'object' && !Array.isArray(paymentIntent.metadata)
    ? paymentIntent.metadata
    : {};
  const raw = metadata.treatmentPlanId || metadata.treatment_plan_id;
  if (!raw) return null;
  try {
    return BigInt(raw);
  } catch (_error) {
    return null;
  }
}

function normalizeLineItems(items = []) {
  return items
    .map((item) => ({
      description: item.name || item.description || 'Consultation',
      quantity: Number.isFinite(item.quantity) ? item.quantity : parseInt(item.quantity || 1, 10),
      unitPrice: Number.isFinite(item.price) ? item.price : parseInt(item.price || 0, 10)
    }))
    .map((item) => ({
      ...item,
      total: (item.unitPrice || 0) * (item.quantity || 0)
    }));
}

export async function ensureInvoiceForPaymentIntent({
  tx,
  paymentIntent,
  appointment,
  patient,
  items = []
}) {
  if (!tx || !paymentIntent) return null;

  const existing = await tx.invoice.findFirst({
    where: { paymentIntentId: paymentIntent.id }
  });
  const treatmentPlanId = getTreatmentPlanIdFromIntent(paymentIntent);
  if (existing) {
    if (treatmentPlanId && !existing.treatmentPlanId) {
      return tx.invoice.update({
        where: { id: existing.id },
        data: {
          treatmentPlanId,
          metadata: {
            ...(existing.metadata || {}),
            treatmentPlanId: treatmentPlanId.toString(),
            source: existing.metadata?.source || 'payment_intent'
          }
        }
      });
    }
    return existing;
  }

  const lineItems = items && items.length > 0
    ? normalizeLineItems(items)
    : [
        {
          description: appointment?.reason || 'Dental Consultation',
          quantity: 1,
          unitPrice: paymentIntent.amount,
          total: paymentIntent.amount
        }
      ];
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const total = subtotal;

  const owner = resolvePaymentOwner(appointment || {});
  const split = calculateFinancialSplit(total, owner.ownerType);
  const reference = `INV-${String(paymentIntent.id).padStart(6, '0')}`;
  const issuedAt = new Date();

  let issuerType = owner.ownerType;
  let issuerName = 'Serene Clinic';
  let issuerEmail = 'billing@serene.test';
  let issuerPhone = '0812345678';
  let issuerAddress = 'Jakarta, Indonesia';
  let issuerTaxId = 'TAX-000';
  let issuerSnapshot = {};

  if (owner.ownerType === 'clinic' && owner.ownerClinicId) {
    const clinic = await tx.clinicProfile.findUnique({
      where: { id: owner.ownerClinicId }
    });
    if (clinic) {
      issuerName = clinic.legalName || clinic.name || issuerName;
      issuerEmail = clinic.email || issuerEmail;
      issuerPhone = clinic.phone || issuerPhone;
      issuerAddress = clinic.streetAddress || issuerAddress;
      issuerTaxId = clinic.npwpNumber || issuerTaxId;
      issuerSnapshot = {
        id: clinic.id.toString(),
        legalName: clinic.legalName,
        brandName: clinic.brandName,
        facilityType: clinic.facilityType,
        streetAddress: clinic.streetAddress,
        city: clinic.city,
        province: clinic.province,
        postalCode: clinic.postalCode,
        phone: clinic.phone,
        email: clinic.email,
        npwpNumber: clinic.npwpNumber
      };
    }
  } else if (owner.ownerDentistId) {
    const dentist = await tx.user.findUnique({
      where: { id: owner.ownerDentistId },
      include: { dentistProfile: true }
    });
    if (dentist) {
      const profile = dentist.dentistProfile?.[0];
      issuerName = dentist.name || issuerName;
      issuerEmail = dentist.email || issuerEmail;
      issuerPhone = dentist.phone_number || issuerPhone;
      issuerAddress = profile?.clinicAddress || issuerAddress;
      issuerTaxId = profile?.registrationNumber || issuerTaxId;
      issuerSnapshot = {
        userId: dentist.id.toString(),
        name: dentist.name,
        email: dentist.email,
        phone: dentist.phone_number,
        licenseNumber: profile?.licenseNumber,
        registrationNumber: profile?.registrationNumber,
        clinicName: profile?.clinicName,
        clinicAddress: profile?.clinicAddress
      };
    }
  }

  const invoice = await tx.invoice.create({
    data: {
      appointmentId: appointment?.id ?? null,
      paymentIntentId: paymentIntent.id,
      treatmentPlanId,
      patientId: patient?.id ?? paymentIntent.patientId,
      clinicBranchId: appointment?.clinicBranchId ?? paymentIntent.clinicBranchId ?? null,
      ownerType: owner.ownerType,
      ownerClinicId: owner.ownerClinicId,
      ownerDentistId: owner.ownerDentistId,
      reference,
      status: 'issued',
      subtotal,
      tax: 0,
      discount: 0,
      total,
      platformFee: split.platformFee,
      clinicShare: split.clinicShare,
      dentistShare: split.dentistShare,
      grandTotal: split.grandTotal,
      currency: paymentIntent.currency || 'IDR',
      issuedAt,
      issuerType,
      issuerName,
      issuerEmail,
      issuerPhone,
      issuerAddress,
      issuerTaxId,
      issuerSnapshot,
      metadata: {
        appointmentId: appointment?.id?.toString?.() ?? null,
        treatmentPlanId: treatmentPlanId?.toString?.() ?? null,
        source: treatmentPlanId ? 'treatment_plan_payment' : 'payment_intent'
      }
    }
  });

  if (lineItems.length) {
    await tx.invoiceLineItem.createMany({
      data: lineItems.map((item) => ({
        invoiceId: invoice.id,
        description: item.description,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        total: item.total || 0,
        metadata: {}
      }))
    });
  }

  return invoice;
}

export async function recordFinancialEntry({
  tx,
  paymentIntent,
  appointment,
  entryType,
  status,
  direction,
  amount,
  source = 'midtrans',
  metadata = {}
}) {
  if (!tx || !paymentIntent || !entryType || !status || !direction) return null;

  const owner = resolvePaymentOwner(appointment || {});
  const entryAmount = Number.isFinite(amount) ? amount : parseInt(amount || paymentIntent.amount || 0, 10);

  const existing = await tx.financialLedgerEntry.findFirst({
    where: {
      paymentIntentId: paymentIntent.id,
      entryType,
      status,
      direction,
      amount: entryAmount
    }
  });

  if (existing) return existing;

  return tx.financialLedgerEntry.create({
    data: {
      paymentIntentId: paymentIntent.id,
      appointmentId: appointment?.id ?? null,
      ownerType: owner.ownerType,
      ownerClinicId: owner.ownerClinicId,
      ownerDentistId: owner.ownerDentistId,
      entryType,
      status,
      direction,
      amount: entryAmount,
      currency: paymentIntent.currency || 'IDR',
      source,
      metadata
    }
  });
}
