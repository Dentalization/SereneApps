# SereneApps Healthtech Platform Blueprint Final

Dokumen ini menjadi baseline implementasi untuk integrasi final SereneApps dengan provider yang sudah diputuskan:

- Chat real-time, two-way messaging, history, typing, read receipt: Twilio Conversations
- Video/voice consultation: Twilio Video
- SMS + OTP: Twilio SMS
- Payment: Midtrans Snap + realtime callback/webhook
- Mobile push: Firebase FCM

## Asumsi Eksplisit

- Backend utama tetap `Express + Prisma + PostgreSQL` seperti implementasi saat ini.
- ID domain utama tetap `BigInt` sesuai schema eksisting.
- Event-driven internal flow menggunakan `transactional outbox` di database, bukan Kafka pada fase ini.
- `chat_rooms`, `chat_room_members`, dan `chat_messages` yang sudah ada dipertahankan sebagai projection/cache internal; Twilio Conversations menjadi source of truth untuk realtime transport.
- `appointments.status` final yang dipakai lintas web/mobile/backend: `scheduled`, `confirmed`, `payment_failed`, `cancelled`, `completed`, `rescheduled`.
- Payment status provider dipisah di `payment_intents.status`; appointment hanya ikut berubah pada transisi bisnis yang valid.
- Twilio Video room dibuat lazy pada join pertama atau H-15 menit, bukan saat booking, untuk menekan biaya dan room churn.

## Executive Summary

1. Provider final: Twilio Conversations untuk chat, Twilio Video untuk konsultasi video/voice, Twilio SMS untuk OTP/SMS, Midtrans Snap untuk payment, dan Firebase FCM untuk mobile push.
2. Boundary final: semua SDK/provider hanya boleh diakses lewat adapter/service layer backend.
3. Source of truth payment: payment_intents + Midtrans callback tervalidasi; frontend bukan sumber kebenaran status payment.
4. Source of truth realtime chat: Twilio Conversations; DB lokal menyimpan projection/cache untuk unread, search, analytics, dan audit.
5. Flow inti: appointment_created -> payment_snap_created -> Midtrans callback verified -> payment_settled -> conversation provisioned -> FCM notified.
6. Exactly-once effect dicapai dengan Idempotency-Key client, provider_order_id Midtrans, webhook_receipts unique key, dan domain_event_outbox.
7. Webhook Twilio dan Midtrans wajib lewat urutan: signature verification, idempotency guard, domain update, outbox emit, ack.
8. OTP wajib hardened: cooldown, resend cap, verify cap, lockout, throttle per IP/per identifier, dan OTP di-hash di DB.
9. Video room Twilio Video dibuat lazy saat join pertama atau H-15 menit; tidak dibuat saat booking.
10. Push mobile hanya FCM. SMS Twilio dipakai untuk OTP dan fallback business alert yang benar-benar diperlukan.
11. Artefak implementasi awal sudah ditambahkan di repo: blueprint final, env final, outbox/webhook migration, dan migration hardening OTP/payment.
12. Perlu konfirmasi lanjutan: route email OTP yang masih ada di codebase sebaiknya dideprecate, karena arsitektur final OTP hanya Twilio SMS.

## Technical Blueprint by Domain

### Provider Matrix Final

| Capability | Provider | Backend Adapter | Notes |
| --- | --- | --- | --- |
| Appointment payment checkout | Midtrans Snap | `payments/midtrans` | Frontend membuka Snap, backend membuat transaction dan menyimpan order mapping |
| Payment status truth from provider | Midtrans callback + reconcile API | `payments/midtrans` | Callback menang, reconcile sebagai correction path |
| Chat realtime + history + typing + read receipt | Twilio Conversations | `communications/conversations` | Backend mengelola provisioning, participant sync, webhook ingestion |
| Video/voice consultation | Twilio Video | `communications/video` | Access token dibangkitkan backend |
| OTP + SMS transactional | Twilio SMS | `auth/otp` | OTP challenge state lokal, delivery via Twilio SMS |
| Mobile push notification | Firebase FCM | `notifications/push` | Semua push mobile lewat FCM |
| Internal async integration | PostgreSQL transactional outbox | `services/events/outbox` | Tidak ada provider overlap |

### Event Flow End-to-End

#### Internal Core Events

- `appointment_created`
- `appointment_payment_pending`
- `payment_snap_created`
- `payment_status_changed`
- `payment_settled`
- `payment_failed`
- `chat_conversation_provisioned`
- `chat_message_created`
- `message_read`
- `video_room_provisioned`
- `otp_requested`
- `otp_verified`
- `push_notification_requested`
- `ai_result_ready`

#### Producer / Consumer

| Event | Producer | Consumer |
| --- | --- | --- |
| `appointment_created` | appointments service | payments, communications orchestrator, notifications |
| `payment_snap_created` | payment application service | notifications |
| `payment_status_changed` | Midtrans webhook handler | payments domain, analytics |
| `payment_settled` | payment application service | appointments, Twilio Conversations provisioner, notifications |
| `payment_failed` | payment application service | appointments, notifications |
| `chat_conversation_provisioned` | communications orchestrator | notifications, mobile/web sync |
| `chat_message_created` | Twilio Conversations webhook sync | notifications, analytics |
| `message_read` | read receipt API / Twilio webhook sync | analytics, unread projection updater |
| `video_room_provisioned` | video application service | mobile/web sync |
| `otp_requested` | OTP service | security audit |
| `otp_verified` | OTP service | auth session issuer, security audit |
| `ai_result_ready` | AI pipeline | notifications, patient timeline |

#### Routing Event ke Provider

- `payment_snap_created` -> Midtrans Snap checkout URL ke client, FCM push optional.
- `payment_settled` -> Twilio Conversations create conversation + participants, FCM send appointment confirmed.
- `payment_failed` -> FCM push + optional Twilio SMS reminder untuk retry.
- `chat_message_created` -> FCM push unread message event.
- `consultation_join_requested` -> Twilio Video ensure room + token issuance.
- `otp_requested` -> Twilio SMS send code.
- `ai_result_ready` -> FCM push hasil AI siap ditinjau.

### Appointment -> Payment -> Callback -> Notification Flow

1. `POST /v1/appointments` membuat appointment `scheduled` dan outbox `appointment_created`.
2. `POST /v1/payments/snap-transactions` membuat `payment_intents` `pending`, menyimpan `idempotency_key` + `provider_order_id`, emit `payment_snap_created`.
3. Frontend membuka Midtrans Snap.
4. Midtrans callback masuk ke `/v1/payments/webhooks/midtrans`.
5. Handler memverifikasi `signature_key`, memeriksa `webhook_receipts`, lalu mengubah `payment_intents`.
6. Jika status bisnis final `settlement/capture-accept`, backend commit `payment_settled`.
7. Consumer `payment_settled`:
   - update `appointments.status=confirmed`
   - ensure Twilio Conversation + participant sync
   - enqueue FCM push ke patient dan dentist
8. Mobile/web membaca state appointment dan channel metadata dari backend, bukan langsung dari webhook provider.

## API Contracts

### Error Envelope Standard

```json
{
  "error": {
    "code": "PAYMENT_SIGNATURE_INVALID",
    "message": "Midtrans signature verification failed",
    "retryable": false,
    "correlationId": "cor-3fc3c2b1",
    "details": {}
  }
}
```

### Conversations

| Endpoint | Purpose |
| --- | --- |
| `POST /v1/conversations` | create or ensure conversation for appointment |
| `POST /v1/conversations/:conversationId/participants` | add participant |
| `DELETE /v1/conversations/:conversationId/participants/:userId` | remove participant |
| `POST /v1/conversations/:conversationId/messages` | send message |
| `GET /v1/conversations/:conversationId/messages` | paginated history |
| `POST /v1/conversations/:conversationId/typing` | typing indicator |
| `POST /v1/conversations/:conversationId/read-receipts` | read receipt |

### Video

| Endpoint | Purpose |
| --- | --- |
| `POST /v1/video/token` | create access token |
| `POST /v1/video/rooms/join` | create-or-join room |
| `POST /v1/video/rooms/:roomName/leave` | persist leave metadata |
| `POST /v1/video/rooms/:roomName/reconnect` | persist reconnect metadata |

### OTP / SMS

| Endpoint | Purpose |
| --- | --- |
| `POST /v1/otp/requests` | request OTP |
| `POST /v1/otp/verifications` | verify OTP |
| `POST /v1/otp/requests/:challengeId/resend` | resend OTP |

### Midtrans

| Endpoint | Purpose |
| --- | --- |
| `POST /v1/payments/snap-transactions` | create Snap transaction |
| `POST /v1/payments/webhooks/midtrans` | Midtrans callback |
| `GET /v1/payments/:paymentIntentId/status` | check internal status |
| `POST /v1/payments/:paymentIntentId/reconcile` | call Midtrans status API |

### Push FCM

| Endpoint | Purpose |
| --- | --- |
| `POST /v1/push/devices` | register token |
| `DELETE /v1/push/devices/:deviceToken` | unregister token |
| `POST /internal/push/events` | internal event -> push enqueue |

## Data Model

### Existing Tables to Keep and Extend

- `appointments`
- `appointment_status_history`
- `payment_intents`
- `payment_ledgers`
- `chat_rooms`
- `chat_room_members`
- `chat_messages`
- `notification_devices`
- `notification_jobs`
- `notification_preferences`
- `otp_verifications`

### New Tables Added as Foundation

- `domain_event_outbox`
- `webhook_receipts`

### Column Extensions Required

- `payment_intents.idempotency_key`
- `payment_intents.provider_order_id`
- `payment_intents.reconciliation_status`
- `payment_intents.last_reconciled_at`
- `payment_intents.callback_verified_at`
- `otp_verifications.purpose`
- `otp_verifications.resend_count`
- `otp_verifications.max_attempts`
- `otp_verifications.cooldown_until`
- `otp_verifications.locked_until`
- `otp_verifications.last_sent_at`
- `otp_verifications.last_request_ip_hash`
- `otp_verifications.verified_at`

### Indexes Wajib

- `payment_intents(provider_order_id)`
- `payment_intents(reconciliation_status, updated_at desc)`
- `payment_intents(idempotency_key)` partial unique
- `chat_messages(chat_room_id, created_at desc)`
- `chat_room_members(user_id, chat_room_id)`
- `notification_jobs(status, next_attempt_at)`
- `webhook_receipts(provider, delivery_key)` unique
- `webhook_receipts(status, next_attempt_at)`
- `domain_event_outbox(status, available_at)`

## Security & Reliability

### Signature Verification

- Midtrans: hitung `sha512(order_id + status_code + gross_amount + server_key)` dan cocokkan dengan `signature_key`.
- Twilio: validasi `X-Twilio-Signature` terhadap full public URL + request params/body menggunakan Twilio helper library.
- Tolak request sebelum parsing bisnis bila signature invalid.
- Simpan hasil hash payload dan signature ke `webhook_receipts`.

### OTP Abuse Prevention

- Cooldown default: 60 detik antar send.
- Maksimal resend per identifier per jam: 5.
- Maksimal verify salah per challenge: 5.
- Lockout: 30 menit setelah limit verify tercapai.
- Rate-limit per IP: 20 request/jam.
- Hash IP sebelum disimpan; jangan simpan OTP plaintext di log.

### Reliability

- Callback provider selalu `200` hanya setelah state internal aman tersimpan.
- Retry transient error:
  - Midtrans reconcile: exponential backoff sampai 12 kali.
  - FCM notification job: 5 kali.
  - Twilio webhook reprocessing: 10 kali internal.
- DLQ = record `failed` di `notification_jobs`, `webhook_receipts`, `domain_event_outbox`.
- Exactly-once effect dicapai dengan kombinasi `idempotency_key`, `provider_order_id`, unique webhook receipt, dan transactional outbox.

## Observability

### Correlation ID

- Format rekomendasi: `cor_<uuid>`
- Set di edge request, propagate ke DB, outbox, webhook receipt, provider callback handling, dan log worker.

### Structured Log Minimum

```json
{
  "timestamp": "2026-04-07T10:15:30.000Z",
  "level": "info",
  "service": "sereneapps-backend",
  "env": "staging",
  "correlationId": "cor_123",
  "eventType": "payment_settled",
  "appointmentId": "901",
  "paymentIntentId": "188",
  "provider": "midtrans",
  "providerReference": "order-188",
  "message": "Payment settled and appointment confirmed"
}
```

### Metrics Minimum

- `payment_callback_success_total`
- `payment_callback_signature_invalid_total`
- `payment_reconcile_mismatch_total`
- `otp_request_blocked_total`
- `otp_verify_failed_total`
- `conversation_provision_latency_ms`
- `push_delivery_failed_total`
- `webhook_duplicate_total`
- `outbox_pending_count`

## Sprint Plan

### Sprint 1

- Midtrans Snap finalization
- Midtrans callback verification + idempotency
- Payment reconcile job
- OTP cooldown, resend, lockout, per-IP rate-limit
- DB changes: payment tracking + webhook receipts + OTP hardening

### Sprint 2

- Twilio Conversations adapter
- Conversation provisioning on `payment_settled`
- Participant sync
- History projection sync
- Read receipt + typing indicator

### Sprint 3

- Twilio Video adapter + join flow
- FCM orchestration by event
- Outbox worker hardening
- Alerting, dashboards, retry tuning, chaos testing

## Testing

### Unit

- Midtrans signature verification
- Twilio signature verification wrapper
- Idempotent webhook guard
- Payment status mapping
- OTP cooldown / lockout / resend
- Conversation participant authorization
- FCM token lifecycle

### Integration

- Midtrans callback replay
- Midtrans callback invalid signature
- Twilio Conversations webhook replay
- FCM send failure -> retry
- Outbox pending -> published

### E2E Critical Journeys

1. Appointment created -> Snap -> settlement callback -> appointment confirmed -> push sent
2. Payment pending -> expired -> payment failed notification
3. Confirmed appointment -> conversation ready -> message sent -> unread count updated -> read receipt stored
4. OTP request spam -> cooldown enforced -> lockout enforced
5. Video join -> room ensured -> token issued -> leave metadata persisted

## Risk Register

1. Duplicate Midtrans callback updates state twice
2. Conversation created before payment truly settled
3. Twilio webhook URL mismatch breaks signature validation
4. OTP endpoint abused via rotating IP
5. FCM invalid tokens inflate retry queue
6. Outbox worker stalls and delays notification
7. Reconcile job diverges from callback truth
8. Read receipt projection drift from Twilio state
9. Video room created too early and expires unused
10. Sensitive provider payload leaked to logs

Setiap risiko di atas wajib punya metric dan alert yang sesuai sebelum production cutover.

## Ready-to-Implement Artifacts

- Env template final: `backend/.env.integrations.example`
- Prisma foundation: `backend/prisma/schema.prisma`
- SQL migration: `backend/migrations/035_event_outbox_and_webhook_receipts.sql`
- SQL migration: `backend/migrations/036_harden_otp_and_payment_tracking.sql`
- Internal events: `backend/src/services/events/core-events.js`
- Outbox helper: `backend/src/services/events/outbox.js`
- Webhook idempotency helper: `backend/src/services/webhooks/idempotency.js`

### Sample Internal Event

```json
{
  "eventId": "d59c4540-5e83-4bea-aa97-460cf6d4b494",
  "eventType": "payment_settled",
  "aggregateType": "payment_intent",
  "aggregateId": "188",
  "correlationId": "cor_8f1f9f1c",
  "payload": {
    "appointmentId": "901",
    "provider": "midtrans",
    "providerOrderId": "APT-901-PI-188",
    "grossAmount": 250000
  }
}
```
