# Mobile Readiness Audit & Action Plan
## Clarify Scope & Readiness

### 1. Audit: Dentist/Clinic Portals – Mobile Readiness

| Feature/API         | Mobile-Ready (✅) | Missing/Needs Work (❌/🚧) | Notes |
|---------------------|------------------|---------------------------|-------|
| **Authentication**  | ✅ `/auth/login`, `/auth/refresh`, `/auth/me`, `/auth/patient/register` | 🚧 OTP + patient-specific guards pending | Patient registration endpoint live; need OTP + scoped token policies before launch |
| **Profile Mgmt**    | ✅ Dentist/clinic profile CRUD, document upload | 🚧 Unified schema, patient profile endpoints | Patient registration/profile API live; need shared schema docs & mobile wiring |
| **Appointments**    | ✅ Dentist & clinic portals now read live data, include filters & polling | 🚧 Patient mobile needs native UI; reminder jobs outstanding | Booking + reschedule/cancel APIs live w/ guardrails, audit trail, concurrency locks |
| **Payments**        | 🚧 Billing UI, payment methods in translation files | 🚧 Midtrans integration + ledger/webhooks live; production provider rollout pending | Hook mobile to new flows, wire sandbox → prod creds, surface payment status UX |
| **Chat/Video**      | 🚧 Socket.IO chat + Agora video wired in dentist portal | 🚧 Mobile clients must consume `/communications` APIs and presence/push backlog | Backend now auto-provisions rooms post-confirmation; confirm mobile auth + attachment UX |
| **Notifications**   | 🚧 Toasts/local banners | 🚧 Mobile apps must surface preferences + register devices | Backend dispatcher live (FCM/SendGrid/Twilio) with retry & opt-in/out APIs |
| **Staff/Roles**     | ✅ Staff CRUD, role updates, branch assignment | 🚧 Permissions via JSON, no central policy | RBAC needs hardening, audit trail missing |
| **Reporting**       | 🚧 KPI cards, static data | ❌ No analytics service or scheduled jobs | Needs backend support |
| **Localization**    | ✅ Shared translation files | 🚧 No currency formatting helpers | Mobile can reuse translation files |

### 2. Freeze Patient App MVP Requirements

**Screens/Flows:**
- Onboarding: Register, verify OTP, create profile
- Browse Clinics/Dentists: List/filter/search, view profiles
- Book Appointment: Select slot, confirm, upload photos
- Manage Payments: Choose method, pay, view receipts, retry
- Appointment Management: Reschedule/cancel, receive notifications
- Teleconsult Entry: Join chat/video, exchange messages/files
- Notifications: Push/email/SMS for reminders, status changes
- Support: Contact support, raise dispute, track status

**Payment Methods:**
- Card, Virtual Account, E-wallet (Midtrans/Xendit planned)

**Notifications:**
- Push, email, SMS (triggered by booking, payment, chat)

**User Stories/Tickets (for web & mobile teams):**
- PAT-001: Patient onboarding (register, verify, profile)
- PAT-002: Browse clinics/dentists (filter, search, view)
- PAT-003: Book appointment (slot selection, confirmation)
- PAT-004: Manage payments (pay, receipts, retry)
- PAT-005: Appointment management (reschedule, cancel, notifications)
- PAT-006: Teleconsult entry (chat/video, file exchange)
- PAT-007: Notifications & reminders (push/email/SMS)
- PAT-008: Support & escalations (contact, dispute, status)

---

**Next Steps:**
- Translate these requirements into actionable tickets for backend, web, and mobile teams.
- Ensure backend APIs and web features are ready or planned for each mobile MVP feature.

## 1. Current Portal Coverage Snapshot

| Area | Dentist Portal (Web) | Clinic Portal (Web) | Backend/API Status | Notes |
| ---- | -------------------- | ------------------- | ------------------ | ----- |
| Authentication & Session | ✅ Login/refresh via `/auth/login` / `/auth/refresh` (role-gated for verified dentists) | ✅ Owner/manager login shares same flow | ⚠️ Prisma + raw SQL mix; missing patient role & token scopes | Dentist login blocked until verification (`backend/src/routes/auth.js:449`). Patient auth not yet modelled in DB or routes. |
| Profile Management | ✅ Basic dentist profile fetch/update (`getDentistProfileApi`) with document upload | ✅ Clinic profile CRUD, branch & staff tooling (`backend/src/routes/clinic.js:204`) | ⚠️ Admin profile password update uses `password` field not `password_hash` (`backend/src/routes/admin-profile.js:220`) | Dentist/clinic profiles exist but no unified schema doc. |
| Scheduling & Appointments | 🚧 UI uses `mockAppointments` (`src/pages/dentist-portal/schedule/index.jsx:39`) | 🚧 Clinic calendar components fed with placeholder data | ❌ No appointment routes/services in backend | Need full CRUD, status machine, conflict detection, and audit logs. |
| Payments/Billing | 🚧 Dashboard cards assume static metrics | 🚧 Reports tab displays mocked KPI data | ❌ No payment gateway integration or tables | Prepare payment intent workflow, ledger updates, refunds API. |
| Chat & Video (Teledentistry) | 🚧 Dentist portal now uses live Socket.IO chat + Twilio Video | 🚧 Clinic portal UI still pending migration | 🚧 `/communications` API + room provisioning shipped; need attachment retention & push hooks | Wire clinic/mobile clients, harden upload lifecycle, add call quality telemetry. |
| Notifications | 🚧 Toasts/local banners only | 🚧 | ✅ Event dispatcher (FCM push, SendGrid email, Twilio SMS) with retries & preferences | Mobile/web must surface opt-in UI and register devices via `/notifications` API. |
| Staff & Role Management | ✅ Staff CRUD, role updates, branch assignment | ✅ Branch CRUD & clinic verification tools | ⚠️ Permissions via free-form JSON, no central policy | Align RBAC, prevent privilege escalation, add audit trail. |
| Reporting & Analytics | 🚧 KPI cards w/ static data | 🚧 | ❌ | Requires analytics service or scheduled jobs (Snowflake/BigQuery etc.). |
| Localization & Currency | ✅ Shared translation files under `src/translations/` | ✅ Applies across portals | ⚠️ No currency formatting helpers, IDR hard-coded | Extract `@sereneai/translations` package & currency utils. |

Legend: ✅ production-ready, ⚠️ functional but needs hardening, 🚧 UI placeholder, ❌ missing.

## 2. Key Gaps Blocking Mobile

- **Appointments**: lifecycle APIs (book/reschedule/cancel) + audit logging shipped; need mobile UX + reminder scheduler.
- **Payments**: zero gateway integration, no state transitions for `pending_payment` / retries. 
- **Chat/Video**: Socket.IO + Twilio Video services online; clinic/mobile UIs, push/presence QA, and storage policies still queued.
- **Patient Role**: database + auth flows lack `patient` role, profile schema, & permission checks.
- **API Contracts**: no OpenAPI/Swagger; inconsistent naming (Prisma vs raw SQL). Hard to share with mobile.
- **Notifications**: dispatcher + queue deployed; need client UX, provider secrets, and reminder scheduling.
- **Observability**: limited logging/telemetry, no central tracing to debug cross-platform issues.

## 3. Patient App MVP – Suggested User Stories

1. **PAT-001 – Patient Onboarding**
   - As a patient, I can register with email/phone, verify OTP, and create a profile (name, DOB, insurance).
   - Acceptance: new `patient` role in `users`, profile stored, welcome notification triggered.
2. **PAT-002 – Browse Clinics & Dentists**
   - List clinics/dentists by location, specialization, availability.
   - Acceptance: endpoints support filtering/sorting; returns availability windows sourced from master schedule.
3. **PAT-003 – Book Appointment**
   - Select slot (tele / in-clinic), capture reason, optional photos, and confirm booking.
   - Acceptance: appointment reserve API enforces double-booking prevention and emits `appointment_created`.
4. **PAT-004 – Manage Payments**
   - Choose payment method (card, VA, e-wallet), complete payment, view receipts, retry failed attempts.
   - Acceptance: payment intent API with callbacks updates appointment status + ledger entries.
5. **PAT-005 – Appointment Management**
   - Reschedule/cancel within policy, receive confirmation via push/email/SMS.
   - Acceptance: cancellation policy enforced server-side; notifications generated.
6. **PAT-006 – Teleconsult Entry**
   - Join chat/video room 5 minutes prior; exchange messages/files during visit.
   - Acceptance: real-time channel authenticates via patient token; messages persisted & encrypted.
7. **PAT-007 – Notifications & Reminders**
   - Receive push/email reminders for upcoming appointment, payment status changes, chat replies.
   - Acceptance: notification service templates by locale; delivery status logged.
8. **PAT-008 – Support & Escalations**
   - Contact support, raise dispute/report issue, track status.
   - Acceptance: ticket API stores audit trail accessible to admin portal.

Translate each story into paired tickets for backend, web (source of truth), and mobile to keep roadmap aligned.

## 4. Backend Stabilisation Workstreams

### 4.1 API Contracts & Docs
- Extract shared DTOs and generate OpenAPI using `swagger-jsdoc` or `prisma-openapi-generator`.
- Document auth flows, dentist/clinic profile schemas, and planned patient endpoints.
- Publish docs in repo + hosted Swagger UI for mobile reference.

### 4.2 Auth & RBAC
- Align all password fields with `password_hash` (`backend/src/routes/admin-profile.js:220` bug).
- Introduce `patient` role, profile table, and enforce role-based guards (`authenticateToken` + `requireRoles`).
- Issue refresh tokens with scoped claims (portal vs patient) and document error codes.

### 4.3 Scheduling & Real-Time
- Patient-facing reschedule/cancel APIs live with cutoff guardrails, audit logging, and notifications.
- Advisory locks + overlap checks protect dentist calendars; expand to branch-level batching & reporting.
- Harden `/communications` Socket.IO + Agora stack (presence, uploads, retention); add integration tests covering mobile and concurrent sessions.

### 4.4 Payments
- Choose gateway (Midtrans/Xendit/etc.); implement create intent → callback → status update pipeline.
- Handle expirations, retries, refunds, partial payments; ensure idempotency keys.
- Emit payment events to notification system and admin override tooling.

### 4.5 Notifications & Events
- Wire mobile/web clients to `/notifications` device + preference APIs; add UX for opt-in/out.
- Schedule reminder + follow-up jobs (cron/BullMQ) that enqueue `appointment_reminder` events.
- Instrument provider health metrics and dead-letter queue for exhausted jobs; track delivery analytics.

### 4.6 Observability & QA
- Add structured logging (correlation IDs), request metrics, and error tracking (Sentry/DataDog).
- Expand automated test suite: auth regression, appointment concurrency, payment webhooks.

## 5. Shared Assets & Tooling

- **Packages**: Create workspaces for `@sereneai/api-client` (axios hooks), `@sereneai/types`, `@sereneai/translations`.
- **Design System**: Export tokens (colors, spacing, typography) and share component guidelines (Figma + Storybook).
- **State Management Guide**: Document caching, optimistic updates, and local storage conventions for both web and mobile.
- **Media Handling**: Centralise upload utilities for documents/avatars with S3-compatible storage to reuse on mobile.

## 6. Environments & DevOps

- Provision dedicated API environments (dev/stage/prod) seeded with dentist/clinic/patient fixtures.
- Extend CI/CD to run schema drift checks, contract tests, and mobile smoke tests against staging.
- Implement feature flags/remote config (ConfigCat/LaunchDarkly) for staged patient rollout.
- Automate data sanitisation for staging exports to protect PHI.

## 7. Documentation & Onboarding

- Update setup scripts (`docker-compose`, `.env.example`) so mobile engineers can run backend/services locally.
- Publish realtime/payments env checklist (TWILIO_VIDEO_API_KEY_SID/TWILIO_VIDEO_API_KEY_SECRET, MIDTRANS keys, optional `VITE_FILE_BASE_URL`) so web/mobile stay in sync.
- Document notification secrets (SENDGRID_API_KEY/FROM, TWILIO_* creds, FCM service account, APNS keys) + client registration flow.
- Write playbooks: API usage guide, booking/payment sequence diagrams, chat/video token lifecycle, payment reconciliation.
- Produce QA matrix covering patient/dentist/admin journeys and share staging datasets for regression.
- Maintain living roadmap linking tickets to the workstreams above to keep teams aligned.
