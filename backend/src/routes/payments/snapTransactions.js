import express from 'express';
import crypto from 'crypto';
import { authenticateToken } from '../../utils/tokens.js';
import { PrismaClient } from '@prisma/client';
import midtransService from '../../services/payments/midtransService.js';

const router = express.Router();
const prisma = new PrismaClient();

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

    // 6. Idempotency Check
    const existingIntent = await prisma.paymentIntent.findUnique({
      where: { idempotencyKey }
    });

    if (existingIntent) {
       let snapToken = null;
       if (existingIntent.metadata && typeof existingIntent.metadata === 'object' && !Array.isArray(existingIntent.metadata)) {
           // We store snapToken inside metadata on intent creation
           snapToken = existingIntent.metadata.snapToken;
       }
       if (snapToken) {
         return res.status(200).json({
           snapToken,
           redirectUrl: existingIntent.redirectUrl,
           paymentIntentId: existingIntent.id.toString()
         });
       }
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

    const { snapToken, redirectUrl } = await midtransService.createSnapTransaction({
      orderId,
      grossAmount,
      customerDetails,
      itemDetails
    });

    // 8. Insert tracking intent natively
    const paymentIntent = await prisma.paymentIntent.create({
      data: {
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        amount: grossAmount,
        currency: 'IDR',
        status: 'pending',
        provider: 'midtrans',
        idempotencyKey,
        providerOrderId: orderId,
        metadata: { snapToken },
        redirectUrl
      }
    });

    // 9. Return execution block correctly
    return res.status(200).json({
      snapToken,
      redirectUrl,
      paymentIntentId: paymentIntent.id.toString()
    });

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

export default router;
