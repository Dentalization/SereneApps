import express from 'express';
import crypto from 'crypto';
import { authenticateToken } from '../../utils/tokens.js';
import { PrismaClient } from '@prisma/client';
import midtransService from '../../services/payments/midtransService.js';
import { resolvePaymentOwner } from '../../services/payments/ownership.js';
import { ensureInvoiceForPaymentIntent } from '../../services/payments/financials.js';
import { ACTIVE_PAYMENT_STATUSES, applyPaymentStatus } from '../../services/payments/status.js';
import { ensureInvoiceForTreatmentPlan, normalizePlanStatus } from '../../services/treatmentPlans.js';

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
      dentist: { include: { dentistProfile: true } },
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

  const dentistProfile = appointment.dentist?.dentistProfile?.[0];
  const fee = dentistProfile?.consultationFee || 150000;
  return { appointment, fee };
}

async function getTreatmentPlanPaymentContext({ treatmentPlanId, invoiceId, userId }) {
  if (!treatmentPlanId && !invoiceId) return null;

  const invoiceWhere = invoiceId ? { id: BigInt(invoiceId) } : null;
  let invoice = invoiceWhere
    ? await prisma.invoice.findUnique({
        where: invoiceWhere,
        include: {
          items: true,
          treatmentPlan: {
            include: {
              appointment: {
                include: {
                  dentist: { include: { dentistProfile: true } },
                  patient: { include: { patientProfile: true } },
                  clinicBranch: true
                }
              }
            }
          }
        }
      })
    : null;

  let plan = invoice?.treatmentPlan || null;
  if (!plan && treatmentPlanId) {
    plan = await prisma.treatmentPlan.findUnique({
      where: { id: BigInt(treatmentPlanId) },
      include: {
        appointment: {
          include: {
            dentist: { include: { dentistProfile: true } },
            patient: { include: { patientProfile: true } },
            clinicBranch: true
          }
        }
      }
    });
  }

  if (!plan) {
    throw { code: 'NOT_FOUND', message: 'Treatment plan not found', status: 404 };
  }
  if (plan.patientId !== BigInt(userId)) {
    throw { code: 'FORBIDDEN', message: 'You are not authorized to pay for this treatment plan', status: 403 };
  }
  if (!['SENT', 'PATIENT_REVIEW', 'APPROVED'].includes(normalizePlanStatus(plan.status))) {
    throw { code: 'BAD_REQUEST', message: 'Treatment plan is not payable yet', status: 400 };
  }
  if (!plan.appointment) {
    throw { code: 'BAD_REQUEST', message: 'Treatment plan is missing an appointment link', status: 400 };
  }

  if (!invoice) {
    invoice = await ensureInvoiceForTreatmentPlan({
      db: prisma,
      treatmentPlanId: plan.id,
      status: normalizePlanStatus(plan.status) === 'APPROVED' ? 'approved' : 'issued'
    });
  }

  if (invoice.status && ['paid', 'settled', 'refunded', 'partial_refund'].includes(invoice.status)) {
    throw { code: 'BAD_REQUEST', message: 'Treatment plan invoice is not payable', status: 400 };
  }

  const fullInvoice = invoice.items
    ? invoice
    : await prisma.invoice.findUnique({
        where: { id: invoice.id },
        include: { items: true }
      });
  const grossAmount = fullInvoice?.grandTotal || fullInvoice?.total || 0;
  if (!grossAmount || grossAmount <= 0) {
    throw { code: 'BAD_REQUEST', message: 'Treatment plan invoice amount is invalid', status: 400 };
  }

  return {
    plan,
    invoice: fullInvoice,
    appointment: plan.appointment,
    fee: grossAmount,
    itemDetails: (fullInvoice.items || []).map((item) => ({
      id: `INVITEM-${item.id.toString()}`,
      price: item.unitPrice,
      quantity: item.quantity || 1,
      name: item.description
    }))
  };
}

// POST /
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { appointmentId, treatmentPlanId, invoiceId } = req.body;
    const userId = req.user.id;

    if (!appointmentId && !treatmentPlanId && !invoiceId) {
      return res.status(400).json({ error: { code: 'MISSING_PARAMETERS', message: 'appointmentId, treatmentPlanId, or invoiceId is required', retryable: false } });
    }

    const treatmentContext = await getTreatmentPlanPaymentContext({ treatmentPlanId, invoiceId, userId });
    const { appointment, fee: grossAmount } = treatmentContext
      ? treatmentContext
      : await getAppointmentForPayment(appointmentId, userId);

    // 5. Generate Idempotency Key
    const idempotencyStr = treatmentContext
      ? `${userId}:${appointment.id.toString()}:tp:${treatmentContext.plan.id.toString()}:invoice:${treatmentContext.invoice.id.toString()}`
      : `${userId}:${appointmentId}`;
    const idempotencyKey = crypto.createHash('sha256').update(idempotencyStr).digest('hex');

    // 6. Idempotency + active intent check
    const existingIntent = await prisma.paymentIntent.findUnique({
      where: { idempotencyKey }
    });

    if (existingIntent) {
       if (canReuseSnapIntent(existingIntent)) {
         return res.status(200).json(buildSnapResponse(existingIntent));
       }
       if (['pending', 'requires_action', 'expired', 'failed', 'cancelled'].includes(existingIntent.status)) {
          await prisma.paymentIntent.update({
            where: { id: existingIntent.id },
            data: {
              status: ['pending', 'requires_action'].includes(existingIntent.status) ? 'expired' : existingIntent.status,
              activeAppointmentId: null,
              idempotencyKey: `${idempotencyKey}:invalidated:${existingIntent.id.toString()}`,
              metadata: {
                ...(existingIntent.metadata && typeof existingIntent.metadata === 'object' && !Array.isArray(existingIntent.metadata) ? existingIntent.metadata : {}),
                expiredByClientRetry: true
              }
           }
         });
       } else {
         return res.status(409).json({
           error: {
             code: 'ACTIVE_PAYMENT_EXISTS',
             message: 'Payment already completed or processing for this appointment',
             retryable: false
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

      if (['pending', 'requires_action'].includes(activeIntent.status)) {
        await prisma.paymentIntent.update({
          where: { id: activeIntent.id },
          data: {
            status: 'expired',
            activeAppointmentId: null,
            idempotencyKey: activeIntent.idempotencyKey ? `${activeIntent.idempotencyKey}:expired:${activeIntent.id.toString()}` : null,
            metadata: {
              ...(activeIntent.metadata && typeof activeIntent.metadata === 'object' && !Array.isArray(activeIntent.metadata) ? activeIntent.metadata : {}),
              expiredByClientRetry: true
            }
          }
        });
      } else {
        return res.status(409).json({
          error: {
            code: 'ACTIVE_PAYMENT_EXISTS',
            message: 'Active payment intent already exists for this appointment',
            retryable: false
          }
        });
      }
    }

    // 7. Midtrans Snap Payload Execution
    const orderId = treatmentContext
      ? `TP-${treatmentContext.plan.id.toString()}-PI-${Date.now()}`
      : `APT-${appointment.id.toString()}-PI-${Date.now()}`;
    const patientProfile = appointment.patient.patientProfile || {};
    
    // Fallbacks since midtrans requires valid string structures 
    const phoneFallback = patientProfile.phoneNumber || appointment.patient.phone_number;
    
    const customerDetails = {
      firstName: appointment.patient.name,
      lastName: '',
      email: appointment.patient.email,
      phone: phoneFallback ? String(phoneFallback) : '0000000000'
    };

    const itemDetails = treatmentContext?.itemDetails?.length
      ? treatmentContext.itemDetails
      : [{
          id: `APT-${appointment.id.toString()}`,
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
          metadata: {
            snapToken,
            ...(treatmentContext ? {
              treatmentPlanId: treatmentContext.plan.id.toString(),
              invoiceId: treatmentContext.invoice.id.toString(),
              source: 'treatment_plan'
            } : {})
          },
          redirectUrl,
          expiresAt
        }
      });

        if (treatmentContext) {
          await tx.invoice.update({
            where: { id: treatmentContext.invoice.id },
            data: {
              paymentIntentId: intent.id,
              status: treatmentContext.invoice.status === 'approved' ? 'approved' : 'issued',
              metadata: {
                ...(treatmentContext.invoice.metadata || {}),
                treatmentPlanId: treatmentContext.plan.id.toString(),
                paymentIntentId: intent.id.toString(),
                source: 'treatment_plan'
              }
            }
          });
        } else {
          await ensureInvoiceForPaymentIntent({
            tx,
            paymentIntent: intent,
            appointment,
            patient: appointment.patient,
            items: itemDetails
          });
        }

        return intent;
      });

      // Auto-settle payment if MIDTRANS_MOCK_MODE is enabled
      const MIDTRANS_MOCK_MODE = (process.env.MIDTRANS_MOCK_MODE || '').toLowerCase() === 'true';
      if (MIDTRANS_MOCK_MODE) {
        try {
          await applyPaymentStatus({
            paymentIntentId: paymentIntent.id.toString(),
            newStatus: 'settled',
            providerPaymentId: `mock-txn-${orderId}`,
            providerResponse: { status: 'settled', mock: true }
          });
          // Reload paymentIntent to have the updated status and activeAppointmentId, etc.
          paymentIntent = await prisma.paymentIntent.findUnique({
            where: { id: paymentIntent.id }
          });
        } catch (settleError) {
          console.error('[SnapTransactions Auto-Settle Error]', settleError);
        }
      }
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
