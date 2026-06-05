# Patient Data Continuity Implementation Note

Date: 2026-06-05

This is a temporary implementation note for the dentist portal patient continuity work. It captures the audit state before backend and frontend wiring changes.

## 1. Components Still Using Mock Or Static Data

- `web/src/pages/dentist-portal/patient/components/PatientTreatmentPlan.jsx`
  - Uses a static treatment catalog and legacy local item shape (`name`, `cost`, `status: pending`).
  - Creates plans through an API, but send/approve/billing linkage is not implemented.
- `web/src/pages/dentist-portal/patient/components/PatientBilling.jsx`
  - Renders `patient.billing` defaults and parent callbacks, with no invoice/payment fetch of its own.
  - Parent handlers in `web/src/pages/dentist-portal/patient/index.jsx` are mostly stubs.
- `web/src/pages/dentist-portal/home/index.jsx`
  - Uses mock dashboard KPI/schedule data.
- `web/src/pages/dentist-portal/home/components/TreatmentPlanCard.jsx`
  - Uses hardcoded treatment-plan rows.
- `web/src/pages/dentist-portal/reports/index.jsx`
  - Uses mock financial and activity data.
- `mobile/src/features/health/TreatmentPlanScreen.jsx`
  - Calls `/profile/treatment-plans`, which is not mounted by the backend patient routes.
  - Expects old snake_case treatment plan fields.

## 2. Components Already Fetching Real API Data

- `web/src/pages/dentist-portal/patient/index.jsx`
  - Fetches dentist patients and patient details through `web/src/services/dentistPortalService.js`.
  - Pulls appointments, AI analysis results, and legacy treatment plans from the backend.
- `web/src/pages/dentist-portal/patient/components/PatientAppointment.jsx`
  - Renders appointment data provided by the real patient detail response.
  - Sends appointment reminders through `/v1/notifications/send-appointment-reminder`.
- `mobile/src/features/appointment/screens/AppointmentListScreen.jsx`
  - Fetches appointment lists through `mobile/src/services/appointmentService.js`.
- `mobile/src/features/appointment/screens/DetailAppointmentScreen.jsx`
  - Fetches appointment detail and completed-appointment clinical summaries.
- `mobile/src/features/appointment/screens/PaymentScreen.jsx`
  - Creates Snap transactions through `mobile/src/services/paymentService.js`.
- `web/src/pages/dentist-portal/teledentistry`
  - Uses real communications/chat/video/clinical-summary APIs, though it is not yet linked into the patient treatment-plan/billing flow.

## 3. Backend Entities Already Existing

- `PatientProfile`, `DentistProfile`, `ClinicProfile`, `Appointment`, `AppointmentClinicalSummary`, `VideoSession`.
- `TreatmentPlan` and `TreatmentItem` exist, but use the old shape:
  - Plan fields include `title`, `description`, `priority`, `status`, `progress`, `estimatedCost`, `actualCost`, `targetCompletion`, `completedAt`, `notes`.
  - Item fields include `name`, `category`, `cost`, `actualCost`, `status`, `scheduledDate`, `completedDate`, `notes`, `resultNotes`, `imageUrl`, `sortOrder`.
- `AIAnalysisResult` and `dentist_emr_records` exist for clinical context.
- `PaymentIntent`, `Invoice`, `InvoiceLineItem`, `PaymentSnapshot`, `PaymentSettlement`, `FinancialLedgerEntry`, `DentistCompensationEntry`, and `AvailableBalance` already support most payment, settlement, ledger, and compensation requirements.
- `Notification` and `DomainEventOutbox` exist for notification and event handling.

## 4. Backend Endpoints Already Existing

- Dentist portal patient endpoints:
  - `GET /v1/dentist-portal/patients`
  - `GET /v1/dentist-portal/patients/:patientId`
  - `GET /v1/dentist-portal/patients/:patientId/treatment-plans`
  - `POST /v1/dentist-portal/patients/:patientId/treatment-plans`
  - `PUT /v1/dentist-portal/patients/:patientId/treatment-plans/:planId`
  - `PUT /v1/dentist-portal/patients/:patientId/treatment-plans/:planId/items/:itemId`
- Appointment endpoints:
  - `POST /v1/appointments`
  - `GET /v1/appointments`
  - `GET /v1/appointments/:appointmentId`
  - `PATCH /v1/appointments/:appointmentId/confirm`
  - `PATCH /v1/appointments/:appointmentId/cancel`
  - `PATCH /v1/appointments/:appointmentId/reschedule`
  - Clinical summary, health form, and video subroutes under appointments.
- Patient profile endpoints:
  - `/v1/patient/profile` and avatar endpoints exist.
  - Patient treatment-plan endpoints do not exist yet.
- Payment and billing endpoints:
  - `/v1/payments`
  - `/v1/payments/snap-transactions`
  - `/v1/payments/:intentId/confirm`
  - `/v1/payments/:intentId/status`
  - `/v1/payments/:intentId/reconcile`
  - Invoice, PDF, refund, webhook, and financial summary routes exist.
- Financial endpoints:
  - Clinic and dentist financial summaries/history/analytics exist under `/v1/financials`.

## 5. Socket Events Already Existing

- `backend/src/server.js` creates Socket.IO and registers the chat gateway.
- `backend/src/sockets/chat.js` supports user rooms and chat/video events:
  - `chat:join`
  - `chat:message`
  - `chat:read`
  - `video:call`
  - `video:call_response`
  - `video:call_ended`
- `backend/src/services/communications.js` has `emitAppointmentEvent`, but it currently queues notifications and does not emit treatment-plan, invoice, dashboard, or finance socket events.
- `DomainEventOutbox` and payment outbox consumers exist, but treatment-plan and dashboard events are not wired.

## 6. Broken Or Duplicated Data Flow

- Treatment plan data uses legacy status/item names and is not linked to appointment, clinic, consultation session, EMR record, AI result, invoice, or settlement.
- Dentist treatment plan creation persists, but the UI performs local optimistic updates and has no send-to-patient or patient approval flow.
- Mobile treatment plan screen points to a missing `/profile/treatment-plans` endpoint and is not connected to appointment detail or payment.
- Billing floats on `patient.billing` in the dentist portal; real invoices and payment intents are not returned with patient detail.
- Snap payment mock approval already exists through `MIDTRANS_MOCK_MODE=true`, but it is appointment-only and does not accept a treatment plan or invoice.
- Financial ledger, settlement, and compensation services already exist for settled payments, but treatment-plan invoices do not feed into them.
- General realtime domain updates are missing. Chat/video sockets work, but treatment-plan, billing, payment, dashboard, and clinic-finance events are not emitted.
- The backend has both newer Prisma routes and older raw-SQL controller modules for some domains, so implementation should extend the active Prisma routes/services and avoid duplicating legacy controller flows.
