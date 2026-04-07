# ✅ Mobile Readiness - Quick Action Checklist

**Status:** ⚠️ NOT READY - Complete all 🔴 CRITICAL items before mobile development

---

## 🔥 WEEK 1: Authentication & Security

### Backend Tasks

#### 🔴 OTP Verification (Day 1-2)
- [ ] Install Twilio SDK: `npm install twilio`
- [ ] Install SendGrid: `npm install @sendgrid/mail`
- [ ] Add to `.env`:
  ```
  TWILIO_ACCOUNT_SID=your_account_sid
  TWILIO_AUTH_TOKEN=your_auth_token
  TWILIO_PHONE_NUMBER=your_twilio_number
  SENDGRID_API_KEY=your_sendgrid_key
  SENDGRID_FROM_EMAIL=noreply@sereneai.id
  ```
- [ ] Use `backend/src/services/otp/` as the OTP adapter/service layer
- [ ] Use public OTP endpoints:
  - `POST /v1/otp/requests`
  - `POST /v1/otp/requests/:challengeId/resend`
  - `POST /v1/otp/verifications`
- [ ] Keep `OTP_EMAIL_DEPRECATED=true`
- [ ] Verify `channel=email` returns `OTP_CHANNEL_DEPRECATED`
- [ ] Test cooldown, rate-limit, and lockout behavior
- [ ] Update `docs/mobile-api-contract.md` with OTP endpoints

#### 🔴 Password Reset (Day 2)
- [ ] Create `backend/src/services/password-reset.js`:
  - `generateResetToken(userId)` - UUID v4 token
  - `sendResetEmail(email, token)` - SendGrid with link
  - `validateResetToken(token)` - Check expiry (1 hour)
- [ ] Create endpoints in `backend/src/routes/auth.js`:
  - `POST /v1/auth/forgot-password` - Send reset email
  - `POST /v1/auth/reset-password` - Reset with token
- [ ] Store reset tokens in database with expiry
- [ ] Test password reset flow end-to-end
- [ ] Update Swagger documentation

#### 🔴 Email Verification (Day 2-3)
- [ ] Modify patient registration to set `emailVerified = false`
- [ ] Create `backend/src/services/email-verification.js`:
  - `generateVerificationToken(userId)` - JWT with 24h expiry
  - `sendVerificationEmail(email, token)` - SendGrid
- [ ] Create endpoints in `backend/src/routes/auth.js`:
  - `POST /v1/auth/send-verification-email` - Resend verification
  - `GET /v1/auth/verify-email/:token` - Verify email
- [ ] Add middleware to check `emailVerified` for protected routes
- [ ] Test verification flow
- [ ] Update Postman collection

#### 🔴 Rate Limiting (Day 3)
- [ ] Install: `npm install express-rate-limit rate-limit-redis`
- [ ] Install Redis (if not already): `npm install redis`
- [ ] Create `backend/src/middleware/rate-limiter.js`:
  ```javascript
  const rateLimit = require('express-rate-limit');
  const RedisStore = require('rate-limit-redis');
  const Redis = require('redis');

  const redisClient = Redis.createClient({ url: process.env.REDIS_URL });

  // Auth endpoints: 5 requests per 15 minutes
  const authLimiter = rateLimit({
    store: new RedisStore({ client: redisClient }),
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many requests from this IP, please try again later.',
  });

  // General endpoints: 100 requests per minute
  const generalLimiter = rateLimit({
    store: new RedisStore({ client: redisClient }),
    windowMs: 60 * 1000,
    max: 100,
  });

  module.exports = { authLimiter, generalLimiter };
  ```
- [ ] Apply `authLimiter` to auth routes
- [ ] Apply `generalLimiter` to all other routes
- [ ] Test rate limiting with multiple requests
- [ ] Add rate limit headers to response

#### 🔴 Input Validation (Day 3-4)
- [ ] Install: `npm install zod`
- [ ] Create `backend/src/schemas/auth.schema.js`:
  ```javascript
  const { z } = require('zod');

  const registerSchema = z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
    phone_number: z.string().regex(/^\+?[1-9]\d{1,14}$/),
    dateOfBirth: z.string().datetime(),
    gender: z.enum(['male', 'female', 'other']),
  });

  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
  });

  module.exports = { registerSchema, loginSchema };
  ```
- [ ] Create validation middleware:
  ```javascript
  const validate = (schema) => (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      return res.status(400).json({ 
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: error.errors,
      });
    }
  };
  ```
- [ ] Apply validation to all endpoints:
  - Registration, login, password reset, profile update
  - Appointment booking, payment creation
- [ ] Create schemas for all entities:
  - `appointment.schema.js`, `payment.schema.js`, `profile.schema.js`
- [ ] Test with invalid inputs
- [ ] Document validation rules in Swagger

#### ✅ Week 1 Deliverables Checklist
- [ ] OTP verification working (phone + email)
- [ ] Password reset flow complete
- [ ] Email verification implemented
- [ ] Rate limiting on all routes
- [ ] Input validation on all endpoints
- [ ] All tests passing
- [ ] Postman collection updated
- [ ] Documentation updated

---

## ☁️ WEEK 2: Payments & Infrastructure

### Backend Tasks

#### 🔴 Refund API (Day 1-2)
- [ ] Read Midtrans refund API docs: https://docs.midtrans.com/reference/refund-transaction
- [ ] Add to `backend/src/services/midtrans.js`:
  ```javascript
  async refundPayment(orderId, amount, reason) {
    const response = await axios.post(
      `${process.env.MIDTRANS_API_URL}/v2/${orderId}/refund`,
      { amount, reason },
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(process.env.MIDTRANS_SERVER_KEY + ':').toString('base64')}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  }
  ```
- [ ] Create `POST /v1/payments/:id/refund` endpoint:
  - Validate payment exists and is refundable
  - Call Midtrans refund API
  - Update PaymentIntent status to 'refunded'
  - Update Appointment status if needed
  - Send refund notification to patient
- [ ] Add refund validation:
  - Only 'completed' payments can be refunded
  - Refund amount <= original amount
  - Refund within 90 days of payment
- [ ] Test full refund and partial refund
- [ ] Update Swagger docs

#### 🔴 Payment History (Day 2)
- [ ] Create `GET /v1/payments` endpoint:
  ```javascript
  router.get('/payments', authenticate, async (req, res) => {
    const { userId, status, startDate, endDate, page = 1, limit = 20 } = req.query;
    
    const payments = await prisma.paymentIntent.findMany({
      where: {
        userId: userId || req.user.id,
        status: status ? { in: status.split(',') } : undefined,
        createdAt: {
          gte: startDate ? new Date(startDate) : undefined,
          lte: endDate ? new Date(endDate) : undefined,
        },
      },
      include: {
        appointment: {
          include: {
            dentist: { select: { name: true } },
            clinic: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await prisma.paymentIntent.count({ where });

    res.json({
      data: payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });
  ```
- [ ] Add filters: status, date range, amount range
- [ ] Add pagination
- [ ] Include appointment details in response
- [ ] Test with various filters
- [ ] Update Swagger docs

#### 🔴 Receipt Generation (Day 3-4)
- [ ] Install: `npm install pdfkit`
- [ ] Create `backend/src/services/receipt.js`:
  ```javascript
  const PDFDocument = require('pdfkit');
  const fs = require('fs');

  async function generateReceipt(payment) {
    const doc = new PDFDocument();
    const filename = `receipt-${payment.id}.pdf`;
    const filepath = `./uploads/receipts/${filename}`;

    doc.pipe(fs.createWriteStream(filepath));

    // Header
    doc.fontSize(20).text('SereneAI - Payment Receipt', { align: 'center' });
    doc.moveDown();

    // Receipt details
    doc.fontSize(12)
      .text(`Receipt #: ${payment.id}`)
      .text(`Date: ${new Date(payment.createdAt).toLocaleDateString('id-ID')}`)
      .text(`Patient: ${payment.user.name}`)
      .text(`Dentist: ${payment.appointment.dentist.name}`)
      .text(`Clinic: ${payment.appointment.clinic.name}`)
      .moveDown()
      .text(`Amount: Rp ${payment.amount.toLocaleString('id-ID')}`)
      .text(`Payment Method: ${payment.provider}`)
      .text(`Status: ${payment.status}`);

    // Footer
    doc.moveDown(2)
      .fontSize(10)
      .text('Thank you for using SereneAI!', { align: 'center' })
      .text('For support: support@sereneai.id', { align: 'center' });

    doc.end();

    return { filename, filepath };
  }

  module.exports = { generateReceipt };
  ```
- [ ] Create `GET /v1/payments/:id/receipt` endpoint
- [ ] Auto-generate receipt after payment confirmation
- [ ] Email receipt to patient via SendGrid
- [ ] Store receipt URL in database
- [ ] Test PDF generation
- [ ] Upload receipts to S3 (after cloud storage setup)

#### 🔴 Production Payment Setup (Day 4)
- [ ] Register for Midtrans production account
- [ ] Complete KYB (Know Your Business) verification
- [ ] Get production credentials:
  - Server Key
  - Client Key
  - Merchant ID
- [ ] Update `.env` with production credentials
- [ ] Configure payment methods:
  - Credit/Debit Card (Visa, Mastercard, JCB)
  - Virtual Account (BCA, Mandiri, BNI, BRI, Permata)
  - E-Wallet (GoPay, ShopeePay, DANA, LinkAja)
  - QRIS
  - Alfamart/Indomaret
- [ ] Test each payment method in sandbox
- [ ] Configure webhook URL: `https://api.sereneai.id/v1/payments/webhooks/midtrans`
- [ ] Test webhook delivery
- [ ] Setup production monitoring

### DevOps Tasks

#### 🔴 Cloud Storage Setup (Day 1-2)
**Option A: AWS S3**
- [ ] Create AWS account
- [ ] Create S3 bucket: `sereneai-production`
- [ ] Enable CORS:
  ```json
  [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedOrigins": ["https://sereneai.id", "https://app.sereneai.id"],
      "ExposeHeaders": []
    }
  ]
  ```
- [ ] Create IAM user with S3 access
- [ ] Install SDK: `npm install @aws-sdk/client-s3`
- [ ] Update upload service:
  ```javascript
  const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

  const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  async function uploadToS3(file, folder) {
    const key = `${folder}/${Date.now()}-${file.originalname}`;
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));
    return `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
  }
  ```
- [ ] Migrate existing uploads to S3
- [ ] Update all file URLs in database
- [ ] Test upload/download

**Option B: Google Cloud Storage**
- [ ] Create GCP project
- [ ] Create Cloud Storage bucket
- [ ] Install SDK: `npm install @google-cloud/storage`
- [ ] Follow similar steps as S3

#### 🔴 CDN Configuration (Day 2)
**If using AWS S3:**
- [ ] Create CloudFront distribution
- [ ] Point origin to S3 bucket
- [ ] Configure cache behaviors:
  - TTL: 1 year for avatars/documents
  - TTL: 1 day for chat attachments
- [ ] Enable compression (gzip, brotli)
- [ ] Add custom domain: `cdn.sereneai.id`
- [ ] Update file URLs to use CDN

**If using GCS:**
- [ ] Enable Cloud CDN
- [ ] Configure cache rules
- [ ] Add custom domain

#### 🔴 Staging Environment (Day 3-5)
**Railway Deployment:**
- [ ] Create Railway account
- [ ] Connect GitHub repository
- [ ] Create new project: `sereneai-staging`
- [ ] Add PostgreSQL service
- [ ] Configure environment variables:
  ```
  DATABASE_URL=<railway_postgres_url>
  NODE_ENV=staging
  PORT=3000
  JWT_SECRET=<random_secret>
  FRONTEND_URL=https://staging.sereneai.id
  REDIS_URL=<railway_redis_url>
  
  # Payment
  MIDTRANS_SERVER_KEY=<sandbox_key>
  MIDTRANS_CLIENT_KEY=<sandbox_client>
  MIDTRANS_IS_PRODUCTION=false
  
  # Notifications
  TWILIO_ACCOUNT_SID=<test_sid>
  TWILIO_AUTH_TOKEN=<test_token>
  SENDGRID_API_KEY=<test_key>
  FCM_SERVICE_ACCOUNT=<test_credentials>
  
  # Storage
  AWS_ACCESS_KEY_ID=<key>
  AWS_SECRET_ACCESS_KEY=<secret>
  S3_BUCKET_NAME=sereneai-staging
  ```
- [ ] Deploy backend: `railway up`
- [ ] Run migrations: `railway run npm run migrate`
- [ ] Seed database: `railway run npm run seed`
- [ ] Test API endpoints: `https://api-staging.sereneai.id/v1/health`
- [ ] Deploy frontend to Vercel/Netlify
- [ ] Point `staging.sereneai.id` to Vercel
- [ ] Test full app end-to-end

#### 🔴 Monitoring Setup (Day 5-6)
**Sentry Error Tracking:**
- [ ] Create Sentry account
- [ ] Create new project: `sereneai-backend`
- [ ] Install SDK: `npm install @sentry/node`
- [ ] Initialize in `server.js`:
  ```javascript
  const Sentry = require('@sentry/node');

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 1.0,
  });

  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.errorHandler());
  ```
- [ ] Test error reporting
- [ ] Setup alerts to Slack

**DataDog/New Relic APM:**
- [ ] Choose APM provider
- [ ] Install agent
- [ ] Configure metrics collection
- [ ] Create dashboard for:
  - Request rate, error rate, latency
  - Database query performance
  - Memory/CPU usage
- [ ] Setup alerts for anomalies

#### ✅ Week 2 Deliverables Checklist
- [ ] Payment refund API working
- [ ] Payment history endpoint live
- [ ] Receipt PDF generation working
- [ ] Production payment provider configured
- [ ] Cloud storage (S3/GCS) configured
- [ ] CDN serving media files
- [ ] Staging environment deployed
- [ ] Monitoring dashboard operational
- [ ] All tests passing on staging

---

## 📚 WEEK 3: Documentation & Mobile Prep

### Backend Tasks

#### 🔴 OpenAPI/Swagger (Day 1-3)
- [ ] Install: `npm install swagger-jsdoc swagger-ui-express`
- [ ] Create `backend/src/swagger.js`:
  ```javascript
  const swaggerJsdoc = require('swagger-jsdoc');

  const options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'SereneAI API',
        version: '1.0.0',
        description: 'API for SereneAI dental platform',
      },
      servers: [
        { url: 'http://localhost:3000/v1', description: 'Local' },
        { url: 'https://api-staging.sereneai.id/v1', description: 'Staging' },
        { url: 'https://api.sereneai.id/v1', description: 'Production' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    apis: ['./src/routes/*.js'], // Path to route files
  };

  const specs = swaggerJsdoc(options);
  module.exports = specs;
  ```
- [ ] Add Swagger UI to `server.js`:
  ```javascript
  const swaggerUi = require('swagger-ui-express');
  const swaggerSpecs = require('./swagger');

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));
  ```
- [ ] Annotate all endpoints in `backend/src/routes/*.js`:
  ```javascript
  /**
   * @swagger
   * /auth/patient/register:
   *   post:
   *     summary: Register a new patient
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *                 example: "John Doe"
   *               email:
   *                 type: string
   *                 example: "john@example.com"
   *               password:
   *                 type: string
   *                 example: "SecureP@ss123"
   *               phone_number:
   *                 type: string
   *                 example: "+628123456789"
   *     responses:
   *       201:
   *         description: Patient registered successfully
   *       400:
   *         description: Validation error
   *       409:
   *         description: Email already exists
   */
  router.post('/patient/register', validate(registerSchema), async (req, res) => {
    // Implementation
  });
  ```
- [ ] Document all endpoints:
  - Auth (10 endpoints)
  - Appointments (7 endpoints)
  - Payments (6 endpoints)
  - Communications (8 endpoints)
  - Notifications (4 endpoints)
  - Clinic (5 endpoints)
- [ ] Add request/response examples for each
- [ ] Test Swagger UI at `http://localhost:3000/docs`
- [ ] Deploy to staging

#### 🔴 Error Code Reference (Day 3)
- [ ] Create `backend/src/utils/errors.js`:
  ```javascript
  const ERROR_CODES = {
    // Authentication (1000-1099)
    AUTH_INVALID_CREDENTIALS: {
      code: 1001,
      message: 'Invalid email or password',
      solution: 'Please check your credentials and try again',
    },
    AUTH_EMAIL_EXISTS: {
      code: 1002,
      message: 'Email already registered',
      solution: 'Please use a different email or try logging in',
    },
    AUTH_OTP_EXPIRED: {
      code: 1003,
      message: 'OTP has expired',
      solution: 'Please request a new OTP',
    },
    AUTH_OTP_INVALID: {
      code: 1004,
      message: 'Invalid OTP',
      solution: 'Please check the code and try again',
    },
    AUTH_TOKEN_EXPIRED: {
      code: 1005,
      message: 'Access token has expired',
      solution: 'Please refresh your token or login again',
    },

    // Appointments (2000-2099)
    APPOINTMENT_NOT_FOUND: {
      code: 2001,
      message: 'Appointment not found',
      solution: 'Please check the appointment ID',
    },
    APPOINTMENT_CONFLICT: {
      code: 2002,
      message: 'Time slot already booked',
      solution: 'Please select a different time',
    },
    APPOINTMENT_CANCEL_DEADLINE: {
      code: 2003,
      message: 'Cannot cancel within 24 hours',
      solution: 'Please contact the clinic directly',
    },

    // Payments (3000-3099)
    PAYMENT_NOT_FOUND: {
      code: 3001,
      message: 'Payment not found',
      solution: 'Please check the payment ID',
    },
    PAYMENT_ALREADY_REFUNDED: {
      code: 3002,
      message: 'Payment already refunded',
      solution: 'Cannot refund the same payment twice',
    },
    PAYMENT_REFUND_DEADLINE: {
      code: 3003,
      message: 'Refund deadline exceeded (90 days)',
      solution: 'Please contact support for assistance',
    },

    // Add more error codes...
  };

  class AppError extends Error {
    constructor(errorCode, details = null) {
      const error = ERROR_CODES[errorCode];
      super(error.message);
      this.code = error.code;
      this.solution = error.solution;
      this.details = details;
    }
  }

  module.exports = { ERROR_CODES, AppError };
  ```
- [ ] Update all routes to use `AppError`
- [ ] Add error codes to Swagger documentation
- [ ] Create `docs/ERROR_CODES.md` with full reference
- [ ] Test error responses

#### 🔴 Mobile Translation Package (Day 4)
- [ ] Create new directory: `packages/translations/`
- [ ] Create `package.json`:
  ```json
  {
    "name": "@sereneai/translations",
    "version": "1.0.0",
    "description": "Translation files for SereneAI apps",
    "main": "index.js",
    "scripts": {
      "build": "node build.js"
    }
  }
  ```
- [ ] Extract mobile-relevant translations from `src/translations/id2.js` and `en2.js`
- [ ] Create simplified structure:
  ```javascript
  // packages/translations/id.json
  {
    "auth": {
      "login": "Masuk",
      "register": "Daftar",
      "forgotPassword": "Lupa Password?",
      // ...
    },
    "appointments": {
      "book": "Buat Janji",
      "upcoming": "Mendatang",
      "past": "Riwayat",
      // ...
    },
    "payments": {
      "pay": "Bayar",
      "history": "Riwayat Pembayaran",
      // ...
    }
  }
  ```
- [ ] Create index.js:
  ```javascript
  const id = require('./id.json');
  const en = require('./en.json');

  module.exports = { id, en };
  ```
- [ ] Publish to npm (or private registry):
  ```bash
  npm login
  npm publish --access public
  ```
- [ ] Test installation: `npm install @sereneai/translations`

#### 🔴 App Version Check (Day 4)
- [ ] Create `backend/src/routes/app.js`:
  ```javascript
  router.get('/version', (req, res) => {
    res.json({
      current: {
        ios: '1.0.0',
        android: '1.0.0',
      },
      minimum: {
        ios: '1.0.0',
        android: '1.0.0',
      },
      forceUpdate: false,
      updateUrl: {
        ios: 'https://apps.apple.com/app/sereneai',
        android: 'https://play.google.com/store/apps/details?id=ai.serene.patient',
      },
    });
  });
  ```
- [ ] Mount in `server.js`: `app.use('/v1/app', appRoutes);`
- [ ] Add database table for version tracking (optional)
- [ ] Test endpoint
- [ ] Document in Swagger

#### 🔴 Notification Production (Day 5)
- [ ] **FCM Production:**
  - Create Firebase project
  - Enable Cloud Messaging
  - Download service account JSON
  - Add to `.env`: `FCM_SERVICE_ACCOUNT_PATH=./config/firebase-admin.json`
  - Test push notification to real device

- [ ] **SendGrid Production:**
  - Verify domain: `sereneai.id`
  - Create API key with full access
  - Add to `.env`: `SENDGRID_API_KEY=<production_key>`
  - Test email delivery

- [ ] **Twilio Production:**
  - Upgrade to paid account
  - Verify phone number
  - Add to `.env`:
    ```
    TWILIO_ACCOUNT_SID=<production_sid>
    TWILIO_AUTH_TOKEN=<production_token>
    TWILIO_PHONE_NUMBER=<verified_number>
    ```
  - Test SMS delivery

#### 🔴 Appointment Reminders (Day 5-6)
- [ ] Install: `npm install bullmq`
- [ ] Create `backend/src/queues/reminder.queue.js`:
  ```javascript
  const { Queue, Worker } = require('bullmq');
  const { notificationService } = require('../services/notification');

  const reminderQueue = new Queue('appointment-reminders', {
    connection: { url: process.env.REDIS_URL },
  });

  const reminderWorker = new Worker('appointment-reminders', async (job) => {
    const { appointmentId, type } = job.data;
    
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: true, dentist: true, clinic: true },
    });

    if (!appointment) return;

    await notificationService.sendAppointmentReminder({
      patient: appointment.patient,
      dentist: appointment.dentist,
      clinic: appointment.clinic,
      appointmentDate: appointment.scheduled_time,
      type, // '24h' or '1h'
    });
  }, {
    connection: { url: process.env.REDIS_URL },
  });

  async function scheduleReminders(appointment) {
    const appointmentTime = new Date(appointment.scheduled_time);
    
    // 24 hours before
    const reminder24h = new Date(appointmentTime.getTime() - 24 * 60 * 60 * 1000);
    await reminderQueue.add('24h-reminder', {
      appointmentId: appointment.id,
      type: '24h',
    }, {
      delay: reminder24h.getTime() - Date.now(),
    });

    // 1 hour before
    const reminder1h = new Date(appointmentTime.getTime() - 60 * 60 * 1000);
    await reminderQueue.add('1h-reminder', {
      appointmentId: appointment.id,
      type: '1h',
    }, {
      delay: reminder1h.getTime() - Date.now(),
    });
  }

  module.exports = { scheduleReminders };
  ```
- [ ] Call `scheduleReminders()` when appointment is created
- [ ] Create notification templates for reminders
- [ ] Test reminder delivery
- [ ] Add to monitoring dashboard

#### ✅ Week 3 Deliverables Checklist
- [ ] Swagger UI live at `/docs`
- [ ] All endpoints documented
- [ ] Error code reference complete
- [ ] Mobile translation package published
- [ ] App version check endpoint working
- [ ] Production notification credentials configured
- [ ] Automated appointment reminders working
- [ ] All tests passing

---

## 📱 Mobile Team Onboarding (After Week 2)

### Setup Checklist
- [ ] Access granted to:
  - GitHub repository
  - Staging environment
  - Postman workspace
  - Slack channel (#sereneai-mobile)
  - Sentry project
  - Firebase project

- [ ] Tools installed:
  - Node.js 18+
  - React Native CLI / Expo CLI
  - Xcode (Mac only)
  - Android Studio
  - VS Code with extensions

- [ ] Test API access:
  - [ ] Register patient via Postman
  - [ ] Login and get access token
  - [ ] Book appointment
  - [ ] Create payment
  - [ ] Send chat message

- [ ] Review documentation:
  - [ ] Mobile API Contract (`docs/mobile-api-contract.md`)
  - [ ] Error Code Reference (`docs/ERROR_CODES.md`)
  - [ ] Swagger UI (`staging.sereneai.id/docs`)
  - [ ] Roadmap (`docs/MOBILE_DEVELOPMENT_ROADMAP.md`)

---

## 🚀 Final Sign-Off Checklist

Before starting mobile development, ensure ALL items are checked:

### Backend Readiness
- [ ] ✅ All 🔴 CRITICAL items from Weeks 1-3 complete
- [ ] ✅ Staging environment stable for 48 hours
- [ ] ✅ All API tests passing (100% success rate)
- [ ] ✅ Error rate < 1% on staging
- [ ] ✅ API response time p95 < 200ms

### Documentation Completeness
- [ ] ✅ Swagger UI accessible with all endpoints
- [ ] ✅ Postman collection updated and shared
- [ ] ✅ Error codes documented
- [ ] ✅ Mobile translation package published

### Infrastructure Stability
- [ ] ✅ Monitoring dashboard showing healthy metrics
- [ ] ✅ Alerts configured and tested
- [ ] ✅ Cloud storage operational
- [ ] ✅ CDN serving files correctly
- [ ] ✅ Database backups automated

### Mobile Team Ready
- [ ] ✅ All team members have access
- [ ] ✅ Tech stack decided and approved
- [ ] ✅ Design system extracted from web
- [ ] ✅ Can make successful API calls to staging

### Product Approval
- [ ] ✅ MVP scope finalized (8 user stories)
- [ ] ✅ Success metrics defined
- [ ] ✅ Beta testing plan ready

---

**Last Updated:** November 10, 2025  
**Status:** Use this checklist to track daily progress  
**Contact:** Adrian Halim (Project Lead)
