import 'dotenv/config';
import assert from 'assert';
import crypto from 'crypto';
import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();
const API_BASE = process.env.TEST_API_BASE_URL || `${process.env.API_BASE_URL || 'http://localhost:4000'}/${process.env.API_VERSION || 'v1'}`;

const safeBigInt = (value) => {
  if (value === undefined || value === null) return null;
  try {
    return BigInt(value);
  } catch (error) {
    return null;
  }
};

function randomEmail() {
  const token = crypto.randomBytes(6).toString('hex');
  return `patient_${token}@serene.test`;
}

function addMinutes(base, minutes) {
  return new Date(new Date(base).getTime() + minutes * 60000);
}

async function httpJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch (err) {
    throw new Error(`Failed to parse JSON from ${url}: ${text}`);
  }
  return { status: res.status, json };
}

async function main() {
  console.log('🚀 Starting patient journey integration test');
  if (!process.env.TWILIO_ACCOUNT_SID) {
    process.env.TWILIO_ACCOUNT_SID = 'test-twilio-account';
  }
  if (!process.env.TWILIO_AUTH_TOKEN) {
    process.env.TWILIO_AUTH_TOKEN = 'test-twilio-token';
  }
  if (!process.env.TWILIO_VIDEO_API_KEY_SID) {
    process.env.TWILIO_VIDEO_API_KEY_SID = 'test-twilio-video-key';
  }
  if (!process.env.TWILIO_VIDEO_API_KEY_SECRET) {
    process.env.TWILIO_VIDEO_API_KEY_SECRET = 'test-twilio-video-secret';
  }

  const patientEmail = randomEmail();
  const patientPassword = 'Test12345!';
  const patientName = 'Integration Patient';

  let dentistUser;
  let appointmentRecord;
  let paymentIntent;
  let chatMessage;
  let registration;

  try {
    // 1. Seed dentist via Prisma
    dentistUser = await prisma.user.create({
      data: {
        name: 'Integration Dentist',
        email: `dentist_${crypto.randomBytes(4).toString('hex')}@serene.test`,
        password_hash: 'placeholder-password',
        roles: ['dentist'],
        phone_number: '+62811111111'
      }
    });

    const dentistProfile = await prisma.dentistProfile.create({
      data: {
        userId: dentistUser.id,
        title: 'drg.',
        licenseNumber: `LIC-${crypto.randomBytes(3).toString('hex')}`,
        licenseIssuingBody: 'Kemenkes',
        licenseExpiryDate: new Date(new Date().getFullYear() + 1, 0, 1),
        registrationNumber: `REG-${crypto.randomBytes(3).toString('hex')}`,
        primarySpecialization: 'General Dentistry',
        educationQualification: 'DDS',
        yearsOfExperience: 5,
        clinicName: 'Integration Clinic',
        clinicAddress: 'Jl. Integration No.1',
        clinicWorkingHours: JSON.stringify({
          monday: { isOpen: true, open: '09:00', close: '17:00' },
          tuesday: { isOpen: true, open: '09:00', close: '17:00' },
          wednesday: { isOpen: true, open: '09:00', close: '17:00' },
          thursday: { isOpen: true, open: '09:00', close: '17:00' },
          friday: { isOpen: true, open: '09:00', close: '17:00' },
          saturday: { isOpen: false },
          sunday: { isOpen: false }
        })
      }
    });

    console.log('✅ Seeded dentist profile');

    // 2. Register patient via API
    const registerPayload = {
      name: patientName,
      email: patientEmail,
      password: patientPassword,
      phoneNumber: '+6281234567890'
    };
    const registerRes = await httpJson(`${API_BASE}/auth/patient/register`, {
      method: 'POST',
      body: JSON.stringify(registerPayload)
    });
    assert.strictEqual(registerRes.status, 201, `Patient register failed: ${JSON.stringify(registerRes.json)}`);
    registration = registerRes.json;
    const accessToken = registration.accessToken;
    assert(accessToken, 'Access token missing from registration response');

    console.log('✅ Registered patient');

    // 3. Book appointment
    const start = addMinutes(Date.now(), 48 * 60).toISOString();
    const end = addMinutes(start, 30).toISOString();
    const appointmentRes = await httpJson(`${API_BASE}/appointments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        dentistId: dentistProfile.id.toString(),
        start,
        end,
        reason: 'Integration test booking'
      })
    });
    assert.strictEqual(appointmentRes.status, 201, `Create appointment failed: ${JSON.stringify(appointmentRes.json)}`);
    appointmentRecord = appointmentRes.json.appointment;
    assert(appointmentRecord?.id, 'Appointment ID missing');
    const resolvedAppointmentId = appointmentRecord.id;

    console.log('✅ Created appointment', resolvedAppointmentId);

    // 4. Create payment intent (mock Midtrans)
    const paymentRes = await httpJson(`${API_BASE}/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        appointmentId: resolvedAppointmentId,
        amount: 150000,
        currency: 'IDR'
      })
    });
    assert.strictEqual(paymentRes.status, 201, `Create payment intent failed: ${JSON.stringify(paymentRes.json)}`);
    paymentIntent = paymentRes.json.paymentIntent;
    assert(paymentIntent?.id, 'Payment intent ID missing');
    console.log('✅ Created payment intent');

    // 5. Confirm payment intent
    const confirmRes = await httpJson(`${API_BASE}/payments/${paymentIntent.id}/confirm`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        status: 'settled'
      })
    });
    assert.strictEqual(confirmRes.status, 200, `Confirm payment failed: ${JSON.stringify(confirmRes.json)}`);
    console.log('✅ Confirmed payment intent');

    // 6. Send chat message
    const chatRes = await httpJson(`${API_BASE}/communications/appointments/${resolvedAppointmentId}/chat/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        message: 'Halo dokter, ini pesan ujicoba dari pasien.',
        messageType: 'text'
      })
    });
    assert.strictEqual(chatRes.status, 201, `Send chat message failed: ${JSON.stringify(chatRes.json)}`);
    chatMessage = chatRes.json.message;
    assert(chatMessage?.id, 'Chat message not returned');
    console.log('✅ Sent chat message');

    // 7. Request video token
    const videoRes = await httpJson(`${API_BASE}/communications/appointments/${resolvedAppointmentId}/video/token`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        role: 'publisher',
        expireSeconds: 300
      })
    });
    assert.strictEqual(videoRes.status, 200, `Generate video token failed: ${JSON.stringify(videoRes.json)}`);
    assert(videoRes.json?.token, 'Video token missing');
    console.log('✅ Generated video token');

    // 8. Cancel appointment (cleanup action via API)
    const cancelRes = await httpJson(`${API_BASE}/appointments/${resolvedAppointmentId}/cancel`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        reason: 'Integration test cleanup'
      })
    });
    assert.strictEqual(cancelRes.status, 200, `Cancel appointment failed: ${JSON.stringify(cancelRes.json)}`);
    console.log('✅ Cancelled appointment via API');

    console.log('🎉 Patient journey completed successfully');
  } finally {
    const appointmentIdBI = safeBigInt(appointmentRecord?.id);
    if (appointmentIdBI) {
      await prisma.chatMessage.deleteMany({ where: { chatRoom: { appointmentId: appointmentIdBI } } }).catch(() => {});
      await prisma.appointmentStatusHistory.deleteMany({ where: { appointmentId: appointmentIdBI } }).catch(() => {});
      await prisma.appointment.deleteMany({ where: { id: appointmentIdBI } }).catch(() => {});
    }
    const paymentIdBI = safeBigInt(paymentIntent?.id);
    if (paymentIdBI) {
      await prisma.paymentIntent.deleteMany({ where: { id: paymentIdBI } }).catch(() => {});
      await prisma.paymentLedger.deleteMany({ where: { paymentIntentId: paymentIdBI } }).catch(() => {});
    }
    const patientIdBI = safeBigInt(registration?.user?.id);
    if (patientIdBI) {
      await prisma.chatMessage.deleteMany({ where: { senderId: patientIdBI } }).catch(() => {});
      await prisma.notificationDevice.deleteMany({ where: { userId: patientIdBI } }).catch(() => {});
      await prisma.notificationPreference.deleteMany({ where: { userId: patientIdBI } }).catch(() => {});
      await prisma.patientProfile.deleteMany({ where: { userId: patientIdBI } }).catch(() => {});
      await prisma.refreshToken.deleteMany({ where: { userId: patientIdBI } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: patientIdBI } }).catch(() => {});
    }
    if (dentistUser?.id) {
      await prisma.dentistProfile.deleteMany({ where: { userId: dentistUser.id } }).catch(() => {});
      await prisma.appointment.deleteMany({ where: { dentistId: dentistUser.id } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: dentistUser.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('❌ Integration test failed');
  console.error(error);
  process.exitCode = 1;
});
