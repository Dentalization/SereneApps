import { resolvePaymentOwner } from './ownership.js';

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
  if (existing) return existing;

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
  const reference = `INV-${String(paymentIntent.id).padStart(6, '0')}`;
  const issuedAt = new Date();

  const invoice = await tx.invoice.create({
    data: {
      appointmentId: appointment?.id ?? null,
      paymentIntentId: paymentIntent.id,
      patientId: patient?.id ?? paymentIntent.patientId,
      ownerType: owner.ownerType,
      ownerClinicId: owner.ownerClinicId,
      ownerDentistId: owner.ownerDentistId,
      reference,
      status: 'issued',
      subtotal,
      tax: 0,
      discount: 0,
      total,
      currency: paymentIntent.currency || 'IDR',
      issuedAt,
      metadata: {
        appointmentId: appointment?.id?.toString?.() ?? null
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
