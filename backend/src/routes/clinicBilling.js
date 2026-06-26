import express from 'express';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../utils/tokens.js';
import {
  assertCanAccessBranch,
  assertCanAccessClinicPayment,
  assertDentistInBranch,
  resolveClinicStaffContext,
  serializeClinicPaymentContext,
  toBigInt
} from '../services/clinicPaymentAuthorization.js';
import midtransService from '../services/payments/midtransService.js';
import { applyPaymentStatus, ACTIVE_PAYMENT_STATUSES } from '../services/payments/status.js';

const router = express.Router();
const prisma = new PrismaClient();
const SNAP_EXPIRY_MS = 30 * 60 * 1000;

function sendError(res, error, fallbackStatus = 500, fallbackMessage = 'Internal server error') {
  const status = error?.status || error?.statusCode || fallbackStatus;
  const message = error?.message || fallbackMessage;
  return res.status(status).json({
    error: message,
    code: error?.code || message
  });
}

function serializeId(value) {
  return value === null || value === undefined ? null : value.toString();
}

function parsePositiveAmount(value, fieldName = 'amount') {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    const error = new Error(`${fieldName} must be a positive integer`);
    error.status = 400;
    throw error;
  }
  return Math.round(parsed);
}

function calculateClinicSplit(amount) {
  const total = parsePositiveAmount(amount);
  const platformFee = Math.round(total * 0.1);
  const dentistShare = Math.round(total * 0.3);
  return {
    platformFee,
    dentistShare,
    clinicShare: total - platformFee - dentistShare,
    grandTotal: total
  };
}

function normalizeMetadata(metadata) {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {};
}

function resolveSnapExpiry(value) {
  const parsed = value ? new Date(value) : null;
  if (parsed && !Number.isNaN(parsed.getTime())) return parsed;
  return new Date(Date.now() + SNAP_EXPIRY_MS);
}

function canReuseMidtransIntent(intent) {
  if (!intent || intent.provider !== 'midtrans') return false;
  if (!['pending', 'requires_action'].includes(intent.status)) return false;
  if (!intent.redirectUrl) return false;
  if (!intent.expiresAt) return true;
  return new Date(intent.expiresAt).getTime() > Date.now();
}

function paymentMethodForIntent(intent) {
  if (intent.provider === 'cash') return 'cash';
  const type = normalizeMetadata(intent.providerResponse).payment_type?.toLowerCase?.() || '';
  if (type.includes('qris') || type.includes('gopay') || type.includes('shopeepay')) return 'qris';
  if (type.includes('transfer') || type.includes('va')) return 'transfer';
  if (type.includes('card')) return 'credit';
  return intent.provider || 'midtrans';
}

function paymentStatusForIntent(status) {
  const value = String(status || '').toLowerCase();
  if (['settled', 'completed'].includes(value)) return 'settled';
  if (['paid', 'succeeded'].includes(value)) return 'paid';
  if (['pending', 'requires_action'].includes(value)) return 'pending';
  if (['refunded', 'partial_refund'].includes(value)) return 'refunded';
  return value || 'failed';
}

function serializeBranch(branch) {
  return {
    id: serializeId(branch.id),
    clinicProfileId: serializeId(branch.clinicProfileId),
    branchName: branch.branchName,
    branchCode: branch.branchCode,
    isMainBranch: branch.isMainBranch,
    streetAddress: branch.streetAddress,
    city: branch.city,
    province: branch.province,
    district: branch.district,
    phone: branch.phone
  };
}

function serializeDentist(staff) {
  const profile = staff.user?.dentistProfile?.[0] || null;
  return {
    id: serializeId(staff.userId || staff.user?.id),
    userId: serializeId(staff.userId || staff.user?.id),
    name: staff.user?.name,
    email: staff.user?.email,
    phone: staff.user?.phone_number,
    branchId: serializeId(staff.assignedBranchId),
    title: profile?.title || 'drg.',
    specialization: profile?.primarySpecialization || null,
    consultationFee: profile?.consultationFee || 0
  };
}

function serializePatient(user) {
  return {
    id: serializeId(user.id),
    name: user.name,
    email: user.email,
    phone: user.phone_number,
    dateOfBirth: user.patientProfile?.dateOfBirth?.toISOString?.().slice(0, 10) || null,
    gender: user.patientProfile?.gender || null,
    address: user.patientProfile?.address || null
  };
}

function serializeAppointment(appointment) {
  return {
    id: serializeId(appointment.id),
    patientId: serializeId(appointment.patientId),
    dentistId: serializeId(appointment.dentistId),
    branchId: serializeId(appointment.clinicBranchId),
    clinicProfileId: serializeId(appointment.ownerClinicId),
    startsAt: appointment.startsAt?.toISOString?.() || appointment.startsAt,
    endsAt: appointment.endsAt?.toISOString?.() || appointment.endsAt,
    status: appointment.status,
    reason: appointment.reason,
    notes: appointment.notes,
    patient: appointment.patient ? serializePatient(appointment.patient) : null,
    dentist: appointment.dentist
      ? {
          id: serializeId(appointment.dentist.id),
          name: appointment.dentist.name,
          email: appointment.dentist.email
        }
      : null
  };
}

function serializeInvoice(invoice) {
  return {
    id: serializeId(invoice.id),
    dbId: serializeId(invoice.id),
    appointmentId: serializeId(invoice.appointmentId),
    paymentIntentId: serializeId(invoice.paymentIntentId),
    patientId: serializeId(invoice.patientId),
    branchId: serializeId(invoice.clinicBranchId),
    ownerClinicId: serializeId(invoice.ownerClinicId),
    reference: invoice.reference || `INV-${invoice.id.toString().padStart(6, '0')}`,
    patient: invoice.patient?.name || 'Pasien',
    patientDetail: invoice.patient ? serializePatient(invoice.patient) : null,
    services: (invoice.items || []).map((item) => item.description),
    amount: invoice.grandTotal || invoice.total,
    subtotal: invoice.subtotal,
    tax: invoice.tax,
    discount: invoice.discount,
    total: invoice.total,
    platformFee: invoice.platformFee || 0,
    clinicShare: invoice.clinicShare || 0,
    dentistShare: invoice.dentistShare || 0,
    grandTotal: invoice.grandTotal,
    currency: invoice.currency || 'IDR',
    status: invoice.status,
    dueDate: invoice.dueAt?.toISOString?.() || null,
    paidAt: invoice.paidAt?.toISOString?.() || null,
    createdAt: invoice.createdAt?.toISOString?.() || invoice.createdAt,
    items: (invoice.items || []).map((item) => ({
      id: serializeId(item.id),
      invoiceId: serializeId(item.invoiceId),
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total
    }))
  };
}

function serializePaymentIntent(intent, invoice = null) {
  const metadata = normalizeMetadata(intent.metadata);
  return {
    id: serializeId(intent.id),
    dbId: serializeId(intent.id),
    invoiceId: serializeId(invoice?.id || metadata.invoiceId),
    appointmentId: serializeId(intent.appointmentId),
    patientId: serializeId(intent.patientId),
    branchId: serializeId(intent.clinicBranchId),
    amount: intent.amount,
    currency: intent.currency || 'IDR',
    method: paymentMethodForIntent(intent),
    provider: intent.provider,
    status: paymentStatusForIntent(intent.status),
    rawStatus: intent.status,
    providerOrderId: intent.providerOrderId,
    providerPaymentId: intent.providerPaymentId,
    snapToken: metadata.snapToken || null,
    redirectUrl: intent.redirectUrl,
    expiresAt: intent.expiresAt?.toISOString?.() || null,
    receivedBy: metadata.receivedByStaffId ? `Staff #${metadata.receivedByStaffId}` : (intent.provider === 'cash' ? 'Kasir' : 'Midtrans'),
    receivedAt: (intent.status === 'paid' || intent.status === 'settled' ? intent.updatedAt : intent.createdAt)?.toISOString?.() || intent.createdAt,
    invoice: invoice?.reference || (metadata.invoiceId ? `INV-${String(metadata.invoiceId).padStart(6, '0')}` : null),
    patient: intent.patient?.name || invoice?.patient?.name || 'Pasien',
    platformFee: invoice?.platformFee || 0,
    clinicShare: invoice?.clinicShare || 0,
    dentistShare: invoice?.dentistShare || 0,
    notes: metadata.notes || normalizeMetadata(intent.providerResponse).status_message || null
  };
}

async function getContext(req) {
  return resolveClinicStaffContext(req.user, { prismaClient: prisma });
}

async function loadBranchesForContext(ctx) {
  if (!ctx.allowedBranchIds?.length) return [];
  return prisma.clinicBranch.findMany({
    where: {
      id: { in: ctx.allowedBranchIds },
      clinicProfileId: ctx.clinicProfileId,
      isActive: true
    },
    orderBy: [
      { isMainBranch: 'desc' },
      { branchName: 'asc' }
    ]
  });
}

async function loadInvoiceForPayment(invoiceId) {
  return prisma.invoice.findUnique({
    where: { id: toBigInt(invoiceId, 'invoiceId') },
    include: {
      items: true,
      patient: { include: { patientProfile: true } },
      paymentIntent: true,
      appointment: {
        include: {
          patient: { include: { patientProfile: true } },
          dentist: { select: { id: true, name: true, email: true, phone_number: true } },
          clinicBranch: true
        }
      }
    }
  });
}

function assertInvoicePayable(invoice, branchId, amount) {
  if (!invoice) {
    const error = new Error('INVOICE_NOT_FOUND');
    error.status = 404;
    throw error;
  }
  if (!invoice.appointmentId) {
    const error = new Error('INVOICE_APPOINTMENT_REQUIRED');
    error.status = 400;
    throw error;
  }
  const invoiceBranchId = invoice.clinicBranchId || invoice.appointment?.clinicBranchId;
  if (!invoiceBranchId || invoiceBranchId.toString() !== branchId.toString()) {
    const error = new Error('BRANCH_ACCESS_DENIED');
    error.status = 403;
    throw error;
  }
  if (['paid', 'settled'].includes(String(invoice.status).toLowerCase())) {
    const error = new Error('INVOICE_ALREADY_PAID');
    error.status = 409;
    throw error;
  }
  if (invoice.paymentIntent && ACTIVE_PAYMENT_STATUSES.has(invoice.paymentIntent.status)) {
    const error = new Error('INVOICE_HAS_ACTIVE_PAYMENT');
    error.status = 409;
    throw error;
  }
  const expectedAmount = invoice.grandTotal || invoice.total;
  if (parsePositiveAmount(amount) !== expectedAmount) {
    const error = new Error('PAYMENT_AMOUNT_MUST_EQUAL_INVOICE_TOTAL');
    error.status = 400;
    throw error;
  }
  return expectedAmount;
}

async function assertNoOtherActiveAppointmentPayment(appointmentId, currentPaymentIntentId = null) {
  const active = await prisma.paymentIntent.findFirst({
    where: {
      activeAppointmentId: appointmentId,
      ...(currentPaymentIntentId ? { id: { not: currentPaymentIntentId } } : {})
    },
    select: { id: true, status: true, provider: true }
  });
  if (active) {
    const error = new Error('APPOINTMENT_HAS_ACTIVE_PAYMENT');
    error.status = 409;
    throw error;
  }
  return true;
}

async function emitClinicPaymentUpdate(req, payload) {
  const io = req.app?.get?.('io');
  if (!io) return;
  io.emit('clinic:billing_updated', payload);
  io.emit('dashboard:metrics_updated', payload);
  io.emit('appointment:updated', payload);
}

router.get('/permissions', authenticateToken, async (req, res) => {
  try {
    const ctx = await getContext(req);
    return res.json(serializeClinicPaymentContext(ctx));
  } catch (error) {
    return sendError(res, error, 403, 'FORBIDDEN');
  }
});

router.get('/branches', authenticateToken, async (req, res) => {
  try {
    const ctx = await getContext(req);
    assertCanAccessClinicPayment(ctx);
    const branches = await loadBranchesForContext(ctx);
    return res.json({
      branches: branches.map(serializeBranch),
      context: serializeClinicPaymentContext(ctx)
    });
  } catch (error) {
    return sendError(res, error, 403, 'FORBIDDEN');
  }
});

router.get('/branches/:branchId/dentists', authenticateToken, async (req, res) => {
  try {
    const ctx = await getContext(req);
    const branchId = assertCanAccessBranch(ctx, req.params.branchId);
    const dentists = await prisma.clinicStaff.findMany({
      where: {
        clinicProfileId: ctx.clinicProfileId,
        assignedBranchId: branchId,
        isActive: true,
        OR: [
          { role: 'dentist' },
          { user: { roles: { has: 'dentist' } } }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone_number: true,
            dentistProfile: {
              select: {
                title: true,
                primarySpecialization: true,
                consultationFee: true
              },
              take: 1
            }
          }
        }
      },
      orderBy: { user: { name: 'asc' } }
    });

    return res.json({ dentists: dentists.map(serializeDentist) });
  } catch (error) {
    return sendError(res, error, 403, 'FORBIDDEN');
  }
});

router.get('/patients', authenticateToken, async (req, res) => {
  try {
    const ctx = await getContext(req);
    const branchId = assertCanAccessBranch(ctx, req.query.branchId);
    const search = String(req.query.search || '').trim();

    const patientFilter = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone_number: { contains: search, mode: 'insensitive' } }
          ]
        }
      : {};

    const patients = await prisma.user.findMany({
      where: {
        roles: { has: 'patient' },
        ...patientFilter,
        OR: [
          {
            patientAppointments: {
              some: {
                clinicBranchId: branchId,
                ownerClinicId: ctx.clinicProfileId
              }
            }
          },
          {
            patientProfile: {
              is: {
                medicalDetails: {
                  path: ['clinicBranchId'],
                  equals: branchId.toString()
                }
              }
            }
          }
        ]
      },
      include: { patientProfile: true },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return res.json({ patients: patients.map(serializePatient) });
  } catch (error) {
    return sendError(res, error, 403, 'FORBIDDEN');
  }
});

router.post('/patients', authenticateToken, async (req, res) => {
  try {
    const ctx = await getContext(req);
    const branchId = assertCanAccessBranch(ctx, req.body?.branchId);
    const { name, email, phone, dateOfBirth, gender, address } = req.body || {};
    const normalizedName = String(name || '').trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedName) {
      return res.status(400).json({ error: 'name is required' });
    }

    const patient = await prisma.$transaction(async (tx) => {
      let user = normalizedEmail
        ? await tx.user.findUnique({ where: { email: normalizedEmail } })
        : null;

      if (!user) {
        const passwordHash = await bcrypt.hash(randomUUID(), 10);
        user = await tx.user.create({
          data: {
            name: normalizedName,
            email: normalizedEmail || `walkin+${randomUUID()}@serene.local`,
            password_hash: passwordHash,
            phone_number: phone || null,
            roles: ['patient']
          }
        });
      } else if (!user.roles?.includes('patient')) {
        user = await tx.user.update({
          where: { id: user.id },
          data: { roles: [...(user.roles || []), 'patient'] }
        });
      }

      return tx.patientProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          gender: gender || null,
          address: address || null,
          medicalDetails: {
            patientSource: 'clinic_created',
            clinicProfileId: ctx.clinicProfileId.toString(),
            clinicBranchId: branchId.toString(),
            createdByStaffId: ctx.staffId.toString()
          }
        },
        update: {
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
          gender: gender || undefined,
          address: address || undefined
        },
        include: {
          user: {
            include: { patientProfile: true }
          }
        }
      });
    });

    return res.status(201).json({ patient: serializePatient(patient.user) });
  } catch (error) {
    return sendError(res, error, 500, 'Failed to create patient');
  }
});

router.get('/appointments', authenticateToken, async (req, res) => {
  try {
    const ctx = await getContext(req);
    const branchId = assertCanAccessBranch(ctx, req.query.branchId);
    const patientId = req.query.patientId ? toBigInt(req.query.patientId, 'patientId') : null;

    const appointments = await prisma.appointment.findMany({
      where: {
        clinicBranchId: branchId,
        ownerClinicId: ctx.clinicProfileId,
        ...(patientId ? { patientId } : {})
      },
      include: {
        patient: { include: { patientProfile: true } },
        dentist: { select: { id: true, name: true, email: true } },
        invoices: {
          include: { items: true },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { startsAt: 'desc' },
      take: 50
    });

    return res.json({
      appointments: appointments.map((appointment) => ({
        ...serializeAppointment(appointment),
        invoice: appointment.invoices?.[0] ? serializeInvoice(appointment.invoices[0]) : null
      }))
    });
  } catch (error) {
    return sendError(res, error, 403, 'FORBIDDEN');
  }
});

router.post('/appointments', authenticateToken, async (req, res) => {
  try {
    const ctx = await getContext(req);
    const branchId = assertCanAccessBranch(ctx, req.body?.branchId);
    const patientId = toBigInt(req.body?.patientId, 'patientId');
    const dentistId = toBigInt(req.body?.dentistId, 'dentistId');
    await assertDentistInBranch(dentistId, branchId, { prismaClient: prisma });

    const startsAt = new Date(req.body?.startsAt);
    const endsAt = req.body?.endsAt
      ? new Date(req.body.endsAt)
      : new Date(startsAt.getTime() + 30 * 60 * 1000);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      return res.status(400).json({ error: 'startsAt and endsAt are required' });
    }

    const patient = await prisma.user.findUnique({ where: { id: patientId }, select: { id: true } });
    if (!patient) {
      return res.status(404).json({ error: 'PATIENT_NOT_FOUND' });
    }

    const appointment = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock($1::bigint)', dentistId);
      const overlap = await tx.appointment.findFirst({
        where: {
          dentistId,
          clinicBranchId: branchId,
          status: { notIn: ['cancelled', 'payment_failed'] },
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt }
        },
        select: { id: true }
      });
      if (overlap) {
        const error = new Error('DENTIST_TIME_SLOT_UNAVAILABLE');
        error.status = 409;
        throw error;
      }

      const created = await tx.appointment.create({
        data: {
          dentistId,
          patientId,
          clinicBranchId: branchId,
          ownerType: 'clinic',
          ownerClinicId: ctx.clinicProfileId,
          startsAt,
          endsAt,
          status: 'scheduled',
          reason: req.body?.reason || 'Konsultasi Klinik',
          notes: req.body?.notes || null,
          consultationType: 'onsite',
          metadata: {
            channel: 'clinic',
            source: 'clinic_created',
            createdByUserId: ctx.userId.toString(),
            createdByStaffId: ctx.staffId.toString(),
            branchId: branchId.toString()
          }
        }
      });

      await tx.appointmentStatusHistory.create({
        data: {
          appointmentId: created.id,
          previousStatus: null,
          newStatus: 'scheduled',
          changedBy: ctx.userId,
          changedByRole: ctx.role,
          reason: 'clinic_created',
          metadata: { source: 'clinic_billing' }
        }
      });

      return tx.appointment.findUnique({
        where: { id: created.id },
        include: {
          patient: { include: { patientProfile: true } },
          dentist: { select: { id: true, name: true, email: true } }
        }
      });
    });

    return res.status(201).json({ appointment: serializeAppointment(appointment) });
  } catch (error) {
    return sendError(res, error, 500, 'Failed to create appointment');
  }
});

router.post('/invoices', authenticateToken, async (req, res) => {
  try {
    const ctx = await getContext(req);
    const appointmentId = toBigInt(req.body?.appointmentId, 'appointmentId');
    const amount = parsePositiveAmount(req.body?.amount);
    const description = String(req.body?.description || 'Konsultasi Klinik').trim();

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { include: { patientProfile: true } },
        dentist: { select: { id: true, name: true, email: true } },
        invoices: {
          include: { items: true, patient: { include: { patientProfile: true } } },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });
    if (!appointment) {
      return res.status(404).json({ error: 'APPOINTMENT_NOT_FOUND' });
    }
    const branchId = assertCanAccessBranch(ctx, req.body?.branchId || appointment.clinicBranchId);
    if (appointment.clinicBranchId?.toString() !== branchId.toString()) {
      return res.status(403).json({ error: 'BRANCH_ACCESS_DENIED' });
    }

    const existingInvoice = appointment.invoices?.[0];
    if (existingInvoice && !['cancelled', 'void'].includes(existingInvoice.status)) {
      return res.status(200).json({ invoice: serializeInvoice(existingInvoice) });
    }

    const split = calculateClinicSplit(amount);
    const invoice = await prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          appointmentId: appointment.id,
          patientId: appointment.patientId,
          clinicBranchId: branchId,
          ownerType: 'clinic',
          ownerClinicId: ctx.clinicProfileId,
          ownerDentistId: null,
          reference: `CL-${appointment.id.toString()}-${Date.now()}`,
          status: 'issued',
          subtotal: amount,
          tax: 0,
          discount: 0,
          total: amount,
          platformFee: split.platformFee,
          clinicShare: split.clinicShare,
          dentistShare: split.dentistShare,
          grandTotal: split.grandTotal,
          currency: 'IDR',
          issuedAt: new Date(),
          dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          issuerType: 'clinic',
          issuerName: 'Clinic Portal',
          issuerSnapshot: {
            clinicProfileId: ctx.clinicProfileId.toString(),
            branchId: branchId.toString(),
            createdByStaffId: ctx.staffId.toString()
          },
          metadata: {
            source: 'clinic_billing',
            appointmentId: appointment.id.toString(),
            branchId: branchId.toString(),
            createdByStaffId: ctx.staffId.toString()
          }
        }
      });

      await tx.invoiceLineItem.create({
        data: {
          invoiceId: created.id,
          description,
          quantity: 1,
          unitPrice: amount,
          total: amount,
          metadata: { source: 'clinic_billing' }
        }
      });

      return tx.invoice.findUnique({
        where: { id: created.id },
        include: {
          items: true,
          patient: { include: { patientProfile: true } }
        }
      });
    });

    return res.status(201).json({ invoice: serializeInvoice(invoice) });
  } catch (error) {
    return sendError(res, error, 500, 'Failed to create invoice');
  }
});

router.get('/invoices/:invoiceId', authenticateToken, async (req, res) => {
  try {
    const ctx = await getContext(req);
    assertCanAccessClinicPayment(ctx);
    const invoice = await prisma.invoice.findUnique({
      where: { id: toBigInt(req.params.invoiceId, 'invoiceId') },
      include: {
        items: true,
        patient: { include: { patientProfile: true } },
        paymentIntent: true,
        appointment: {
          include: {
            dentist: { select: { id: true, name: true, email: true } },
            clinicBranch: true
          }
        }
      }
    });
    if (!invoice) {
      return res.status(404).json({ error: 'INVOICE_NOT_FOUND' });
    }
    if (!invoice.appointmentId) {
      return res.status(400).json({ error: 'INVOICE_APPOINTMENT_REQUIRED' });
    }

    const branchId = invoice.clinicBranchId || invoice.appointment?.clinicBranchId;
    assertCanAccessBranch(ctx, branchId);
    if (invoice.ownerClinicId?.toString() !== ctx.clinicProfileId.toString()) {
      return res.status(403).json({ error: 'BRANCH_ACCESS_DENIED' });
    }

    return res.json({
      invoice: {
        ...serializeInvoice(invoice),
        patient: invoice.patient ? serializePatient(invoice.patient) : null,
        paymentIntent: invoice.paymentIntent ? serializePaymentIntent(invoice.paymentIntent, invoice) : null,
        appointment: invoice.appointment ? serializeAppointment(invoice.appointment) : null
      }
    });
  } catch (error) {
    return sendError(res, error, 403, 'FORBIDDEN');
  }
});

router.get('/history', authenticateToken, async (req, res) => {
  try {
    const ctx = await getContext(req);
    assertCanAccessClinicPayment(ctx);

    let branchFilter;
    if (req.query.branchId) {
      const branchId = assertCanAccessBranch(ctx, req.query.branchId);
      branchFilter = { clinicBranchId: branchId };
    } else if (ctx.allowedBranchIds?.length) {
      branchFilter = { clinicBranchId: { in: ctx.allowedBranchIds } };
    } else {
      branchFilter = { clinicBranchId: { in: [] } };
    }

    const invoiceWhere = {
      ownerType: 'clinic',
      ownerClinicId: ctx.clinicProfileId,
      ...branchFilter
    };
    const paymentWhere = {
      ownerType: 'clinic',
      ownerClinicId: ctx.clinicProfileId,
      ...branchFilter
    };

    const [invoices, payments] = await Promise.all([
      prisma.invoice.findMany({
        where: invoiceWhere,
        include: {
          patient: { include: { patientProfile: true } },
          items: true,
          paymentIntent: true,
          appointment: {
            select: {
              id: true,
              startsAt: true,
              reason: true,
              dentist: { select: { name: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      }),
      prisma.paymentIntent.findMany({
        where: paymentWhere,
        include: {
          patient: { select: { id: true, name: true, email: true, phone_number: true } },
          invoices: { take: 1 },
          appointment: {
            select: {
              startsAt: true,
              reason: true,
              dentist: { select: { name: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      })
    ]);

    return res.json({
      invoices: invoices.map(serializeInvoice),
      payments: payments.map((payment) => serializePaymentIntent(payment, payment.invoices?.[0] || null))
    });
  } catch (error) {
    return sendError(res, error, 500, 'Failed to load billing history');
  }
});

router.post('/payments/cash', authenticateToken, async (req, res) => {
  try {
    const ctx = await getContext(req);
    const branchId = assertCanAccessBranch(ctx, req.body?.branchId);
    const invoice = await loadInvoiceForPayment(req.body?.invoiceId);
    const amount = assertInvoicePayable(invoice, branchId, req.body?.amount);
    await assertNoOtherActiveAppointmentPayment(invoice.appointmentId, invoice.paymentIntentId);

    const result = await prisma.$transaction(async (tx) => {
      const intent = await tx.paymentIntent.create({
        data: {
          appointmentId: invoice.appointmentId,
          activeAppointmentId: invoice.appointmentId,
          patientId: invoice.patientId,
          clinicBranchId: branchId,
          ownerType: 'clinic',
          ownerClinicId: ctx.clinicProfileId,
          ownerDentistId: null,
          amount,
          currency: invoice.currency || 'IDR',
          status: 'pending',
          provider: 'cash',
          providerOrderId: `CASH-${invoice.id.toString()}-${Date.now()}`,
          providerPaymentId: `cash-${invoice.id.toString()}-${Date.now()}`,
          metadata: {
            invoiceId: invoice.id.toString(),
            method: 'cash',
            branchId: branchId.toString(),
            receivedByStaffId: ctx.staffId.toString(),
            receivedByUserId: ctx.userId.toString(),
            notes: req.body?.notes || null,
            source: 'clinic_billing'
          },
          providerResponse: {
            method: 'cash',
            status_message: 'Cash payment recorded by clinic cashier'
          }
        }
      });

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paymentIntentId: intent.id,
          clinicBranchId: branchId,
          status: 'issued',
          metadata: {
            ...normalizeMetadata(invoice.metadata),
            paymentIntentId: intent.id.toString(),
            paidBy: 'cash',
            receivedByStaffId: ctx.staffId.toString()
          }
        }
      });

      await tx.financialAuditLog.create({
        data: {
          actorId: ctx.userId,
          actorRole: ctx.role,
          entityType: 'payment_intent',
          entityId: intent.id.toString(),
          action: 'clinic_cash_payment_recorded',
          metadata: {
            invoiceId: invoice.id.toString(),
            appointmentId: invoice.appointmentId?.toString?.(),
            branchId: branchId.toString(),
            amount
          }
        }
      });

      await applyPaymentStatus({
        paymentIntentId: intent.id.toString(),
        newStatus: 'paid',
        providerPaymentId: intent.providerPaymentId,
        providerResponse: { method: 'cash', paidAt: new Date().toISOString() },
        tx
      });

      return tx.paymentIntent.findUnique({
        where: { id: intent.id },
        include: {
          patient: { select: { id: true, name: true, email: true, phone_number: true } },
          invoices: { include: { items: true, patient: { include: { patientProfile: true } } }, take: 1 },
          appointment: true
        }
      });
    });

    await emitClinicPaymentUpdate(req, {
      type: 'cash_payment_paid',
      paymentIntentId: result.id.toString(),
      invoiceId: invoice.id.toString(),
      appointmentId: invoice.appointmentId?.toString?.(),
      branchId: branchId.toString(),
      status: 'paid'
    });

    return res.status(201).json({
      payment: serializePaymentIntent(result, result.invoices?.[0] || invoice),
      invoice: result.invoices?.[0] ? serializeInvoice(result.invoices[0]) : null,
      message: 'Pembayaran Berhasil'
    });
  } catch (error) {
    return sendError(res, error, 500, 'Failed to record cash payment');
  }
});

router.post('/payments/midtrans', authenticateToken, async (req, res) => {
  try {
    const ctx = await getContext(req);
    const branchId = assertCanAccessBranch(ctx, req.body?.branchId);
    const invoice = await loadInvoiceForPayment(req.body?.invoiceId);

    if (!invoice) {
      return res.status(404).json({ error: 'INVOICE_NOT_FOUND' });
    }
    const invoiceBranchId = invoice.clinicBranchId || invoice.appointment?.clinicBranchId;
    if (!invoiceBranchId || invoiceBranchId.toString() !== branchId.toString()) {
      return res.status(403).json({ error: 'BRANCH_ACCESS_DENIED' });
    }
    if (['paid', 'settled'].includes(String(invoice.status).toLowerCase())) {
      return res.status(409).json({ error: 'INVOICE_ALREADY_PAID' });
    }

    if (invoice.paymentIntent) {
      if (canReuseMidtransIntent(invoice.paymentIntent)) {
        return res.status(200).json({
          payment: serializePaymentIntent(invoice.paymentIntent, invoice),
          snapToken: normalizeMetadata(invoice.paymentIntent.metadata).snapToken || null,
          redirectUrl: invoice.paymentIntent.redirectUrl,
          status: 'pending'
        });
      }
      if (ACTIVE_PAYMENT_STATUSES.has(invoice.paymentIntent.status)) {
        return res.status(409).json({ error: 'INVOICE_HAS_ACTIVE_PAYMENT' });
      }
    }
    await assertNoOtherActiveAppointmentPayment(invoice.appointmentId, invoice.paymentIntentId);

    const amount = invoice.grandTotal || invoice.total;
    const orderId = `CLINIC-${invoice.id.toString()}-${Date.now()}`;
    const itemDetails = invoice.items?.length
      ? invoice.items.map((item) => ({
          id: `INV-${invoice.id.toString()}-${item.id.toString()}`,
          price: item.unitPrice,
          quantity: item.quantity || 1,
          name: item.description
        }))
      : [{
          id: `INV-${invoice.id.toString()}`,
          price: amount,
          quantity: 1,
          name: invoice.appointment?.reason || 'Konsultasi Klinik'
        }];

    const providerResult = await midtransService.createSnapTransaction({
      orderId,
      grossAmount: amount,
      customerDetails: {
        firstName: invoice.patient?.name || 'Pasien',
        lastName: '',
        email: invoice.patient?.email || undefined,
        phone: invoice.patient?.phone_number || '0000000000'
      },
      itemDetails
    });
    const expiresAt = resolveSnapExpiry(providerResult.expiresAt || providerResult.expiryTime);

    const intent = await prisma.$transaction(async (tx) => {
      const created = await tx.paymentIntent.create({
        data: {
          appointmentId: invoice.appointmentId,
          activeAppointmentId: invoice.appointmentId,
          patientId: invoice.patientId,
          clinicBranchId: branchId,
          ownerType: 'clinic',
          ownerClinicId: ctx.clinicProfileId,
          ownerDentistId: null,
          amount,
          currency: invoice.currency || 'IDR',
          status: 'requires_action',
          provider: 'midtrans',
          providerOrderId: orderId,
          redirectUrl: providerResult.redirectUrl,
          expiresAt,
          metadata: {
            snapToken: providerResult.snapToken,
            invoiceId: invoice.id.toString(),
            appointmentId: invoice.appointmentId?.toString?.(),
            branchId: branchId.toString(),
            initiatedByStaffId: ctx.staffId.toString(),
            initiatedByUserId: ctx.userId.toString(),
            source: 'clinic_billing'
          },
          providerResponse: {
            ...providerResult,
            environment: process.env.MIDTRANS_IS_PRODUCTION === 'true' ? 'production' : 'sandbox'
          }
        }
      });

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paymentIntentId: created.id,
          clinicBranchId: branchId,
          status: 'issued',
          metadata: {
            ...normalizeMetadata(invoice.metadata),
            paymentIntentId: created.id.toString(),
            midtransOrderId: orderId
          }
        }
      });

      await tx.financialAuditLog.create({
        data: {
          actorId: ctx.userId,
          actorRole: ctx.role,
          entityType: 'payment_intent',
          entityId: created.id.toString(),
          action: 'clinic_midtrans_payment_initiated',
          metadata: {
            invoiceId: invoice.id.toString(),
            appointmentId: invoice.appointmentId?.toString?.(),
            branchId: branchId.toString(),
            amount,
            orderId
          }
        }
      });

      return tx.paymentIntent.findUnique({
        where: { id: created.id },
        include: {
          patient: { select: { id: true, name: true, email: true, phone_number: true } },
          invoices: { take: 1 },
          appointment: true
        }
      });
    });

    await emitClinicPaymentUpdate(req, {
      type: 'midtrans_payment_pending',
      paymentIntentId: intent.id.toString(),
      invoiceId: invoice.id.toString(),
      appointmentId: invoice.appointmentId?.toString?.(),
      branchId: branchId.toString(),
      status: 'pending'
    });

    return res.status(201).json({
      payment: serializePaymentIntent(intent, invoice),
      snapToken: providerResult.snapToken,
      redirectUrl: providerResult.redirectUrl,
      expiresAt: expiresAt.toISOString(),
      status: 'pending',
      environment: process.env.MIDTRANS_IS_PRODUCTION === 'true' ? 'production' : 'sandbox',
      message: 'Menunggu Pembayaran Midtrans'
    });
  } catch (error) {
    if (error?.code === 'MIDTRANS_API_ERROR') {
      return sendError(res, error, error.statusCode || 502, 'Failed to initiate Midtrans payment');
    }
    return sendError(res, error, 500, 'Failed to initiate Midtrans payment');
  }
});

export default router;
