import {
  appointmentSchema,
  emailSchema,
  imageSchema,
  passwordSchema,
  phoneSchema,
  registerSchema,
  validate,
} from '../src/utils/validation.js';

describe('mobile validation schemas', () => {
  test('accepts valid contact credentials', () => {
    expect(validate(emailSchema, 'pasien@example.com')).toEqual({ valid: true, errors: null });
    expect(validate(phoneSchema, '+6281234567890')).toEqual({ valid: true, errors: null });
    expect(validate(passwordSchema, 'Password123')).toEqual({ valid: true, errors: null });
  });

  test('returns field errors for invalid scalar values', () => {
    expect(validate(emailSchema, 'email-salah')).toEqual({
      valid: false,
      errors: { '': 'Format email tidak valid' },
    });
    expect(validate(phoneSchema, '081234567890')).toEqual({
      valid: false,
      errors: { '': 'Format nomor telepon harus +628XXXXXXXXXX' },
    });
  });

  test('accepts complete registration data', () => {
    const result = validate(registerSchema, {
      name: 'Ayu Lestari',
      email: 'ayu@example.com',
      password: 'Password123',
      phoneNumber: '+6281234567890',
      dateOfBirth: '1996-06-08',
      gender: 'female',
      emergencyContactName: 'Budi',
      emergencyContactPhone: '+6281298765432',
      emergencyContactRelationship: 'Keluarga',
    });

    expect(result).toEqual({ valid: true, errors: null });
  });

  test('rejects incomplete appointment data and oversized images', () => {
    expect(validate(appointmentSchema, {
      dentistId: 10,
      clinicId: 2,
      startsAt: '2026-06-09T10:00:00.000Z',
      appointmentType: 'consultation',
      reason: 'Sakit',
    })).toEqual({
      valid: false,
      errors: { reason: 'Alasan minimal 10 karakter' },
    });

    expect(validate(imageSchema, {
      uri: 'file:///tmp/gigi.jpg',
      type: 'image/jpeg',
      name: 'gigi.jpg',
      size: 11 * 1024 * 1024,
    })).toEqual({
      valid: false,
      errors: { size: 'Ukuran gambar maksimal 10MB' },
    });
  });
});
