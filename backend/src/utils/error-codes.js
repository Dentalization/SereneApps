/**
 * Centralized Error Code System for SereneAI API
 * 
 * Error Code Ranges:
 * 1000-1099: Authentication & Authorization
 * 2000-2099: Appointments
 * 3000-3099: Payments
 * 4000-4099: Communications (Chat/Video)
 * 5000-5099: Notifications
 * 6000-6099: Profile & User Management
 * 7000-7099: Clinic Management
 * 8000-8099: File Uploads
 * 9000-9099: System & General Errors
 */

export const ERROR_CODES = {
  // ============================================================================
  // AUTHENTICATION & AUTHORIZATION (1000-1099)
  // ============================================================================
  
  AUTH_INVALID_CREDENTIALS: {
    code: 1001,
    message: 'Email atau password salah',
    messageEn: 'Invalid email or password',
    solution: 'Periksa kembali email dan password Anda',
    solutionEn: 'Please check your email and password',
  },
  
  AUTH_EMAIL_EXISTS: {
    code: 1002,
    message: 'Email sudah terdaftar',
    messageEn: 'Email already registered',
    solution: 'Gunakan email lain atau coba login',
    solutionEn: 'Please use a different email or try logging in',
  },
  
  AUTH_OTP_EXPIRED: {
    code: 1003,
    message: 'Kode OTP sudah kadaluarsa',
    messageEn: 'OTP has expired',
    solution: 'Silakan minta kode OTP baru',
    solutionEn: 'Please request a new OTP',
  },
  
  AUTH_OTP_INVALID: {
    code: 1004,
    message: 'Kode OTP tidak valid',
    messageEn: 'Invalid OTP',
    solution: 'Periksa kembali kode yang Anda masukkan',
    solutionEn: 'Please check the code and try again',
  },
  
  AUTH_TOKEN_EXPIRED: {
    code: 1005,
    message: 'Sesi Anda telah berakhir',
    messageEn: 'Session has expired',
    solution: 'Silakan login kembali',
    solutionEn: 'Please login again',
  },
  
  AUTH_TOKEN_INVALID: {
    code: 1006,
    message: 'Token tidak valid',
    messageEn: 'Invalid token',
    solution: 'Silakan login kembali',
    solutionEn: 'Please login again',
  },
  
  AUTH_UNAUTHORIZED: {
    code: 1007,
    message: 'Anda tidak memiliki akses',
    messageEn: 'Unauthorized access',
    solution: 'Silakan login terlebih dahulu',
    solutionEn: 'Please login first',
  },
  
  AUTH_FORBIDDEN: {
    code: 1008,
    message: 'Akses ditolak',
    messageEn: 'Access forbidden',
    solution: 'Anda tidak memiliki izin untuk mengakses resource ini',
    solutionEn: 'You do not have permission to access this resource',
  },
  
  AUTH_OTP_MAX_ATTEMPTS: {
    code: 1009,
    message: 'Terlalu banyak percobaan OTP yang salah',
    messageEn: 'Too many failed OTP attempts',
    solution: 'Silakan minta kode OTP baru',
    solutionEn: 'Please request a new OTP',
  },
  
  AUTH_PHONE_EXISTS: {
    code: 1010,
    message: 'Nomor telepon sudah terdaftar',
    messageEn: 'Phone number already registered',
    solution: 'Gunakan nomor telepon lain',
    solutionEn: 'Please use a different phone number',
  },

  // ============================================================================
  // APPOINTMENTS (2000-2099)
  // ============================================================================
  
  APPOINTMENT_NOT_FOUND: {
    code: 2001,
    message: 'Janji temu tidak ditemukan',
    messageEn: 'Appointment not found',
    solution: 'Periksa kembali ID janji temu',
    solutionEn: 'Please check the appointment ID',
  },
  
  APPOINTMENT_CONFLICT: {
    code: 2002,
    message: 'Waktu yang dipilih sudah dibooking',
    messageEn: 'Time slot already booked',
    solution: 'Pilih waktu lain yang tersedia',
    solutionEn: 'Please select a different time slot',
  },
  
  APPOINTMENT_CANCEL_DEADLINE: {
    code: 2003,
    message: 'Tidak bisa cancel dalam 24 jam sebelum janji',
    messageEn: 'Cannot cancel within 24 hours',
    solution: 'Hubungi klinik langsung untuk bantuan',
    solutionEn: 'Please contact the clinic directly',
  },
  
  APPOINTMENT_RESCHEDULE_DEADLINE: {
    code: 2004,
    message: 'Tidak bisa reschedule dalam 24 jam sebelum janji',
    messageEn: 'Cannot reschedule within 24 hours',
    solution: 'Hubungi klinik langsung untuk bantuan',
    solutionEn: 'Please contact the clinic directly',
  },
  
  APPOINTMENT_INVALID_STATUS: {
    code: 2005,
    message: 'Status janji temu tidak valid untuk operasi ini',
    messageEn: 'Invalid appointment status for this operation',
    solution: 'Periksa status janji temu Anda',
    solutionEn: 'Please check your appointment status',
  },
  
  APPOINTMENT_ALREADY_CONFIRMED: {
    code: 2006,
    message: 'Janji temu sudah dikonfirmasi',
    messageEn: 'Appointment already confirmed',
    solution: 'Tidak perlu konfirmasi ulang',
    solutionEn: 'No need to confirm again',
  },
  
  APPOINTMENT_OUTSIDE_HOURS: {
    code: 2007,
    message: 'Waktu di luar jam operasional',
    messageEn: 'Time outside operating hours',
    solution: 'Pilih waktu antara 08:00 - 18:00',
    solutionEn: 'Please select time between 08:00 - 18:00',
  },
  
  APPOINTMENT_INVALID_SLOT: {
    code: 2008,
    message: 'Slot waktu tidak valid',
    messageEn: 'Invalid time slot',
    solution: 'Pilih slot waktu yang valid',
    solutionEn: 'Please select a valid time slot',
  },
  
  APPOINTMENT_SLOT_UNAVAILABLE: {
    code: 2009,
    message: 'Slot waktu tidak tersedia',
    messageEn: 'Time slot unavailable',
    solution: 'Pilih waktu lain yang tersedia',
    solutionEn: 'Please select another available time',
  },
  
  APPOINTMENT_CANNOT_RESCHEDULE: {
    code: 2010,
    message: 'Appointment tidak dapat direschedule',
    messageEn: 'Appointment cannot be rescheduled',
    solution: 'Hubungi klinik untuk bantuan',
    solutionEn: 'Please contact the clinic for assistance',
  },
  
  APPOINTMENT_ALREADY_CANCELLED: {
    code: 2011,
    message: 'Appointment sudah dibatalkan',
    messageEn: 'Appointment already cancelled',
    solution: 'Buat appointment baru jika diperlukan',
    solutionEn: 'Create a new appointment if needed',
  },
  
  APPOINTMENT_CANNOT_CANCEL: {
    code: 2012,
    message: 'Appointment tidak dapat dibatalkan',
    messageEn: 'Appointment cannot be cancelled',
    solution: 'Hubungi klinik untuk bantuan',
    solutionEn: 'Please contact the clinic for assistance',
  },
  
  APPOINTMENT_CANNOT_CONFIRM: {
    code: 2013,
    message: 'Appointment tidak dapat dikonfirmasi',
    messageEn: 'Appointment cannot be confirmed',
    solution: 'Periksa status appointment',
    solutionEn: 'Please check appointment status',
  },

  // ============================================================================
  // PAYMENTS (3000-3099)
  // ============================================================================
  
  PAYMENT_NOT_FOUND: {
    code: 3001,
    message: 'Pembayaran tidak ditemukan',
    messageEn: 'Payment not found',
    solution: 'Periksa kembali ID pembayaran',
    solutionEn: 'Please check the payment ID',
  },
  
  PAYMENT_ALREADY_PAID: {
    code: 3002,
    message: 'Pembayaran sudah lunas',
    messageEn: 'Payment already completed',
    solution: 'Tidak perlu bayar lagi',
    solutionEn: 'No need to pay again',
  },
  
  PAYMENT_FAILED: {
    code: 3003,
    message: 'Pembayaran gagal',
    messageEn: 'Payment failed',
    solution: 'Coba lagi atau gunakan metode pembayaran lain',
    solutionEn: 'Please try again or use a different payment method',
  },
  
  PAYMENT_EXPIRED: {
    code: 3004,
    message: 'Pembayaran sudah kadaluarsa',
    messageEn: 'Payment has expired',
    solution: 'Buat pembayaran baru',
    solutionEn: 'Please create a new payment',
  },
  
  PAYMENT_INVALID_AMOUNT: {
    code: 3005,
    message: 'Jumlah pembayaran tidak valid',
    messageEn: 'Invalid payment amount',
    solution: 'Periksa kembali jumlah yang dibayarkan',
    solutionEn: 'Please check the payment amount',
  },
  
  PAYMENT_REFUND_NOT_ALLOWED: {
    code: 3006,
    message: 'Refund tidak diizinkan',
    messageEn: 'Refund not allowed',
    solution: 'Hubungi customer service untuk bantuan',
    solutionEn: 'Please contact customer service',
  },
  
  PAYMENT_REFUND_DEADLINE: {
    code: 3007,
    message: 'Batas waktu refund terlampaui (90 hari)',
    messageEn: 'Refund deadline exceeded (90 days)',
    solution: 'Hubungi customer service untuk bantuan',
    solutionEn: 'Please contact customer service',
  },

  // ============================================================================
  // COMMUNICATIONS (4000-4099)
  // ============================================================================
  
  CHAT_ROOM_NOT_FOUND: {
    code: 4001,
    message: 'Chat room tidak ditemukan',
    messageEn: 'Chat room not found',
    solution: 'Periksa kembali ID chat room',
    solutionEn: 'Please check the chat room ID',
  },
  
  CHAT_UNAUTHORIZED: {
    code: 4002,
    message: 'Anda tidak memiliki akses ke chat ini',
    messageEn: 'Unauthorized to access this chat',
    solution: 'Hanya pasien dan dokter yang bisa akses chat',
    solutionEn: 'Only patient and dentist can access this chat',
  },
  
  CHAT_MESSAGE_TOO_LONG: {
    code: 4003,
    message: 'Pesan terlalu panjang',
    messageEn: 'Message too long',
    solution: 'Maksimal 5000 karakter per pesan',
    solutionEn: 'Maximum 5000 characters per message',
  },
  
  CHAT_FILE_TOO_LARGE: {
    code: 4004,
    message: 'File terlalu besar',
    messageEn: 'File too large',
    solution: 'Maksimal ukuran file 5MB',
    solutionEn: 'Maximum file size is 5MB',
  },
  
  VIDEO_TOKEN_EXPIRED: {
    code: 4005,
    message: 'Token video call sudah kadaluarsa',
    messageEn: 'Video token has expired',
    solution: 'Silakan refresh untuk mendapatkan token baru',
    solutionEn: 'Please refresh to get a new token',
  },

  // ============================================================================
  // NOTIFICATIONS (5000-5099)
  // ============================================================================
  
  NOTIFICATION_DEVICE_NOT_FOUND: {
    code: 5001,
    message: 'Device tidak terdaftar',
    messageEn: 'Device not registered',
    solution: 'Silakan daftar ulang device Anda',
    solutionEn: 'Please re-register your device',
  },
  
  NOTIFICATION_SEND_FAILED: {
    code: 5002,
    message: 'Gagal mengirim notifikasi',
    messageEn: 'Failed to send notification',
    solution: 'Periksa koneksi internet Anda',
    solutionEn: 'Please check your internet connection',
  },
  
  NOTIFICATION_NOT_FOUND: {
    code: 5003,
    message: 'Notifikasi tidak ditemukan',
    messageEn: 'Notification not found',
    solution: 'Periksa kembali ID notifikasi',
    solutionEn: 'Please check the notification ID',
  },

  // ============================================================================
  // PROFILE & USER MANAGEMENT (6000-6099)
  // ============================================================================
  
  USER_NOT_FOUND: {
    code: 6001,
    message: 'User tidak ditemukan',
    messageEn: 'User not found',
    solution: 'Periksa kembali ID user',
    solutionEn: 'Please check the user ID',
  },
  
  PROFILE_INCOMPLETE: {
    code: 6002,
    message: 'Profil belum lengkap',
    messageEn: 'Incomplete profile',
    solution: 'Lengkapi profil Anda terlebih dahulu',
    solutionEn: 'Please complete your profile first',
  },
  
  PROFILE_UPDATE_FAILED: {
    code: 6003,
    message: 'Gagal update profil',
    messageEn: 'Failed to update profile',
    solution: 'Coba lagi atau hubungi support',
    solutionEn: 'Please try again or contact support',
  },

  // ============================================================================
  // CLINIC MANAGEMENT (7000-7099)
  // ============================================================================
  
  CLINIC_NOT_FOUND: {
    code: 7001,
    message: 'Klinik tidak ditemukan',
    messageEn: 'Clinic not found',
    solution: 'Periksa kembali ID klinik',
    solutionEn: 'Please check the clinic ID',
  },
  
  DENTIST_NOT_FOUND: {
    code: 7002,
    message: 'Dokter gigi tidak ditemukan',
    messageEn: 'Dentist not found',
    solution: 'Periksa kembali ID dokter',
    solutionEn: 'Please check the dentist ID',
  },
  
  DENTIST_NOT_AVAILABLE: {
    code: 7003,
    message: 'Dokter tidak tersedia',
    messageEn: 'Dentist not available',
    solution: 'Pilih dokter atau waktu lain',
    solutionEn: 'Please select another dentist or time',
  },

  // ============================================================================
  // FILE UPLOADS (8000-8099)
  // ============================================================================
  
  FILE_TOO_LARGE: {
    code: 8001,
    message: 'File terlalu besar',
    messageEn: 'File too large',
    solution: 'Maksimal ukuran file 5MB',
    solutionEn: 'Maximum file size is 5MB',
  },
  
  FILE_INVALID_TYPE: {
    code: 8002,
    message: 'Tipe file tidak didukung',
    messageEn: 'Invalid file type',
    solution: 'Hanya mendukung: jpg, png, pdf',
    solutionEn: 'Supported types: jpg, png, pdf',
  },
  
  FILE_UPLOAD_FAILED: {
    code: 8003,
    message: 'Gagal upload file',
    messageEn: 'Failed to upload file',
    solution: 'Coba lagi atau periksa koneksi internet',
    solutionEn: 'Please try again or check your connection',
  },

  // ============================================================================
  // SYSTEM & GENERAL (9000-9099)
  // ============================================================================
  
  VALIDATION_ERROR: {
    code: 9001,
    message: 'Data tidak valid',
    messageEn: 'Validation error',
    solution: 'Periksa kembali data yang Anda masukkan',
    solutionEn: 'Please check your input data',
  },
  
  SERVER_ERROR: {
    code: 9002,
    message: 'Terjadi kesalahan server',
    messageEn: 'Internal server error',
    solution: 'Coba lagi atau hubungi support',
    solutionEn: 'Please try again or contact support',
  },
  
  DATABASE_ERROR: {
    code: 9003,
    message: 'Kesalahan database',
    messageEn: 'Database error',
    solution: 'Coba lagi atau hubungi support',
    solutionEn: 'Please try again or contact support',
  },
  
  RATE_LIMIT_EXCEEDED: {
    code: 9004,
    message: 'Terlalu banyak request',
    messageEn: 'Rate limit exceeded',
    solution: 'Silakan tunggu beberapa saat',
    solutionEn: 'Please wait a moment before trying again',
  },
  
  RESOURCE_NOT_FOUND: {
    code: 9005,
    message: 'Resource tidak ditemukan',
    messageEn: 'Resource not found',
    solution: 'Periksa kembali URL atau ID resource',
    solutionEn: 'Please check the URL or resource ID',
  },
  
  MISSING_REQUIRED_FIELD: {
    code: 9006,
    message: 'Field wajib belum diisi',
    messageEn: 'Missing required field',
    solution: 'Lengkapi semua field yang wajib diisi',
    solutionEn: 'Please fill in all required fields',
  },
};

/**
 * Custom API Error class
 */
export class APIError extends Error {
  constructor(errorCode, details = null, lang = 'id') {
    const error = ERROR_CODES[errorCode];
    
    if (!error) {
      super('Unknown error');
      this.code = 9999;
      this.message = 'Unknown error occurred';
      this.solution = 'Please contact support';
    } else {
      const message = lang === 'en' ? error.messageEn : error.message;
      super(message);
      
      this.code = error.code;
      this.message = message;
      this.solution = lang === 'en' ? error.solutionEn : error.solution;
      this.details = details;
    }
    
    this.name = 'APIError';
    this.errorCode = errorCode;
  }

  toJSON() {
    return {
      code: this.code,
      errorCode: this.errorCode,
      message: this.message,
      solution: this.solution,
      ...(this.details && { details: this.details }),
    };
  }
}

/**
 * Error handler middleware
 */
import { PrismaClient } from '@prisma/client';
import { verify } from './tokens.js';

const prisma = new PrismaClient();

export const errorHandler = async (err, req, res, next) => {
  // Log error for debugging
  console.error('Error:', err);

  // Handle APIError
  if (err instanceof APIError) {
    return res.status(err.code >= 5000 ? 500 : 400).json(err.toJSON());
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      code: 9001,
      errorCode: 'VALIDATION_ERROR',
      message: 'Data tidak valid',
      details: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      code: 1006,
      errorCode: 'AUTH_TOKEN_INVALID',
      message: 'Token tidak valid',
      solution: 'Silakan login kembali',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      code: 1005,
      errorCode: 'AUTH_TOKEN_EXPIRED',
      message: 'Sesi Anda telah berakhir',
      solution: 'Silakan login kembali',
    });
  }

  // Handle Payload Too Large errors (body-parser / entity too large)
  const message = String(err?.message || '').toLowerCase();
  const isPayloadTooLarge = err?.status === 413 || err?.type === 'entity.too.large' || /request entity too large|payload too large/.test(message);

  if (isPayloadTooLarge) {
    // Try to notify the user in-app if we can recover a user id from the token
    try {
      const authHeader = req.headers?.authorization;
      if (authHeader) {
        const token = authHeader.split(' ')[1];
        if (token) {
          const decoded = verify(token);
          const userId = decoded?.sub?.toString?.() ?? decoded?.sub;
          if (userId) {
            await prisma.notification.create({
              data: {
                userId: BigInt(userId),
                type: 'ai_analysis',
                title: 'Gagal menyimpan analisis',
                message: 'Ukuran gambar terlalu besar. Silakan coba unggah gambar yang lebih kecil atau gunakan Wi‑Fi.',
                data: { reason: 'payload_too_large' },
                isRead: false
              }
            });
          }
        }
      }
    } catch (notifyErr) {
      console.warn('Failed to queue notification for payload-too-large:', notifyErr?.message || notifyErr);
    }

    return res.status(413).json({
      code: 8001,
      errorCode: 'FILE_TOO_LARGE',
      message: ERROR_CODES.FILE_TOO_LARGE.message,
      solution: ERROR_CODES.FILE_TOO_LARGE.solution
    });
  }

  // Default error
  return res.status(500).json({
    code: 9002,
    errorCode: 'SERVER_ERROR',
    message: 'Terjadi kesalahan server',
    solution: 'Coba lagi atau hubungi support',
  });
};

export default ERROR_CODES;
