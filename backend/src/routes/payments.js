import express from 'express';
import { authenticateToken, requireRoles } from '../utils/tokens.js';
import { PrismaClient } from '@prisma/client';
import {
  createMidtransTransaction,
  getMidtransClientConfig
} from '../services/payments/midtrans.js';
import {
  applyPaymentStatus,
  VALID_PAYMENT_STATUSES
} from '../services/payments/status.js';
import snapTransactionsRouter from './payments/snapTransactions.js';
import paymentStatusRouter from './payments/status.js';

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
        where: { appointmentId },
        select: { id: true, status: true }
      }).catch(() => null);

      if (existingIntent && !['succeeded', 'failed', 'cancelled'].includes(existingIntent.status)) {
        return res.status(409).json({ error: 'Active payment intent already exists for this appointment' });
      }

      const paymentIntent = await prisma.paymentIntent.create({
        data: {
          appointmentId,
          patientId,
          amount: parsedAmount,
          currency,
          status: 'pending',
          provider: 'midtrans',
          idempotencyKey: requestIdempotencyKey,
          metadata: {}
        },
        include: {
          appointment: { select: { id: true, reason: true } },
          patient: { select: { id: true, name: true, email: true, phone_number: true } }
        }
      });

      const midtransConfig = getMidtransClientConfig();
      if (!midtransConfig) {
        return res.status(500).json({ error: 'Midtrans client configuration missing on server' });
      }

      let providerResult;
      try {
        providerResult = await createMidtransTransaction({
          paymentIntent,
          appointment,
          patient: appointment.patient
        });
      } catch (error) {
        console.error('Midtrans create transaction error:', error);
        await prisma.paymentIntent.update({
          where: { id: paymentIntent.id },
          data: {
            status: 'failed',
            providerResponse: { error: error.message, details: error.details || null }
          }
        });
        return res.status(error.status || 502).json({ error: 'Failed to initiate payment with provider' });
      }

      const updatedIntent = await prisma.paymentIntent.update({
        where: { id: paymentIntent.id },
        data: {
          status: 'requires_action',
          providerOrderId: providerResult.providerOrderId,
          providerPaymentId: providerResult.providerPaymentId,
          redirectUrl: providerResult.redirectUrl,
          expiresAt: providerResult.expiresAt,
          providerResponse: providerResult.rawResponse
        },
        include: {
          appointment: true,
          patient: { select: { id: true, name: true, email: true, phone_number: true } }
        }
      });

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
      const isDentist = paymentIntent.appointment?.dentistId === userId;
      const isAdmin = userRoles.includes('admin') || userRoles.includes('super_admin');

      if (!isPatient && !isDentist && !isAdmin) {
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

export default router;
