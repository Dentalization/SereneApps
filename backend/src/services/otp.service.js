import twilio from 'twilio';
import sgMail from '@sendgrid/mail';
import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

// Initialize clients
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Generate random 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Store OTP in database with expiry
async function storeOTP(identifier, otp, type = 'phone') {
  const expiresAt = new Date(
    Date.now() + (parseInt(process.env.OTP_EXPIRY_MINUTES) || 5) * 60 * 1000
  );

  await prisma.oTPVerification.upsert({
    where: { identifier },
    update: {
      otp,
      expiresAt,
      attempts: 0,
      verified: false,
    },
    create: {
      identifier,
      otp,
      type,
      expiresAt,
    },
  });
}

// Send OTP via SMS
async function sendPhoneOTP(phoneNumber) {
  const otp = generateOTP();
  
  try {
    if (!twilioClient) {
      // Development mode: just log the OTP
      console.log('=== DEVELOPMENT MODE: OTP NOT SENT ===');
      console.log(`Phone: ${phoneNumber}`);
      console.log(`OTP: ${otp}`);
      console.log('=====================================');
      
      // Still store in database for verification
      await storeOTP(phoneNumber, otp, 'phone');
      
      return { 
        success: true, 
        message: 'OTP sent to phone (dev mode)',
        otp: process.env.NODE_ENV === 'development' ? otp : undefined // Only return in dev
      };
    }

    // Production mode: Send SMS via Twilio
    await twilioClient.messages.create({
      body: `Kode OTP SereneAI Anda: ${otp}. Berlaku selama 5 menit.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });

    // Store in database
    await storeOTP(phoneNumber, otp, 'phone');

    return { success: true, message: 'OTP sent to phone' };
  } catch (error) {
    console.error('Failed to send phone OTP:', error);
    throw new Error('Failed to send OTP. Please try again.');
  }
}

// Send OTP via Email (fallback)
async function sendEmailOTP(email) {
  const otp = generateOTP();
  
  try {
    if (!process.env.SENDGRID_API_KEY) {
      // Development mode: just log the OTP
      console.log('=== DEVELOPMENT MODE: OTP NOT SENT ===');
      console.log(`Email: ${email}`);
      console.log(`OTP: ${otp}`);
      console.log('=====================================');
      
      await storeOTP(email, otp, 'email');
      
      return { 
        success: true, 
        message: 'OTP sent to email (dev mode)',
        otp: process.env.NODE_ENV === 'development' ? otp : undefined
      };
    }

    // Production mode: Send email
    await sgMail.send({
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: 'Kode Verifikasi SereneAI',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">Kode Verifikasi OTP</h2>
          <p>Kode OTP Anda adalah:</p>
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #059669;">
            ${otp}
          </div>
          <p style="margin-top: 20px;">Kode ini berlaku selama 5 menit.</p>
          <p style="color: #6b7280; font-size: 14px;">Jika Anda tidak meminta kode ini, abaikan email ini.</p>
        </div>
      `,
    });

    await storeOTP(email, otp, 'email');

    return { success: true, message: 'OTP sent to email' };
  } catch (error) {
    console.error('Failed to send email OTP:', error);
    throw new Error('Failed to send OTP. Please try again.');
  }
}

// Verify OTP
async function verifyOTP(identifier, inputOTP) {
  const otpRecord = await prisma.oTPVerification.findUnique({
    where: { identifier },
  });

  if (!otpRecord) {
    return { success: false, error: 'OTP not found. Please request a new one.' };
  }

  // Check expiry
  if (new Date() > otpRecord.expiresAt) {
    return { success: false, error: 'OTP has expired. Please request a new one.' };
  }

  // Check attempts (max 3)
  if (otpRecord.attempts >= 3) {
    return { success: false, error: 'Too many failed attempts. Please request a new OTP.' };
  }

  // Verify OTP
  if (otpRecord.otp !== inputOTP) {
    // Increment attempts
    await prisma.oTPVerification.update({
      where: { identifier },
      data: { attempts: { increment: 1 } },
    });
    return { success: false, error: 'Invalid OTP. Please try again.' };
  }

  // Mark as verified
  await prisma.oTPVerification.update({
    where: { identifier },
    data: { verified: true },
  });

  return { success: true, message: 'OTP verified successfully' };
}

export {
  sendPhoneOTP,
  sendEmailOTP,
  verifyOTP,
};
