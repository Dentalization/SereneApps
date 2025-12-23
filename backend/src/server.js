import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { Server as SocketIOServer } from 'socket.io';
import authRouter from './routes/auth.js';
import clinicRouter from './routes/clinic.js';
import clinicsRouter from './routes/clinics.js';
import dentistsRouter from './routes/dentists.js';
import profileRouter from './routes/profile.js';
import patientRouter from './routes/patient.js';
import adminProfileRouter from './routes/admin-profile.js';
import adminDentistsRouter from './routes/admin-dentists.js';
import adminRouter from './routes/admin.js';
import adminDashboardRouter from './routes/admin-dashboard.js';
import appointmentsRouter from './routes/appointments.js';
import paymentsRouter from './routes/payments.js';
import paymentWebhooksRouter from './routes/payment-webhooks.js';
import communicationsRouter from './routes/communications.js';
import notificationsRouter from './routes/notifications.js';
import chatRouter from './routes/chat.js';
import clinicServicesRouter from './routes/clinicServices.js';
import clinicProfileRouter from './routes/clinicProfile.js';
import dentistServicesRouter from './routes/dentistServices.js';
import emrRouter from './routes/emr.js';
import { verify } from './utils/tokens.js';
import { registerChatGateway } from './sockets/chat.js';
import { startNotificationWorker } from './services/notifications/index.js';
import { errorHandler } from './utils/error-codes.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';

// Handle BigInt serialization in JSON responses
BigInt.prototype.toJSON = function() { return this.toString(); };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

app.use(cors(corsOptions));
app.use(express.json());

// Serve static files from uploads directory
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
app.use(`${prefix}`, authRouter); // Also mount auth routes under /v1 for profile endpoints
app.use(`${prefix}/profile`, profileRouter);
app.use(`${prefix}/patient`, patientRouter); // Patient-specific routes
app.use(`${prefix}/clinic`, clinicRouter);
app.use(`${prefix}/clinic`, clinicServicesRouter); // Clinic services management
app.use(`${prefix}/clinic`, clinicProfileRouter); // Clinic profile (gallery, highlights, facilities)
app.use(`${prefix}/dentist`, dentistServicesRouter); // Dentist portal services
app.use(`${prefix}/emr`, emrRouter);
app.use(`${prefix}/clinics`, clinicsRouter);
app.use(`${prefix}/dentists`, dentistsRouter);
app.use(`${prefix}/appointments`, appointmentsRouter);
app.use(`${prefix}/payments`, paymentsRouter);
app.use(`${prefix}/payments/webhooks`, paymentWebhooksRouter);
app.use(`${prefix}/communications`, communicationsRouter);
app.use(`${prefix}/notifications`, notificationsRouter);
app.use(`${prefix}/chat`, chatRouter);
app.use(`${prefix}/admin`, adminProfileRouter);
app.use(`${prefix}/admin`, adminDentistsRouter);
app.use(`${prefix}/admin`, adminRouter);
app.use(`${prefix}/admin/dashboard`, adminDashboardRouter);

// Global error handler (must be last middleware)
app.use(errorHandler);

const port = process.env.PORT || 4000;
server.listen(port, () => {
  console.log(`API listening on :${port}`);
});
