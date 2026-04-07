# 🔐 Phase 1: Authentication Implementation Plan
**Priority:** CRITICAL for Mobile Patient App  
**Timeline:** 3-5 days  
**Goal:** Patient dapat register, login, dan booking appointment dari mobile app

> Historical plan. OTP implementation details in this document are superseded by the SMS-only rollout in `/docs/INTERNAL_RELEASE_CHANGELOG_2026-04-07_OTP_SMS_ONLY.md`. Use `/v1/otp/*` for active integrations.

---

## 🎯 Scope Minimal (Must Have)

Untuk patient bisa **booking dan masuk ke web**, kita butuh:

### ✅ **Priority 1: Patient Registration & Login (Day 1-2)**
1. ✅ Patient registration endpoint (already exists)
2. 🔴 **Phone OTP verification** (untuk verifikasi nomor HP)
3. ✅ Login endpoint (already exists)
4. ✅ JWT token generation (already exists)
5. 🔴 **Token refresh mechanism** (perlu dipastikan working)

### ✅ **Priority 2: Security Basics (Day 2-3)**
1. 🔴 **Rate limiting** (prevent brute force)
2. 🔴 **Input validation** (prevent injection attacks)
3. 🔴 **Password strength requirements**

### 🟡 **Priority 3: Password Management (Day 3-4)** (Nice to have)
1. 🔴 Password reset flow (forgot password)
2. 🔴 Change password

### ⚪ **Skipped for Now** (Can add later)
- ❌ Email verification (tidak critical untuk MVP)
- ❌ Social login (Google/Apple)
- ❌ Biometric auth (client-side only)
- ❌ 2FA (advanced security)

---

## 📋 Implementation Checklist

### **Day 1: OTP Verification Setup**

#### 1.1 Install Dependencies
```bash
cd backend
npm install twilio @sendgrid/mail
```

#### 1.2 Environment Variables
Add to `backend/.env`:
```env
# Twilio (untuk SMS OTP)
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# SendGrid (optional, untuk email OTP sebagai fallback)
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@sereneai.id

# OTP Settings
OTP_EXPIRY_MINUTES=5
OTP_LENGTH=6
```

#### 1.3 Create OTP Service
**File:** `backend/src/services/otp.service.js`

```javascript
const twilio = require('twilio');
const sgMail = require('@sendgrid/mail');
const { prisma } = require('../db');

// Initialize clients
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Generate random 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Store OTP in database with expiry
async function storeOTP(identifier, otp, type = 'phone') {
  const expiresAt = new Date(
    Date.now() + (process.env.OTP_EXPIRY_MINUTES || 5) * 60 * 1000
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
    // Send SMS via Twilio
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
    await sgMail.send({
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: 'Kode Verifikasi SereneAI',
      html: `
        <h2>Kode Verifikasi OTP</h2>
        <p>Kode OTP Anda adalah: <strong>${otp}</strong></p>
        <p>Kode ini berlaku selama 5 menit.</p>
        <p>Jika Anda tidak meminta kode ini, abaikan email ini.</p>
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

module.exports = {
  sendPhoneOTP,
  sendEmailOTP,
  verifyOTP,
};
```

#### 1.4 Create Database Migration for OTP
**File:** `backend/migrations/022_create_otp_verification.sql`

```sql
-- Create OTP verification table
CREATE TABLE IF NOT EXISTS "OTPVerification" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "identifier" TEXT NOT NULL UNIQUE, -- phone number or email
  "otp" TEXT NOT NULL,
  "type" TEXT NOT NULL, -- 'phone' or 'email'
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS "OTPVerification_identifier_idx" ON "OTPVerification"("identifier");
CREATE INDEX IF NOT EXISTS "OTPVerification_expiresAt_idx" ON "OTPVerification"("expiresAt");
```

Run migration:
```bash
cd backend
npm run migrate
```

#### 1.5 Create OTP Routes
**File:** `backend/src/routes/auth.js` (add to existing file)

```javascript
const { sendPhoneOTP, sendEmailOTP, verifyOTP } = require('../services/otp.service');

// Send Phone OTP
router.post('/send-phone-otp', async (req, res) => {
  try {
    const { phone_number } = req.body;

    if (!phone_number) {
      return res.status(400).json({
        code: 'MISSING_PHONE',
        message: 'Phone number is required',
      });
    }

    // Validate phone number format (must start with +)
    if (!phone_number.match(/^\+[1-9]\d{1,14}$/)) {
      return res.status(400).json({
        code: 'INVALID_PHONE',
        message: 'Invalid phone number format. Must include country code (e.g., +628123456789)',
      });
    }

    const result = await sendPhoneOTP(phone_number);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('Send phone OTP error:', error);
    res.status(500).json({
      code: 'OTP_SEND_FAILED',
      message: error.message,
    });
  }
});

// Verify Phone OTP
router.post('/verify-phone-otp', async (req, res) => {
  try {
    const { phone_number, otp } = req.body;

    if (!phone_number || !otp) {
      return res.status(400).json({
        code: 'MISSING_FIELDS',
        message: 'Phone number and OTP are required',
      });
    }

    const result = await verifyOTP(phone_number, otp);

    if (!result.success) {
      return res.status(400).json({
        code: 'OTP_VERIFICATION_FAILED',
        message: result.error,
      });
    }

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      code: 'OTP_VERIFY_ERROR',
      message: 'Failed to verify OTP',
    });
  }
});

// Send Email OTP (fallback)
router.post('/send-email-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        code: 'MISSING_EMAIL',
        message: 'Email is required',
      });
    }

    const result = await sendEmailOTP(email);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('Send email OTP error:', error);
    res.status(500).json({
      code: 'OTP_SEND_FAILED',
      message: error.message,
    });
  }
});
```

---

### **Day 2: Rate Limiting & Input Validation**

#### 2.1 Install Dependencies
```bash
npm install express-rate-limit zod
```

#### 2.2 Create Rate Limiter Middleware
**File:** `backend/src/middleware/rate-limiter.js`

```javascript
const rateLimit = require('express-rate-limit');

// Auth endpoints: 5 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests
  message: {
    code: 'TOO_MANY_REQUESTS',
    message: 'Terlalu banyak percobaan. Silakan coba lagi dalam 15 menit.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// OTP endpoints: 3 requests per 5 minutes (lebih ketat)
const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // 3 requests
  message: {
    code: 'TOO_MANY_OTP_REQUESTS',
    message: 'Terlalu banyak permintaan OTP. Silakan coba lagi dalam 5 menit.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API: 100 requests per minute
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests
  message: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  authLimiter,
  otpLimiter,
  generalLimiter,
};
```

#### 2.3 Apply Rate Limiters
**File:** `backend/src/routes/auth.js` (update)

```javascript
const { authLimiter, otpLimiter } = require('../middleware/rate-limiter');

// Apply to login/register
router.post('/login', authLimiter, async (req, res) => { /* ... */ });
router.post('/patient/register', authLimiter, async (req, res) => { /* ... */ });

// Apply to OTP endpoints
router.post('/send-phone-otp', otpLimiter, async (req, res) => { /* ... */ });
router.post('/verify-phone-otp', otpLimiter, async (req, res) => { /* ... */ });
```

#### 2.4 Create Input Validation Schemas
**File:** `backend/src/schemas/auth.schema.js`

```javascript
const { z } = require('zod');

// Patient registration schema
const patientRegisterSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100),
  email: z.string().email('Email tidak valid'),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .regex(/^(?=.*[a-z])/, 'Password harus mengandung huruf kecil')
    .regex(/^(?=.*[A-Z])/, 'Password harus mengandung huruf besar')
    .regex(/^(?=.*\d)/, 'Password harus mengandung angka'),
  phone_number: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, 'Format nomor HP tidak valid. Contoh: +628123456789'),
  dateOfBirth: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Format tanggal tidak valid',
  }),
  gender: z.enum(['male', 'female', 'other']),
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
    .regex(/^\+[1-9]\d{1,14}$/, 'Format nomor HP tidak valid'),
});

// Verify OTP schema
const verifyOTPSchema = z.object({
  phone_number: z.string(),
  otp: z.string().length(6, 'OTP harus 6 digit'),
});

module.exports = {
  patientRegisterSchema,
  loginSchema,
  phoneOTPSchema,
  verifyOTPSchema,
};
```

#### 2.5 Create Validation Middleware
**File:** `backend/src/middleware/validate.js`

```javascript
const validate = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error.errors) {
        return res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: 'Data tidak valid',
          errors: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      next(error);
    }
  };
};

module.exports = { validate };
```

#### 2.6 Apply Validation
**File:** `backend/src/routes/auth.js` (update)

```javascript
const { validate } = require('../middleware/validate');
const {
  patientRegisterSchema,
  loginSchema,
  phoneOTPSchema,
  verifyOTPSchema,
} = require('../schemas/auth.schema');

router.post('/patient/register', 
  authLimiter, 
  validate(patientRegisterSchema), 
  async (req, res) => { /* ... */ }
);

router.post('/login', 
  authLimiter, 
  validate(loginSchema), 
  async (req, res) => { /* ... */ }
);

router.post('/send-phone-otp', 
  otpLimiter, 
  validate(phoneOTPSchema), 
  async (req, res) => { /* ... */ }
);

router.post('/verify-phone-otp', 
  otpLimiter, 
  validate(verifyOTPSchema), 
  async (req, res) => { /* ... */ }
);
```

---

### **Day 3: Password Reset (Optional tapi Recommended)**

#### 3.1 Create Password Reset Service
**File:** `backend/src/services/password-reset.service.js`

```javascript
const crypto = require('crypto');
const sgMail = require('@sendgrid/mail');
const { prisma } = require('../db');
const bcrypt = require('bcrypt');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Generate reset token
async function generateResetToken(email) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    // Don't reveal if email exists
    return { success: true, message: 'Jika email terdaftar, link reset akan dikirim' };
  }

  // Generate token
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Store token
  await prisma.passwordReset.upsert({
    where: { userId: user.id },
    update: { token, expiresAt, used: false },
    create: { userId: user.id, token, expiresAt },
  });

  // Send email
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  
  await sgMail.send({
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject: 'Reset Password SereneAI',
    html: `
      <h2>Reset Password</h2>
      <p>Klik link berikut untuk reset password Anda:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>Link ini berlaku selama 1 jam.</p>
      <p>Jika Anda tidak meminta reset password, abaikan email ini.</p>
    `,
  });

  return { success: true, message: 'Jika email terdaftar, link reset akan dikirim' };
}

// Reset password
async function resetPassword(token, newPassword) {
  const resetRecord = await prisma.passwordReset.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!resetRecord || resetRecord.used) {
    return { success: false, error: 'Token tidak valid atau sudah digunakan' };
  }

  if (new Date() > resetRecord.expiresAt) {
    return { success: false, error: 'Token sudah expired. Silakan request ulang' };
  }

  // Hash new password
  const password_hash = await bcrypt.hash(newPassword, 10);

  // Update password
  await prisma.user.update({
    where: { id: resetRecord.userId },
    data: { password_hash },
  });

  // Mark token as used
  await prisma.passwordReset.update({
    where: { token },
    data: { used: true },
  });

  return { success: true, message: 'Password berhasil direset' };
}

module.exports = {
  generateResetToken,
  resetPassword,
};
```

#### 3.2 Add Password Reset Routes
**File:** `backend/src/routes/auth.js`

```javascript
const { generateResetToken, resetPassword } = require('../services/password-reset.service');

// Forgot Password
router.post('/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        code: 'MISSING_EMAIL',
        message: 'Email is required',
      });
    }

    const result = await generateResetToken(email);
    res.json(result);
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      code: 'FORGOT_PASSWORD_ERROR',
      message: 'Failed to process request',
    });
  }
});

// Reset Password
router.post('/reset-password', authLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        code: 'MISSING_FIELDS',
        message: 'Token and new password are required',
      });
    }

    // Validate new password
    if (newPassword.length < 8) {
      return res.status(400).json({
        code: 'WEAK_PASSWORD',
        message: 'Password minimal 8 karakter',
      });
    }

    const result = await resetPassword(token, newPassword);

    if (!result.success) {
      return res.status(400).json({
        code: 'RESET_FAILED',
        message: result.error,
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      code: 'RESET_PASSWORD_ERROR',
      message: 'Failed to reset password',
    });
  }
});
```

#### 3.3 Create Migration for Password Reset
**File:** `backend/migrations/023_create_password_reset.sql`

```sql
CREATE TABLE IF NOT EXISTS "PasswordReset" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "used" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") 
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "PasswordReset_userId_idx" ON "PasswordReset"("userId");
CREATE INDEX "PasswordReset_token_idx" ON "PasswordReset"("token");
```

---

## 🧪 Testing Checklist

### Manual Testing with Postman

#### Test 1: Patient Registration
```json
POST http://localhost:3000/v1/auth/patient/register

{
  "name": "Test Patient",
  "email": "patient@test.com",
  "password": "SecurePass123",
  "phone_number": "+628123456789",
  "dateOfBirth": "1990-01-01",
  "gender": "male"
}
```

Expected: 201 Created with user data and token

#### Test 2: Send Phone OTP
```json
POST http://localhost:3000/v1/auth/send-phone-otp

{
  "phone_number": "+628123456789"
}
```

Expected: 200 OK with success message

#### Test 3: Verify Phone OTP
```json
POST http://localhost:3000/v1/auth/verify-phone-otp

{
  "phone_number": "+628123456789",
  "otp": "123456"
}
```

Expected: 200 OK if correct, 400 if wrong

#### Test 4: Login
```json
POST http://localhost:3000/v1/auth/login

{
  "email": "patient@test.com",
  "password": "SecurePass123"
}
```

Expected: 200 OK with tokens

#### Test 5: Rate Limiting
Send 6 login requests rapidly.  
Expected: 6th request returns 429 Too Many Requests

---

## 📊 Timeline Summary

| Day | Task | Hours | Status |
|-----|------|-------|--------|
| **Day 1** | OTP Service + Routes | 6h | 🔴 TODO |
| **Day 2** | Rate Limiting + Validation | 5h | 🔴 TODO |
| **Day 3** | Password Reset | 4h | 🟡 OPTIONAL |
| **Day 4** | Testing + Bug Fixes | 3h | 🔴 TODO |

**Total:** 15-18 hours (2-3 days)

---

## ✅ Success Criteria

Before declaring "DONE", ensure:

- [ ] Patient can register with phone number
- [ ] OTP sent via SMS successfully
- [ ] OTP verification works (correct + incorrect cases)
- [ ] Login returns valid JWT tokens
- [ ] Token refresh works
- [ ] Rate limiting prevents brute force
- [ ] Input validation blocks invalid data
- [ ] Password reset flow works (optional)
- [ ] All tests pass in Postman
- [ ] No security vulnerabilities

---

## 🚀 Next Steps After Authentication

Once authentication is done:

1. **Test from Mobile App**
   - Mobile team can start testing registration/login
   - Test OTP flow on real devices

2. **Integrate with Appointment Booking**
   - Authenticated patients can book appointments
   - Test full flow: register → verify → login → book

3. **Deploy to Staging**
   - Setup staging environment
   - Test with production-like config

---

**Last Updated:** November 10, 2025  
**Status:** 🔴 NOT STARTED - Ready to implement  
**Owner:** Backend Team
