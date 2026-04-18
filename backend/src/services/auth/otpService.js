import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import smsAdapter from '../sms/smsAdapter.js';

const prisma = new PrismaClient();

class OtpService {
  async requestOtp({ phone, purpose = 'login', ipHash }) {
    const now = new Date();

    const existingChallenge = await prisma.oTPVerification.findFirst({
      where: {
        identifier: phone,
        purpose,
        verifiedAt: null,
        verified: false
      },
      orderBy: { createdAt: 'desc' }
    });

    if (existingChallenge) {
      if (existingChallenge.cooldownUntil && existingChallenge.cooldownUntil > now) {
        throw { 
          code: 'OTP_COOLDOWN', 
          retryAfterSeconds: Math.ceil((existingChallenge.cooldownUntil.getTime() - now.getTime()) / 1000) 
        };
      }
      if (existingChallenge.lockedUntil && existingChallenge.lockedUntil > now) {
        throw { 
          code: 'OTP_LOCKED', 
          retryAfterSeconds: Math.ceil((existingChallenge.lockedUntil.getTime() - now.getTime()) / 1000) 
        };
      }
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const cooldownUntil = new Date(now.getTime() + 60 * 1000);
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

    let challenge;

    if (existingChallenge) {
        challenge = await prisma.oTPVerification.update({
             where: { id: existingChallenge.id },
             data: {
                 otp: hashedOtp,
                 cooldownUntil,
                 expiresAt,
                 resendCount: 0,
                 maxAttempts: 5,
                 lastSentAt: now,
                 lastRequestIpHash: ipHash,
                 attempts: 0
             }
        });
    } else {
        // Fallback for native constraints mapping unique overrides natively correctly avoiding clashes
        const strictExisting = await prisma.oTPVerification.findUnique({ where: { identifier: phone }});
        if (strictExisting) {
            challenge = await prisma.oTPVerification.update({
              where: { id: strictExisting.id },
              data: {
                otp: hashedOtp,
                purpose,
                type: 'sms',
                expiresAt,
                cooldownUntil,
                resendCount: 0,
                maxAttempts: 5,
                lastSentAt: now,
                lastRequestIpHash: ipHash,
                attempts: 0,
                verifiedAt: null,
                verified: false
              }
            });
        } else {
            challenge = await prisma.oTPVerification.create({
              data: {
                identifier: phone,
                purpose,
                otp: hashedOtp,
                type: 'sms',
                expiresAt,
                cooldownUntil,
                resendCount: 0,
                maxAttempts: 5,
                lastSentAt: now,
                lastRequestIpHash: ipHash,
                attempts: 0
              }
            });
        }
    }

    const smsBody = `Kode OTP SereneApps Anda: ${otp}. Berlaku 10 menit. Jangan bagikan ke siapapun.`;
    await smsAdapter.sendSms(phone, smsBody);

    return { challengeId: challenge.id };
  }

  async verifyOtp({ challengeId, code }) {
    const challenge = await prisma.oTPVerification.findUnique({
      where: { id: challengeId }
    });

    if (!challenge) {
      throw { code: 'OTP_NOT_FOUND', message: 'Tantangan OTP tidak ditemukan atau invalid.' };
    }

    if (challenge.verifiedAt || challenge.verified) {
      throw { code: 'OTP_ALREADY_USED', message: 'Kode OTP ini sudah digunakan.' };
    }

    const now = new Date();
    
    if (challenge.expiresAt < now) {
      throw { code: 'OTP_EXPIRED', message: 'Kode OTP sudah kadaluarsa.' };
    }

    if (challenge.lockedUntil && challenge.lockedUntil > now) {
      const retryAfterSeconds = Math.ceil((challenge.lockedUntil.getTime() - now.getTime()) / 1000);
      throw { code: 'OTP_LOCKED', retryAfterSeconds };
    }

    const isMatch = await bcrypt.compare(code, challenge.otp);

    if (!isMatch) {
      const attempts = challenge.attempts + 1;
      
      if (attempts >= challenge.maxAttempts) {
        const lockedUntil = new Date(now.getTime() + 30 * 60 * 1000); // lock 30m
        await prisma.oTPVerification.update({
          where: { id: challenge.id },
          data: { attempts, lockedUntil }
        });
        throw { code: 'OTP_INVALID', locked: true, message: 'OTP salah, akun terkunci sementara.' };
      }

      await prisma.oTPVerification.update({
        where: { id: challenge.id },
        data: { attempts }
      });
      
      throw { code: 'OTP_INVALID', attemptsRemaining: challenge.maxAttempts - attempts, message: `OTP salah. Tersisa ${challenge.maxAttempts - attempts} percobaan.` };
    }

    await prisma.oTPVerification.update({
      where: { id: challenge.id },
      data: { verifiedAt: now, verified: true }
    });

    return { verified: true, phone: challenge.identifier };
  }

  async resendOtp({ challengeId, ipHash }) {
    const challenge = await prisma.oTPVerification.findUnique({
      where: { id: challengeId }
    });

    if (!challenge) {
      throw { code: 'OTP_NOT_FOUND', message: 'Tantangan OTP tidak ditemukan.' };
    }

    if (challenge.resendCount >= 5) {
      throw { code: 'OTP_RESEND_LIMIT', message: 'Maksimal 5 kali pengiriman ulang per sesi' };
    }

    const now = new Date();
    if (challenge.cooldownUntil && challenge.cooldownUntil > now) {
      const retryAfterSeconds = Math.ceil((challenge.cooldownUntil.getTime() - now.getTime()) / 1000);
      throw { code: 'OTP_COOLDOWN', retryAfterSeconds };
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const cooldownUntil = new Date(now.getTime() + 60 * 1000);
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

    await prisma.oTPVerification.update({
      where: { id: challenge.id },
      data: {
        otp: hashedOtp,
        expiresAt,
        resendCount: challenge.resendCount + 1,
        cooldownUntil,
        lastSentAt: now,
        lastRequestIpHash: ipHash
      }
    });

    const smsBody = `Kode OTP SereneApps Anda: ${otp}. Berlaku 10 menit. Jangan bagikan ke siapapun.`;
    await smsAdapter.sendSms(challenge.identifier, smsBody);

    return { nextAvailableAt: cooldownUntil };
  }
}

export default new OtpService();
