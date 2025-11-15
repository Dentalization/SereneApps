import { z } from 'zod';

// Phone number validation (Indonesian format)
export const phoneSchema = z
  .string()
  .regex(/^\+628\d{8,11}$/, 'Format nomor telepon harus +628XXXXXXXXXX');

// Email validation
export const emailSchema = z.string().email('Format email tidak valid');

// Password validation
export const passwordSchema = z
  .string()
  .min(8, 'Password minimal 8 karakter')
  .regex(/[A-Z]/, 'Password harus mengandung huruf besar')
  .regex(/[a-z]/, 'Password harus mengandung huruf kecil')
  .regex(/[0-9]/, 'Password harus mengandung angka');

// OTP validation
export const otpSchema = z.string().length(6, 'Kode OTP harus 6 digit').regex(/^\d+$/, 'Kode OTP harus berupa angka');

// Patient registration schema
export const registerSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: emailSchema,
  password: passwordSchema,
  phoneNumber: phoneSchema,
  dateOfBirth: z.string().refine((date) => {
    const dob = new Date(date);
    const age = new Date().getFullYear() - dob.getFullYear();
    return age >= 1 && age <= 120;
  }, 'Usia tidak valid'),
  gender: z.enum(['male', 'female', 'other']),
  allergies: z.array(z.string()).optional(),
  chronicConditions: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
  medicalNotes: z.string().max(2000).optional(),
  emergencyContactName: z.string().min(2, 'Nama kontak darurat minimal 2 karakter'),
  emergencyContactPhone: phoneSchema,
  emergencyContactRelationship: z.string().min(1, 'Hubungan kontak darurat harus diisi'),
  insuranceProvider: z.string().optional(),
  insuranceNumber: z.string().optional(),
  insuranceMemberId: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  preferredLanguage: z.enum(['id', 'en']).default('id'),
});

// Appointment booking schema
export const appointmentSchema = z.object({
  dentistId: z.number(),
  clinicId: z.number(),
  startsAt: z.string(),
  appointmentType: z.enum(['consultation', 'checkup', 'treatment', 'emergency']),
  reason: z.string().min(10, 'Alasan minimal 10 karakter'),
  notes: z.string().optional(),
});

// Image validation
export const imageSchema = z.object({
  uri: z.string(),
  type: z.string(),
  name: z.string(),
  size: z.number().max(10 * 1024 * 1024, 'Ukuran gambar maksimal 10MB'),
});

// Validate function
export const validate = (schema, data) => {
  try {
    schema.parse(data);
    return { valid: true, errors: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.reduce((acc, err) => {
        const path = err.path.join('.');
        acc[path] = err.message;
        return acc;
      }, {});
      return { valid: false, errors };
    }
    return { valid: false, errors: { _error: 'Validation failed' } };
  }
};
