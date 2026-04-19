import { z } from 'zod';

// Patient registration schema
const patientRegisterSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100, 'Nama maksimal 100 karakter'),
  email: z.string().email('Email tidak valid'),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .regex(/^(?=.*[a-z])/, 'Password harus mengandung minimal 1 huruf kecil')
    .regex(/^(?=.*[A-Z])/, 'Password harus mengandung minimal 1 huruf besar')
    .regex(/^(?=.*\d)/, 'Password harus mengandung minimal 1 angka'),
  phone_number: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, 'Format nomor HP tidak valid. Contoh: +628123456789'),
  dateOfBirth: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Format tanggal tidak valid',
  }),
  gender: z.enum(['male', 'female', 'other'], {
    errorMap: () => ({ message: 'Gender harus male, female, atau other' }),
  }),
});

// Login schema
const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

// Phone OTP schema
const phoneOTPSchema = z.object({
  phone_number: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, 'Format nomor HP tidak valid. Contoh: +628123456789'),
  purpose: z.string().max(50).optional(),
  channel: z.enum(['sms']).optional()
});

// Email OTP schema
const emailOTPSchema = z.object({
  email: z.string().email('Email tidak valid')
});

// Verify OTP schema
const verifyOTPSchema = z.object({
  phone_number: z.string().optional(),
  email: z.string().email().optional(),
  otp: z.string().min(4).max(10, 'OTP tidak valid')
}).refine(
  (data) => data.phone_number || data.email,
  {
    message: 'Phone number atau email harus diisi',
  }
);

const otpRequestSchema = z.object({
  channel: z.enum(['sms']).default('sms'),
  identifier: z.string().optional(),
  phone_number: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Format nomor HP tidak valid. Contoh: +628123456789').optional(),
  email: z.string().email('Email tidak valid').optional(),
  purpose: z.string().max(50).optional()
}).superRefine((data, ctx) => {
  if (data.channel === 'sms' && !data.phone_number) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['phone_number'],
      message: 'Phone number wajib diisi untuk OTP SMS'
    });
  }
});

const otpVerifyRequestSchema = z.object({
  channel: z.enum(['sms']).default('sms'),
  phone_number: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Format nomor HP tidak valid. Contoh: +628123456789').optional(),
  email: z.string().email('Email tidak valid').optional(),
  otp: z.string().min(4).max(10, 'OTP tidak valid')
}).superRefine((data, ctx) => {
  if (data.channel === 'sms' && !data.phone_number) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['phone_number'],
      message: 'Phone number wajib diisi untuk verifikasi OTP SMS'
    });
  }
});

// Forgot password schema
const forgotPasswordSchema = z.object({
  email: z.string().email('Email tidak valid'),
});

// Reset password schema
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token wajib diisi'),
  newPassword: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .regex(/^(?=.*[a-z])/, 'Password harus mengandung minimal 1 huruf kecil')
    .regex(/^(?=.*[A-Z])/, 'Password harus mengandung minimal 1 huruf besar')
    .regex(/^(?=.*\d)/, 'Password harus mengandung minimal 1 angka'),
});

export {
  patientRegisterSchema,
  loginSchema,
  phoneOTPSchema,
  emailOTPSchema,
  otpRequestSchema,
  otpVerifyRequestSchema,
  verifyOTPSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
