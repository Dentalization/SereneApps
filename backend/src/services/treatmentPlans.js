import { PrismaClient } from '@prisma/client';
import { resolvePaymentOwner, normalizeFinancialOwnerType } from './payments/ownership.js';

const prisma = new PrismaClient();

export const TREATMENT_PLAN_STATUSES = Object.freeze({
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  PATIENT_REVIEW: 'PATIENT_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
});

export const TREATMENT_ITEM_STATUSES = Object.freeze({
  PLANNED: 'PLANNED',
  APPROVED: 'APPROVED',
  SCHEDULED: 'SCHEDULED',
  DONE: 'DONE',
  CANCELLED: 'CANCELLED'
});

const VALID_PLAN_STATUSES = new Set(Object.values(TREATMENT_PLAN_STATUSES));
const VALID_ITEM_STATUSES = new Set(Object.values(TREATMENT_ITEM_STATUSES));

function getDb(db) {
  return db || prisma;
}

function toBigInt(value, code = 'INVALID_ID') {
  if (typeof value === 'bigint') return value;
  try {
    return BigInt(value);
  } catch (error) {
    const err = new Error(code);
    err.status = 400;
    throw err;
  }
}

function toOptionalBigInt(value, code = 'INVALID_ID') {
  if (value === undefined || value === null || value === '') return null;
  return toBigInt(value, code);
}

function toOptionalDate(value, code = 'INVALID_DATE') {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    const err = new Error(code);
    err.status = 400;
    throw err;
  }
  return date;
}

function toMoney(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function normalizePriority(value, fallback = 'MEDIUM') {
  const normalized = String(value || fallback).trim().toUpperCase().replace(/[\s-]+/g, '_');
  return ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(normalized) ? normalized : fallback;
}

export function normalizePlanStatus(value, fallback = TREATMENT_PLAN_STATUSES.DRAFT) {
  const raw = String(value || '').trim();
  const normalized = raw.toUpperCase().replace(/[\s-]+/g, '_');
  const legacyMap = {
    PENDING: TREATMENT_PLAN_STATUSES.DRAFT,
    ACTIVE: TREATMENT_PLAN_STATUSES.IN_PROGRESS,
    IN_PROGRESS: TREATMENT_PLAN_STATUSES.IN_PROGRESS,
    COMPLETED: TREATMENT_PLAN_STATUSES.COMPLETED,
    CANCELLED: TREATMENT_PLAN_STATUSES.CANCELLED,
    CANCELED: TREATMENT_PLAN_STATUSES.CANCELLED
  };
  const candidate = legacyMap[normalized] || normalized;
  return VALID_PLAN_STATUSES.has(candidate) ? candidate : fallback;
}

export function normalizeItemStatus(value, fallback = TREATMENT_ITEM_STATUSES.PLANNED) {
  const raw = String(value || '').trim();
  const normalized = raw.toUpperCase().replace(/[\s-]+/g, '_');
  const legacyMap = {
    PENDING: TREATMENT_ITEM_STATUSES.PLANNED,
    PLANNED: TREATMENT_ITEM_STATUSES.PLANNED,
    IN_PROGRESS: TREATMENT_ITEM_STATUSES.SCHEDULED,
    COMPLETED: TREATMENT_ITEM_STATUSES.DONE,
    DONE: TREATMENT_ITEM_STATUSES.DONE,
    CANCELLED: TREATMENT_ITEM_STATUSES.CANCELLED,
    CANCELED: TREATMENT_ITEM_STATUSES.CANCELLED
  };
  const candidate = legacyMap[normalized] || normalized;
  return VALID_ITEM_STATUSES.has(candidate) ? candidate : fallback;
}

function asId(value) {
  return value === undefined || value === null ? null : value.toString();
}

export function calculateFinancialSplit(amount, ownerType = 'dentist') {
  const grossAmount = toMoney(amount);
  const normalizedOwnerType = normalizeFinancialOwnerType(ownerType) || 'dentist';
  const platformFee = Math.round(grossAmount * 0.1);
  if (normalizedOwnerType === 'clinic') {
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

function normalizeTreatmentItems(inputItems = []) {
  return inputItems.map((item, index) => {
    const procedureName = (item.procedureName || item.name || item.description || `Treatment ${index + 1}`).trim();
    const estimatedCost = toMoney(item.estimatedCost ?? item.cost ?? item.price);
    return {
      name: procedureName,
      toothNumber: item.toothNumber || item.tooth_number || null,
      areaLabel: item.areaLabel || item.area_label || null,
      procedureCode: item.procedureCode || item.procedure_code || null,
      procedureName,
      category: item.category || 'Other',
      description: item.description || '',
      clinicalReason: item.clinicalReason || item.clinical_reason || '',
      priority: normalizePriority(item.priority, 'MEDIUM'),
      cost: estimatedCost,
      estimatedCost,
      actualCost: toMoney(item.actualCost ?? item.actual_cost),
      estimatedDurationMinutes: item.estimatedDurationMinutes
        ? Number(item.estimatedDurationMinutes)
        : item.estimated_duration_minutes
          ? Number(item.estimated_duration_minutes)
          : null,
      phase: item.phase || null,
      status: normalizeItemStatus(item.status),
      scheduledDate: toOptionalDate(item.scheduledDate ?? item.scheduled_date, 'INVALID_SCHEDULED_DATE'),
      completedDate: toOptionalDate(item.completedDate ?? item.completed_date, 'INVALID_COMPLETED_DATE'),
      notes: item.notes || null,
      resultNotes: item.resultNotes || item.result_notes || null,
      imageUrl: item.imageUrl || item.image_url || null,
      sortOrder: Number.isFinite(Number(item.sortOrder ?? item.sort_order))
        ? Number(item.sortOrder ?? item.sort_order)
        : index
    };
  });
}

function normalizeTreatmentPlanPayload(payload = {}) {
  const inputItems = Array.isArray(payload.items)
    ? payload.items
    : Array.isArray(payload.treatments)
      ? payload.treatments
      : [];
  const items = normalizeTreatmentItems(inputItems);
  const estimatedTotal = payload.estimatedTotal !== undefined
    ? toMoney(payload.estimatedTotal)
    : payload.estimatedCost !== undefined
      ? toMoney(payload.estimatedCost)
      : items.reduce((sum, item) => sum + item.estimatedCost, 0);
  const diagnosisSummary = payload.diagnosisSummary || payload.diagnosis_summary || payload.description || '';
  const title = payload.title || diagnosisSummary || 'Treatment Plan';

  return {
    appointmentId: toOptionalBigInt(payload.appointmentId ?? payload.appointment_id, 'INVALID_APPOINTMENT_ID'),
    consultationSessionId: toOptionalBigInt(payload.consultationSessionId ?? payload.consultation_session_id, 'INVALID_CONSULTATION_SESSION_ID'),
    medicalRecordId: payload.medicalRecordId || payload.medical_record_id || null,
    aiAnalysisResultId: toOptionalBigInt(payload.aiAnalysisResultId ?? payload.ai_analysis_result_id, 'INVALID_AI_ANALYSIS_RESULT_ID'),
    title: title.trim(),
    description: payload.description || diagnosisSummary || '',
    diagnosisSummary,
    clinicalNotes: payload.clinicalNotes || payload.clinical_notes || '',
    patientFriendlySummary: payload.patientFriendlySummary || payload.patient_friendly_summary || '',
    priority: normalizePriority(payload.priority),
    status: normalizePlanStatus(payload.status),
    estimatedTotal,
    currency: payload.currency || 'IDR',
    validUntil: toOptionalDate(payload.validUntil ?? payload.valid_until, 'INVALID_VALID_UNTIL'),
    targetCompletion: toOptionalDate(payload.targetCompletion ?? payload.target_completion, 'INVALID_TARGET_COMPLETION'),
    notes: payload.notes || null,
    items
  };
}

async function resolveAppointment({ db, dentistId, patientId, appointmentId }) {
  const where = appointmentId
    ? { id: appointmentId, dentistId, patientId }
    : { dentistId, patientId };
  const appointment = await db.appointment.findFirst({
    where,
    include: {
      clinicBranch: true,
      patient: { select: { id: true, name: true, email: true, phone_number: true } },
      dentist: { select: { id: true, name: true, email: true, phone_number: true, dentistProfile: true } }
    },
    orderBy: { startsAt: 'desc' }
  });

  if (!appointment) {
    const err = new Error('APPOINTMENT_NOT_FOUND');
    err.status = 404;
    throw err;
  }

  return appointment;
}

function serializeItem(item) {
  const procedureName = item.procedureName || item.name || 'Treatment item';
  const estimatedCost = item.estimatedCost ?? item.cost ?? 0;
  const status = normalizeItemStatus(item.status);
  return {
    id: asId(item.id),
    treatmentPlanId: asId(item.treatmentPlanId),
    toothNumber: item.toothNumber || null,
    areaLabel: item.areaLabel || null,
    procedureCode: item.procedureCode || null,
    procedureName,
    name: procedureName,
    category: item.category || 'Other',
    description: item.description || item.notes || '',
    clinicalReason: item.clinicalReason || '',
    priority: normalizePriority(item.priority, 'MEDIUM'),
    estimatedCost,
    cost: estimatedCost,
    actualCost: item.actualCost || 0,
    estimatedDurationMinutes: item.estimatedDurationMinutes || null,
    phase: item.phase || null,
    status,
    legacyStatus: item.status,
    scheduledDate: item.scheduledDate?.toISOString?.() || null,
    completedDate: item.completedDate?.toISOString?.() || null,
    notes: item.notes || null,
    resultNotes: item.resultNotes || null,
    imageUrl: item.imageUrl || null,
    sortOrder: item.sortOrder || 0
  };
}

export function serializeInvoice(invoice) {
  if (!invoice) return null;
  const total = invoice.grandTotal || invoice.total || 0;
  const isCashier = invoice.ownerType === 'clinic' || invoice.issuerType === 'clinic' || invoice.issuerName === 'Clinic Portal' || (invoice.reference && invoice.reference.startsWith('CL-'));
  const reference = invoice.reference || (
    isCashier 
      ? `CL-${invoice.id.toString().padStart(6, '0')}` 
      : `INV-${invoice.id.toString().padStart(6, '0')}`
  );
  return {
    id: asId(invoice.id),
    invoiceId: asId(invoice.id),
    reference,
    paymentIntentId: asId(invoice.paymentIntentId),
    appointmentId: asId(invoice.appointmentId),
    treatmentPlanId: asId(invoice.treatmentPlanId),
    patientId: asId(invoice.patientId),
    dentistId: asId(invoice.appointment?.dentistId || invoice.ownerDentistId),
    clinicId: asId(invoice.ownerClinicId),
    ownerType: invoice.ownerType,
    subtotal: invoice.subtotal || 0,
    platformFee: invoice.platformFee || 0,
    clinicShare: invoice.clinicShare || 0,
    dentistShare: invoice.dentistShare || 0,
    discount: invoice.discount || 0,
    tax: invoice.tax || 0,
    total: invoice.total || total,
    grandTotal: total,
    currency: invoice.currency || 'IDR',
    status: invoice.status,
    approvedAt: invoice.approvedAt?.toISOString?.() || null,
    paidAt: invoice.paidAt?.toISOString?.() || null,
    issuedAt: invoice.issuedAt?.toISOString?.() || null,
    createdAt: invoice.createdAt?.toISOString?.() || null,
    updatedAt: invoice.updatedAt?.toISOString?.() || null,
    items: (invoice.items || []).map((item) => ({
      id: asId(item.id),
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
      metadata: item.metadata || {}
    }))
  };
}

export function serializeTreatmentPlan(plan, extras = {}) {
  if (!plan) return null;
  const items = (plan.items || []).map(serializeItem);
  const estimatedTotal = plan.estimatedCost || items.reduce((sum, item) => sum + (item.estimatedCost || 0), 0);
  const status = normalizePlanStatus(plan.status);
  return {
    id: asId(plan.id),
    patientId: asId(plan.patientId),
    dentistId: asId(plan.dentistId),
    clinicId: asId(plan.clinicId),
    appointmentId: asId(plan.appointmentId),
    consultationSessionId: asId(plan.consultationSessionId),
    medicalRecordId: plan.medicalRecordId || null,
    aiAnalysisResultId: asId(plan.aiAnalysisResultId),
    status,
    legacyStatus: plan.status,
    title: plan.title,
    description: plan.description || '',
    diagnosisSummary: plan.diagnosisSummary || plan.description || '',
    clinicalNotes: plan.clinicalNotes || '',
    patientFriendlySummary: plan.patientFriendlySummary || '',
    priority: normalizePriority(plan.priority, 'MEDIUM'),
    progress: plan.progress || 0,
    estimatedTotal,
    estimatedCost: estimatedTotal,
    actualCost: plan.actualCost || 0,
    currency: plan.currency || 'IDR',
    validUntil: plan.validUntil?.toISOString?.() || null,
    sentAt: plan.sentAt?.toISOString?.() || null,
    approvedAt: plan.approvedAt?.toISOString?.() || null,
    startDate: plan.createdAt?.toISOString?.() || null,
    targetCompletion: plan.targetCompletion?.toISOString?.() || null,
    estimatedCompletion: plan.targetCompletion?.toISOString?.() || null,
    completedAt: plan.completedAt?.toISOString?.() || null,
    notes: plan.notes || null,
    createdAt: plan.createdAt?.toISOString?.() || null,
    updatedAt: plan.updatedAt?.toISOString?.() || null,
    dentist: plan.dentist ? {
      id: asId(plan.dentist.id),
      name: plan.dentist.name,
      avatar: plan.dentist.avatar_url || plan.dentist.dentistProfile?.[0]?.avatar_url || null
    } : null,
    patient: plan.patient ? {
      id: asId(plan.patient.id),
      name: plan.patient.name,
      email: plan.patient.email || null
    } : null,
    items,
    treatments: items,
    invoice: serializeInvoice(extras.invoice || plan.invoices?.[0] || null),
    invoices: (plan.invoices || []).map(serializeInvoice)
  };
}

function includePlanGraph() {
  return {
    items: { orderBy: { sortOrder: 'asc' } },
    dentist: { select: { id: true, name: true, avatar_url: true, dentistProfile: { select: { avatar_url: true }, take: 1 } } },
    patient: { select: { id: true, name: true, email: true } },
    invoices: { include: { items: true, appointment: { select: { dentistId: true } } }, orderBy: { createdAt: 'desc' } }
  };
}

export async function createTreatmentPlan({ db, dentistId, patientId, payload = {} }) {
  const client = getDb(db);
  const dentist = toBigInt(dentistId, 'INVALID_DENTIST_ID');
  const patient = toBigInt(patientId, 'INVALID_PATIENT_ID');
  const normalized = normalizeTreatmentPlanPayload(payload);



  const appointment = await resolveAppointment({
    db: client,
    dentistId: dentist,
    patientId: patient,
    appointmentId: normalized.appointmentId
  });
  const owner = resolvePaymentOwner(appointment);
  const clinicId = owner.ownerType === 'clinic' ? owner.ownerClinicId : null;

  await client.patientProfile.upsert({
    where: { userId: patient },
    update: {},
    create: { userId: patient }
  });

  const plan = await client.treatmentPlan.create({
    data: {
      patientId: patient,
      dentistId: dentist,
      clinicId,
      appointmentId: appointment.id,
      consultationSessionId: normalized.consultationSessionId,
      medicalRecordId: normalized.medicalRecordId,
      aiAnalysisResultId: normalized.aiAnalysisResultId,
      title: normalized.title,
      description: normalized.description,
      diagnosisSummary: normalized.diagnosisSummary,
      clinicalNotes: normalized.clinicalNotes,
      patientFriendlySummary: normalized.patientFriendlySummary,
      priority: normalized.priority,
      status: TREATMENT_PLAN_STATUSES.DRAFT,
      estimatedCost: normalized.estimatedTotal,
      currency: normalized.currency,
      targetCompletion: normalized.targetCompletion,
      validUntil: normalized.validUntil,
      notes: normalized.notes,
      items: {
        create: normalized.items.map((item) => ({
          name: item.name,
          toothNumber: item.toothNumber,
          areaLabel: item.areaLabel,
          procedureCode: item.procedureCode,
          procedureName: item.procedureName,
          category: item.category,
          description: item.description,
          clinicalReason: item.clinicalReason,
          priority: item.priority,
          cost: item.cost,
          estimatedCost: item.estimatedCost,
          actualCost: item.actualCost,
          estimatedDurationMinutes: item.estimatedDurationMinutes,
          phase: item.phase,
          status: item.status,
          scheduledDate: item.scheduledDate,
          completedDate: item.completedDate,
          notes: item.notes,
          resultNotes: item.resultNotes,
          imageUrl: item.imageUrl,
          sortOrder: item.sortOrder
        }))
      }
    },
    include: includePlanGraph()
  });

  return serializeTreatmentPlan(plan);
}

async function loadTreatmentPlanForDentist({ db, treatmentPlanId, dentistId }) {
  const plan = await db.treatmentPlan.findFirst({
    where: { id: toBigInt(treatmentPlanId, 'INVALID_TREATMENT_PLAN_ID'), dentistId: toBigInt(dentistId, 'INVALID_DENTIST_ID') },
    include: {
      ...includePlanGraph(),
      appointment: { include: { clinicBranch: true, patient: true, dentist: { include: { dentistProfile: true } } } }
    }
  });
  if (!plan) {
    const err = new Error('TREATMENT_PLAN_NOT_FOUND');
    err.status = 404;
    throw err;
  }
  return plan;
}

async function loadTreatmentPlanForPatient({ db, treatmentPlanId, patientId }) {
  const plan = await db.treatmentPlan.findFirst({
    where: { id: toBigInt(treatmentPlanId, 'INVALID_TREATMENT_PLAN_ID'), patientId: toBigInt(patientId, 'INVALID_PATIENT_ID') },
    include: {
      ...includePlanGraph(),
      appointment: { include: { clinicBranch: true, patient: true, dentist: { include: { dentistProfile: true } } } }
    }
  });
  if (!plan) {
    const err = new Error('TREATMENT_PLAN_NOT_FOUND');
    err.status = 404;
    throw err;
  }
  return plan;
}

function canRefreshInvoice(invoice) {
  return !invoice?.paymentIntentId && !['paid', 'settled', 'refunded', 'partial_refund'].includes(invoice?.status);
}

async function writeInvoiceItems({ db, invoiceId, items }) {
  await db.invoiceLineItem.deleteMany({ where: { invoiceId } });
  if (!items.length) return;
  await db.invoiceLineItem.createMany({
    data: items.map((item) => ({
      invoiceId,
      description: item.procedureName || item.name || 'Dental treatment',
      quantity: 1,
      unitPrice: item.estimatedCost ?? item.cost ?? 0,
      total: item.estimatedCost ?? item.cost ?? 0,
      metadata: {
        treatmentItemId: item.id?.toString?.() || null,
        toothNumber: item.toothNumber || null,
        areaLabel: item.areaLabel || null,
        category: item.category || null,
        phase: item.phase || null
      }
    }))
  });
}

export async function ensureInvoiceForTreatmentPlan({ db, treatmentPlanId, status = 'issued' }) {
  const client = getDb(db);
  const plan = await client.treatmentPlan.findUnique({
    where: { id: toBigInt(treatmentPlanId, 'INVALID_TREATMENT_PLAN_ID') },
    include: {
      items: { orderBy: { sortOrder: 'asc' } },
      appointment: { include: { clinicBranch: true, patient: true, dentist: { include: { dentistProfile: true } } } },
      patient: true
    }
  });
  if (!plan) {
    const err = new Error('TREATMENT_PLAN_NOT_FOUND');
    err.status = 404;
    throw err;
  }

  const appointment = plan.appointment || await resolveAppointment({
    db: client,
    dentistId: plan.dentistId,
    patientId: plan.patientId,
    appointmentId: plan.appointmentId
  });
  const owner = resolvePaymentOwner(appointment);
  const items = plan.items || [];
  const subtotal = items.reduce((sum, item) => sum + (item.estimatedCost ?? item.cost ?? 0), 0);
  const discount = 0;
  const tax = 0;
  const total = subtotal - discount + tax;
  const split = calculateFinancialSplit(total, owner.ownerType);
  const issuedAt = new Date();

  return client.$transaction(async (tx) => {
    const existing = await tx.invoice.findFirst({
      where: { treatmentPlanId: plan.id },
      include: { items: true, appointment: { select: { dentistId: true } } }
    });

    if (existing) {
      if (!canRefreshInvoice(existing)) {
        return existing;
      }
      const refreshed = await tx.invoice.update({
        where: { id: existing.id },
        data: {
          appointmentId: appointment.id,
          patientId: plan.patientId,
          clinicBranchId: appointment.clinicBranchId || null,
          ownerType: owner.ownerType,
          ownerClinicId: owner.ownerClinicId,
          ownerDentistId: owner.ownerDentistId,
          status: existing.status === 'approved' ? existing.status : status,
          subtotal,
          tax,
          discount,
          total,
          platformFee: split.platformFee,
          clinicShare: split.clinicShare,
          dentistShare: split.dentistShare,
          grandTotal: split.grandTotal,
          currency: plan.currency || 'IDR',
          issuedAt: existing.issuedAt || issuedAt,
          metadata: {
            ...(existing.metadata || {}),
            treatmentPlanId: plan.id.toString(),
            appointmentId: appointment.id.toString(),
            source: 'treatment_plan'
          }
        }
      });
      await writeInvoiceItems({ db: tx, invoiceId: refreshed.id, items });
      return tx.invoice.findUnique({
        where: { id: refreshed.id },
        include: { items: true, appointment: { select: { dentistId: true } } }
      });
    }

    const invoice = await tx.invoice.create({
      data: {
        appointmentId: appointment.id,
        treatmentPlanId: plan.id,
        patientId: plan.patientId,
        clinicBranchId: appointment.clinicBranchId || null,
        ownerType: owner.ownerType,
        ownerClinicId: owner.ownerClinicId,
        ownerDentistId: owner.ownerDentistId,
        reference: `INV-TP-${String(plan.id).padStart(6, '0')}`,
        status,
        subtotal,
        tax,
        discount,
        total,
        platformFee: split.platformFee,
        clinicShare: split.clinicShare,
        dentistShare: split.dentistShare,
        grandTotal: split.grandTotal,
        currency: plan.currency || 'IDR',
        issuedAt,
        issuerType: owner.ownerType,
        issuerName: appointment.dentist?.name || 'SereneApps',
        issuerEmail: appointment.dentist?.email || 'billing@serene.test',
        issuerPhone: appointment.dentist?.phone_number || null,
        issuerAddress: appointment.dentist?.dentistProfile?.[0]?.clinicAddress || null,
        issuerTaxId: appointment.dentist?.dentistProfile?.[0]?.registrationNumber || null,
        issuerSnapshot: {
          dentistId: appointment.dentistId?.toString?.(),
          clinicId: owner.ownerClinicId?.toString?.() || null,
          source: 'treatment_plan'
        },
        metadata: {
          treatmentPlanId: plan.id.toString(),
          appointmentId: appointment.id.toString(),
          source: 'treatment_plan'
        }
      }
    });

    await writeInvoiceItems({ db: tx, invoiceId: invoice.id, items });
    return tx.invoice.findUnique({
      where: { id: invoice.id },
      include: { items: true, appointment: { select: { dentistId: true } } }
    });
  });
}

export async function sendTreatmentPlan({ db, dentistId, treatmentPlanId }) {
  const client = getDb(db);
  const plan = await loadTreatmentPlanForDentist({ db: client, treatmentPlanId, dentistId });
  const now = new Date();
  const updated = await client.treatmentPlan.update({
    where: { id: plan.id },
    data: {
      status: TREATMENT_PLAN_STATUSES.SENT,
      sentAt: plan.sentAt || now
    },
    include: includePlanGraph()
  });
  const invoice = await ensureInvoiceForTreatmentPlan({ db: client, treatmentPlanId: plan.id, status: 'issued' });

  // Create in-app notification for the patient
  try {
    const patientId = updated.patientId;
    const dentistName = updated.dentist?.name || 'Dokter Gigi';
    const planTitle = updated.title || 'Rencana Perawatan';

    await client.notification.create({
      data: {
        user_id: BigInt(patientId),
        type: 'treatment_plan_sent',
        title: '📋 Rencana Perawatan Baru',
        message: `drg. ${dentistName} mengirimkan rencana perawatan baru: "${planTitle}". Silakan ditinjau.`,
        data: {
          treatmentPlanId: updated.id.toString(),
          dentistName,
          title: planTitle,
          invoiceId: invoice?.id ? invoice.id.toString() : null
        },
        is_read: false
      }
    });
  } catch (err) {
    console.error('Failed to create patient notification for sent treatment plan:', err);
  }

  return serializeTreatmentPlan(updated, { invoice });
}

export async function respondToTreatmentPlan({ db, patientId, treatmentPlanId, decision, reason = null }) {
  const client = getDb(db);
  const plan = await loadTreatmentPlanForPatient({ db: client, treatmentPlanId, patientId });
  const normalizedDecision = String(decision || '').toLowerCase();
  if (!['approve', 'approved', 'reject', 'rejected'].includes(normalizedDecision)) {
    const err = new Error('INVALID_TREATMENT_PLAN_DECISION');
    err.status = 400;
    throw err;
  }

  const isApproval = normalizedDecision.startsWith('approve');
  const now = new Date();
  const updated = await client.$transaction(async (tx) => {
    const nextPlan = await tx.treatmentPlan.update({
      where: { id: plan.id },
      data: {
        status: isApproval ? TREATMENT_PLAN_STATUSES.APPROVED : TREATMENT_PLAN_STATUSES.REJECTED,
        approvedAt: isApproval ? (plan.approvedAt || now) : null,
        notes: reason ? [plan.notes, `Patient response: ${reason}`].filter(Boolean).join('\n') : plan.notes
      },
      include: includePlanGraph()
    });

    if (isApproval) {
      await tx.treatmentItem.updateMany({
        where: { treatmentPlanId: plan.id, status: { in: ['PLANNED', 'pending', 'planned'] } },
        data: { status: TREATMENT_ITEM_STATUSES.APPROVED }
      });
      await tx.invoice.updateMany({
        where: {
          treatmentPlanId: plan.id,
          paymentIntentId: null,
          status: { in: ['draft', 'issued', 'approved'] }
        },
        data: { status: 'approved', approvedAt: now }
      });
    } else {
      await tx.invoice.updateMany({
        where: {
          treatmentPlanId: plan.id,
          paymentIntentId: null,
          status: { in: ['draft', 'issued', 'approved'] }
        },
        data: { status: 'cancelled' }
      });
    }

    return nextPlan;
  });

  const invoice = await ensureInvoiceForTreatmentPlan({
    db: client,
    treatmentPlanId: plan.id,
    status: isApproval ? 'approved' : 'cancelled'
  });
  const refreshedInvoice = isApproval && invoice.status !== 'approved'
    ? await client.invoice.update({
        where: { id: invoice.id },
        data: { status: 'approved', approvedAt: invoice.approvedAt || now },
        include: { items: true, appointment: { select: { dentistId: true } } }
      })
    : invoice;

  // Create in-app notification for the dentist
  try {
    const dentistId = updated.dentistId;
    const patientName = updated.patient?.name || 'Pasien';
    const planTitle = updated.title || 'Rencana Perawatan';
    const notifyTitle = isApproval ? '✅ Rencana Perawatan Disetujui' : '❌ Rencana Perawatan Ditolak';
    const notifyMsg = isApproval
      ? `Pasien ${patientName} menyetujui rencana perawatan: "${planTitle}".`
      : `Pasien ${patientName} menolak rencana perawatan: "${planTitle}".` + (reason ? ` Alasan: ${reason}` : '');

    await client.notification.create({
      data: {
        user_id: BigInt(dentistId),
        type: isApproval ? 'treatment_plan_approved' : 'treatment_plan_rejected',
        title: notifyTitle,
        message: notifyMsg,
        data: {
          treatmentPlanId: updated.id.toString(),
          patientName,
          title: planTitle,
          reason: reason || null
        },
        is_read: false
      }
    });
  } catch (err) {
    console.error('Failed to create dentist notification for treatment plan response:', err);
  }

  return serializeTreatmentPlan(updated, { invoice: refreshedInvoice });
}

export async function listTreatmentPlansForDentist({ db, dentistId, patientId }) {
  const client = getDb(db);
  const dentist = toBigInt(dentistId, 'INVALID_DENTIST_ID');
  const patient = toOptionalBigInt(patientId, 'INVALID_PATIENT_ID');
  const plans = await client.treatmentPlan.findMany({
    where: {
      dentistId: dentist,
      ...(patient ? { patientId: patient } : {})
    },
    include: includePlanGraph(),
    orderBy: { createdAt: 'desc' }
  });
  return plans.map(serializeTreatmentPlan);
}

export async function getTreatmentPlanForDentist({ db, dentistId, treatmentPlanId }) {
  const client = getDb(db);
  const plan = await loadTreatmentPlanForDentist({ db: client, treatmentPlanId, dentistId });
  return serializeTreatmentPlan(plan);
}

export async function listTreatmentPlansForPatient({ db, patientId }) {
  const client = getDb(db);
  const plans = await client.treatmentPlan.findMany({
    where: { patientId: toBigInt(patientId, 'INVALID_PATIENT_ID') },
    include: includePlanGraph(),
    orderBy: { createdAt: 'desc' }
  });
  return plans.map(serializeTreatmentPlan);
}

export async function getTreatmentPlanForPatient({ db, patientId, treatmentPlanId }) {
  const client = getDb(db);
  const plan = await loadTreatmentPlanForPatient({ db: client, patientId, treatmentPlanId });
  return serializeTreatmentPlan(plan);
}

export async function updateTreatmentPlan({ db, dentistId, treatmentPlanId, payload = {} }) {
  const client = getDb(db);
  const plan = await loadTreatmentPlanForDentist({ db: client, treatmentPlanId, dentistId });
  const normalized = normalizeTreatmentPlanPayload({ ...plan, ...payload, items: payload.items || [] });
  const data = {};
  if (payload.title !== undefined) data.title = normalized.title;
  if (payload.description !== undefined) data.description = normalized.description;
  if (payload.diagnosisSummary !== undefined || payload.diagnosis_summary !== undefined) data.diagnosisSummary = normalized.diagnosisSummary;
  if (payload.clinicalNotes !== undefined || payload.clinical_notes !== undefined) data.clinicalNotes = normalized.clinicalNotes;
  if (payload.patientFriendlySummary !== undefined || payload.patient_friendly_summary !== undefined) data.patientFriendlySummary = normalized.patientFriendlySummary;
  if (payload.priority !== undefined) data.priority = normalized.priority;
  if (payload.status !== undefined) data.status = normalizePlanStatus(payload.status);
  if (payload.estimatedTotal !== undefined || payload.estimatedCost !== undefined) data.estimatedCost = normalized.estimatedTotal;
  if (payload.currency !== undefined) data.currency = normalized.currency;
  if (payload.validUntil !== undefined || payload.valid_until !== undefined) data.validUntil = normalized.validUntil;
  if (payload.targetCompletion !== undefined || payload.target_completion !== undefined) data.targetCompletion = normalized.targetCompletion;
  if (payload.notes !== undefined) data.notes = normalized.notes;

  const updated = await client.treatmentPlan.update({
    where: { id: plan.id },
    data,
    include: includePlanGraph()
  });
  return serializeTreatmentPlan(updated);
}

export async function addTreatmentPlanItem({ db, dentistId, treatmentPlanId, payload = {} }) {
  const client = getDb(db);
  const plan = await loadTreatmentPlanForDentist({ db: client, treatmentPlanId, dentistId });
  const [item] = normalizeTreatmentItems([payload]);
  const created = await client.treatmentItem.create({
    data: {
      treatmentPlanId: plan.id,
      name: item.name,
      toothNumber: item.toothNumber,
      areaLabel: item.areaLabel,
      procedureCode: item.procedureCode,
      procedureName: item.procedureName,
      category: item.category,
      description: item.description,
      clinicalReason: item.clinicalReason,
      priority: item.priority,
      cost: item.cost,
      estimatedCost: item.estimatedCost,
      actualCost: item.actualCost,
      estimatedDurationMinutes: item.estimatedDurationMinutes,
      phase: item.phase,
      status: item.status,
      scheduledDate: item.scheduledDate,
      completedDate: item.completedDate,
      notes: item.notes,
      resultNotes: item.resultNotes,
      imageUrl: item.imageUrl,
      sortOrder: item.sortOrder
    }
  });
  const estimatedTotal = await client.treatmentItem.aggregate({
    where: { treatmentPlanId: plan.id },
    _sum: { estimatedCost: true, cost: true }
  });
  await client.treatmentPlan.update({
    where: { id: plan.id },
    data: { estimatedCost: estimatedTotal._sum.estimatedCost || estimatedTotal._sum.cost || 0 }
  });
  return serializeItem(created);
}

export async function updateTreatmentPlanItem({ db, dentistId, treatmentPlanId, itemId, payload = {} }) {
  const client = getDb(db);
  const plan = await loadTreatmentPlanForDentist({ db: client, treatmentPlanId, dentistId });
  const existing = await client.treatmentItem.findFirst({
    where: { id: toBigInt(itemId, 'INVALID_TREATMENT_ITEM_ID'), treatmentPlanId: plan.id }
  });
  if (!existing) {
    const err = new Error('TREATMENT_ITEM_NOT_FOUND');
    err.status = 404;
    throw err;
  }
  const [item] = normalizeTreatmentItems([{ ...existing, ...payload }]);
  const completedDate = item.status === TREATMENT_ITEM_STATUSES.DONE && !existing.completedDate
    ? new Date()
    : item.completedDate;
  const updated = await client.treatmentItem.update({
    where: { id: existing.id },
    data: {
      name: item.name,
      toothNumber: item.toothNumber,
      areaLabel: item.areaLabel,
      procedureCode: item.procedureCode,
      procedureName: item.procedureName,
      category: item.category,
      description: item.description,
      clinicalReason: item.clinicalReason,
      priority: item.priority,
      cost: item.cost,
      estimatedCost: item.estimatedCost,
      actualCost: item.actualCost,
      estimatedDurationMinutes: item.estimatedDurationMinutes,
      phase: item.phase,
      status: item.status,
      scheduledDate: item.scheduledDate,
      completedDate,
      notes: item.notes,
      resultNotes: item.resultNotes,
      imageUrl: item.imageUrl,
      sortOrder: item.sortOrder
    }
  });
  return serializeItem(updated);
}

export async function deleteTreatmentPlanItem({ db, dentistId, treatmentPlanId, itemId }) {
  const client = getDb(db);
  const plan = await loadTreatmentPlanForDentist({ db: client, treatmentPlanId, dentistId });
  const existing = await client.treatmentItem.findFirst({
    where: { id: toBigInt(itemId, 'INVALID_TREATMENT_ITEM_ID'), treatmentPlanId: plan.id }
  });
  if (!existing) {
    const err = new Error('TREATMENT_ITEM_NOT_FOUND');
    err.status = 404;
    throw err;
  }
  await client.treatmentItem.delete({ where: { id: existing.id } });
  return { deleted: true, id: existing.id.toString() };
}

export function emitTreatmentPlanRealtime({ io, eventType, treatmentPlan, invoice = null }) {
  if (!io || !treatmentPlan) return;
  const payload = {
    eventType,
    treatmentPlan,
    invoice,
    dashboardRefresh: true,
    emittedAt: new Date().toISOString()
  };
  if (treatmentPlan.patientId) io.to(`user:${treatmentPlan.patientId}`).emit(eventType, payload);
  if (treatmentPlan.dentistId) io.to(`user:${treatmentPlan.dentistId}`).emit(eventType, payload);
  if (treatmentPlan.clinicId) io.to(`clinic:${treatmentPlan.clinicId}`).emit(eventType, payload);
  if (treatmentPlan.patientId) io.to(`user:${treatmentPlan.patientId}`).emit('dashboard:metrics_updated', payload);
  if (treatmentPlan.dentistId) io.to(`user:${treatmentPlan.dentistId}`).emit('dashboard:metrics_updated', payload);
}
