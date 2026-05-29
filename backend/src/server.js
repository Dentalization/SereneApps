import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import http from 'http';
import { Readable } from 'stream';
import { fileURLToPath } from 'url';
import { Server as SocketIOServer } from 'socket.io';
import authRouter from './routes/auth.js';
import clinicRouter from './routes/clinic.js';
import clinicTeledentistryRouter from './routes/clinicTeledentistry.js';
import clinicsRouter from './routes/clinics.js';
import dentistsRouter from './routes/dentists.js';
import profileRouter from './routes/profile.js';
import patientRouter from './routes/patient.js';
import otpRouter from './routes/otp.js';
import adminProfileRouter from './routes/admin-profile.js';
import adminDentistsRouter from './routes/admin-dentists.js';
import adminRouter from './routes/admin.js';
import adminDashboardRouter from './routes/admin-dashboard.js';
import appointmentsRouter from './routes/appointments.js';
import paymentsRouter from './routes/payments.js';
import paymentWebhooksRouter from './routes/payment-webhooks.js';
import financialsRouter from './routes/financials.js';
import communicationsRouter from './routes/communications.js';
import notificationsRouter from './routes/notifications.js';
import chatRouter from './routes/chat.js';
import clinicServicesRouter from './routes/clinicServices.js';
import clinicProfileRouter from './routes/clinicProfile.js';
import dentistServicesRouter from './routes/dentistServices.js';
import dentistPortalRouter from './routes/dentist-portal.js';
import aiAnalysisRouter from './routes/ai-analysis.js';
import emrRouter from './routes/emr.js';
import xCoreRouter from './routes/xCoreRoutes.js';
import verifiedCasesRouter, { assertVerifiedCaseWorkspaceRuntimeMode } from './routes/verified-cases.js';
import webhooksRouter from './routes/webhooks.js';
import { verify } from './utils/tokens.js';
import {
  buildDeepDentalProxyHeaders,
  getDeepDentalProxyAuthError,
  isDeepDentalApiPath,
} from './utils/deepDentalProxy.js';
import { registerChatGateway } from './sockets/chat.js';
import { startNotificationWorker } from './services/notifications/index.js';
import { start as startOutboxWorker } from './services/events/outboxWorker.js';
import { startReminderWorker } from './services/appointments/reminderService.js';
import { startCommunicationsRetentionWorker } from './services/communications/retentionService.js';
import { validateAttachmentStorageConfiguration } from './services/communications/attachmentStorageService.js';
import { startWebhookWorker } from './services/webhooks/webhookQueue.js';
import { startReconcileScheduler } from './services/payments/reconcileJob.js';
import { errorHandler } from './utils/error-codes.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';

// Handle BigInt serialization in JSON responses
BigInt.prototype.toJSON = function () { return this.toString(); };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pyApiBase = (
  process.env.DEEPDENTAL_API_BASE_URL ||
  process.env.XCORE_PY_API_BASE_URL ||
  'http://127.0.0.1:8000'
).replace(/\/$/, '');

const app = express();
const server = http.createServer(app);

const allow = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const checkOrigin = (origin, cb) => {
  if (!origin) return cb(null, true);
  if (!allow.length || allow.includes(origin)) return cb(null, true);
  return cb(new Error('Not allowed by CORS'));
};
const corsOptions = {
  origin: checkOrigin,
  credentials: true,
};

const io = new SocketIOServer(server, {
  cors: {
    origin: checkOrigin,
    credentials: true
  }
});

app.set('io', io);

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Unauthorized'));
    }
    const payload = verify(token);
    socket.data.user = {
      id: payload.sub?.toString?.() ?? payload.sub,
      roles: payload.roles || []
    };
    return next();
  } catch (error) {
    console.error('Socket auth error:', error);
    return next(new Error('Unauthorized'));
  }
});

registerChatGateway(io);
startNotificationWorker();
startOutboxWorker();
startReminderWorker();
startCommunicationsRetentionWorker();
startWebhookWorker();
startReconcileScheduler();

app.use(cors(corsOptions));
// Increase JSON body size limit to handle AI analysis payloads safely
// Default 100kb was causing PayloadTooLargeError for annotated images metadata
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '512kb' }));

app.use('/py-api', async (req, res) => {
  const proxyPath = req.originalUrl.replace(/^\/py-api/, '') || '/';
  const targetUrl = new URL(proxyPath, `${pyApiBase}/`);
  const backendApiKey = process.env.DEEPDENTAL_API_KEY || process.env.SERENE_AI_API_KEY || '';

  const authError = getDeepDentalProxyAuthError({
    path: targetUrl.pathname,
    authorization: req.headers.authorization || '',
    backendApiKey,
    verifyToken: verify,
  });

  if (authError) {
    return res.status(authError.status).json({
      error: {
        code: authError.code,
        message: authError.code === 'deepdental_proxy_not_configured'
          ? 'DeepDental proxy is missing a backend API key.'
          : 'DeepDental proxy request is not authorized.'
      }
    });
  }

  try {
    const headers = buildDeepDentalProxyHeaders({
      incomingHeaders: req.headers,
      backendApiKey: isDeepDentalApiPath(targetUrl.pathname) ? backendApiKey : '',
    });

    const init = {
      method: req.method,
      headers,
      redirect: 'manual'
    };

    if (!['GET', 'HEAD'].includes(req.method)) {
      if (req.body && Object.keys(req.body).length > 0) {
        init.body = JSON.stringify(req.body);
        if (!headers.has('content-type')) {
          headers.set('content-type', 'application/json');
        }
      } else if (req.headers['content-length'] || req.headers['transfer-encoding']) {
        init.body = req;
        init.duplex = 'half';
      }
    }

    const upstream = await fetch(targetUrl, init);

    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'transfer-encoding') return;
      res.setHeader(key, value);
    });

    if (!upstream.body) {
      res.end();
      return;
    }

    Readable.fromWeb(upstream.body).pipe(res);
  } catch (error) {
    console.error(`[py-api] Proxy request failed for ${targetUrl}:`, error.message);
    res.status(502).json({
      error: 'Imaging service unavailable',
      detail: 'Cannot connect to the X-Core Python service'
    });
  }
});

// Verified case clinical images must be retrieved through signed case-storage URLs.
app.use('/uploads/verified-cases', (_req, res) => {
  res.status(404).json({ error: { code: 'verified_case_uploads_not_public', message: 'Verified case image storage is not public.' } });
});

// Serve static files from uploads directory for non-clinical legacy assets.
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'SereneAI API Documentation',
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.get('/health', (req, res) => res.json({ ok: true }));

// Mount API under versioned prefix to match frontend
const prefix = `/${process.env.API_VERSION || 'v1'}`;
app.use(`${prefix}/auth`, authRouter);
app.use(`${prefix}/otp`, otpRouter);
app.use(`${prefix}`, authRouter); // Also mount auth routes under /v1 for profile endpoints
app.use(`${prefix}/profile`, profileRouter);
app.use(`${prefix}/patient`, patientRouter); // Patient-specific routes
app.use(`${prefix}/clinic/teledentistry`, clinicTeledentistryRouter);
app.use(`${prefix}/clinic`, clinicRouter);
app.use(`${prefix}/clinic`, clinicServicesRouter); // Clinic services management
app.use(`${prefix}/clinic`, clinicProfileRouter); // Clinic profile (gallery, highlights, facilities)
app.use(`${prefix}/dentist`, dentistServicesRouter); // Dentist portal services
app.use(`${prefix}/dentist-portal`, dentistPortalRouter); // Dentist portal patient management
app.use(`${prefix}/ai-analysis`, aiAnalysisRouter); // AI dental analysis results
app.use(`${prefix}`, verifiedCasesRouter); // Verified Case Workspace clinical workflow
app.use(`${prefix}/emr`, emrRouter);
app.use(`${prefix}/clinics`, clinicsRouter);
app.use(`${prefix}/dentists`, dentistsRouter);
app.use(`${prefix}/appointments`, appointmentsRouter);
app.use(`${prefix}/payments`, paymentsRouter);
app.use(`${prefix}/payments/webhooks`, paymentWebhooksRouter);
app.use(`${prefix}/financials`, financialsRouter);
app.use(`${prefix}/communications`, communicationsRouter);
app.use(`${prefix}/notifications`, notificationsRouter);
app.use(`${prefix}/chat`, chatRouter);
app.use(`${prefix}/admin`, adminProfileRouter);
app.use(`${prefix}/admin`, adminDentistsRouter);
app.use(`${prefix}/admin`, adminRouter);
app.use(`${prefix}/x-core`, xCoreRouter);
app.use(`${prefix}/webhooks`, webhooksRouter);
app.use(`${prefix}/admin/dashboard`, adminDashboardRouter);

// Global error handler (must be last middleware)
app.use(errorHandler);

const port = process.env.PORT || 4000;
assertVerifiedCaseWorkspaceRuntimeMode();
validateAttachmentStorageConfiguration();
server.listen(port, () => {
  console.log(`API listening on :${port}`);
});
