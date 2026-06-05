import express from 'express';
import { authenticateToken, requireRoles } from '../utils/tokens.js';
import { PrismaClient } from '@prisma/client';
import {
  createMidtransTransaction,
  getMidtransClientConfig,
  cancelMidtransTransaction
} from '../services/payments/midtrans.js';
import {
  applyPaymentStatus,
  VALID_PAYMENT_STATUSES,
  ACTIVE_PAYMENT_STATUSES
} from '../services/payments/status.js';
import { FINANCIAL_OWNER_TYPES, normalizeFinancialOwnerType, resolvePaymentOwner } from '../services/payments/ownership.js';
import { ensureInvoiceForPaymentIntent } from '../services/payments/financials.js';
import snapTransactionsRouter from './payments/snapTransactions.js';
import paymentStatusRouter from './payments/status.js';
import { generateInvoicePDF } from '../services/payments/pdfGenerator.js';
import { processRefund } from '../services/payments/refundService.js';
import { recordFinancialAuditLog } from '../services/audit/auditLogger.js';

const router = express.Router();
const prisma = new PrismaClient();

router.use('/snap-transactions', snapTransactionsRouter);
router.use('/', paymentStatusRouter);

function toBigInt(value, fieldName) {
  try {
    return BigInt(value);
  } catch (err) {
    const error = new Error(`INVALID_${fieldName?.toUpperCase() || 'ID'}`);
    error.status = 400;
    throw error;
  }
}

function serializePaymentIntent(intent) {
  if (!intent) return null;
    return {
      id: intent.id.toString(),
      appointmentId: intent.appointmentId?.toString?.() ?? intent.appointment_id?.toString?.() ?? null,
      patientId: intent.patientId?.toString?.() ?? intent.patient_id?.toString?.() ?? null,
      ownerType: intent.ownerType ?? intent.owner_type ?? null,
      ownerClinicId: intent.ownerClinicId?.toString?.() ?? intent.owner_clinic_id?.toString?.() ?? null,
      ownerDentistId: intent.ownerDentistId?.toString?.() ?? intent.owner_dentist_id?.toString?.() ?? null,
      amount: intent.amount,
      currency: intent.currency,
    status: intent.status,
    provider: intent.provider,
    idempotencyKey: intent.idempotencyKey ?? intent.idempotency_key ?? null,
    providerOrderId: intent.providerOrderId ?? intent.provider_order_id ?? null,
    providerPaymentId: intent.providerPaymentId ?? intent.provider_payment_id ?? null,
    redirectUrl: intent.redirectUrl ?? intent.redirect_url ?? null,
    expiresAt: intent.expiresAt ?? intent.expires_at ?? null,
    reconciliationStatus: intent.reconciliationStatus ?? intent.reconciliation_status ?? null,
    lastReconciledAt: intent.lastReconciledAt ?? intent.last_reconciled_at ?? null,
    callbackVerifiedAt: intent.callbackVerifiedAt ?? intent.callback_verified_at ?? null,
    metadata: intent.metadata || {},
    providerResponse: intent.providerResponse ?? intent.provider_response ?? {},
      createdAt: intent.createdAt ?? intent.created_at,
      updatedAt: intent.updatedAt ?? intent.updated_at,
    appointment: intent.appointment
      ? {
          id: intent.appointment.id.toString(),
          dentistId: intent.appointment.dentistId?.toString?.() ?? null,
          patientId: intent.appointment.patientId?.toString?.() ?? null,
          startsAt: intent.appointment.startsAt ?? intent.appointment.starts_at,
          endsAt: intent.appointment.endsAt ?? intent.appointment.ends_at,
          status: intent.appointment.status,
          reason: intent.appointment.reason,
          chatRoomRef: intent.appointment.chatRoomRef ?? intent.appointment.chat_room_ref ?? null,
          videoRoomRef: intent.appointment.videoRoomRef ?? intent.appointment.video_room_ref ?? null
        }
      : null,
    patient: intent.patient
      ? {
          id: intent.patient.id.toString(),
          name: intent.patient.name,
          email: intent.patient.email,
          phone: intent.patient.phone_number
        }
      : null
    };
}

function isActivePaymentStatus(status) {
  return ACTIVE_PAYMENT_STATUSES.has(status);
}

router.post(
  '/',
  authenticateToken,
  requireRoles(['patient']),
  async (req, res) => {
    try {
      const patientId = toBigInt(req.user.id, 'patientId');
      const { appointmentId: appointmentIdRaw, amount, currency = 'IDR' } = req.body || {};
      const requestIdempotencyKey = req.get('Idempotency-Key') || req.body?.idempotencyKey || null;

      if (!appointmentIdRaw) {
        return res.status(400).json({ error: 'appointmentId is required' });
      }
      const appointmentId = toBigInt(appointmentIdRaw, 'appointmentId');

      if (!amount || Number.isNaN(parseInt(amount, 10)) || parseInt(amount, 10) <= 0) {
        return res.status(400).json({ error: 'amount must be a positive integer (minor units)' });
      }
      const parsedAmount = parseInt(amount, 10);

      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          patient: { select: { id: true, name: true, email: true, phone_number: true } },
          dentist: { select: { id: true, name: true } }
        }
      });

      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }
      if (appointment.patientId !== patientId) {
        return res.status(403).json({ error: 'You can only create payments for your own appointments' });
      }

      if (requestIdempotencyKey) {
        const existingByKey = await prisma.paymentIntent.findFirst({
          where: {
            patientId,
            idempotencyKey: requestIdempotencyKey
          },
          include: {
            appointment: true,
            patient: { select: { id: true, name: true, email: true, phone_number: true } }
          }
        });

        if (existingByKey) {
          const midtransConfig = getMidtransClientConfig();
          return res.status(200).json({
            paymentIntent: serializePaymentIntent(existingByKey),
            provider: midtransConfig
              ? {
                  name: 'midtrans',
                  redirectUrl: existingByKey.redirectUrl ?? existingByKey.redirect_url ?? null,
                  clientKey: midtransConfig.clientKey
                }
              : null
          });
        }
      }

      const existingIntent = await prisma.paymentIntent.findFirst({
        where: { activeAppointmentId: appointmentId },
        include: {
          appointment: true,
          patient: { select: { id: true, name: true, email: true, phone_number: true } }
        }
      }).catch(() => null);

      if (existingIntent && isActivePaymentStatus(existingIntent.status)) {
        const midtransConfig = getMidtransClientConfig();
        return res.status(200).json({
          paymentIntent: serializePaymentIntent(existingIntent),
          provider: midtransConfig
            ? {
                name: 'midtrans',
                redirectUrl: existingIntent.redirectUrl ?? existingIntent.redirect_url ?? null,
                clientKey: midtransConfig.clientKey
              }
            : null
        });
      }

      const isSimulated = process.env.PAYMENT_MODE === 'simulated';

      if (isSimulated) {
        const owner = resolvePaymentOwner(appointment);
        const orderId = `simulated-${appointmentId.toString()}-${Date.now()}`;

        const simulatedIntent = await prisma.$transaction(async (tx) => {
          const createdIntent = await tx.paymentIntent.create({
            data: {
              appointmentId,
              activeAppointmentId: appointmentId,
              patientId,
              ownerType: owner.ownerType,
              ownerClinicId: owner.ownerClinicId,
              ownerDentistId: owner.ownerDentistId,
              amount: parsedAmount,
              currency,
              status: 'succeeded',
              provider: 'SIMULATED',
              idempotencyKey: requestIdempotencyKey,
              providerOrderId: orderId,
              providerPaymentId: `sim-pay-${Date.now()}`,
              redirectUrl: `/payment/simulated-success?orderId=${orderId}`,
              expiresAt: new Date(Date.now() + 30 * 60 * 1000),
              providerResponse: { payment_mode: 'simulated', success: true },
              metadata: {}
            },
            include: {
              appointment: true,
              patient: { select: { id: true, name: true, email: true, phone_number: true } }
            }
          });

          await ensureInvoiceForPaymentIntent({
            tx,
            paymentIntent: createdIntent,
            appointment,
            patient: appointment.patient,
            items: [
              {
                name: appointment.reason || 'Dental Appointment',
                quantity: 1,
                price: parsedAmount
              }
            ]
          });

          // Mark Invoice as PAID
          const invoiceRecord = await tx.invoice.findFirst({
            where: { paymentIntentId: createdIntent.id }
          });
          if (invoiceRecord) {
            await tx.invoice.update({
              where: { id: invoiceRecord.id },
              data: {
                status: 'paid',
                paymentStatus: 'paid',
                paymentDate: new Date()
              }
            });
          }

          // Mark Appointment as CONFIRMED / APPROVED
          await tx.appointment.update({
            where: { id: appointmentId },
            data: {
              status: 'confirmed'
            }
          });

          return createdIntent;
        });

        // Trigger real-time notifications via event emitters or websockets if global io/sockets is defined.
        if (req.app && req.app.get('io')) {
          const io = req.app.get('io');
          io.emit('notification:new', {
            type: 'PAYMENT_SUCCESS',
            paymentIntentId: simulatedIntent.id.toString(),
            appointmentId: appointmentId.toString(),
            message: `Pembayaran simulasi untuk appointment #${appointmentId} berhasil.`
          });
        }

        return res.status(201).json({
          paymentIntent: serializePaymentIntent(simulatedIntent),
          provider: {
            name: 'SIMULATED',
            redirectUrl: simulatedIntent.redirectUrl,
            clientKey: 'simulated-key'
          }
        });
      }

      const midtransConfig = getMidtransClientConfig();
      if (!midtransConfig) {
        return res.status(500).json({ error: 'Midtrans client configuration missing on server' });
      }

      const owner = resolvePaymentOwner(appointment);
      const orderId = `appointment-${appointmentId.toString()}-${Date.now()}`;

      let providerResult;
      try {
        providerResult = await createMidtransTransaction({
          paymentIntent: { id: appointmentId, amount: parsedAmount },
          appointment,
          patient: appointment.patient,
          orderId
        });
      } catch (error) {
        console.error('Midtrans create transaction error:', error?.message || error);
        return res.status(error.status || 502).json({ error: 'Failed to initiate payment with provider' });
      }

      let updatedIntent;
      try {
        updatedIntent = await prisma.$transaction(async (tx) => {
          const createdIntent = await tx.paymentIntent.create({
            data: {
              appointmentId,
              activeAppointmentId: appointmentId,
              patientId,
              ownerType: owner.ownerType,
              ownerClinicId: owner.ownerClinicId,
              ownerDentistId: owner.ownerDentistId,
              amount: parsedAmount,
              currency,
              status: 'requires_action',
              provider: 'midtrans',
              idempotencyKey: requestIdempotencyKey,
              providerOrderId: providerResult.providerOrderId,
              providerPaymentId: providerResult.providerPaymentId,
              redirectUrl: providerResult.redirectUrl,
              expiresAt: providerResult.expiresAt,
              providerResponse: providerResult.rawResponse,
              metadata: {}
            },
            include: {
              appointment: true,
              patient: { select: { id: true, name: true, email: true, phone_number: true } }
            }
          });

          await ensureInvoiceForPaymentIntent({
            tx,
            paymentIntent: createdIntent,
            appointment,
            patient: appointment.patient,
            items: [
              {
                name: appointment.reason || 'Dental Appointment',
                quantity: 1,
                price: parsedAmount
              }
            ]
          });

          return createdIntent;
        });
      } catch (error) {
        if (error?.code === 'P2002') {
          if (providerResult?.providerOrderId) {
            await cancelMidtransTransaction(providerResult.providerOrderId).catch(() => null);
          }
          const activeIntent = await prisma.paymentIntent.findFirst({
            where: { activeAppointmentId: appointmentId },
            include: {
              appointment: true,
              patient: { select: { id: true, name: true, email: true, phone_number: true } }
            }
          });
          if (activeIntent) {
            return res.status(200).json({
              paymentIntent: serializePaymentIntent(activeIntent),
              provider: {
                name: 'midtrans',
                redirectUrl: activeIntent.redirectUrl ?? null,
                clientKey: midtransConfig.clientKey
              }
            });
          }
        }
        throw error;
      }

      return res.status(201).json({
        paymentIntent: serializePaymentIntent(updatedIntent),
        provider: {
          name: 'midtrans',
          redirectUrl: providerResult.redirectUrl,
          clientKey: midtransConfig.clientKey
        }
      });
    } catch (error) {
      console.error('Error creating payment intent:', error);
      if (error.status === 400 && error.message?.startsWith('INVALID_')) {
        return res.status(400).json({ error: error.message.replace('INVALID_', '').toLowerCase() });
      }
      return res.status(500).json({ error: 'Failed to create payment intent' });
    }
  }
);

router.post(
  '/:intentId/confirm',
  authenticateToken,
  requireRoles(['patient']),
  async (req, res) => {
    const { intentId } = req.params;
    const patientId = toBigInt(req.user.id, 'patientId');
    const status = req.body?.status || 'succeeded';
    const providerPaymentId = req.body?.providerPaymentId || req.body?.provider_payment_id || null;
    const failureReason = req.body?.failureReason || req.body?.failure_reason || null;
    const providerResponse = req.body?.providerResponse || {};

    try {
      if (!VALID_PAYMENT_STATUSES.includes(status)) {
        return res.status(400).json({ error: `Invalid status: ${status}` });
      }

      const paymentIntentId = toBigInt(intentId, 'intentId');
      const paymentIntent = await prisma.paymentIntent.findUnique({
        where: { id: paymentIntentId },
        select: { patientId: true }
      });

      if (!paymentIntent) {
        return res.status(404).json({ error: 'Payment intent not found' });
      }

      if (paymentIntent.patientId !== patientId) {
        return res.status(403).json({ error: 'You can only confirm your own payments' });
      }

      const result = await applyPaymentStatus({
        paymentIntentId,
        newStatus: status,
        providerPaymentId,
        providerResponse,
        failureReason
      });

      return res.json({
        paymentIntent: serializePaymentIntent(result.paymentIntent),
        appointmentStatus: result.appointmentStatus
      });
    } catch (error) {
      console.error('Error confirming payment intent:', error);
      if (error.status) {
        return res.status(error.status).json({ error: error.message.toLowerCase() });
      }
      return res.status(500).json({ error: 'Failed to update payment intent' });
    }
  }
);

router.get(
  '/invoices/:invoiceId',
  authenticateToken,
  async (req, res) => {
    try {
      const { invoiceId } = req.params;
      const parsedInvoiceId = toBigInt(invoiceId, 'invoiceId');

      const invoice = await prisma.invoice.findUnique({
        where: { id: parsedInvoiceId },
        include: {
          items: true,
          patient: { select: { id: true, name: true, email: true, phone_number: true } },
          paymentIntent: true,
          appointment: {
            include: {
              dentist: { select: { name: true } }
            }
          }
        }
      });

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      const userId = toBigInt(req.user.id, 'userId');
      const userRoles = req.user.roles || [];
      const isAdmin = userRoles.includes('admin') || userRoles.includes('super_admin') || userRoles.includes('finance_manager');

      // 1. Patient check
      const isPatient = invoice.patientId === userId;

      // 2. Dentist check (only if dentist owns the invoice)
      const invoiceOwnerType = normalizeFinancialOwnerType(invoice.ownerType);
      const isDentist = invoiceOwnerType === FINANCIAL_OWNER_TYPES.INDEPENDENT_DENTIST && invoice.ownerDentistId === userId;

      // 3. Clinic check (only if clinic owns the invoice and user belongs to clinic)
      let isClinicStaff = false;
      if (invoiceOwnerType === FINANCIAL_OWNER_TYPES.CLINIC && invoice.ownerClinicId) {
        // Resolve clinic profile for current user
        let userClinicProfile = await prisma.clinicProfile.findFirst({
          where: { userId }
        });
        if (!userClinicProfile) {
          const staffRecord = await prisma.clinicStaff.findFirst({
            where: { userId },
            select: { clinicProfileId: true }
          });
          if (staffRecord) {
            userClinicProfile = { id: staffRecord.clinicProfileId };
          }
        }
        if (userClinicProfile && userClinicProfile.id === invoice.ownerClinicId) {
          isClinicStaff = true;
        }
      }

      if (!isPatient && !isDentist && !isClinicStaff && !isAdmin) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Serialize BigInts cleanly
      const serializedInvoice = {
        ...invoice,
        id: invoice.id.toString(),
        appointmentId: invoice.appointmentId?.toString?.() ?? null,
        paymentIntentId: invoice.paymentIntentId?.toString?.() ?? null,
        patientId: invoice.patientId.toString(),
        ownerClinicId: invoice.ownerClinicId?.toString?.() ?? null,
        ownerDentistId: invoice.ownerDentistId?.toString?.() ?? null,
        items: invoice.items.map((item) => ({
          ...item,
          id: item.id.toString(),
          invoiceId: item.invoiceId.toString()
        })),
        patient: invoice.patient ? {
          id: invoice.patient.id.toString(),
          name: invoice.patient.name,
          email: invoice.patient.email,
          phone: invoice.patient.phone_number
        } : null,
        paymentIntent: invoice.paymentIntent ? serializePaymentIntent(invoice.paymentIntent) : null,
        appointment: invoice.appointment ? {
          ...invoice.appointment,
          id: invoice.appointment.id.toString(),
          dentistId: invoice.appointment.dentistId.toString(),
          patientId: invoice.appointment.patientId.toString(),
          dentist: invoice.appointment.dentist
        } : null
      };

      return res.json({ invoice: serializedInvoice });
    } catch (error) {
      console.error('Error fetching invoice:', error);
      if (error.status === 400 && error.message?.startsWith('INVALID_')) {
        return res.status(400).json({ error: error.message.replace('INVALID_', '').toLowerCase() });
      }
      return res.status(500).json({ error: 'Failed to fetch invoice' });
    }
  }
);

router.get(
  '/:intentId',
  authenticateToken,
  async (req, res) => {
    try {
      const { intentId } = req.params;
      const paymentIntentId = toBigInt(intentId, 'intentId');

      const paymentIntent = await prisma.paymentIntent.findUnique({
        where: { id: paymentIntentId },
        include: {
          appointment: true,
          patient: { select: { id: true, name: true, email: true, phone_number: true } }
        }
      });

      if (!paymentIntent) {
        return res.status(404).json({ error: 'Payment intent not found' });
      }

      const userId = toBigInt(req.user.id, 'userId');
      const userRoles = req.user.roles || [];
      const isPatient = paymentIntent.patientId === userId;
      const paymentOwnerType = normalizeFinancialOwnerType(paymentIntent.ownerType);
      const isDentistOwner = paymentOwnerType === FINANCIAL_OWNER_TYPES.INDEPENDENT_DENTIST && paymentIntent.ownerDentistId === userId;
      const isAdmin = userRoles.includes('admin') || userRoles.includes('super_admin') || userRoles.includes('finance_manager');

      let isClinicStaff = false;
      if (paymentOwnerType === FINANCIAL_OWNER_TYPES.CLINIC && paymentIntent.ownerClinicId) {
        let userClinicProfile = await prisma.clinicProfile.findFirst({
          where: { userId }
        });
        if (!userClinicProfile) {
          const staffRecord = await prisma.clinicStaff.findFirst({
            where: { userId },
            select: { clinicProfileId: true }
          });
          if (staffRecord) {
            userClinicProfile = { id: staffRecord.clinicProfileId };
          }
        }
        if (userClinicProfile && userClinicProfile.id === paymentIntent.ownerClinicId) {
          isClinicStaff = true;
        }
      }

      if (!isPatient && !isDentistOwner && !isClinicStaff && !isAdmin) {
        return res.status(403).json({ error: 'Access denied' });
      }

      return res.json({ paymentIntent: serializePaymentIntent(paymentIntent) });
    } catch (error) {
      console.error('Error fetching payment intent:', error);
      if (error.status === 400 && error.message?.startsWith('INVALID_')) {
        return res.status(400).json({ error: error.message.replace('INVALID_', '').toLowerCase() });
      }
      return res.status(500).json({ error: 'Failed to fetch payment intent' });
    }
  }
);

router.get(
  '/invoices/:invoiceId/pdf',
  authenticateToken,
  async (req, res) => {
    try {
      const { invoiceId } = req.params;
      const parsedInvoiceId = toBigInt(invoiceId, 'invoiceId');

      const invoice = await prisma.invoice.findUnique({
        where: { id: parsedInvoiceId },
        include: {
          items: true,
          patient: { select: { id: true, name: true, email: true, phone_number: true } },
          paymentIntent: true,
          paymentSnapshot: true,
          ownerClinic: true,
          appointment: {
            include: {
              dentist: { select: { name: true, email: true } }
            }
          }
        }
      });

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      const userId = toBigInt(req.user.id, 'userId');
      const userRoles = req.user.roles || [];
      const isAdmin = userRoles.includes('admin') || userRoles.includes('super_admin') || userRoles.includes('finance_manager');

      const isPatient = invoice.patientId === userId;
      const invoiceOwnerType = normalizeFinancialOwnerType(invoice.ownerType);
      const isDentist = invoiceOwnerType === FINANCIAL_OWNER_TYPES.INDEPENDENT_DENTIST && invoice.ownerDentistId === userId;

      let isClinicStaff = false;
      if (invoiceOwnerType === FINANCIAL_OWNER_TYPES.CLINIC && invoice.ownerClinicId) {
        let userClinicProfile = await prisma.clinicProfile.findFirst({
          where: { userId }
        });
        if (!userClinicProfile) {
          const staffRecord = await prisma.clinicStaff.findFirst({
            where: { userId },
            select: { clinicProfileId: true }
          });
          if (staffRecord) {
            userClinicProfile = { id: staffRecord.clinicProfileId };
          }
        }
        if (userClinicProfile && userClinicProfile.id === invoice.ownerClinicId) {
          isClinicStaff = true;
        }
      }

      if (!isPatient && !isDentist && !isClinicStaff && !isAdmin) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Record audit log
      await recordFinancialAuditLog({
        actorId: req.user.id,
        actorRole: userRoles[0] || 'anonymous',
        entityType: 'invoice',
        entityId: invoiceId,
        action: 'invoice_pdf_downloaded',
        metadata: { reference: invoice.reference },
        req
      });

      // Stream PDF response
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Invoice-${invoice.reference || invoice.id}.pdf"`);

      generateInvoicePDF(invoice, res);

    } catch (error) {
      console.error('Error generating PDF invoice:', error);
      if (error.status === 400 && error.message?.startsWith('INVALID_')) {
        return res.status(400).json({ error: error.message.replace('INVALID_', '').toLowerCase() });
      }
      return res.status(500).json({ error: 'Failed to generate PDF invoice' });
    }
  }
);

router.post(
  '/refunds',
  authenticateToken,
  async (req, res) => {
    try {
      const { paymentIntentId, refundAmount, refundReason } = req.body;
      const actorId = req.user.id;
      const actorRoles = req.user.roles || [];

      if (!paymentIntentId) {
        return res.status(400).json({ error: 'paymentIntentId is required' });
      }
      if (!refundAmount || Number.isNaN(parseInt(refundAmount, 10)) || parseInt(refundAmount, 10) <= 0) {
        return res.status(400).json({ error: 'refundAmount must be a positive number' });
      }

      const result = await processRefund({
        paymentIntentId,
        refundAmount: parseInt(refundAmount, 10),
        refundReason: refundReason || 'No reason provided',
        actorId,
        actorRoles,
        ipAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null
      });

      return res.status(200).json({
        ok: true,
        refund: {
          id: result.id.toString(),
          paymentIntentId: result.paymentIntentId.toString(),
          refundAmount: result.refundAmount,
          refundReason: result.refundReason,
          refundStatus: result.refundStatus,
          refundRequestedAt: result.refundRequestedAt,
          refundedAt: result.refundedAt
        }
      });
    } catch (error) {
      console.error('Error processing refund:', error);
      if (error.status) {
        return res.status(error.status).json({ error: error.message || error });
      }
      return res.status(500).json({ error: 'Internal server error while processing refund' });
    }
  }
);

export default router;
