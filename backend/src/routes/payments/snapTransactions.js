import express from 'express';
import crypto from 'crypto';
import { authenticateToken } from '../../utils/tokens.js';
import { PrismaClient } from '@prisma/client';
import midtransService from '../../services/payments/midtransService.js';
import { resolvePaymentOwner } from '../../services/payments/ownership.js';
import { ensureInvoiceForPaymentIntent } from '../../services/payments/financials.js';
import { ACTIVE_PAYMENT_STATUSES } from '../../services/payments/status.js';

const router = express.Router();
const prisma = new PrismaClient();
const SNAP_EXPIRY_MS = 15 * 60 * 1000;

export function resolveSnapExpiry(value, now = new Date()) {
  const parsed = value ? new Date(value) : null;
  if (parsed && !Number.isNaN(parsed.getTime())) return parsed;
  return new Date(now.getTime() + SNAP_EXPIRY_MS);
}

export function canReuseSnapIntent(intent, now = new Date()) {
  if (!intent || !['pending', 'requires_action'].includes(intent.status)) return false;
  const snapToken = intent.metadata && typeof intent.metadata === 'object' && !Array.isArray(intent.metadata)
    ? intent.metadata.snapToken
    : null;
  if (!snapToken || !intent.redirectUrl) return false;
  if (!intent.expiresAt) return true;
  return new Date(intent.expiresAt).getTime() > now.getTime();
}

export function buildSnapResponse(intent) {
  const snapToken = intent.metadata && typeof intent.metadata === 'object' && !Array.isArray(intent.metadata)
    ? intent.metadata.snapToken
    : null;
  return {
    snapToken,
    redirectUrl: intent.redirectUrl,
    paymentIntentId: intent.id.toString(),
    expiresAt: intent.expiresAt ? new Date(intent.expiresAt).toISOString() : null
  };
}

function isActivePaymentStatus(status) {
  return ACTIVE_PAYMENT_STATUSES.has(status);
}

async function getAppointmentForPayment(appointmentId, userId) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: BigInt(appointmentId) },
    include: {
      dentist: true,
      patient: {
        include: {
          patientProfile: true
        }
      }
    }
  });

  if (!appointment) {
    throw { code: 'NOT_FOUND', message: 'Appointment not found', status: 404 };
  }

  if (appointment.patientId !== BigInt(userId)) {
    throw { code: 'FORBIDDEN', message: 'You are not authorized to pay for this appointment', status: 403 };
  }
  
  if (appointment.status !== 'scheduled' && appointment.status !== 'confirmed') {
     throw { code: 'BAD_REQUEST', message: 'Appointment is not in a payable state', status: 400 };
  }

  const fee = appointment.dentist.consultationFee || 150000;
  return { appointment, fee };
}

// POST /
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { appointmentId } = req.body;
    const userId = req.user.id;

    if (!appointmentId) {
      return res.status(400).json({ error: { code: 'MISSING_PARAMETERS', message: 'appointmentId is required', retryable: false } });
    }

    const { appointment, fee: grossAmount } = await getAppointmentForPayment(appointmentId, userId);

    // 5. Generate Idempotency Key
    const idempotencyStr = `${userId}:${appointmentId}`;
    const idempotencyKey = crypto.createHash('sha256').update(idempotencyStr).digest('hex');

    // 6. Idempotency + active intent check
    const existingIntent = await prisma.paymentIntent.findUnique({
      where: { idempotencyKey }
    });

    if (existingIntent) {
       if (canReuseSnapIntent(existingIntent)) {
         return res.status(200).json(buildSnapResponse(existingIntent));
       }
       if (['pending', 'requires_action'].includes(existingIntent.status)) {
          await prisma.paymentIntent.update({
            where: { id: existingIntent.id },
            data: {
              status: 'expired',
              activeAppointmentId: null,
              idempotencyKey: `${idempotencyKey}:expired:${existingIntent.id.toString()}`,
              metadata: {
                ...(existingIntent.metadata && typeof existingIntent.metadata === 'object' && !Array.isArray(existingIntent.metadata) ? existingIntent.metadata : {}),
                expiredByClientRetry: true
              }
           }
         });
       }
    }

    const activeIntent = await prisma.paymentIntent.findFirst({
      where: { activeAppointmentId: appointment.id }
    });

    if (activeIntent && isActivePaymentStatus(activeIntent.status)) {
      if (canReuseSnapIntent(activeIntent)) {
        return res.status(200).json(buildSnapResponse(activeIntent));
      }
      return res.status(409).json({
        error: {
          code: 'ACTIVE_PAYMENT_EXISTS',
          message: 'Active payment intent already exists for this appointment',
          retryable: false
        }
      });
    }

    // 7. Midtrans Snap Payload Execution
    const orderId = `APT-${appointmentId}-PI-${Date.now()}`;
    const patientProfile = appointment.patient.patientProfile || {};
    
    // Fallbacks since midtrans requires valid string structures 
    const phoneFallback = patientProfile.phoneNumber || appointment.patient.phone;
    
    const customerDetails = {
      firstName: appointment.patient.name,
      lastName: '',
      email: appointment.patient.email,
      phone: phoneFallback ? String(phoneFallback) : '0000000000'
    };

    const itemDetails = [{
      id: `APT-${appointmentId}`,
      price: grossAmount,
      quantity: 1,
      name: `Konsultasi Teledentistry - drg. ${appointment.dentist.name.split(',')[0]}`,
    }];

    const { snapToken, redirectUrl, expiresAt: providerExpiresAt, expiryTime } = await midtransService.createSnapTransaction({
      orderId,
      grossAmount,
      customerDetails,
      itemDetails
    });
    const expiresAt = resolveSnapExpiry(providerExpiresAt || expiryTime);

    // 8. Insert tracking intent natively
    const owner = resolvePaymentOwner(appointment);

    let paymentIntent;
    try {
      paymentIntent = await prisma.$transaction(async (tx) => {
        const intent = await tx.paymentIntent.create({
        data: {
          appointmentId: appointment.id,
          activeAppointmentId: appointment.id,
          patientId: appointment.patientId,
          ownerType: owner.ownerType,
          ownerClinicId: owner.ownerClinicId,
          ownerDentistId: owner.ownerDentistId,
          amount: grossAmount,
          currency: 'IDR',
          status: 'requires_action',
          provider: 'midtrans',
          idempotencyKey,
          providerOrderId: orderId,
          metadata: { snapToken },
          redirectUrl,
          expiresAt
        }
      });

        await ensureInvoiceForPaymentIntent({
          tx,
          paymentIntent: intent,
          appointment,
          patient: appointment.patient,
          items: itemDetails
        });

        return intent;
      });
    } catch (error) {
      if (error?.code === 'P2002') {
        const existingActive = await prisma.paymentIntent.findFirst({
          where: { activeAppointmentId: appointment.id }
        });
        if (existingActive && canReuseSnapIntent(existingActive)) {
          return res.status(200).json(buildSnapResponse(existingActive));
        }
        return res.status(409).json({
          error: {
            code: 'ACTIVE_PAYMENT_EXISTS',
            message: 'Active payment intent already exists for this appointment',
            retryable: false
          }
        });
      }
      throw error;
    }

    // 9. Return execution block correctly
    return res.status(200).json(buildSnapResponse(paymentIntent));

  } catch (error) {
    if (error.code === 'MIDTRANS_API_ERROR') {
         return res.status(error.statusCode || 502).json({
           error: {
             code: error.code,
             message: error.message,
             retryable: true
           }
         });
    }
    
    if (error.status) {
         return res.status(error.status).json({
            error: {
              code: error.code || 'BAD_REQUEST',
              message: error.message,
              retryable: false
            }
         });
    }

    console.error('[SnapTransactions Error]', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred during payment initiation',
        retryable: true
      }
    });
  }
});

export const __testables = {
  buildSnapResponse,
  canReuseSnapIntent,
  resolveSnapExpiry
};

export default router;
