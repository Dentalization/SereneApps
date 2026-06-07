# Engineering Database Schema

Generated from current workspace sources on 2026-06-07.

## Sources of Truth

- Primary application schema: `backend/prisma/schema.prisma`
- Migration history: `backend/migrations/*.sql`
- Runtime database adapter: `backend/src/db.js` uses PostgreSQL via `pg` and `DATABASE_URL`.
- Prisma datasource: PostgreSQL, `env("DATABASE_URL")`.

## Scope

- Prisma models documented: 64
- Migration files scanned: 58
- SQL-only tables found outside Prisma models: 8
- Naming convention: Prisma field names may be camelCase while physical PostgreSQL columns use snake_case through `@map`.
- Required means the Prisma field is non-nullable unless database migration constraints say otherwise.

## Domain Map

- Appointments & communications: `appointment_clinical_summaries`, `appointment_communication_participants`, `appointment_follow_up_tasks`, `appointment_pre_session_health_forms`, `appointment_status_history`, `appointments`, `chat_messages`, `chat_room_members`, `chat_rooms`, `communication_events`, `video_sessions`
- Clinic, branch, staff, services: `clinic_branches`, `clinic_facilities`, `clinic_gallery`, `clinic_highlights`, `clinic_profiles`, `clinic_services`, `clinic_staff`, `clinics`, `dentist_profiles`, `dentist_services`, `service_dentist_assignments`
- Events & webhooks: `domain_event_outbox`, `webhook_receipts`
- Identity & authentication: `OTPVerification`, `otp_request_attempts`, `refresh_tokens`, `user_devices`, `users`
- Notifications: `notification_devices`, `notification_jobs`, `notification_preferences`, `notifications`
- Other: `dentist_schedule_entries`
- Patient clinical data & treatment planning: `ai_analysis_results`, `ai_chat_messages`, `dentist_emr_records`, `patient_profiles`, `treatment_items`, `treatment_plans`
- Payments, invoices, ledger, settlement: `accounting_periods`, `available_balances`, `dentist_compensation_entries`, `financial_audit_logs`, `financial_ledger_entries`, `invoice_items`, `invoices`, `ownership_correction_logs`, `ownership_correction_requests`, `payment_intents`, `payment_ledgers`, `payment_settlements`, `payment_snapshots`, `payout_batches`, `payout_items`, `refunds`, `webhook_processing_logs`
- X-Core imaging & annotations: `ai_results`, `annotation_snapshots`, `imaging_series`, `imaging_studies`, `study_annotations`, `study_dentist_shares`, `study_shares`
- SQL-only migration tables: `ai_findings`, `case_audit_events`, `case_exports`, `case_images`, `clinician_findings`, `image_quality_checks`, `patient_timeline_events`, `verified_cases`

## Migration Inventory

- `001_init.sql`
- `002_add_dentist_profile.sql`
- `003_add_document_fields.sql`
- `004_add_user_avatar_fields.sql`
- `005_add_avatar_fields.sql`
- `006_add_clinic_profile.sql`
- `007_add_clinic_staff.sql`
- `008_link_staff_to_clinic.sql`
- `009_add_user_last_login.sql`
- `010_add_admin_users.sql`
- `011_add_patient_profiles.sql`
- `012_update_clinic_staff_role_constraint.sql`
- `013_create_appointments.sql`
- `014_create_payment_intents.sql`
- `015_add_comm_channel_refs.sql`
- `016_create_chat_tables.sql`
- `017_add_payment_provider_fields.sql`
- `018_create_chat_room_members.sql`
- `019_add_chat_message_files.sql`
- `020_create_notifications_tables.sql`
- `021_add_appointment_history.sql`
- `022_create_otp_verification.sql`
- `023_add_in_app_notifications.sql`
- `024_add_dentist_geolocation_and_type.sql`
- `025_add_clinic_geolocation.sql`
- `026_fix_updated_at_trigger.sql`
- `027_add_services_tables.sql`
- `028_fix_services_permissions.sql`
- `029_create_dentist_emr_records.sql`
- `030_create_ai_analysis_results.sql`
- `031_add_consultation_type_to_appointments.sql`
- `032_add_dentist_storage_quota.sql`
- `033_create_xcore_imaging_tables.sql`
- `034_create_treatment_plans.sql`
- `035_event_outbox_and_webhook_receipts.sql`
- `036_harden_otp.sql`
- `036_harden_otp_and_payment_tracking.sql`
- `037_create_otp_request_attempts.sql`
- `037_payment_ownership_financials.sql`
- `038_add_video_room_sid.sql`
- `039_create_study_shares.sql`
- `040_create_study_annotations.sql`
- `041_annotation_snapshots_review.sql`
- `042_annotation_snapshot_feature_state.sql`
- `043_add_twilio_message_sid.sql`
- `044_communication_events_and_message_metadata.sql`
- `045_clinical_summaries_participants_diagnostics.sql`
- `046_communications_retention_and_attachment_storage.sql`
- `047_add_video_session_actor_role.sql`
- `048_create_verified_case_workspace.sql`
- `049_add_pre_session_health_forms.sql`
- `050_payment_hardening.sql`
- `051_financial_ownership_constraints.sql`
- `052_financial_owner_immutability.sql`
- `053_financial_balance_constraints.sql`
- `054_add_clinical_summary_attachments.sql`
- `055_patient_data_continuity.sql`
- `056_xcore_clinic_access_and_dentist_shares.sql`

## Prisma Models and Physical Tables

### Appointments & communications

#### `appointment_clinical_summaries`

- Prisma model: `AppointmentClinicalSummary`
- Physical table: `appointment_clinical_summaries`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `String` | yes | `Uuid` | `@default(uuid())` | `@id` |
| `appointment_id` | `appointmentId` | `BigInt` | yes | `-` | `-` | `@unique` |
| `dentist_id` | `dentistId` | `BigInt` | yes | `-` | `-` | `-` |
| `patient_id` | `patientId` | `BigInt` | yes | `-` | `-` | `-` |
| `status` | `status` | `String` | yes | `VarChar(32)` | `@default("draft")` | `-` |
| `chief_complaint` | `chiefComplaint` | `String?` | no | `-` | `-` | `-` |
| `subjective_notes` | `subjectiveNotes` | `String?` | no | `-` | `-` | `-` |
| `objective_findings` | `objectiveFindings` | `String?` | no | `-` | `-` | `-` |
| `assessment` | `assessment` | `String?` | no | `-` | `-` | `-` |
| `plan` | `plan` | `String?` | no | `-` | `-` | `-` |
| `diagnosis_codes` | `diagnosisCodes` | `Json?` | no | `-` | `@default("[]")` | `-` |
| `recommendations` | `recommendations` | `Json?` | no | `-` | `@default("[]")` | `-` |
| `follow_up_needed` | `followUpNeeded` | `Boolean` | yes | `-` | `@default(false)` | `-` |
| `follow_up_at` | `followUpAt` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |
| `attachments` | `attachments` | `Json?` | no | `-` | `@default("[]")` | `-` |
| `finalized_at` | `finalizedAt` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |
| `amended_at` | `amendedAt` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |
| `patient_acknowledged_at` | `patientAcknowledgedAt` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |
| `patient_acknowledged_by_id` | `patientAcknowledgedById` | `BigInt?` | no | `-` | `-` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `updated_at` | `updatedAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `@updatedAt` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `appointment` | `Appointment` | no | `@relation(fields: [appointmentId], references: [id], onDelete: Cascade, onUpdate: NoAction)` |
| `followUpTasks` | `AppointmentFollowUpTask[]` | no | `-` |

Indexes and table-level constraints:

- `@@index([dentistId, status], map: "idx_clinical_summaries_dentist_status")`
- `@@index([patientId, status], map: "idx_clinical_summaries_patient_status")`

#### `appointment_communication_participants`

- Prisma model: `AppointmentCommunicationParticipant`
- Physical table: `appointment_communication_participants`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `String` | yes | `Uuid` | `@default(uuid())` | `@id` |
| `appointment_id` | `appointmentId` | `BigInt` | yes | `-` | `-` | `-` |
| `user_id` | `userId` | `BigInt?` | no | `-` | `-` | `-` |
| `display_name` | `displayName` | `String` | yes | `VarChar(160)` | `-` | `-` |
| `email` | `email` | `String?` | no | `VarChar(191)` | `-` | `-` |
| `phone` | `phone` | `String?` | no | `VarChar(40)` | `-` | `-` |
| `role` | `role` | `String` | yes | `VarChar(32)` | `-` | `-` |
| `status` | `status` | `String` | yes | `VarChar(32)` | `@default("invited")` | `-` |
| `invite_token_hash` | `inviteTokenHash` | `String?` | no | `VarChar(128)` | `-` | `@unique` |
| `invited_by_id` | `invitedById` | `BigInt?` | no | `-` | `-` | `-` |
| `invited_at` | `invitedAt` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |
| `verified_at` | `verifiedAt` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |
| `joined_at` | `joinedAt` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |
| `last_invite_sent_at` | `lastInviteSentAt` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |
| `revoked_at` | `revokedAt` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |
| `kicked_at` | `kickedAt` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |
| `removed_by_id` | `removedById` | `BigInt?` | no | `-` | `-` | `-` |
| `access_regenerated_at` | `accessRegeneratedAt` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |
| `expires_at` | `expiresAt` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `updated_at` | `updatedAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `@updatedAt` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `appointment` | `Appointment` | no | `@relation(fields: [appointmentId], references: [id], onDelete: Cascade, onUpdate: NoAction)` |
| `chatMessages` | `ChatMessage[]` | no | `-` |

Indexes and table-level constraints:

- `@@index([appointmentId, role, status], map: "idx_comm_participants_appointment_role_status")`
- `@@index([userId, status], map: "idx_comm_participants_user_status")`
- `@@index([expiresAt], map: "idx_comm_participants_expires_at")`

#### `appointment_follow_up_tasks`

- Prisma model: `AppointmentFollowUpTask`
- Physical table: `appointment_follow_up_tasks`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `String` | yes | `Uuid` | `@default(uuid())` | `@id` |
| `appointment_id` | `appointmentId` | `BigInt` | yes | `-` | `-` | `-` |
| `summary_id` | `summaryId` | `String?` | no | `Uuid` | `-` | `-` |
| `dentist_id` | `dentistId` | `BigInt` | yes | `-` | `-` | `-` |
| `patient_id` | `patientId` | `BigInt` | yes | `-` | `-` | `-` |
| `title` | `title` | `String` | yes | `VarChar(180)` | `-` | `-` |
| `notes` | `notes` | `String?` | no | `-` | `-` | `-` |
| `status` | `status` | `String` | yes | `VarChar(32)` | `@default("open")` | `-` |
| `due_at` | `dueAt` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |
| `completed_at` | `completedAt` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |
| `metadata` | `metadata` | `Json?` | no | `-` | `@default("{}")` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `updated_at` | `updatedAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `@updatedAt` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `appointment` | `Appointment` | no | `@relation(fields: [appointmentId], references: [id], onDelete: Cascade, onUpdate: NoAction)` |
| `summary` | `AppointmentClinicalSummary` | yes | `@relation(fields: [summaryId], references: [id], onDelete: SetNull, onUpdate: NoAction)` |

Indexes and table-level constraints:

- `@@index([appointmentId, status], map: "idx_follow_up_tasks_appointment_status")`
- `@@index([dentistId, status, dueAt], map: "idx_follow_up_tasks_dentist_due")`
- `@@index([patientId, status, dueAt], map: "idx_follow_up_tasks_patient_due")`

#### `appointment_pre_session_health_forms`

- Prisma model: `AppointmentPreSessionHealthForm`
- Physical table: `appointment_pre_session_health_forms`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `appointment_id` | `appointmentId` | `BigInt` | yes | `-` | `-` | `@unique` |
| `patient_id` | `patientId` | `BigInt` | yes | `-` | `-` | `-` |
| `symptoms` | `symptoms` | `String?` | no | `-` | `-` | `-` |
| `pain_level` | `painLevel` | `Int?` | no | `-` | `-` | `-` |
| `allergies` | `allergies` | `String?` | no | `-` | `-` | `-` |
| `medications` | `medications` | `String?` | no | `-` | `-` | `-` |
| `notes` | `notes` | `String?` | no | `-` | `-` | `-` |
| `answers` | `answers` | `Json?` | no | `-` | `@default("{}")` | `-` |
| `submitted_at` | `submittedAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `updated_at` | `updatedAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `@updatedAt` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `appointment` | `Appointment` | no | `@relation(fields: [appointmentId], references: [id], onDelete: Cascade, onUpdate: NoAction)` |

Indexes and table-level constraints:

- `@@index([patientId, submittedAt], map: "idx_pre_session_health_forms_patient_submitted")`

#### `appointment_status_history`

- Prisma model: `AppointmentStatusHistory`
- Physical table: `appointment_status_history`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `appointment_id` | `appointmentId` | `BigInt` | yes | `-` | `-` | `-` |
| `previous_status` | `previousStatus` | `String?` | no | `VarChar` | `-` | `-` |
| `new_status` | `newStatus` | `String` | yes | `VarChar` | `-` | `-` |
| `changed_by` | `changedBy` | `BigInt?` | no | `-` | `-` | `-` |
| `changed_by_role` | `changedByRole` | `String?` | no | `VarChar` | `-` | `-` |
| `reason` | `reason` | `String?` | no | `VarChar` | `-` | `-` |
| `notes` | `notes` | `String?` | no | `-` | `-` | `-` |
| `metadata` | `metadata` | `Json?` | no | `-` | `@default("{}")` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `appointment` | `Appointment` | no | `@relation(fields: [appointmentId], references: [id], onDelete: Cascade, onUpdate: NoAction)` |
| `changedByUser` | `User` | yes | `@relation(fields: [changedBy], references: [id], onUpdate: NoAction)` |

Indexes and table-level constraints:

- `@@index([appointmentId, createdAt(sort: Desc)], map: "idx_appointment_status_history_appt")`
- `@@index([changedBy], map: "idx_appointment_status_history_user")`

#### `appointments`

- Prisma model: `Appointment`
- Physical table: `appointments`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `dentist_id` | `dentistId` | `BigInt` | yes | `-` | `-` | `-` |
| `patient_id` | `patientId` | `BigInt` | yes | `-` | `-` | `-` |
| `clinic_branch_id` | `clinicBranchId` | `BigInt?` | no | `-` | `-` | `-` |
| `owner_type` | `ownerType` | `String` | yes | `VarChar(24)` | `@default("dentist")` | `-` |
| `owner_clinic_id` | `ownerClinicId` | `BigInt?` | no | `-` | `-` | `-` |
| `starts_at` | `startsAt` | `DateTime` | yes | `Timestamptz(6)` | `-` | `-` |
| `ends_at` | `endsAt` | `DateTime` | yes | `Timestamptz(6)` | `-` | `-` |
| `status` | `status` | `String` | yes | `VarChar` | `@default("scheduled")` | `-` |
| `reason` | `reason` | `String?` | no | `-` | `-` | `-` |
| `notes` | `notes` | `String?` | no | `-` | `-` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `updated_at` | `updatedAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `@updatedAt` |
| `chat_room_ref` | `chatRoomRef` | `String?` | no | `-` | `-` | `-` |
| `video_room_ref` | `videoRoomRef` | `String?` | no | `-` | `-` | `-` |
| `video_room_sid` | `video_room_sid` | `String?` | no | `-` | `-` | `-` |
| `comm_status` | `commStatus` | `String` | yes | `VarChar` | `@default("pending")` | `-` |
| `cancellation_reason` | `cancellationReason` | `String?` | no | `VarChar` | `-` | `-` |
| `cancellation_fee` | `cancellationFee` | `Int?` | no | `-` | `-` | `-` |
| `rescheduled_from_id` | `rescheduledFromId` | `BigInt?` | no | `-` | `-` | `-` |
| `metadata` | `metadata` | `Json?` | no | `-` | `@default("{}")` | `-` |
| `consultation_type` | `consultationType` | `String?` | no | `VarChar` | `@default("onsite")` | `-` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `statusHistory` | `AppointmentStatusHistory[]` | no | `-` |
| `clinicBranch` | `ClinicBranch` | yes | `@relation(fields: [clinicBranchId], references: [id], onUpdate: NoAction)` |
| `ownerClinic` | `ClinicProfile` | yes | `@relation(fields: [ownerClinicId], references: [id], onUpdate: NoAction)` |
| `dentist` | `User` | no | `@relation("DentistAppointments", fields: [dentistId], references: [id], onDelete: Cascade, onUpdate: NoAction)` |
| `patient` | `User` | no | `@relation("PatientAppointments", fields: [patientId], references: [id], onDelete: Cascade, onUpdate: NoAction)` |
| `rescheduledFrom` | `Appointment` | yes | `@relation("AppointmentRescheduleChain", fields: [rescheduledFromId], references: [id], onUpdate: NoAction)` |
| `rescheduledTo` | `Appointment[]` | no | `@relation("AppointmentRescheduleChain")` |
| `chatRoom` | `ChatRoom` | yes | `-` |
| `paymentIntents` | `PaymentIntent[]` | no | `@relation("AppointmentPaymentIntents")` |
| `invoices` | `Invoice[]` | no | `@relation("AppointmentInvoices")` |
| `treatmentPlans` | `TreatmentPlan[]` | no | `@relation("AppointmentTreatmentPlans")` |
| `financialEntries` | `FinancialLedgerEntry[]` | no | `-` |
| `videoSessions` | `VideoSession[]` | no | `-` |
| `communicationEvents` | `CommunicationEvent[]` | no | `-` |
| `compensationEntries` | `DentistCompensationEntry[]` | no | `-` |
| `clinicalSummary` | `AppointmentClinicalSummary` | yes | `-` |
| `communicationParticipants` | `AppointmentCommunicationParticipant[]` | no | `-` |
| `followUpTasks` | `AppointmentFollowUpTask[]` | no | `-` |
| `preSessionHealthForm` | `AppointmentPreSessionHealthForm` | yes | `-` |

Indexes and table-level constraints:

- `@@index([dentistId, startsAt], map: "idx_appointments_dentist_time")`
- `@@index([patientId, startsAt], map: "idx_appointments_patient_time")`
- `@@index([status], map: "idx_appointments_status")`
- `@@index([commStatus], map: "idx_appointments_comm_status")`

#### `chat_messages`

- Prisma model: `ChatMessage`
- Physical table: `chat_messages`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `chat_room_id` | `chatRoomId` | `BigInt` | yes | `-` | `-` | `-` |
| `sender_id` | `senderId` | `BigInt?` | no | `-` | `-` | `-` |
| `sender_communication_participant_id` | `senderCommunicationParticipantId` | `String?` | no | `Uuid` | `-` | `-` |
| `message` | `message` | `String` | yes | `-` | `-` | `-` |
| `message_type` | `messageType` | `String` | yes | `VarChar` | `@default("text")` | `-` |
| `twilio_message_sid` | `twilioMessageSid` | `String?` | no | `VarChar(255)` | `-` | `@unique` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `file_url` | `fileUrl` | `String?` | no | `-` | `-` | `-` |
| `file_name` | `fileName` | `String?` | no | `-` | `-` | `-` |
| `mime_type` | `mimeType` | `String?` | no | `VarChar(120)` | `-` | `-` |
| `file_size_bytes` | `fileSizeBytes` | `BigInt?` | no | `-` | `-` | `-` |
| `media_retention_until` | `mediaRetentionUntil` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |
| `storage_provider` | `storageProvider` | `String?` | no | `VarChar(32)` | `-` | `-` |
| `storage_bucket` | `storageBucket` | `String?` | no | `VarChar(191)` | `-` | `-` |
| `storage_object_key` | `storageObjectKey` | `String?` | no | `VarChar(512)` | `-` | `-` |
| `media_deleted_at` | `mediaDeletedAt` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |
| `media_scan_status` | `mediaScanStatus` | `String?` | no | `VarChar(32)` | `-` | `-` |
| `media_tombstone_reason` | `mediaTombstoneReason` | `String?` | no | `VarChar(120)` | `-` | `-` |
| `metadata` | `metadata` | `Json?` | no | `-` | `@default("{}")` | `-` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `chatRoom` | `ChatRoom` | no | `@relation(fields: [chatRoomId], references: [id], onDelete: Cascade, onUpdate: NoAction)` |
| `sender` | `User` | yes | `@relation(fields: [senderId], references: [id], onUpdate: NoAction)` |
| `senderCommunicationParticipant` | `AppointmentCommunicationParticipant` | yes | `@relation(fields: [senderCommunicationParticipantId], references: [id], onUpdate: NoAction)` |

Indexes and table-level constraints:

- `@@index([chatRoomId, createdAt(sort: Desc)], map: "idx_chat_messages_room_created_at")`
- `@@index([senderId, createdAt(sort: Desc)], map: "idx_chat_messages_sender")`
- `@@index([senderCommunicationParticipantId, createdAt(sort: Desc)], map: "idx_chat_messages_comm_participant")`
- `@@index([mediaRetentionUntil], map: "idx_chat_messages_media_retention")`
- `@@index([storageObjectKey], map: "idx_chat_messages_storage_object_key")`
- `@@index([createdAt(sort: Desc)], map: "idx_chat_messages_created_at")`

#### `chat_room_members`

- Prisma model: `ChatRoomMember`
- Physical table: `chat_room_members`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `chat_room_id` | `chatRoomId` | `BigInt` | yes | `-` | `-` | `-` |
| `user_id` | `userId` | `BigInt` | yes | `-` | `-` | `-` |
| `role` | `role` | `String` | yes | `VarChar` | `-` | `-` |
| `last_read_at` | `lastReadAt` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `chatRoom` | `ChatRoom` | no | `@relation(fields: [chatRoomId], references: [id], onDelete: Cascade, onUpdate: NoAction)` |
| `user` | `User` | no | `@relation(fields: [userId], references: [id], onDelete: Cascade, onUpdate: NoAction)` |

Indexes and table-level constraints:

- `@@unique([chatRoomId, userId])`
- `@@index([userId, chatRoomId], map: "idx_chat_room_members_user")`

#### `chat_rooms`

- Prisma model: `ChatRoom`
- Physical table: `chat_rooms`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `appointment_id` | `appointmentId` | `BigInt` | yes | `-` | `-` | `@unique` |
| `channel_name` | `channelName` | `String` | yes | `-` | `-` | `-` |
| `twilio_conversation_sid` | `twilio_conversation_sid` | `String?` | no | `-` | `-` | `@unique` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `messages` | `ChatMessage[]` | no | `-` |
| `members` | `ChatRoomMember[]` | no | `-` |
| `appointment` | `Appointment` | no | `@relation(fields: [appointmentId], references: [id], onDelete: Cascade, onUpdate: NoAction)` |

#### `communication_events`

- Prisma model: `CommunicationEvent`
- Physical table: `communication_events`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `appointment_id` | `appointmentId` | `BigInt` | yes | `-` | `-` | `-` |
| `user_id` | `userId` | `BigInt?` | no | `-` | `-` | `-` |
| `actor_role` | `actorRole` | `String?` | no | `VarChar(32)` | `-` | `-` |
| `event_type` | `eventType` | `String` | yes | `VarChar(64)` | `-` | `-` |
| `provider` | `provider` | `String?` | no | `VarChar(32)` | `-` | `-` |
| `provider_event_id` | `providerEventId` | `String?` | no | `VarChar(191)` | `-` | `-` |
| `resource_sid` | `resourceSid` | `String?` | no | `VarChar(191)` | `-` | `-` |
| `provider_sid` | `providerSid` | `String?` | no | `VarChar(191)` | `-` | `-` |
| `metadata` | `metadata` | `Json?` | no | `-` | `@default("{}")` | `-` |
| `occurred_at` | `occurredAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `appointment` | `Appointment` | no | `@relation(fields: [appointmentId], references: [id], onDelete: Cascade, onUpdate: NoAction)` |

Indexes and table-level constraints:

- `@@unique([provider, providerEventId], map: "uniq_communication_events_provider_event")`
- `@@index([appointmentId, occurredAt(sort: Desc)], map: "idx_communication_events_appointment_time")`
- `@@index([eventType, occurredAt(sort: Desc)], map: "idx_communication_events_type_time")`
- `@@index([userId, occurredAt(sort: Desc)], map: "idx_communication_events_user_time")`

#### `video_sessions`

- Prisma model: `VideoSession`
- Physical table: `video_sessions`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `appointmentId` | `appointmentId` | `BigInt` | yes | `-` | `-` | `-` |
| `userId` | `userId` | `BigInt` | yes | `-` | `-` | `-` |
| `actor_role` | `actorRole` | `String` | yes | `VarChar(32)` | `@default("participant")` | `-` |
| `joinedAt` | `joinedAt` | `DateTime` | yes | `-` | `@default(now())` | `-` |
| `leftAt` | `leftAt` | `DateTime?` | no | `-` | `-` | `-` |
| `durationSeconds` | `durationSeconds` | `Int?` | no | `-` | `-` | `-` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `appointment` | `Appointment` | no | `@relation(fields: [appointmentId], references: [id])` |
| `treatmentPlans` | `TreatmentPlan[]` | no | `@relation("TreatmentPlanConsultationSession")` |

### Clinic, branch, staff, services

#### `clinic_branches`

- Prisma model: `ClinicBranch`
- Physical table: `clinic_branches`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `clinic_profile_id` | `clinicProfileId` | `BigInt` | yes | `-` | `-` | `-` |
| `branch_name` | `branchName` | `String` | yes | `VarChar` | `-` | `-` |
| `branch_code` | `branchCode` | `String?` | no | `VarChar` | `-` | `-` |
| `is_main_branch` | `isMainBranch` | `Boolean` | yes | `-` | `@default(false)` | `-` |
| `street_address` | `streetAddress` | `String` | yes | `VarChar` | `-` | `-` |
| `city` | `city` | `String` | yes | `VarChar` | `-` | `-` |
| `province` | `province` | `String` | yes | `VarChar` | `-` | `-` |
| `postal_code` | `postalCode` | `String` | yes | `VarChar` | `-` | `-` |
| `phone` | `phone` | `String?` | no | `VarChar` | `-` | `-` |
| `treatment_rooms_count` | `treatmentRoomsCount` | `Int` | yes | `-` | `-` | `-` |
| `has_sterilization` | `hasSterlization` | `Boolean` | yes | `-` | `@default(false)` | `-` |
| `has_radiography` | `hasRadiography` | `Boolean` | yes | `-` | `@default(false)` | `-` |
| `operating_hours` | `operatingHours` | `Json?` | no | `-` | `-` | `-` |
| `is_active` | `isActive` | `Boolean` | yes | `-` | `@default(true)` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `updated_at` | `updatedAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `@updatedAt` |
| `latitude` | `latitude` | `Decimal?` | no | `Decimal(10, 8)` | `-` | `-` |
| `longitude` | `longitude` | `Decimal?` | no | `Decimal(11, 8)` | `-` | `-` |
| `district` | `district` | `String?` | no | `-` | `-` | `-` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `appointments` | `Appointment[]` | no | `-` |
| `clinicProfile` | `ClinicProfile` | no | `@relation(fields: [clinicProfileId], references: [id], onDelete: Cascade, onUpdate: NoAction)` |
| `clinic_facilities` | `clinic_facilities[]` | no | `-` |
| `clinic_gallery` | `clinic_gallery[]` | no | `-` |
| `clinic_highlights` | `clinic_highlights[]` | no | `-` |
| `clinic_services` | `clinic_services[]` | no | `-` |
| `clinicStaff` | `ClinicStaff[]` | no | `-` |

Indexes and table-level constraints:

- `@@unique([clinicProfileId, branchCode])`
- `@@index([clinicProfileId], map: "idx_clinic_branches_clinic_id")`
- `@@index([isMainBranch], map: "idx_clinic_branches_main")`
- `@@index([isActive], map: "idx_clinic_branches_active")`
- `@@index([city, district], map: "idx_clinic_branches_city")`
- `@@index([latitude, longitude], map: "idx_clinic_branches_location")`

#### `clinic_facilities`

- Prisma model: `clinic_facilities`
- Physical table: `clinic_facilities`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `clinic_branch_id` | `clinic_branch_id` | `BigInt` | yes | `-` | `-` | `-` |
| `facility_name` | `facility_name` | `String` | yes | `VarChar(255)` | `-` | `-` |
| `description` | `description` | `String?` | no | `-` | `-` | `-` |
| `icon` | `icon` | `String?` | no | `VarChar(100)` | `-` | `-` |
| `display_order` | `display_order` | `Int?` | no | `-` | `@default(0)` | `-` |
| `is_active` | `is_active` | `Boolean?` | no | `-` | `@default(true)` | `-` |
| `created_at` | `created_at` | `DateTime?` | no | `Timestamp(6)` | `@default(now())` | `-` |
| `updated_at` | `updated_at` | `DateTime?` | no | `Timestamp(6)` | `@default(now())` | `-` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `clinic_branches` | `ClinicBranch` | no | `@relation(fields: [clinic_branch_id], references: [id], onDelete: Cascade, onUpdate: NoAction)` |

Indexes and table-level constraints:

- `@@index([clinic_branch_id], map: "idx_clinic_facilities_branch")`
- `@@index([display_order], map: "idx_clinic_facilities_order")`

#### `clinic_gallery`

- Prisma model: `clinic_gallery`
- Physical table: `clinic_gallery`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `clinic_branch_id` | `clinic_branch_id` | `BigInt` | yes | `-` | `-` | `-` |
| `image_url` | `image_url` | `String` | yes | `-` | `-` | `-` |
| `image_type` | `image_type` | `String` | yes | `VarChar(50)` | `@default("general")` | `-` |
| `caption` | `caption` | `String?` | no | `-` | `-` | `-` |
| `display_order` | `display_order` | `Int?` | no | `-` | `@default(0)` | `-` |
| `is_active` | `is_active` | `Boolean?` | no | `-` | `@default(true)` | `-` |
| `created_at` | `created_at` | `DateTime?` | no | `Timestamp(6)` | `@default(now())` | `-` |
| `updated_at` | `updated_at` | `DateTime?` | no | `Timestamp(6)` | `@default(now())` | `-` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `clinic_branches` | `ClinicBranch` | no | `@relation(fields: [clinic_branch_id], references: [id], onDelete: Cascade, onUpdate: NoAction)` |

Indexes and table-level constraints:

- `@@index([clinic_branch_id], map: "idx_clinic_gallery_branch")`
- `@@index([display_order], map: "idx_clinic_gallery_order")`
- `@@index([image_type], map: "idx_clinic_gallery_type")`

#### `clinic_highlights`

- Prisma model: `clinic_highlights`
- Physical table: `clinic_highlights`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `clinic_branch_id` | `clinic_branch_id` | `BigInt` | yes | `-` | `-` | `-` |
| `highlight_text` | `highlight_text` | `String` | yes | `VarChar(255)` | `-` | `-` |
| `icon` | `icon` | `String?` | no | `VarChar(100)` | `-` | `-` |
| `display_order` | `display_order` | `Int?` | no | `-` | `@default(0)` | `-` |
| `is_active` | `is_active` | `Boolean?` | no | `-` | `@default(true)` | `-` |
| `created_at` | `created_at` | `DateTime?` | no | `Timestamp(6)` | `@default(now())` | `-` |
| `updated_at` | `updated_at` | `DateTime?` | no | `Timestamp(6)` | `@default(now())` | `-` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `clinic_branches` | `ClinicBranch` | no | `@relation(fields: [clinic_branch_id], references: [id], onDelete: Cascade, onUpdate: NoAction)` |

Indexes and table-level constraints:

- `@@index([clinic_branch_id], map: "idx_clinic_highlights_branch")`
- `@@index([display_order], map: "idx_clinic_highlights_order")`

#### `clinic_profiles`

- Prisma model: `ClinicProfile`
- Physical table: `clinic_profiles`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `user_id` | `userId` | `BigInt` | yes | `-` | `-` | `-` |
| `legal_name` | `legalName` | `String` | yes | `VarChar` | `-` | `-` |
| `brand_name` | `brandName` | `String?` | no | `VarChar` | `-` | `-` |
| `facility_type` | `facilityType` | `String` | yes | `VarChar` | `-` | `-` |
| `street_address` | `streetAddress` | `String` | yes | `VarChar` | `-` | `-` |
| `city` | `city` | `String` | yes | `VarChar` | `-` | `-` |
| `province` | `province` | `String` | yes | `VarChar` | `-` | `-` |
| `postal_code` | `postalCode` | `String` | yes | `VarChar` | `-` | `-` |
| `phone` | `phone` | `String` | yes | `VarChar` | `-` | `-` |
| `email` | `email` | `String` | yes | `VarChar` | `-` | `-` |
| `timezone` | `timezone` | `String` | yes | `VarChar` | `@default("Asia/Jakarta")` | `-` |
| `operating_hours` | `operatingHours` | `Json` | yes | `-` | `-` | `-` |
| `owner_name` | `ownerName` | `String` | yes | `VarChar` | `-` | `-` |
| `owner_position` | `ownerPosition` | `String` | yes | `VarChar` | `-` | `-` |
| `owner_email` | `ownerEmail` | `String` | yes | `VarChar` | `-` | `-` |
| `owner_whatsapp` | `ownerWhatsapp` | `String` | yes | `VarChar` | `-` | `-` |
| `owner_nik` | `ownerNik` | `String` | yes | `VarChar` | `-` | `@unique` |
| `ktp_file_path` | `ktpFilePath` | `String` | yes | `VarChar` | `-` | `-` |
| `ktp_selfie_file_path` | `ktpSelfieFilePath` | `String?` | no | `VarChar` | `-` | `-` |
| `nib_number` | `nibNumber` | `String` | yes | `VarChar` | `-` | `@unique` |
| `nib_file_path` | `nibFilePath` | `String` | yes | `VarChar` | `-` | `-` |
| `npwp_number` | `npwpNumber` | `String` | yes | `VarChar` | `-` | `@unique` |
| `npwp_file_path` | `npwpFilePath` | `String` | yes | `VarChar` | `-` | `-` |
| `operational_license_file_path` | `operationalLicenseFilePath` | `String` | yes | `VarChar` | `-` | `-` |
| `additional_license_file_paths` | `additionalLicenseFilePaths` | `String[]` | yes | `-` | `@default([])` | `-` |
| `terms_accepted` | `termsAccepted` | `Boolean` | yes | `-` | `@default(false)` | `-` |
| `privacy_accepted` | `privacyAccepted` | `Boolean` | yes | `-` | `@default(false)` | `-` |
| `data_protection_contact` | `dataProtectionContact` | `String?` | no | `VarChar` | `-` | `-` |
| `is_verified` | `isVerified` | `Boolean` | yes | `-` | `@default(false)` | `-` |
| `verification_date` | `verificationDate` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |
| `verification_notes` | `verificationNotes` | `String?` | no | `-` | `-` | `-` |
| `status` | `status` | `String` | yes | `VarChar` | `@default("pending")` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `updated_at` | `updatedAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `@updatedAt` |
| `latitude` | `latitude` | `Decimal?` | no | `Decimal(10, 8)` | `-` | `-` |
| `longitude` | `longitude` | `Decimal?` | no | `Decimal(11, 8)` | `-` | `-` |
| `district` | `district` | `String?` | no | `-` | `-` | `-` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `branches` | `ClinicBranch[]` | no | `-` |
| `user` | `User` | no | `@relation(fields: [userId], references: [id], onDelete: Cascade, onUpdate: NoAction)` |
| `staff` | `ClinicStaff[]` | no | `-` |
| `ownedPaymentIntents` | `PaymentIntent[]` | no | `@relation("PaymentIntentOwnerClinic")` |
| `financialLedgerEntries` | `FinancialLedgerEntry[]` | no | `@relation("FinancialLedgerClinic")` |
| `invoices` | `Invoice[]` | no | `@relation("InvoiceOwnerClinic")` |
| `ownedAppointments` | `Appointment[]` | no | `-` |
| `ownedSettlements` | `PaymentSettlement[]` | no | `@relation("SettlementOwnerClinic")` |
| `compensationEntries` | `DentistCompensationEntry[]` | no | `@relation("ClinicCompensation")` |
| `treatmentPlans` | `TreatmentPlan[]` | no | `@relation("ClinicTreatmentPlans")` |

Indexes and table-level constraints:

- `@@index([userId], map: "idx_clinic_profiles_user_id")`
- `@@index([nibNumber], map: "idx_clinic_profiles_nib")`
- `@@index([npwpNumber], map: "idx_clinic_profiles_npwp")`
- `@@index([ownerNik], map: "idx_clinic_profiles_owner_nik")`
- `@@index([status], map: "idx_clinic_profiles_status")`
- `@@index([legalName], map: "idx_clinic_profiles_legal_name")`
- `@@index([city, district], map: "idx_clinic_profiles_city")`
- `@@index([latitude, longitude], map: "idx_clinic_profiles_location")`

#### `clinic_services`

- Prisma model: `clinic_services`
- Physical table: `clinic_services`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `clinic_branch_id` | `clinic_branch_id` | `BigInt` | yes | `-` | `-` | `-` |
| `name` | `name` | `String` | yes | `VarChar(255)` | `-` | `-` |
| `description` | `description` | `String?` | no | `-` | `-` | `-` |
| `base_price` | `base_price` | `Decimal` | yes | `Decimal(10, 2)` | `-` | `-` |
| `category` | `category` | `String` | yes | `VarChar(50)` | `@default("general")` | `-` |
| `specialty` | `specialty` | `String?` | no | `VarChar(100)` | `-` | `-` |
| `duration_minutes` | `duration_minutes` | `Int?` | no | `-` | `@default(30)` | `-` |
| `is_active` | `is_active` | `Boolean?` | no | `-` | `@default(true)` | `-` |
| `is_available_for_all_dentists` | `is_available_for_all_dentists` | `Boolean?` | no | `-` | `@default(true)` | `-` |
| `created_at` | `created_at` | `DateTime?` | no | `Timestamp(6)` | `@default(now())` | `-` |
| `updated_at` | `updated_at` | `DateTime?` | no | `Timestamp(6)` | `@default(now())` | `-` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `clinic_branches` | `ClinicBranch` | no | `@relation(fields: [clinic_branch_id], references: [id], onDelete: Cascade, onUpdate: NoAction)` |
| `service_dentist_assignments` | `service_dentist_assignments[]` | no | `-` |

Indexes and table-level constraints:

- `@@index([is_active], map: "idx_clinic_services_active")`
- `@@index([clinic_branch_id], map: "idx_clinic_services_branch")`
- `@@index([category], map: "idx_clinic_services_category")`

#### `clinic_staff`

- Prisma model: `ClinicStaff`
- Physical table: `clinic_staff`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `clinic_profile_id` | `clinicProfileId` | `BigInt` | yes | `-` | `-` | `-` |
| `user_id` | `userId` | `BigInt` | yes | `-` | `-` | `@unique(map: "unique_clinic_staff_user_id")` |
| `role` | `role` | `String` | yes | `VarChar` | `-` | `-` |
| `is_active` | `isActive` | `Boolean` | yes | `-` | `@default(true)` | `-` |
| `hire_date` | `hireDate` | `DateTime?` | no | `Date` | `-` | `-` |
| `position_title` | `positionTitle` | `String?` | no | `VarChar` | `-` | `-` |
| `department` | `department` | `String?` | no | `VarChar` | `-` | `-` |
| `assigned_branch_id` | `assignedBranchId` | `BigInt?` | no | `-` | `-` | `-` |
| `permissions` | `permissions` | `Json?` | no | `-` | `-` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `updated_at` | `updatedAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `@updatedAt` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `assignedBranch` | `ClinicBranch` | yes | `@relation(fields: [assignedBranchId], references: [id], onUpdate: NoAction)` |
| `clinicProfile` | `ClinicProfile` | no | `@relation(fields: [clinicProfileId], references: [id], onDelete: Cascade, onUpdate: NoAction)` |
| `user` | `User` | no | `@relation(fields: [userId], references: [id], onDelete: Cascade, onUpdate: NoAction)` |

Indexes and table-level constraints:

- `@@unique([clinicProfileId, userId])`
- `@@index([clinicProfileId], map: "idx_clinic_staff_clinic_id")`
- `@@index([role], map: "idx_clinic_staff_role")`
- `@@index([isActive], map: "idx_clinic_staff_active")`
- `@@index([assignedBranchId], map: "idx_clinic_staff_branch")`
- `@@index([userId], map: "idx_clinic_staff_user_id")`

#### `clinics`

- Prisma model: `Clinic`
- Physical table: `clinics`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `name` | `name` | `String` | yes | `-` | `-` | `-` |
| `address` | `address` | `String` | yes | `-` | `-` | `-` |
| `city` | `city` | `String` | yes | `-` | `-` | `-` |
| `district` | `district` | `String?` | no | `-` | `-` | `-` |
| `province` | `province` | `String?` | no | `-` | `-` | `-` |
| `postal_code` | `postal_code` | `String?` | no | `-` | `-` | `-` |
| `latitude` | `latitude` | `Decimal?` | no | `Decimal(10, 8)` | `-` | `-` |
| `longitude` | `longitude` | `Decimal?` | no | `Decimal(11, 8)` | `-` | `-` |
| `phone_number` | `phone_number` | `String?` | no | `-` | `-` | `-` |
| `email` | `email` | `String?` | no | `-` | `-` | `-` |
| `website` | `website` | `String?` | no | `-` | `-` | `-` |
| `operating_hours` | `operating_hours` | `Json?` | no | `-` | `-` | `-` |
| `facilities` | `facilities` | `String[]` | yes | `-` | `-` | `-` |
| `total_dentists` | `total_dentists` | `Int?` | no | `-` | `@default(0)` | `-` |
| `rating` | `rating` | `Decimal?` | no | `Decimal(3, 2)` | `@default(0.0)` | `-` |
| `total_reviews` | `total_reviews` | `Int?` | no | `-` | `@default(0)` | `-` |
| `is_verified` | `is_verified` | `Boolean?` | no | `-` | `@default(false)` | `-` |
| `created_at` | `created_at` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `updated_at` | `updated_at` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |

Indexes and table-level constraints:

- `@@index([city, district], map: "idx_clinic_city")`
- `@@index([latitude, longitude], map: "idx_clinic_location")`

#### `dentist_profiles`

- Prisma model: `DentistProfile`
- Physical table: `dentist_profiles`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `user_id` | `userId` | `BigInt` | yes | `-` | `-` | `-` |
| `title` | `title` | `String` | yes | `-` | `-` | `-` |
| `license_number` | `licenseNumber` | `String` | yes | `-` | `-` | `@unique` |
| `license_issuing_body` | `licenseIssuingBody` | `String` | yes | `-` | `-` | `-` |
| `license_expiry_date` | `licenseExpiryDate` | `DateTime` | yes | `Date` | `-` | `-` |
| `registration_number` | `registrationNumber` | `String` | yes | `-` | `-` | `@unique` |
| `primary_specialization` | `primarySpecialization` | `String` | yes | `-` | `-` | `-` |
| `education_qualification` | `educationQualification` | `String` | yes | `-` | `-` | `-` |
| `years_of_experience` | `yearsOfExperience` | `Int` | yes | `-` | `-` | `-` |
| `clinic_name` | `clinicName` | `String` | yes | `-` | `-` | `-` |
| `clinic_address` | `clinicAddress` | `String` | yes | `-` | `-` | `-` |
| `clinic_working_hours` | `clinicWorkingHours` | `String` | yes | `-` | `-` | `-` |
| `consultation_types` | `consultationTypes` | `String[]` | yes | `-` | `@default([])` | `-` |
| `services_offered` | `servicesOffered` | `String[]` | yes | `-` | `@default([])` | `-` |
| `consultation_fee` | `consultationFee` | `Int?` | no | `-` | `-` | `-` |
| `accepts_insurance` | `acceptsInsurance` | `Boolean` | yes | `-` | `@default(false)` | `-` |
| `accepts_bpjs` | `acceptsBpjs` | `Boolean` | yes | `-` | `@default(false)` | `-` |
| `emergency_availability` | `emergencyAvailability` | `Boolean` | yes | `-` | `@default(false)` | `-` |
| `is_verified` | `isVerified` | `Boolean` | yes | `-` | `@default(false)` | `-` |
| `verification_date` | `verificationDate` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `updated_at` | `updatedAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `@updatedAt` |
| `sip_file_path` | `sipFilePath` | `String?` | no | `-` | `-` | `-` |
| `str_file_path` | `strFilePath` | `String?` | no | `-` | `-` | `-` |
| `ijazah_file_paths` | `ijazahFilePaths` | `String[]` | yes | `-` | `@default([])` | `-` |
| `certification_file_paths` | `certificationFilePaths` | `String[]` | yes | `-` | `@default([])` | `-` |
| `avatar_url` | `avatar_url` | `String?` | no | `-` | `-` | `-` |
| `latitude` | `latitude` | `Decimal?` | no | `Decimal(10, 8)` | `-` | `-` |
| `longitude` | `longitude` | `Decimal?` | no | `Decimal(11, 8)` | `-` | `-` |
| `city` | `city` | `String?` | no | `-` | `-` | `-` |
| `district` | `district` | `String?` | no | `-` | `-` | `-` |
| `province` | `province` | `String?` | no | `-` | `-` | `-` |
| `postal_code` | `postal_code` | `String?` | no | `-` | `-` | `-` |
| `dentist_type` | `dentist_type` | `String` | yes | `-` | `@default("independent")` | `-` |
| `clinic_id` | `clinic_id` | `BigInt?` | no | `-` | `-` | `-` |
| `is_clinic_owner` | `is_clinic_owner` | `Boolean?` | no | `-` | `@default(false)` | `-` |
| `storage_limit` | `storage_limit` | `BigInt` | yes | `-` | `@default(10737418240)` | `-` |
| `storage_usage` | `storage_usage` | `BigInt` | yes | `-` | `@default(0)` | `-` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `user` | `User` | no | `@relation(fields: [userId], references: [id], onDelete: Cascade, onUpdate: NoAction)` |
| `dentist_services` | `dentist_services[]` | no | `-` |
| `service_dentist_assignments` | `service_dentist_assignments[]` | no | `-` |

Indexes and table-level constraints:

- `@@index([licenseNumber], map: "idx_dentist_profiles_license_number")`
- `@@index([registrationNumber], map: "idx_dentist_profiles_registration_number")`
- `@@index([primarySpecialization], map: "idx_dentist_profiles_specialization")`
- `@@index([userId], map: "idx_dentist_profiles_user_id")`
- `@@index([city, district], map: "idx_dentist_city_district")`
- `@@index([clinic_id], map: "idx_dentist_clinic_id")`
- `@@index([latitude, longitude], map: "idx_dentist_location")`
- `@@index([dentist_type], map: "idx_dentist_type")`

#### `dentist_services`

- Prisma model: `dentist_services`
- Physical table: `dentist_services`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `dentist_profile_id` | `dentist_profile_id` | `BigInt` | yes | `-` | `-` | `-` |
| `name` | `name` | `String` | yes | `VarChar(255)` | `-` | `-` |
| `description` | `description` | `String?` | no | `-` | `-` | `-` |
| `price` | `price` | `Decimal` | yes | `Decimal(10, 2)` | `-` | `-` |
| `category` | `category` | `String` | yes | `VarChar(50)` | `@default("specialist")` | `-` |
| `specialty` | `specialty` | `String?` | no | `VarChar(100)` | `-` | `-` |
| `duration_minutes` | `duration_minutes` | `Int?` | no | `-` | `@default(30)` | `-` |
| `managed_by` | `managed_by` | `String` | yes | `VarChar(20)` | `@default("dentist")` | `-` |
| `can_edit` | `can_edit` | `Boolean?` | no | `-` | `@default(true)` | `-` |
| `is_active` | `is_active` | `Boolean?` | no | `-` | `@default(true)` | `-` |
| `created_at` | `created_at` | `DateTime?` | no | `Timestamp(6)` | `@default(now())` | `-` |
| `updated_at` | `updated_at` | `DateTime?` | no | `Timestamp(6)` | `@default(now())` | `-` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `dentist_profiles` | `DentistProfile` | no | `@relation(fields: [dentist_profile_id], references: [id], onDelete: Cascade, onUpdate: NoAction)` |

Indexes and table-level constraints:

- `@@index([is_active], map: "idx_dentist_services_active")`
- `@@index([category], map: "idx_dentist_services_category")`
- `@@index([dentist_profile_id], map: "idx_dentist_services_dentist")`

#### `service_dentist_assignments`

- Prisma model: `service_dentist_assignments`
- Physical table: `service_dentist_assignments`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `clinic_service_id` | `clinic_service_id` | `BigInt` | yes | `-` | `-` | `-` |
| `dentist_profile_id` | `dentist_profile_id` | `BigInt` | yes | `-` | `-` | `-` |
| `custom_price` | `custom_price` | `Decimal?` | no | `Decimal(10, 2)` | `-` | `-` |
| `is_available` | `is_available` | `Boolean?` | no | `-` | `@default(true)` | `-` |
| `created_at` | `created_at` | `DateTime?` | no | `Timestamp(6)` | `@default(now())` | `-` |
| `updated_at` | `updated_at` | `DateTime?` | no | `Timestamp(6)` | `@default(now())` | `-` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `clinic_services` | `clinic_services` | no | `@relation(fields: [clinic_service_id], references: [id], onDelete: Cascade, onUpdate: NoAction)` |
| `dentist_profiles` | `DentistProfile` | no | `@relation(fields: [dentist_profile_id], references: [id], onDelete: Cascade, onUpdate: NoAction)` |

Indexes and table-level constraints:

- `@@unique([clinic_service_id, dentist_profile_id])`
- `@@index([clinic_service_id], map: "idx_service_assignments_clinic_service")`
- `@@index([dentist_profile_id], map: "idx_service_assignments_dentist")`

### Events & webhooks

#### `domain_event_outbox`

- Prisma model: `DomainEventOutbox`
- Physical table: `domain_event_outbox`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `event_id` | `eventId` | `String` | yes | `Uuid` | `@default(dbgenerated("gen_random_uuid()"))` | `@unique` |
| `event_type` | `eventType` | `String` | yes | `VarChar(100)` | `-` | `-` |
| `aggregate_type` | `aggregateType` | `String` | yes | `VarChar(100)` | `-` | `-` |
| `aggregate_id` | `aggregateId` | `String` | yes | `VarChar(100)` | `-` | `-` |
| `correlation_id` | `correlationId` | `String?` | no | `VarChar(120)` | `-` | `-` |
| `causation_id` | `causationId` | `String?` | no | `VarChar(120)` | `-` | `-` |
| `idempotency_key` | `idempotencyKey` | `String?` | no | `VarChar(180)` | `-` | `-` |
| `payload` | `payload` | `Json?` | no | `-` | `@default("{}")` | `-` |
| `headers` | `headers` | `Json?` | no | `-` | `@default("{}")` | `-` |
| `status` | `status` | `String` | yes | `VarChar(32)` | `@default("pending")` | `-` |
| `attempts` | `attempts` | `Int` | yes | `-` | `@default(0)` | `-` |
| `available_at` | `availableAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `published_at` | `publishedAt` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |
| `last_error` | `lastError` | `String?` | no | `-` | `-` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `updated_at` | `updatedAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `@updatedAt` |

Indexes and table-level constraints:

- `@@index([status, availableAt], map: "idx_domain_event_outbox_status_available")`
- `@@index([aggregateType, aggregateId, createdAt(sort: Desc)], map: "idx_domain_event_outbox_aggregate")`

#### `webhook_receipts`

- Prisma model: `WebhookReceipt`
- Physical table: `webhook_receipts`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `provider` | `provider` | `String` | yes | `VarChar(32)` | `-` | `-` |
| `source` | `source` | `String?` | no | `VarChar(64)` | `-` | `-` |
| `delivery_key` | `deliveryKey` | `String` | yes | `VarChar(191)` | `-` | `-` |
| `event_type` | `eventType` | `String?` | no | `VarChar(100)` | `-` | `-` |
| `resource_id` | `resourceId` | `String?` | no | `VarChar(191)` | `-` | `-` |
| `signature` | `signature` | `String?` | no | `VarChar(255)` | `-` | `-` |
| `payload_hash` | `payloadHash` | `String` | yes | `VarChar(128)` | `-` | `-` |
| `correlation_id` | `correlationId` | `String?` | no | `VarChar(120)` | `-` | `-` |
| `raw_payload` | `rawPayload` | `Json?` | no | `-` | `@default("{}")` | `-` |
| `headers` | `headers` | `Json?` | no | `-` | `@default("{}")` | `-` |
| `status` | `status` | `String` | yes | `VarChar(32)` | `@default("processing")` | `-` |
| `attempts` | `attempts` | `Int` | yes | `-` | `@default(1)` | `-` |
| `received_at` | `receivedAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `processed_at` | `processedAt` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |
| `next_attempt_at` | `nextAttemptAt` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |
| `last_error` | `lastError` | `String?` | no | `-` | `-` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `updated_at` | `updatedAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `@updatedAt` |
| `provider_event_id` | `providerEventId` | `String?` | no | `VarChar(191)` | `-` | `-` |
| `provider_transaction_id` | `providerTransactionId` | `String?` | no | `VarChar(191)` | `-` | `-` |
| `order_id` | `orderId` | `String?` | no | `VarChar(191)` | `-` | `-` |
| `processing_status` | `processingStatus` | `String?` | no | `VarChar(32)` | `-` | `-` |
| `retry_count` | `retryCount` | `Int` | yes | `-` | `@default(0)` | `-` |

Indexes and table-level constraints:

- `@@unique([provider, deliveryKey], map: "uniq_webhook_receipts_provider_delivery")`
- `@@index([status, nextAttemptAt], map: "idx_webhook_receipts_status_next_attempt")`
- `@@index([provider, receivedAt(sort: Desc)], map: "idx_webhook_receipts_provider_received_at")`

### Identity & authentication

#### `OTPVerification`

- Prisma model: `OTPVerification`
- Physical table: `OTPVerification`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `String` | yes | `-` | `@default(dbgenerated("gen_random_uuid()"))` | `@id` |
| `identifier` | `identifier` | `String` | yes | `-` | `-` | `@unique` |
| `otp` | `otp` | `String` | yes | `-` | `-` | `-` |
| `type` | `type` | `String` | yes | `-` | `-` | `-` |
| `purpose` | `purpose` | `String` | yes | `VarChar(50)` | `@default("login")` | `-` |
| `expiresAt` | `expiresAt` | `DateTime` | yes | `-` | `-` | `-` |
| `attempts` | `attempts` | `Int` | yes | `-` | `@default(0)` | `-` |
| `resend_count` | `resendCount` | `Int` | yes | `-` | `@default(0)` | `-` |
| `max_attempts` | `maxAttempts` | `Int` | yes | `-` | `@default(5)` | `-` |
| `cooldown_until` | `cooldownUntil` | `DateTime?` | no | `-` | `-` | `-` |
| `locked_until` | `lockedUntil` | `DateTime?` | no | `-` | `-` | `-` |
| `last_sent_at` | `lastSentAt` | `DateTime?` | no | `-` | `-` | `-` |
| `last_request_ip_hash` | `lastRequestIpHash` | `String?` | no | `VarChar(128)` | `-` | `-` |
| `verified` | `verified` | `Boolean` | yes | `-` | `@default(false)` | `-` |
| `verified_at` | `verifiedAt` | `DateTime?` | no | `-` | `-` | `-` |
| `createdAt` | `createdAt` | `DateTime` | yes | `-` | `@default(now())` | `-` |
| `updatedAt` | `updatedAt` | `DateTime` | yes | `-` | `@default(now())` | `-` |

Indexes and table-level constraints:

- `@@index([expiresAt])`
- `@@index([identifier])`
- `@@index([cooldownUntil], map: "idx_otp_verification_cooldown")`
- `@@index([lockedUntil], map: "idx_otp_verification_locked")`

#### `otp_request_attempts`

- Prisma model: `OtpRequestAttempt`
- Physical table: `otp_request_attempts`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `otp_verification_id` | `otpVerificationId` | `String?` | no | `-` | `-` | `-` |
| `action` | `action` | `String` | yes | `VarChar(16)` | `-` | `-` |
| `identifier_hash` | `identifierHash` | `String?` | no | `VarChar(128)` | `-` | `-` |
| `ip_hash` | `ipHash` | `String?` | no | `VarChar(128)` | `-` | `-` |
| `channel` | `channel` | `String` | yes | `VarChar(16)` | `-` | `-` |
| `outcome` | `outcome` | `String` | yes | `VarChar(32)` | `-` | `-` |
| `reason` | `reason` | `String?` | no | `VarChar(64)` | `-` | `-` |
| `correlation_id` | `correlationId` | `String?` | no | `VarChar(120)` | `-` | `-` |
| `user_id` | `userId` | `BigInt?` | no | `-` | `-` | `-` |
| `idempotency_key` | `idempotencyKey` | `String?` | no | `VarChar(180)` | `-` | `-` |
| `metadata` | `metadata` | `Json?` | no | `-` | `@default("{}")` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |

Indexes and table-level constraints:

- `@@index([ipHash, action, createdAt(sort: Desc)], map: "idx_otp_request_attempts_ip_window")`
- `@@index([identifierHash, action, createdAt(sort: Desc)], map: "idx_otp_request_attempts_identifier_window")`
- `@@index([idempotencyKey, createdAt(sort: Desc)], map: "idx_otp_request_attempts_idempotency")`

#### `refresh_tokens`

- Prisma model: `RefreshToken`
- Physical table: `refresh_tokens`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `user_id` | `userId` | `BigInt` | yes | `-` | `-` | `-` |
| `token` | `token` | `String` | yes | `-` | `-` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `user` | `User` | no | `@relation(fields: [userId], references: [id], onDelete: Cascade, onUpdate: NoAction)` |

Indexes and table-level constraints:

- `@@index([token], map: "idx_refresh_tokens_token")`

#### `user_devices`

- Prisma model: `UserDevice`
- Physical table: `user_devices`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `user_id` | `user_id` | `BigInt` | yes | `-` | `-` | `-` |
| `device_token` | `device_token` | `String` | yes | `-` | `-` | `-` |
| `device_type` | `device_type` | `String?` | no | `VarChar(20)` | `-` | `-` |
| `device_name` | `device_name` | `String?` | no | `VarChar(255)` | `-` | `-` |
| `is_active` | `is_active` | `Boolean` | yes | `-` | `@default(true)` | `-` |
| `last_active_at` | `last_active_at` | `DateTime?` | no | `Timestamptz(6)` | `@default(now())` | `-` |
| `created_at` | `created_at` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `updated_at` | `updated_at` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `users` | `User` | no | `@relation(fields: [user_id], references: [id], onDelete: Cascade, onUpdate: NoAction)` |

Indexes and table-level constraints:

- `@@unique([user_id, device_token], map: "uniq_user_device_token")`
- `@@index([user_id, is_active], map: "idx_user_devices_user_active")`

#### `users`

- Prisma model: `User`
- Physical table: `users`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `name` | `name` | `String` | yes | `-` | `-` | `-` |
| `email` | `email` | `String` | yes | `-` | `-` | `@unique` |
| `password_hash` | `password_hash` | `String` | yes | `-` | `-` | `-` |
| `roles` | `roles` | `String[]` | yes | `-` | `@default([])` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `phone_number` | `phone_number` | `String?` | no | `-` | `-` | `-` |
| `about` | `about` | `String?` | no | `-` | `-` | `-` |
| `avatar_url` | `avatar_url` | `String?` | no | `-` | `-` | `-` |
| `clinic_id` | `clinic_id` | `BigInt?` | no | `-` | `-` | `-` |
| `last_login_at` | `lastLoginAt` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `aiAnalysisResults` | `AIAnalysisResult[]` | no | `-` |
| `aiChatMessages` | `AIChatMessage[]` | no | `-` |
| `appointmentStatusHistory` | `AppointmentStatusHistory[]` | no | `-` |
| `dentistAppointments` | `Appointment[]` | no | `@relation("DentistAppointments")` |
| `patientAppointments` | `Appointment[]` | no | `@relation("PatientAppointments")` |
| `chatMessages` | `ChatMessage[]` | no | `-` |
| `chatRoomMemberships` | `ChatRoomMember[]` | no | `-` |
| `clinicProfile` | `ClinicProfile[]` | no | `-` |
| `clinicStaff` | `ClinicStaff` | yes | `-` |
| `dentist_emr_records_dentist_emr_records_dentist_idTousers` | `dentist_emr_records[]` | no | `@relation("dentist_emr_records_dentist_idTousers")` |
| `dentist_emr_records_dentist_emr_records_patient_user_idTousers` | `dentist_emr_records[]` | no | `@relation("dentist_emr_records_patient_user_idTousers")` |
| `dentistProfile` | `DentistProfile[]` | no | `-` |
| `scheduleEntries` | `DentistScheduleEntry[]` | no | `-` |
| `dentistStudies` | `ImagingStudy[]` | no | `@relation("DentistStudies")` |
| `patientStudies` | `ImagingStudy[]` | no | `@relation("PatientStudies")` |
| `notificationDevices` | `NotificationDevice[]` | no | `-` |
| `notificationJobs` | `NotificationJob[]` | no | `-` |
| `notificationPreferences` | `NotificationPreference[]` | no | `-` |
| `notifications` | `Notification[]` | no | `-` |
| `patientProfile` | `PatientProfile` | yes | `-` |
| `paymentIntents` | `PaymentIntent[]` | no | `-` |
| `ownedPaymentIntents` | `PaymentIntent[]` | no | `@relation("PaymentIntentOwnerDentist")` |
| `financialLedgerEntries` | `FinancialLedgerEntry[]` | no | `@relation("FinancialLedgerDentist")` |
| `ownedInvoices` | `Invoice[]` | no | `@relation("InvoiceOwnerDentist")` |
| `invoices` | `Invoice[]` | no | `-` |
| `refreshTokens` | `RefreshToken[]` | no | `-` |
| `user_devices` | `UserDevice[]` | no | `-` |
| `createdTreatmentPlans` | `TreatmentPlan[]` | no | `@relation("DentistTreatmentPlans")` |
| `patientTreatmentPlans` | `TreatmentPlan[]` | no | `@relation("PatientTreatmentPlans")` |
| `createdStudyAnnotations` | `StudyAnnotation[]` | no | `@relation("StudyAnnotationCreator")` |
| `reviewedStudyAnnotations` | `StudyAnnotation[]` | no | `@relation("StudyAnnotationReviewer")` |
| `createdAnnotationSnapshots` | `AnnotationSnapshot[]` | no | `@relation("AnnotationSnapshotCreator")` |
| `ownedStudyDentistShares` | `StudyDentistShare[]` | no | `@relation("StudyDentistShareOwner")` |
| `receivedStudyDentistShares` | `StudyDentistShare[]` | no | `@relation("StudyDentistShareRecipient")` |
| `createdStudyDentistShares` | `StudyDentistShare[]` | no | `@relation("StudyDentistShareCreator")` |
| `actedRefunds` | `Refund[]` | no | `@relation("RefundActor")` |
| `financialAuditLogs` | `FinancialAuditLog[]` | no | `@relation("FinancialAuditActor")` |
| `ownershipRequestsRequested` | `OwnershipCorrectionRequest[]` | no | `@relation("CorrectionRequester")` |
| `ownershipLogsActed` | `OwnershipCorrectionLog[]` | no | `@relation("CorrectionActor")` |
| `compensationEntries` | `DentistCompensationEntry[]` | no | `@relation("DentistCompensation")` |
| `ownedSettlements` | `PaymentSettlement[]` | no | `@relation("SettlementOwnerDentist")` |

Indexes and table-level constraints:

- `@@index([clinic_id], map: "idx_users_clinic_id")`
- `@@index([lastLoginAt], map: "idx_users_last_login_at")`

### Notifications

#### `notification_devices`

- Prisma model: `NotificationDevice`
- Physical table: `notification_devices`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `user_id` | `userId` | `BigInt` | yes | `-` | `-` | `-` |
| `provider` | `provider` | `String` | yes | `VarChar` | `-` | `-` |
| `platform` | `platform` | `String` | yes | `VarChar` | `-` | `-` |
| `device_token` | `deviceToken` | `String` | yes | `VarChar` | `-` | `-` |
| `metadata` | `metadata` | `Json?` | no | `-` | `@default("{}")` | `-` |
| `is_active` | `isActive` | `Boolean` | yes | `-` | `@default(true)` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `updated_at` | `updatedAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `@updatedAt` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `user` | `User` | no | `@relation(fields: [userId], references: [id], onDelete: Cascade, onUpdate: NoAction)` |

Indexes and table-level constraints:

- `@@unique([deviceToken, provider], map: "uniq_notification_device_token")`
- `@@index([userId, provider], map: "idx_notification_devices_user_provider")`

#### `notification_jobs`

- Prisma model: `NotificationJob`
- Physical table: `notification_jobs`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `user_id` | `userId` | `BigInt?` | no | `-` | `-` | `-` |
| `channel` | `channel` | `String` | yes | `VarChar` | `-` | `-` |
| `event_type` | `eventType` | `String` | yes | `VarChar` | `-` | `-` |
| `payload` | `payload` | `Json?` | no | `-` | `@default("{}")` | `-` |
| `status` | `status` | `String` | yes | `VarChar` | `@default("pending")` | `-` |
| `attempts` | `attempts` | `Int` | yes | `-` | `@default(0)` | `-` |
| `max_attempts` | `maxAttempts` | `Int` | yes | `-` | `@default(5)` | `-` |
| `last_error` | `lastError` | `String?` | no | `-` | `-` | `-` |
| `scheduled_at` | `scheduledAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `next_attempt_at` | `nextAttemptAt` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `updated_at` | `updatedAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `@updatedAt` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `user` | `User` | yes | `@relation(fields: [userId], references: [id], onUpdate: NoAction)` |

Indexes and table-level constraints:

- `@@index([status, nextAttemptAt], map: "idx_notification_jobs_status_next")`

#### `notification_preferences`

- Prisma model: `NotificationPreference`
- Physical table: `notification_preferences`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `user_id` | `userId` | `BigInt` | yes | `-` | `-` | `-` |
| `channel` | `channel` | `String` | yes | `VarChar` | `-` | `-` |
| `event_type` | `eventType` | `String` | yes | `VarChar` | `-` | `-` |
| `enabled` | `enabled` | `Boolean` | yes | `-` | `@default(true)` | `-` |
| `metadata` | `metadata` | `Json?` | no | `-` | `@default("{}")` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `updated_at` | `updatedAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `@updatedAt` |
| `enable_push_notifications` | `enable_push_notifications` | `Boolean?` | no | `-` | `@default(true)` | `-` |
| `enable_email_notifications` | `enable_email_notifications` | `Boolean?` | no | `-` | `@default(true)` | `-` |
| `enable_sms_notifications` | `enable_sms_notifications` | `Boolean?` | no | `-` | `@default(false)` | `-` |
| `notify_appointment_reminders` | `notify_appointment_reminders` | `Boolean?` | no | `-` | `@default(true)` | `-` |
| `notify_appointment_confirmations` | `notify_appointment_confirmations` | `Boolean?` | no | `-` | `@default(true)` | `-` |
| `notify_appointment_cancellations` | `notify_appointment_cancellations` | `Boolean?` | no | `-` | `@default(true)` | `-` |
| `notify_chat_messages` | `notify_chat_messages` | `Boolean?` | no | `-` | `@default(true)` | `-` |
| `notify_payment_updates` | `notify_payment_updates` | `Boolean?` | no | `-` | `@default(true)` | `-` |
| `notify_promotions` | `notify_promotions` | `Boolean?` | no | `-` | `@default(false)` | `-` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `user` | `User` | no | `@relation(fields: [userId], references: [id], onDelete: Cascade, onUpdate: NoAction)` |

Indexes and table-level constraints:

- `@@unique([userId, channel, eventType], map: "uniq_notification_preference")`
- `@@index([userId, channel], map: "idx_notification_preferences_user_channel")`

#### `notifications`

- Prisma model: `Notification`
- Physical table: `notifications`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `user_id` | `user_id` | `BigInt` | yes | `-` | `-` | `-` |
| `type` | `type` | `String` | yes | `VarChar(50)` | `-` | `-` |
| `title` | `title` | `String` | yes | `VarChar(255)` | `-` | `-` |
| `message` | `message` | `String` | yes | `-` | `-` | `-` |
| `data` | `data` | `Json?` | no | `-` | `@default("{}")` | `-` |
| `is_read` | `is_read` | `Boolean` | yes | `-` | `@default(false)` | `-` |
| `read_at` | `read_at` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |
| `created_at` | `created_at` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `user` | `User` | no | `@relation(fields: [user_id], references: [id], onDelete: Cascade, onUpdate: NoAction)` |

Indexes and table-level constraints:

- `@@index([user_id, created_at(sort: Desc)], map: "idx_notifications_user_created")`
- `@@index([user_id, is_read], map: "idx_notifications_user_read")`

### Other

#### `dentist_schedule_entries`

- Prisma model: `DentistScheduleEntry`
- Physical table: `dentist_schedule_entries`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `dentist_id` | `dentistId` | `BigInt` | yes | `-` | `-` | `-` |
| `type` | `type` | `String` | yes | `VarChar(50)` | `-` | `-` |
| `status` | `status` | `String` | yes | `VarChar(50)` | `@default("active")` | `-` |
| `start_at` | `startAt` | `DateTime` | yes | `Timestamptz(6)` | `-` | `-` |
| `end_at` | `endAt` | `DateTime` | yes | `Timestamptz(6)` | `-` | `-` |
| `notes` | `notes` | `String?` | no | `-` | `-` | `-` |
| `patient_name` | `patientName` | `String?` | no | `-` | `-` | `-` |
| `patient_phone` | `patientPhone` | `String?` | no | `-` | `-` | `-` |
| `metadata` | `metadata` | `Json?` | no | `-` | `@default("{}")` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `updated_at` | `updatedAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `@updatedAt` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `dentist` | `User` | no | `@relation(fields: [dentistId], references: [id], onDelete: Cascade)` |

Indexes and table-level constraints:

- `@@index([dentistId, startAt], map: "idx_dentist_schedule_dentist_time")`

### Patient clinical data & treatment planning

#### `ai_analysis_results`

- Prisma model: `AIAnalysisResult`
- Physical table: `ai_analysis_results`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `user_id` | `userId` | `BigInt` | yes | `-` | `-` | `-` |
| `session_id` | `sessionId` | `String` | yes | `VarChar(255)` | `-` | `-` |
| `image_url` | `imageUrl` | `String?` | no | `-` | `-` | `-` |
| `annotated_image_url` | `annotatedImageUrl` | `String?` | no | `-` | `-` | `-` |
| `findings` | `findings` | `String?` | no | `-` | `-` | `-` |
| `summary` | `summary` | `String?` | no | `-` | `-` | `-` |
| `overall_assessment` | `overallAssessment` | `String?` | no | `-` | `-` | `-` |
| `risk_level` | `riskLevel` | `String?` | no | `VarChar(50)` | `-` | `-` |
| `confidence_score` | `confidenceScore` | `Float?` | no | `-` | `-` | `-` |
| `detections` | `detections` | `Json?` | no | `-` | `@default("[]")` | `-` |
| `recommendations` | `recommendations` | `Json?` | no | `-` | `@default("[]")` | `-` |
| `metadata` | `metadata` | `Json?` | no | `-` | `@default("{}")` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `updated_at` | `updatedAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `@updatedAt` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `user` | `User` | no | `@relation(fields: [userId], references: [id], onDelete: Cascade, onUpdate: NoAction)` |
| `chatMessages` | `AIChatMessage[]` | no | `-` |
| `treatmentPlans` | `TreatmentPlan[]` | no | `@relation("TreatmentPlanAIAnalysisResult")` |

Indexes and table-level constraints:

- `@@index([sessionId], map: "idx_ai_analysis_session")`
- `@@index([userId, createdAt(sort: Desc)], map: "idx_ai_analysis_user_created")`

#### `ai_chat_messages`

- Prisma model: `AIChatMessage`
- Physical table: `ai_chat_messages`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `ai_result_id` | `aiResultId` | `BigInt` | yes | `-` | `-` | `-` |
| `user_id` | `userId` | `BigInt` | yes | `-` | `-` | `-` |
| `role` | `role` | `String` | yes | `VarChar(20)` | `-` | `-` |
| `content` | `content` | `String` | yes | `-` | `-` | `-` |
| `metadata` | `metadata` | `Json?` | no | `-` | `@default("{}")` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `aiResult` | `AIAnalysisResult` | no | `@relation(fields: [aiResultId], references: [id], onDelete: Cascade)` |
| `user` | `User` | no | `@relation(fields: [userId], references: [id], onDelete: Cascade)` |

Indexes and table-level constraints:

- `@@index([aiResultId, createdAt], map: "idx_ai_chat_result_time")`

#### `dentist_emr_records`

- Prisma model: `dentist_emr_records`
- Physical table: `dentist_emr_records`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `String` | yes | `VarChar(64)` | `-` | `@id` |
| `dentist_id` | `dentist_id` | `BigInt` | yes | `-` | `-` | `-` |
| `patient_user_id` | `patient_user_id` | `BigInt?` | no | `-` | `-` | `-` |
| `payload` | `payload` | `Json` | yes | `-` | `@default("{}")` | `-` |
| `created_at` | `created_at` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `updated_at` | `updated_at` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `users_dentist_emr_records_dentist_idTousers` | `User` | no | `@relation("dentist_emr_records_dentist_idTousers", fields: [dentist_id], references: [id], onDelete: Cascade, onUpdate: NoAction)` |
| `users_dentist_emr_records_patient_user_idTousers` | `User` | yes | `@relation("dentist_emr_records_patient_user_idTousers", fields: [patient_user_id], references: [id], onUpdate: NoAction)` |
| `treatmentPlans` | `TreatmentPlan[]` | no | `@relation("TreatmentPlanMedicalRecord")` |

Indexes and table-level constraints:

- `@@index([dentist_id, updated_at(sort: Desc)], map: "idx_dentist_emr_records_dentist")`
- `@@index([patient_user_id], map: "idx_dentist_emr_records_patient")`

#### `patient_profiles`

- Prisma model: `PatientProfile`
- Physical table: `patient_profiles`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `user_id` | `userId` | `BigInt` | yes | `-` | `-` | `@unique` |
| `date_of_birth` | `dateOfBirth` | `DateTime?` | no | `Date` | `-` | `-` |
| `gender` | `gender` | `String?` | no | `-` | `-` | `-` |
| `insurance_provider` | `insuranceProvider` | `String?` | no | `-` | `-` | `-` |
| `insurance_number` | `insuranceNumber` | `String?` | no | `-` | `-` | `-` |
| `insurance_member_id` | `insuranceMemberId` | `String?` | no | `-` | `-` | `-` |
| `emergency_contact` | `emergencyContact` | `Json?` | no | `-` | `-` | `-` |
| `address` | `address` | `Json?` | no | `-` | `-` | `-` |
| `medical_details` | `medicalDetails` | `Json?` | no | `-` | `-` | `-` |
| `preferred_language` | `preferredLanguage` | `String` | yes | `-` | `@default("id")` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `updated_at` | `updatedAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `@updatedAt` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `user` | `User` | no | `@relation(fields: [userId], references: [id], onDelete: Cascade, onUpdate: NoAction)` |
| `treatmentPlans` | `TreatmentPlan[]` | no | `@relation("PatientProfileTreatmentPlans")` |

Indexes and table-level constraints:

- `@@index([userId], map: "idx_patient_profiles_user_id")`
- `@@index([insuranceNumber], map: "idx_patient_profiles_insurance_number")`

#### `treatment_items`

- Prisma model: `TreatmentItem`
- Physical table: `treatment_items`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `treatment_plan_id` | `treatmentPlanId` | `BigInt` | yes | `-` | `-` | `-` |
| `name` | `name` | `String` | yes | `VarChar(255)` | `-` | `-` |
| `tooth_number` | `toothNumber` | `String?` | no | `VarChar(16)` | `-` | `-` |
| `area_label` | `areaLabel` | `String?` | no | `VarChar(80)` | `-` | `-` |
| `procedure_code` | `procedureCode` | `String?` | no | `VarChar(64)` | `-` | `-` |
| `procedure_name` | `procedureName` | `String?` | no | `VarChar(255)` | `-` | `-` |
| `category` | `category` | `String?` | no | `VarChar(100)` | `-` | `-` |
| `description` | `description` | `String?` | no | `-` | `-` | `-` |
| `clinical_reason` | `clinicalReason` | `String?` | no | `-` | `-` | `-` |
| `priority` | `priority` | `String?` | no | `VarChar(20)` | `-` | `-` |
| `cost` | `cost` | `Int` | yes | `-` | `@default(0)` | `-` |
| `estimated_cost` | `estimatedCost` | `Int?` | no | `-` | `-` | `-` |
| `actual_cost` | `actualCost` | `Int` | yes | `-` | `@default(0)` | `-` |
| `estimated_duration_minutes` | `estimatedDurationMinutes` | `Int?` | no | `-` | `-` | `-` |
| `phase` | `phase` | `String?` | no | `VarChar(80)` | `-` | `-` |
| `status` | `status` | `String` | yes | `VarChar(30)` | `@default("pending")` | `-` |
| `scheduled_date` | `scheduledDate` | `DateTime?` | no | `Date` | `-` | `-` |
| `completed_date` | `completedDate` | `DateTime?` | no | `Date` | `-` | `-` |
| `notes` | `notes` | `String?` | no | `-` | `-` | `-` |
| `result_notes` | `resultNotes` | `String?` | no | `-` | `-` | `-` |
| `image_url` | `imageUrl` | `String?` | no | `-` | `-` | `-` |
| `sort_order` | `sortOrder` | `Int` | yes | `-` | `@default(0)` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `updated_at` | `updatedAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `@updatedAt` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `treatmentPlan` | `TreatmentPlan` | no | `@relation(fields: [treatmentPlanId], references: [id], onDelete: Cascade, onUpdate: NoAction)` |

Indexes and table-level constraints:

- `@@index([treatmentPlanId], map: "idx_treatment_items_plan")`
- `@@index([status], map: "idx_treatment_items_status")`

#### `treatment_plans`

- Prisma model: `TreatmentPlan`
- Physical table: `treatment_plans`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `patient_id` | `patientId` | `BigInt` | yes | `-` | `-` | `-` |
| `dentist_id` | `dentistId` | `BigInt` | yes | `-` | `-` | `-` |
| `clinic_id` | `clinicId` | `BigInt?` | no | `-` | `-` | `-` |
| `appointment_id` | `appointmentId` | `BigInt?` | no | `-` | `-` | `-` |
| `consultation_session_id` | `consultationSessionId` | `BigInt?` | no | `-` | `-` | `-` |
| `medical_record_id` | `medicalRecordId` | `String?` | no | `VarChar(64)` | `-` | `-` |
| `ai_analysis_result_id` | `aiAnalysisResultId` | `BigInt?` | no | `-` | `-` | `-` |
| `title` | `title` | `String` | yes | `VarChar(255)` | `-` | `-` |
| `description` | `description` | `String?` | no | `-` | `-` | `-` |
| `diagnosis_summary` | `diagnosisSummary` | `String?` | no | `-` | `-` | `-` |
| `clinical_notes` | `clinicalNotes` | `String?` | no | `-` | `-` | `-` |
| `patient_friendly_summary` | `patientFriendlySummary` | `String?` | no | `-` | `-` | `-` |
| `priority` | `priority` | `String` | yes | `VarChar(20)` | `@default("medium")` | `-` |
| `status` | `status` | `String` | yes | `VarChar(30)` | `@default("pending")` | `-` |
| `progress` | `progress` | `Int` | yes | `-` | `@default(0)` | `-` |
| `estimated_cost` | `estimatedCost` | `Int` | yes | `-` | `@default(0)` | `-` |
| `actual_cost` | `actualCost` | `Int` | yes | `-` | `@default(0)` | `-` |
| `currency` | `currency` | `String` | yes | `VarChar(8)` | `@default("IDR")` | `-` |
| `target_completion` | `targetCompletion` | `DateTime?` | no | `Date` | `-` | `-` |
| `valid_until` | `validUntil` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |
| `sent_at` | `sentAt` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |
| `approved_at` | `approvedAt` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |
| `completed_at` | `completedAt` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |
| `notes` | `notes` | `String?` | no | `-` | `-` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `updated_at` | `updatedAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `@updatedAt` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `patient` | `User` | no | `@relation("PatientTreatmentPlans", fields: [patientId], references: [id], onDelete: Cascade, onUpdate: NoAction)` |
| `dentist` | `User` | no | `@relation("DentistTreatmentPlans", fields: [dentistId], references: [id], onDelete: Cascade, onUpdate: NoAction)` |
| `clinic` | `ClinicProfile` | yes | `@relation("ClinicTreatmentPlans", fields: [clinicId], references: [id], onDelete: SetNull, onUpdate: NoAction)` |
| `appointment` | `Appointment` | yes | `@relation("AppointmentTreatmentPlans", fields: [appointmentId], references: [id], onDelete: SetNull, onUpdate: NoAction)` |
| `consultationSession` | `VideoSession` | yes | `@relation("TreatmentPlanConsultationSession", fields: [consultationSessionId], references: [id], onDelete: SetNull, onUpdate: NoAction)` |
| `medicalRecord` | `dentist_emr_records` | yes | `@relation("TreatmentPlanMedicalRecord", fields: [medicalRecordId], references: [id], onDelete: SetNull, onUpdate: NoAction)` |
| `aiAnalysisResult` | `AIAnalysisResult` | yes | `@relation("TreatmentPlanAIAnalysisResult", fields: [aiAnalysisResultId], references: [id], onDelete: SetNull, onUpdate: NoAction)` |
| `patientProfile` | `PatientProfile` | yes | `@relation("PatientProfileTreatmentPlans", fields: [patientId], references: [userId], map: "treatment_plans_patient_profile_fkey")` |
| `items` | `TreatmentItem[]` | no | `-` |
| `invoices` | `Invoice[]` | no | `@relation("TreatmentPlanInvoices")` |

Indexes and table-level constraints:

- `@@index([patientId, createdAt(sort: Desc)], map: "idx_treatment_plans_patient")`
- `@@index([dentistId], map: "idx_treatment_plans_dentist")`
- `@@index([clinicId, createdAt(sort: Desc)], map: "idx_treatment_plans_clinic")`
- `@@index([appointmentId], map: "idx_treatment_plans_appointment")`
- `@@index([status], map: "idx_treatment_plans_status")`

### Payments, invoices, ledger, settlement

#### `accounting_periods`

- Prisma model: `AccountingPeriod`
- Physical table: `accounting_periods`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `period_key` | `periodKey` | `String` | yes | `VarChar(7)` | `-` | `@unique, //, YYYY-MM` |
| `is_locked` | `isLocked` | `Boolean` | yes | `-` | `@default(false)` | `-` |
| `locked_at` | `lockedAt` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |
| `locked_by` | `lockedBy` | `BigInt?` | no | `-` | `-` | `-` |

#### `available_balances`

- Prisma model: `AvailableBalance`
- Physical table: `available_balances`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `owner_type` | `ownerType` | `String` | yes | `VarChar(24)` | `-` | `//, clinic,, dentist` |
| `owner_clinic_id` | `ownerClinicId` | `BigInt?` | no | `-` | `-` | `@unique` |
| `owner_dentist_id` | `ownerDentistId` | `BigInt?` | no | `-` | `-` | `@unique` |
| `available_amount` | `availableAmount` | `Int` | yes | `-` | `@default(0)` | `-` |
| `pending_amount` | `pendingAmount` | `Int` | yes | `-` | `@default(0)` | `-` |
| `currency` | `currency` | `String` | yes | `VarChar(8)` | `@default("IDR")` | `-` |
| `updated_at` | `updatedAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `@updatedAt` |

Indexes and table-level constraints:

- `@@index([ownerType, ownerClinicId], map: "idx_balances_clinic")`
- `@@index([ownerType, ownerDentistId], map: "idx_balances_dentist")`

#### `dentist_compensation_entries`

- Prisma model: `DentistCompensationEntry`
- Physical table: `dentist_compensation_entries`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `appointment_id` | `appointmentId` | `BigInt?` | no | `-` | `-` | `-` |
| `payment_intent_id` | `paymentIntentId` | `BigInt?` | no | `-` | `-` | `-` |
| `dentist_id` | `dentistId` | `BigInt` | yes | `-` | `-` | `-` |
| `clinic_id` | `clinicId` | `BigInt` | yes | `-` | `-` | `-` |
| `entry_type` | `entryType` | `String` | yes | `VarChar(32)` | `-` | `//, ACCRUAL,, COMMISSION,, ADJUSTMENT,, PAYOUT` |
| `amount` | `amount` | `Int` | yes | `-` | `-` | `-` |
| `status` | `status` | `String` | yes | `VarChar(32)` | `@default("accrued")` | `//, accrued,, approved,, paid,, cancelled` |
| `metadata` | `metadata` | `Json?` | no | `-` | `@default("{}")` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `updated_at` | `updatedAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `@updatedAt` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `appointment` | `Appointment` | yes | `@relation(fields: [appointmentId], references: [id], onDelete: SetNull)` |
| `paymentIntent` | `PaymentIntent` | yes | `@relation(fields: [paymentIntentId], references: [id], onDelete: SetNull)` |
| `dentist` | `User` | no | `@relation("DentistCompensation", fields: [dentistId], references: [id], onDelete: Cascade)` |
| `clinic` | `ClinicProfile` | no | `@relation("ClinicCompensation", fields: [clinicId], references: [id], onDelete: Cascade)` |

Indexes and table-level constraints:

- `@@index([dentistId, status], map: "idx_compensation_dentist_status")`
- `@@index([clinicId, status], map: "idx_compensation_clinic_status")`

#### `financial_audit_logs`

- Prisma model: `FinancialAuditLog`
- Physical table: `financial_audit_logs`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `actor_id` | `actorId` | `BigInt?` | no | `-` | `-` | `-` |
| `actor_role` | `actorRole` | `String?` | no | `VarChar(32)` | `-` | `-` |
| `entity_type` | `entityType` | `String` | yes | `VarChar(64)` | `-` | `-` |
| `entity_id` | `entityId` | `String` | yes | `VarChar(64)` | `-` | `-` |
| `action` | `action` | `String` | yes | `VarChar(64)` | `-` | `-` |
| `metadata` | `metadata` | `Json?` | no | `-` | `@default("{}")` | `-` |
| `ip_address` | `ipAddress` | `String?` | no | `VarChar(45)` | `-` | `-` |
| `timestamp` | `timestamp` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `actor` | `User` | yes | `@relation("FinancialAuditActor", fields: [actorId], references: [id], onDelete: SetNull)` |

#### `financial_ledger_entries`

- Prisma model: `FinancialLedgerEntry`
- Physical table: `financial_ledger_entries`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `payment_intent_id` | `paymentIntentId` | `BigInt?` | no | `-` | `-` | `-` |
| `appointment_id` | `appointmentId` | `BigInt?` | no | `-` | `-` | `-` |
| `owner_type` | `ownerType` | `String` | yes | `VarChar(24)` | `-` | `-` |
| `owner_clinic_id` | `ownerClinicId` | `BigInt?` | no | `-` | `-` | `-` |
| `owner_dentist_id` | `ownerDentistId` | `BigInt?` | no | `-` | `-` | `-` |
| `entry_type` | `entryType` | `String` | yes | `VarChar(32)` | `-` | `-` |
| `status` | `status` | `String` | yes | `VarChar(32)` | `-` | `-` |
| `direction` | `direction` | `String` | yes | `VarChar(16)` | `-` | `-` |
| `amount` | `amount` | `Int` | yes | `-` | `-` | `-` |
| `currency` | `currency` | `String` | yes | `VarChar(8)` | `@default("IDR")` | `-` |
| `source` | `source` | `String?` | no | `VarChar(32)` | `-` | `-` |
| `metadata` | `metadata` | `Json?` | no | `-` | `@default("{}")` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `paymentIntent` | `PaymentIntent` | yes | `@relation(fields: [paymentIntentId], references: [id], onDelete: SetNull, onUpdate: NoAction)` |
| `appointment` | `Appointment` | yes | `@relation(fields: [appointmentId], references: [id], onDelete: SetNull, onUpdate: NoAction)` |
| `ownerClinic` | `ClinicProfile` | yes | `@relation("FinancialLedgerClinic", fields: [ownerClinicId], references: [id], onUpdate: NoAction)` |
| `ownerDentist` | `User` | yes | `@relation("FinancialLedgerDentist", fields: [ownerDentistId], references: [id], onUpdate: NoAction)` |

Indexes and table-level constraints:

- `@@index([ownerType, ownerClinicId, createdAt(sort: Desc)], map: "idx_financial_ledger_clinic")`
- `@@index([ownerType, ownerDentistId, createdAt(sort: Desc)], map: "idx_financial_ledger_dentist")`
- `@@index([paymentIntentId, createdAt(sort: Desc)], map: "idx_financial_ledger_intent")`

#### `invoice_items`

- Prisma model: `InvoiceLineItem`
- Physical table: `invoice_items`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `invoice_id` | `invoiceId` | `BigInt` | yes | `-` | `-` | `-` |
| `description` | `description` | `String` | yes | `-` | `-` | `-` |
| `quantity` | `quantity` | `Int` | yes | `-` | `@default(1)` | `-` |
| `unit_price` | `unitPrice` | `Int` | yes | `-` | `-` | `-` |
| `total` | `total` | `Int` | yes | `-` | `-` | `-` |
| `metadata` | `metadata` | `Json?` | no | `-` | `@default("{}")` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `invoice` | `Invoice` | no | `@relation(fields: [invoiceId], references: [id], onDelete: Cascade, onUpdate: NoAction)` |

Indexes and table-level constraints:

- `@@index([invoiceId], map: "idx_invoice_items_invoice")`

#### `invoices`

- Prisma model: `Invoice`
- Physical table: `invoices`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `appointment_id` | `appointmentId` | `BigInt?` | no | `-` | `-` | `-` |
| `payment_intent_id` | `paymentIntentId` | `BigInt?` | no | `-` | `-` | `-` |
| `treatment_plan_id` | `treatmentPlanId` | `BigInt?` | no | `-` | `-` | `-` |
| `patient_id` | `patientId` | `BigInt` | yes | `-` | `-` | `-` |
| `owner_type` | `ownerType` | `String` | yes | `VarChar(24)` | `-` | `-` |
| `owner_clinic_id` | `ownerClinicId` | `BigInt?` | no | `-` | `-` | `-` |
| `owner_dentist_id` | `ownerDentistId` | `BigInt?` | no | `-` | `-` | `-` |
| `reference` | `reference` | `String?` | no | `VarChar(64)` | `-` | `@unique(map: "uniq_invoices_reference")` |
| `status` | `status` | `String` | yes | `VarChar(24)` | `@default("issued")` | `-` |
| `subtotal` | `subtotal` | `Int` | yes | `-` | `-` | `-` |
| `tax` | `tax` | `Int` | yes | `-` | `@default(0)` | `-` |
| `discount` | `discount` | `Int` | yes | `-` | `@default(0)` | `-` |
| `total` | `total` | `Int` | yes | `-` | `-` | `-` |
| `platform_fee` | `platformFee` | `Int` | yes | `-` | `@default(0)` | `-` |
| `clinic_share` | `clinicShare` | `Int` | yes | `-` | `@default(0)` | `-` |
| `dentist_share` | `dentistShare` | `Int` | yes | `-` | `@default(0)` | `-` |
| `grand_total` | `grandTotal` | `Int` | yes | `-` | `@default(0)` | `-` |
| `currency` | `currency` | `String` | yes | `VarChar(8)` | `@default("IDR")` | `-` |
| `issued_at` | `issuedAt` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |
| `due_at` | `dueAt` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |
| `approved_at` | `approvedAt` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |
| `paid_at` | `paidAt` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |
| `issuer_type` | `issuerType` | `String?` | no | `VarChar(24)` | `-` | `-` |
| `issuer_name` | `issuerName` | `String?` | no | `VarChar(120)` | `-` | `-` |
| `issuer_email` | `issuerEmail` | `String?` | no | `VarChar(120)` | `-` | `-` |
| `issuer_phone` | `issuerPhone` | `String?` | no | `VarChar(32)` | `-` | `-` |
| `issuer_address` | `issuerAddress` | `String?` | no | `VarChar(255)` | `-` | `-` |
| `issuer_tax_id` | `issuerTaxId` | `String?` | no | `VarChar(64)` | `-` | `-` |
| `issuer_snapshot` | `issuerSnapshot` | `Json?` | no | `-` | `@default("{}")` | `-` |
| `metadata` | `metadata` | `Json?` | no | `-` | `@default("{}")` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `updated_at` | `updatedAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `@updatedAt` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `appointment` | `Appointment` | yes | `@relation("AppointmentInvoices", fields: [appointmentId], references: [id], onDelete: SetNull, onUpdate: NoAction)` |
| `paymentIntent` | `PaymentIntent` | yes | `@relation("PaymentIntentInvoices", fields: [paymentIntentId], references: [id], onDelete: SetNull, onUpdate: NoAction)` |
| `treatmentPlan` | `TreatmentPlan` | yes | `@relation("TreatmentPlanInvoices", fields: [treatmentPlanId], references: [id], onDelete: SetNull, onUpdate: NoAction)` |
| `patient` | `User` | no | `@relation(fields: [patientId], references: [id], onDelete: Cascade, onUpdate: NoAction)` |
| `ownerClinic` | `ClinicProfile` | yes | `@relation("InvoiceOwnerClinic", fields: [ownerClinicId], references: [id], onUpdate: NoAction)` |
| `ownerDentist` | `User` | yes | `@relation("InvoiceOwnerDentist", fields: [ownerDentistId], references: [id], onUpdate: NoAction)` |
| `items` | `InvoiceLineItem[]` | no | `-` |
| `paymentSnapshot` | `PaymentSnapshot` | yes | `-` |

Indexes and table-level constraints:

- `@@index([ownerType, ownerClinicId, createdAt(sort: Desc)], map: "idx_invoices_owner_clinic")`
- `@@index([ownerType, ownerDentistId, createdAt(sort: Desc)], map: "idx_invoices_owner_dentist")`
- `@@index([patientId, createdAt(sort: Desc)], map: "idx_invoices_patient")`
- `@@index([treatmentPlanId], map: "idx_invoices_treatment_plan")`

#### `ownership_correction_logs`

- Prisma model: `OwnershipCorrectionLog`
- Physical table: `ownership_correction_logs`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `payment_intent_id` | `paymentIntentId` | `BigInt` | yes | `-` | `-` | `-` |
| `request_id` | `requestId` | `BigInt?` | no | `-` | `-` | `-` |
| `corrected_by` | `correctedBy` | `BigInt` | yes | `-` | `-` | `-` |
| `old_owner_type` | `oldOwnerType` | `String` | yes | `VarChar(24)` | `-` | `-` |
| `old_owner_clinic_id` | `oldOwnerClinicId` | `BigInt?` | no | `-` | `-` | `-` |
| `old_owner_dentist_id` | `oldOwnerDentistId` | `BigInt?` | no | `-` | `-` | `-` |
| `new_owner_type` | `newOwnerType` | `String` | yes | `VarChar(24)` | `-` | `-` |
| `new_owner_clinic_id` | `newOwnerClinicId` | `BigInt?` | no | `-` | `-` | `-` |
| `new_owner_dentist_id` | `newOwnerDentistId` | `BigInt?` | no | `-` | `-` | `-` |
| `reason` | `reason` | `String` | yes | `VarChar(255)` | `-` | `-` |
| `timestamp` | `timestamp` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `paymentIntent` | `PaymentIntent` | no | `@relation(fields: [paymentIntentId], references: [id], onDelete: Cascade)` |
| `request` | `OwnershipCorrectionRequest` | yes | `@relation(fields: [requestId], references: [id], onDelete: SetNull)` |
| `actor` | `User` | no | `@relation("CorrectionActor", fields: [correctedBy], references: [id])` |

#### `ownership_correction_requests`

- Prisma model: `OwnershipCorrectionRequest`
- Physical table: `ownership_correction_requests`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `payment_intent_id` | `paymentIntentId` | `BigInt` | yes | `-` | `-` | `-` |
| `requested_by` | `requestedBy` | `BigInt` | yes | `-` | `-` | `-` |
| `status` | `status` | `String` | yes | `VarChar(24)` | `@default("pending")` | `//, pending,, approved,, rejected` |
| `old_owner_type` | `oldOwnerType` | `String` | yes | `VarChar(24)` | `-` | `-` |
| `old_owner_clinic_id` | `oldOwnerClinicId` | `BigInt?` | no | `-` | `-` | `-` |
| `old_owner_dentist_id` | `oldOwnerDentistId` | `BigInt?` | no | `-` | `-` | `-` |
| `new_owner_type` | `newOwnerType` | `String` | yes | `VarChar(24)` | `-` | `-` |
| `new_owner_clinic_id` | `newOwnerClinicId` | `BigInt?` | no | `-` | `-` | `-` |
| `new_owner_dentist_id` | `newOwnerDentistId` | `BigInt?` | no | `-` | `-` | `-` |
| `reason` | `reason` | `String` | yes | `VarChar(255)` | `-` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `updated_at` | `updatedAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `@updatedAt` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `paymentIntent` | `PaymentIntent` | no | `@relation(fields: [paymentIntentId], references: [id], onDelete: Cascade)` |
| `requester` | `User` | no | `@relation("CorrectionRequester", fields: [requestedBy], references: [id])` |
| `logs` | `OwnershipCorrectionLog[]` | no | `-` |

#### `payment_intents`

- Prisma model: `PaymentIntent`
- Physical table: `payment_intents`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `appointment_id` | `appointmentId` | `BigInt` | yes | `-` | `-` | `-` |
| `active_appointment_id` | `activeAppointmentId` | `BigInt?` | no | `-` | `-` | `-` |
| `patient_id` | `patientId` | `BigInt` | yes | `-` | `-` | `-` |
| `owner_type` | `ownerType` | `String` | yes | `VarChar(24)` | `@default("dentist")` | `-` |
| `owner_clinic_id` | `ownerClinicId` | `BigInt?` | no | `-` | `-` | `-` |
| `owner_dentist_id` | `ownerDentistId` | `BigInt?` | no | `-` | `-` | `-` |
| `amount` | `amount` | `Int` | yes | `-` | `-` | `-` |
| `currency` | `currency` | `String` | yes | `VarChar` | `@default("IDR")` | `-` |
| `status` | `status` | `String` | yes | `VarChar` | `@default("pending")` | `-` |
| `provider` | `provider` | `String?` | no | `VarChar` | `-` | `-` |
| `idempotency_key` | `idempotencyKey` | `String?` | no | `VarChar(180)` | `-` | `@unique(map: "uniq_payment_intents_idempotency_key")` |
| `provider_order_id` | `providerOrderId` | `String?` | no | `VarChar(191)` | `-` | `@unique(map: "uniq_payment_intents_provider_order_id")` |
| `provider_payment_id` | `providerPaymentId` | `String?` | no | `VarChar` | `-` | `@unique(map: "uniq_payment_intents_provider_payment_id")` |
| `metadata` | `metadata` | `Json?` | no | `-` | `@default("{}")` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `updated_at` | `updatedAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `@updatedAt` |
| `redirect_url` | `redirectUrl` | `String?` | no | `-` | `-` | `-` |
| `expires_at` | `expiresAt` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |
| `provider_response` | `providerResponse` | `Json?` | no | `-` | `@default("{}")` | `-` |
| `reconciliation_status` | `reconciliationStatus` | `String` | yes | `VarChar(32)` | `@default("pending")` | `-` |
| `reconciliation_attempts` | `reconciliationAttempts` | `Int` | yes | `-` | `@default(0)` | `-` |
| `reconciliation_error` | `reconciliationError` | `String?` | no | `VarChar(255)` | `-` | `-` |
| `last_reconciled_at` | `lastReconciledAt` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |
| `callback_verified_at` | `callbackVerifiedAt` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `appointment` | `Appointment` | no | `@relation("AppointmentPaymentIntents", fields: [appointmentId], references: [id], onDelete: Cascade, onUpdate: NoAction)` |
| `patient` | `User` | no | `@relation(fields: [patientId], references: [id], onDelete: Cascade, onUpdate: NoAction)` |
| `ownerClinic` | `ClinicProfile` | yes | `@relation("PaymentIntentOwnerClinic", fields: [ownerClinicId], references: [id], onUpdate: NoAction)` |
| `ownerDentist` | `User` | yes | `@relation("PaymentIntentOwnerDentist", fields: [ownerDentistId], references: [id], onUpdate: NoAction)` |
| `ledgerEntries` | `PaymentLedger[]` | no | `-` |
| `financialEntries` | `FinancialLedgerEntry[]` | no | `-` |
| `invoices` | `Invoice[]` | no | `@relation("PaymentIntentInvoices")` |
| `paymentSnapshot` | `PaymentSnapshot` | yes | `-` |
| `refunds` | `Refund[]` | no | `-` |
| `ownershipRequests` | `OwnershipCorrectionRequest[]` | no | `-` |
| `ownershipLogs` | `OwnershipCorrectionLog[]` | no | `-` |
| `settlements` | `PaymentSettlement[]` | no | `-` |
| `compensationEntries` | `DentistCompensationEntry[]` | no | `-` |

Indexes and table-level constraints:

- `@@unique([activeAppointmentId], map: "uniq_payment_intents_active_appointment")`
- `@@index([appointmentId], map: "idx_payment_intents_appointment")`
- `@@index([patientId, createdAt(sort: Desc)], map: "idx_payment_intents_patient")`
- `@@index([status], map: "idx_payment_intents_status")`
- `@@index([ownerType, ownerClinicId], map: "idx_payment_intents_owner_clinic")`
- `@@index([ownerType, ownerDentistId], map: "idx_payment_intents_owner_dentist")`
- `@@index([providerOrderId], map: "idx_payment_intents_provider_order_id")`
- `@@index([providerPaymentId], map: "idx_payment_intents_provider_payment_id")`
- `@@index([reconciliationStatus, updatedAt(sort: Desc)], map: "idx_payment_intents_reconciliation")`

#### `payment_ledgers`

- Prisma model: `PaymentLedger`
- Physical table: `payment_ledgers`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `payment_intent_id` | `paymentIntentId` | `BigInt` | yes | `-` | `-` | `-` |
| `entry_type` | `entryType` | `String` | yes | `VarChar` | `-` | `-` |
| `status` | `status` | `String` | yes | `VarChar` | `-` | `-` |
| `amount` | `amount` | `Int` | yes | `-` | `-` | `-` |
| `metadata` | `metadata` | `Json?` | no | `-` | `@default("{}")` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `paymentIntent` | `PaymentIntent` | no | `@relation(fields: [paymentIntentId], references: [id], onDelete: Cascade, onUpdate: NoAction)` |

Indexes and table-level constraints:

- `@@index([paymentIntentId, status], map: "idx_payment_ledgers_intent_status")`
- `@@index([createdAt(sort: Desc)], map: "idx_payment_ledgers_created_at")`

#### `payment_settlements`

- Prisma model: `PaymentSettlement`
- Physical table: `payment_settlements`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `payment_intent_id` | `paymentIntentId` | `BigInt` | yes | `-` | `-` | `-` |
| `owner_type` | `ownerType` | `String` | yes | `VarChar(24)` | `-` | `-` |
| `owner_clinic_id` | `ownerClinicId` | `BigInt?` | no | `-` | `-` | `-` |
| `owner_dentist_id` | `ownerDentistId` | `BigInt?` | no | `-` | `-` | `-` |
| `gross_amount` | `grossAmount` | `Int` | yes | `-` | `-` | `-` |
| `platform_fee` | `platformFee` | `Int` | yes | `-` | `-` | `-` |
| `clinic_share` | `clinicShare` | `Int` | yes | `-` | `@default(0)` | `-` |
| `dentist_share` | `dentistShare` | `Int` | yes | `-` | `@default(0)` | `-` |
| `net_amount` | `netAmount` | `Int` | yes | `-` | `-` | `-` |
| `currency` | `currency` | `String` | yes | `VarChar(8)` | `@default("IDR")` | `-` |
| `settlement_status` | `settlementStatus` | `String` | yes | `VarChar(32)` | `-` | `//, pending,, processing,, settled,, failed,, refunded,, partially_refunded,, chargeback` |
| `provider_reference` | `providerReference` | `String?` | no | `VarChar(191)` | `-` | `-` |
| `settled_at` | `settledAt` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |
| `payout_status` | `payoutStatus` | `String` | yes | `VarChar(32)` | `@default("unpaid")` | `//, unpaid,, processing,, paid` |
| `payout_at` | `payoutAt` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |
| `settlement_reference` | `settlementReference` | `String?` | no | `VarChar(191)` | `-` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `updated_at` | `updatedAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `@updatedAt` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `paymentIntent` | `PaymentIntent` | no | `@relation(fields: [paymentIntentId], references: [id], onDelete: Cascade)` |
| `ownerClinic` | `ClinicProfile` | yes | `@relation("SettlementOwnerClinic", fields: [ownerClinicId], references: [id], onUpdate: NoAction)` |
| `ownerDentist` | `User` | yes | `@relation("SettlementOwnerDentist", fields: [ownerDentistId], references: [id], onUpdate: NoAction)` |

Indexes and table-level constraints:

- `@@index([ownerType, ownerClinicId], map: "idx_settlements_clinic")`
- `@@index([ownerType, ownerDentistId], map: "idx_settlements_dentist")`

#### `payment_snapshots`

- Prisma model: `PaymentSnapshot`
- Physical table: `payment_snapshots`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `payment_intent_id` | `paymentIntentId` | `BigInt` | yes | `-` | `-` | `@unique` |
| `invoice_id` | `invoiceId` | `BigInt?` | no | `-` | `-` | `@unique` |
| `consultation_fee` | `consultationFee` | `Int` | yes | `-` | `-` | `-` |
| `subtotal` | `subtotal` | `Int` | yes | `-` | `-` | `-` |
| `tax` | `tax` | `Int` | yes | `-` | `-` | `-` |
| `discount` | `discount` | `Int` | yes | `-` | `-` | `-` |
| `platform_fee` | `platformFee` | `Int` | yes | `-` | `-` | `-` |
| `clinic_share` | `clinicShare` | `Int` | yes | `-` | `-` | `-` |
| `dentist_share` | `dentistShare` | `Int` | yes | `-` | `-` | `-` |
| `final_paid_amount` | `finalPaidAmount` | `Int` | yes | `-` | `-` | `-` |
| `payment_method` | `paymentMethod` | `String` | yes | `VarChar(50)` | `-` | `-` |
| `settlement_timestamp` | `settlementTimestamp` | `DateTime` | yes | `Timestamptz(6)` | `-` | `-` |
| `currency` | `currency` | `String` | yes | `VarChar(8)` | `@default("IDR")` | `-` |
| `pricing_version` | `pricingVersion` | `String` | yes | `VarChar(24)` | `-` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `paymentIntent` | `PaymentIntent` | no | `@relation(fields: [paymentIntentId], references: [id], onDelete: Cascade)` |
| `invoice` | `Invoice` | yes | `@relation(fields: [invoiceId], references: [id], onDelete: SetNull)` |

#### `payout_batches`

- Prisma model: `PayoutBatch`
- Physical table: `payout_batches`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `status` | `status` | `String` | yes | `VarChar(24)` | `-` | `//, DRAFT,, INITIATED,, PROCESSING,, COMPLETED,, FAILED,, CANCELLED` |
| `total_amount` | `totalAmount` | `Int` | yes | `-` | `-` | `-` |
| `provider_reference` | `providerReference` | `String?` | no | `VarChar(120)` | `-` | `-` |
| `initiated_at` | `initiatedAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `completed_at` | `completedAt` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `updated_at` | `updatedAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `@updatedAt` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `items` | `PayoutItem[]` | no | `-` |

#### `payout_items`

- Prisma model: `PayoutItem`
- Physical table: `payout_items`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `batch_id` | `batchId` | `BigInt` | yes | `-` | `-` | `-` |
| `recipient_type` | `recipientType` | `String` | yes | `VarChar(24)` | `-` | `//, clinic,, dentist` |
| `recipient_clinic_id` | `recipientClinicId` | `BigInt?` | no | `-` | `-` | `-` |
| `recipient_dentist_id` | `recipientDentistId` | `BigInt?` | no | `-` | `-` | `-` |
| `amount` | `amount` | `Int` | yes | `-` | `-` | `-` |
| `status` | `status` | `String` | yes | `VarChar(24)` | `-` | `//, PENDING,, SUCCESS,, FAILED,, REVERSED` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `updated_at` | `updatedAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `@updatedAt` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `batch` | `PayoutBatch` | no | `@relation(fields: [batchId], references: [id], onDelete: Cascade)` |

#### `refunds`

- Prisma model: `Refund`
- Physical table: `refunds`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `payment_intent_id` | `paymentIntentId` | `BigInt` | yes | `-` | `-` | `-` |
| `refund_amount` | `refundAmount` | `Int` | yes | `-` | `-` | `-` |
| `refund_reason` | `refundReason` | `String` | yes | `-` | `-` | `-` |
| `refund_status` | `refundStatus` | `String` | yes | `VarChar(32)` | `-` | `//, pending,, approved,, rejected,, refunded` |
| `refund_requested_at` | `refundRequestedAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `refunded_at` | `refundedAt` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |
| `refund_actor_id` | `refundActorId` | `BigInt?` | no | `-` | `-` | `-` |
| `provider_refund_reference` | `providerRefundReference` | `String?` | no | `VarChar(191)` | `-` | `-` |
| `internal_notes` | `internalNotes` | `String?` | no | `-` | `-` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `updated_at` | `updatedAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `@updatedAt` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `paymentIntent` | `PaymentIntent` | no | `@relation(fields: [paymentIntentId], references: [id], onDelete: Cascade)` |
| `refundActor` | `User` | yes | `@relation("RefundActor", fields: [refundActorId], references: [id], onDelete: SetNull)` |

#### `webhook_processing_logs`

- Prisma model: `WebhookProcessingLog`
- Physical table: `webhook_processing_logs`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `provider` | `provider` | `String` | yes | `VarChar(32)` | `-` | `-` |
| `event_id` | `eventId` | `String` | yes | `VarChar(191)` | `-` | `-` |
| `payload_hash` | `payloadHash` | `String` | yes | `VarChar(128)` | `-` | `@unique` |
| `received_at` | `receivedAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |

Indexes and table-level constraints:

- `@@unique([provider, eventId], map: "uniq_webhook_provider_event")`

### X-Core imaging & annotations

#### `ai_results`

- Prisma model: `AIResult`
- Physical table: `ai_results`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `series_id` | `seriesId` | `BigInt` | yes | `-` | `-` | `-` |
| `model_name` | `modelName` | `String` | yes | `-` | `-` | `-` |
| `analyzed_at` | `analyzedAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `findings` | `findings` | `Json` | yes | `-` | `@default("[]")` | `-` |
| `status` | `status` | `String` | yes | `-` | `@default("completed")` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `series` | `ImagingSeries` | no | `@relation(fields: [seriesId], references: [id], onDelete: Cascade)` |

Indexes and table-level constraints:

- `@@index([seriesId], map: "idx_ai_results_series")`

#### `annotation_snapshots`

- Prisma model: `AnnotationSnapshot`
- Physical table: `annotation_snapshots`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `String` | yes | `-` | `@default(cuid())` | `@id` |
| `study_id` | `studyId` | `BigInt` | yes | `-` | `-` | `-` |
| `series_uid` | `seriesUid` | `String` | yes | `-` | `-` | `-` |
| `snapshot_at` | `snapshotAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `created_by` | `createdBy` | `BigInt` | yes | `-` | `-` | `-` |
| `note` | `note` | `String?` | no | `-` | `-` | `-` |
| `annotations` | `annotations` | `Json` | yes | `-` | `-` | `-` |
| `feature_state` | `featureState` | `Json` | yes | `-` | `@default("{}")` | `-` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `study` | `ImagingStudy` | no | `@relation(fields: [studyId], references: [id], onDelete: Cascade)` |
| `creator` | `User` | no | `@relation("AnnotationSnapshotCreator", fields: [createdBy], references: [id], onDelete: Cascade)` |

Indexes and table-level constraints:

- `@@index([studyId, seriesUid, snapshotAt], map: "idx_annotation_snapshots_scope")`
- `@@index([createdBy], map: "idx_annotation_snapshots_created_by")`

#### `imaging_series`

- Prisma model: `ImagingSeries`
- Physical table: `imaging_series`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `study_id` | `studyId` | `BigInt` | yes | `-` | `-` | `-` |
| `series_number` | `seriesNumber` | `Int?` | no | `-` | `-` | `-` |
| `modality` | `modality` | `String` | yes | `VarChar(50)` | `-` | `-` |
| `description` | `description` | `String?` | no | `-` | `-` | `-` |
| `body_part` | `bodyPart` | `String?` | no | `-` | `-` | `-` |
| `slice_thickness` | `sliceThickness` | `Float?` | no | `-` | `-` | `-` |
| `pixel_spacing` | `pixelSpacing` | `Json?` | no | `-` | `-` | `-` |
| `kv` | `kv` | `Float?` | no | `-` | `-` | `-` |
| `ma` | `ma` | `Float?` | no | `-` | `-` | `-` |
| `exposure_time` | `exposureTime` | `Float?` | no | `-` | `-` | `-` |
| `num_slices` | `numSlices` | `Int` | yes | `-` | `@default(0)` | `-` |
| `folder_path` | `folderPath` | `String` | yes | `-` | `-` | `-` |
| `preview_image_url` | `previewImageUrl` | `String?` | no | `-` | `-` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `aiResults` | `AIResult[]` | no | `-` |
| `study` | `ImagingStudy` | no | `@relation(fields: [studyId], references: [id], onDelete: Cascade)` |

Indexes and table-level constraints:

- `@@index([studyId], map: "idx_imaging_series_study")`

#### `imaging_studies`

- Prisma model: `ImagingStudy`
- Physical table: `imaging_studies`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `patient_id` | `patientId` | `BigInt` | yes | `-` | `-` | `-` |
| `dentist_id` | `dentistId` | `BigInt?` | no | `-` | `-` | `-` |
| `clinic_id` | `clinicId` | `BigInt?` | no | `-` | `-` | `-` |
| `study_date` | `studyDate` | `DateTime` | yes | `Date` | `-` | `-` |
| `description` | `description` | `String?` | no | `-` | `-` | `-` |
| `modality` | `modality` | `String` | yes | `VarChar(50)` | `-` | `-` |
| `folder_name` | `folderName` | `String` | yes | `-` | `-` | `-` |
| `status` | `status` | `String` | yes | `-` | `@default("uploading")` | `-` |
| `metadata` | `metadata` | `Json?` | no | `-` | `@default("{}")` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `updated_at` | `updatedAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `@updatedAt` |
| `size_in_bytes` | `sizeInBytes` | `BigInt` | yes | `-` | `@default(0)` | `-` |
| `original_name` | `originalName` | `String?` | no | `-` | `-` | `-` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `series` | `ImagingSeries[]` | no | `-` |
| `shares` | `StudyShare[]` | no | `-` |
| `dentistShares` | `StudyDentistShare[]` | no | `-` |
| `annotations` | `StudyAnnotation[]` | no | `-` |
| `annotationSnapshots` | `AnnotationSnapshot[]` | no | `-` |
| `dentist` | `User` | yes | `@relation("DentistStudies", fields: [dentistId], references: [id])` |
| `patient` | `User` | no | `@relation("PatientStudies", fields: [patientId], references: [id], onDelete: Cascade)` |

Indexes and table-level constraints:

- `@@index([patientId], map: "idx_imaging_studies_patient")`
- `@@index([studyDate], map: "idx_imaging_studies_date")`

#### `study_annotations`

- Prisma model: `StudyAnnotation`
- Physical table: `study_annotations`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `String` | yes | `-` | `@default(cuid())` | `@id` |
| `study_id` | `studyId` | `BigInt` | yes | `-` | `-` | `-` |
| `series_uid` | `seriesUid` | `String` | yes | `-` | `-` | `-` |
| `viewer_type` | `viewerType` | `String` | yes | `-` | `-` | `-` |
| `slice_axis` | `sliceAxis` | `String?` | no | `-` | `-` | `-` |
| `slice_index` | `sliceIndex` | `Int?` | no | `-` | `-` | `-` |
| `type` | `type` | `String` | yes | `-` | `-` | `-` |
| `coordinates` | `coordinates` | `Json` | yes | `-` | `-` | `-` |
| `label` | `label` | `String?` | no | `-` | `-` | `-` |
| `color` | `color` | `String?` | no | `-` | `-` | `-` |
| `metadata` | `metadata` | `Json?` | no | `-` | `@default("{}")` | `-` |
| `review_status` | `reviewStatus` | `String` | yes | `-` | `@default("draft")` | `-` |
| `reviewed_by` | `reviewedBy` | `BigInt?` | no | `-` | `-` | `-` |
| `reviewed_at` | `reviewedAt` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |
| `reviewer_comment` | `reviewerComment` | `String?` | no | `-` | `-` | `-` |
| `confidence_score` | `confidenceScore` | `Float` | yes | `-` | `@default(0.7)` | `-` |
| `created_by` | `createdBy` | `BigInt` | yes | `-` | `-` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |
| `updated_at` | `updatedAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `@updatedAt` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `study` | `ImagingStudy` | no | `@relation(fields: [studyId], references: [id], onDelete: Cascade)` |
| `creator` | `User` | no | `@relation("StudyAnnotationCreator", fields: [createdBy], references: [id], onDelete: Cascade)` |
| `reviewer` | `User` | yes | `@relation("StudyAnnotationReviewer", fields: [reviewedBy], references: [id], onDelete: SetNull)` |

Indexes and table-level constraints:

- `@@index([studyId, seriesUid, viewerType], map: "idx_study_annotations_scope")`
- `@@index([studyId, seriesUid, viewerType, sliceAxis, sliceIndex], map: "idx_study_annotations_slice")`
- `@@index([createdBy], map: "idx_study_annotations_created_by")`
- `@@index([reviewStatus], map: "idx_study_annotations_review_status")`
- `@@index([reviewedBy], map: "idx_study_annotations_reviewed_by")`

#### `study_dentist_shares`

- Prisma model: `StudyDentistShare`
- Physical table: `study_dentist_shares`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `study_id` | `studyId` | `BigInt` | yes | `-` | `-` | `-` |
| `owner_dentist_id` | `ownerDentistId` | `BigInt` | yes | `-` | `-` | `-` |
| `recipient_dentist_id` | `recipientDentistId` | `BigInt` | yes | `-` | `-` | `-` |
| `created_by` | `createdById` | `BigInt` | yes | `-` | `-` | `-` |
| `revoked_at` | `revokedAt` | `DateTime?` | no | `Timestamptz(6)` | `-` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `study` | `ImagingStudy` | no | `@relation(fields: [studyId], references: [id], onDelete: Cascade, onUpdate: NoAction)` |
| `ownerDentist` | `User` | no | `@relation("StudyDentistShareOwner", fields: [ownerDentistId], references: [id], onDelete: Cascade, onUpdate: NoAction)` |
| `recipientDentist` | `User` | no | `@relation("StudyDentistShareRecipient", fields: [recipientDentistId], references: [id], onDelete: Cascade, onUpdate: NoAction)` |
| `createdBy` | `User` | no | `@relation("StudyDentistShareCreator", fields: [createdById], references: [id], onDelete: Cascade, onUpdate: NoAction)` |

Indexes and table-level constraints:

- `@@unique([studyId, recipientDentistId], map: "unique_study_dentist_recipient")`
- `@@index([studyId], map: "idx_study_dentist_shares_study")`
- `@@index([ownerDentistId], map: "idx_study_dentist_shares_owner")`
- `@@index([recipientDentistId, revokedAt], map: "idx_study_dentist_shares_recipient_active")`

#### `study_shares`

- Prisma model: `StudyShare`
- Physical table: `study_shares`

| Column | Prisma field | Type | Required | DB type | Default | Attributes |
|---|---|---|---|---|---|---|
| `id` | `id` | `BigInt` | yes | `-` | `@default(autoincrement())` | `@id` |
| `study_id` | `studyId` | `BigInt` | yes | `-` | `-` | `-` |
| `token` | `token` | `String` | yes | `-` | `-` | `@unique` |
| `expires_at` | `expiresAt` | `DateTime` | yes | `Timestamptz(6)` | `-` | `-` |
| `created_at` | `createdAt` | `DateTime` | yes | `Timestamptz(6)` | `@default(now())` | `-` |

Relations:

| Field | Target | Optional | Relation metadata |
|---|---|---|---|
| `study` | `ImagingStudy` | no | `@relation(fields: [studyId], references: [id], onDelete: Cascade)` |

Indexes and table-level constraints:

- `@@index([studyId], map: "idx_study_shares_study")`
- `@@index([expiresAt], map: "idx_study_shares_expires_at")`

## SQL-Only Migration Tables

These tables are present in SQL migrations but are not represented by a Prisma model in `backend/prisma/schema.prisma`.

### `ai_findings`

- Source migration: `backend/migrations/048_create_verified_case_workspace.sql`

```sql
CREATE TABLE IF NOT EXISTS ai_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES verified_cases(id) ON DELETE CASCADE,
  image_id UUID NULL REFERENCES case_images(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  tooth_or_region TEXT NULL,
  severity VARCHAR(64) NOT NULL DEFAULT 'mild',
  confidence DOUBLE PRECISION NULL,
  source VARCHAR(64) NOT NULL DEFAULT 'ai',
  status VARCHAR(64) NOT NULL DEFAULT 'ai_suggested',
  notes TEXT NULL,
  raw_ai_result JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ai_finding_status_check CHECK (status = 'ai_suggested')
);
```

Indexes:
- `048_create_verified_case_workspace.sql: CREATE INDEX IF NOT EXISTS idx_ai_findings_case ON ai_findings(case_id);`

### `case_audit_events`

- Source migration: `backend/migrations/048_create_verified_case_workspace.sql`

```sql
CREATE TABLE IF NOT EXISTS case_audit_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES verified_cases(id) ON DELETE RESTRICT,
  actor_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  actor_role VARCHAR(64) NOT NULL,
  event_type VARCHAR(96) NOT NULL,
  before_json JSONB NULL,
  after_json JSONB NULL,
  reason TEXT NULL,
  request_id VARCHAR(128) NULL,
  device_metadata JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Indexes:
- `048_create_verified_case_workspace.sql: CREATE INDEX IF NOT EXISTS idx_case_audit_case_created ON case_audit_events(case_id, created_at ASC);`

Trigger/constraint references:
- `048_create_verified_case_workspace.sql: ALTER TABLE case_audit_events DROP CONSTRAINT IF EXISTS case_audit_events_case_id_fkey;`
- `048_create_verified_case_workspace.sql: ADD CONSTRAINT case_audit_events_case_id_fkey`
- `048_create_verified_case_workspace.sql: DROP TRIGGER IF EXISTS trigger_case_audit_events_no_update ON case_audit_events;`
- `048_create_verified_case_workspace.sql: CREATE TRIGGER trigger_case_audit_events_no_update`
- `048_create_verified_case_workspace.sql: DROP TRIGGER IF EXISTS trigger_case_audit_events_no_delete ON case_audit_events;`
- `048_create_verified_case_workspace.sql: CREATE TRIGGER trigger_case_audit_events_no_delete`

### `case_exports`

- Source migration: `backend/migrations/048_create_verified_case_workspace.sql`

```sql
CREATE TABLE IF NOT EXISTS case_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES verified_cases(id) ON DELETE CASCADE,
  format VARCHAR(16) NOT NULL,
  redacted BOOLEAN NOT NULL DEFAULT FALSE,
  mime_type VARCHAR(128) NOT NULL,
  storage_ref TEXT NOT NULL,
  exported_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  exported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT case_export_format_check CHECK (format IN ('pdf', 'json'))
);
```

Indexes:
- `048_create_verified_case_workspace.sql: CREATE INDEX IF NOT EXISTS idx_case_exports_case ON case_exports(case_id, exported_at DESC);`

### `case_images`

- Source migration: `backend/migrations/048_create_verified_case_workspace.sql`

```sql
CREATE TABLE IF NOT EXISTS case_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES verified_cases(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  mime_type VARCHAR(128) NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  content_hash VARCHAR(128) NOT NULL,
  storage_ref TEXT NOT NULL,
  annotated_image_ref TEXT NULL,
  annotated_image_mime_type VARCHAR(128) NULL,
  duplicate_of UUID NULL REFERENCES case_images(id) ON DELETE SET NULL,
  upload_status VARCHAR(64) NOT NULL DEFAULT 'uploaded',
  quality_status VARCHAR(64) NULL,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Indexes:
- `048_create_verified_case_workspace.sql: CREATE INDEX IF NOT EXISTS idx_case_images_case ON case_images(case_id);`
- `048_create_verified_case_workspace.sql: CREATE INDEX IF NOT EXISTS idx_case_images_hash ON case_images(case_id, content_hash);`

### `clinician_findings`

- Source migration: `backend/migrations/048_create_verified_case_workspace.sql`

```sql
CREATE TABLE IF NOT EXISTS clinician_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES verified_cases(id) ON DELETE CASCADE,
  image_id UUID NULL REFERENCES case_images(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  tooth_or_region TEXT NULL,
  severity VARCHAR(64) NOT NULL DEFAULT 'mild',
  confidence DOUBLE PRECISION NULL,
  source VARCHAR(64) NOT NULL DEFAULT 'clinician',
  status VARCHAR(64) NOT NULL,
  notes TEXT NULL,
  urgent_referral BOOLEAN NOT NULL DEFAULT FALSE,
  needs_in_person_exam BOOLEAN NOT NULL DEFAULT FALSE,
  confirmed_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT clinician_finding_status_check CHECK (
    status IN (
      'clinician_confirmed',
      'clinician_rejected',
      'clinician_edited',
      'manual_added'
    )
  )
);
```

Indexes:
- `048_create_verified_case_workspace.sql: CREATE INDEX IF NOT EXISTS idx_clinician_findings_case ON clinician_findings(case_id);`

### `image_quality_checks`

- Source migration: `backend/migrations/048_create_verified_case_workspace.sql`

```sql
CREATE TABLE IF NOT EXISTS image_quality_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES verified_cases(id) ON DELETE CASCADE,
  image_id UUID NOT NULL REFERENCES case_images(id) ON DELETE CASCADE,
  quality_score INTEGER NOT NULL,
  quality_status VARCHAR(64) NOT NULL,
  issues JSONB NOT NULL DEFAULT '[]',
  recommendation TEXT NULL,
  can_continue_analysis BOOLEAN NOT NULL DEFAULT FALSE,
  metrics JSONB NOT NULL DEFAULT '{}',
  checked_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT image_quality_status_check CHECK (
    quality_status IN ('acceptable', 'warning', 'rejected', 'needs_retake')
  )
);
```

Indexes:
- `048_create_verified_case_workspace.sql: CREATE INDEX IF NOT EXISTS idx_quality_checks_case_image ON image_quality_checks(case_id, image_id, created_at DESC);`

### `patient_timeline_events`

- Source migration: `backend/migrations/048_create_verified_case_workspace.sql`

```sql
CREATE TABLE IF NOT EXISTS patient_timeline_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  case_id UUID NULL REFERENCES verified_cases(id) ON DELETE SET NULL,
  event_type VARCHAR(96) NOT NULL,
  event_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  case_title TEXT NULL,
  case_status VARCHAR(64) NULL,
  confirmed_findings_summary TEXT NULL,
  image_count INTEGER NOT NULL DEFAULT 0,
  report_link TEXT NULL,
  related_session_id VARCHAR(255) NULL,
  details JSONB NOT NULL DEFAULT '{}'
);
```

Indexes:
- `048_create_verified_case_workspace.sql: CREATE INDEX IF NOT EXISTS idx_patient_timeline_patient_date ON patient_timeline_events(patient_id, event_date DESC);`

### `verified_cases`

- Source migration: `backend/migrations/048_create_verified_case_workspace.sql`

```sql
CREATE TABLE IF NOT EXISTS verified_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NULL,
  clinic_id TEXT NULL,
  patient_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(255) NULL,
  title TEXT NOT NULL,
  status VARCHAR(64) NOT NULL DEFAULT 'draft',
  created_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ NULL,
  exported_at TIMESTAMPTZ NULL,
  archived_at TIMESTAMPTZ NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT verified_case_status_check CHECK (
    status IN (
      'draft',
      'images_uploaded',
      'quality_checked',
      'analysis_completed',
      'pending_clinician_review',
      'verified',
      'exported',
      'archived'
    )
  )
);
```

Indexes:
- `048_create_verified_case_workspace.sql: CREATE INDEX IF NOT EXISTS idx_verified_cases_patient_updated ON verified_cases(patient_id, updated_at DESC);`
- `048_create_verified_case_workspace.sql: CREATE INDEX IF NOT EXISTS idx_verified_cases_tenant_clinic_updated ON verified_cases(tenant_id, clinic_id, updated_at DESC);`
- `048_create_verified_case_workspace.sql: CREATE INDEX IF NOT EXISTS idx_verified_cases_session ON verified_cases(session_id);`
- `048_create_verified_case_workspace.sql: CREATE INDEX IF NOT EXISTS idx_verified_cases_status_updated ON verified_cases(status, updated_at DESC);`

Trigger/constraint references:
- `048_create_verified_case_workspace.sql: FOREIGN KEY (case_id) REFERENCES verified_cases(id) ON DELETE RESTRICT;`
- `048_create_verified_case_workspace.sql: DROP TRIGGER IF EXISTS trigger_verified_case_updated_at ON verified_cases;`
- `048_create_verified_case_workspace.sql: DROP TRIGGER IF EXISTS trigger_verified_cases_no_delete ON verified_cases;`
- `048_create_verified_case_workspace.sql: CREATE TRIGGER trigger_verified_cases_no_delete`

## Global Functions and Triggers

- `006_add_clinic_profile.sql`: `CREATE OR REPLACE FUNCTION update_updated_at_column()`
- `006_add_clinic_profile.sql`: `DROP TRIGGER IF EXISTS update_clinic_profiles_updated_at ON clinic_profiles;`
- `006_add_clinic_profile.sql`: `CREATE TRIGGER update_clinic_profiles_updated_at`
- `006_add_clinic_profile.sql`: `DROP TRIGGER IF EXISTS update_clinic_branches_updated_at ON clinic_branches;`
- `006_add_clinic_profile.sql`: `CREATE TRIGGER update_clinic_branches_updated_at`
- `007_add_clinic_staff.sql`: `DROP TRIGGER IF EXISTS update_clinic_staff_updated_at ON clinic_staff;`
- `007_add_clinic_staff.sql`: `CREATE TRIGGER update_clinic_staff_updated_at`
- `022_create_otp_verification.sql`: `CREATE OR REPLACE FUNCTION update_updated_at_column()`
- `022_create_otp_verification.sql`: `DROP TRIGGER IF EXISTS update_otp_verification_updated_at ON "OTPVerification";`
- `022_create_otp_verification.sql`: `CREATE TRIGGER update_otp_verification_updated_at BEFORE UPDATE`
- `024_add_dentist_geolocation_and_type.sql`: `CREATE OR REPLACE FUNCTION update_clinic_dentist_count()`
- `024_add_dentist_geolocation_and_type.sql`: `DROP TRIGGER IF EXISTS trigger_update_clinic_dentist_count ON dentist_profiles;`
- `024_add_dentist_geolocation_and_type.sql`: `CREATE TRIGGER trigger_update_clinic_dentist_count`
- `026_fix_updated_at_trigger.sql`: `CREATE OR REPLACE FUNCTION update_updated_at_column()`
- `027_add_services_tables.sql`: `CREATE OR REPLACE FUNCTION update_updated_at_column()`
- `027_add_services_tables.sql`: `DROP TRIGGER IF EXISTS update_clinic_services_updated_at ON clinic_services;`
- `027_add_services_tables.sql`: `CREATE TRIGGER update_clinic_services_updated_at BEFORE UPDATE ON clinic_services`
- `027_add_services_tables.sql`: `DROP TRIGGER IF EXISTS update_dentist_services_updated_at ON dentist_services;`
- `027_add_services_tables.sql`: `CREATE TRIGGER update_dentist_services_updated_at BEFORE UPDATE ON dentist_services`
- `027_add_services_tables.sql`: `DROP TRIGGER IF EXISTS update_service_assignments_updated_at ON service_dentist_assignments;`
- `027_add_services_tables.sql`: `CREATE TRIGGER update_service_assignments_updated_at BEFORE UPDATE ON service_dentist_assignments`
- `027_add_services_tables.sql`: `DROP TRIGGER IF EXISTS update_clinic_gallery_updated_at ON clinic_gallery;`
- `027_add_services_tables.sql`: `CREATE TRIGGER update_clinic_gallery_updated_at BEFORE UPDATE ON clinic_gallery`
- `027_add_services_tables.sql`: `DROP TRIGGER IF EXISTS update_clinic_highlights_updated_at ON clinic_highlights;`
- `027_add_services_tables.sql`: `CREATE TRIGGER update_clinic_highlights_updated_at BEFORE UPDATE ON clinic_highlights`
- `027_add_services_tables.sql`: `DROP TRIGGER IF EXISTS update_clinic_facilities_updated_at ON clinic_facilities;`
- `027_add_services_tables.sql`: `CREATE TRIGGER update_clinic_facilities_updated_at BEFORE UPDATE ON clinic_facilities`
- `028_fix_services_permissions.sql`: `CREATE OR REPLACE FUNCTION update_updated_at_column()`
- `029_create_dentist_emr_records.sql`: `DROP TRIGGER IF EXISTS update_dentist_emr_records_updated_at ON dentist_emr_records;`
- `029_create_dentist_emr_records.sql`: `CREATE TRIGGER update_dentist_emr_records_updated_at`
- `030_create_ai_analysis_results.sql`: `CREATE OR REPLACE FUNCTION update_ai_analysis_updated_at()`
- `030_create_ai_analysis_results.sql`: `DROP TRIGGER IF EXISTS trigger_ai_analysis_updated_at ON ai_analysis_results;`
- `030_create_ai_analysis_results.sql`: `CREATE TRIGGER trigger_ai_analysis_updated_at`
- `033_create_xcore_imaging_tables.sql`: `CREATE OR REPLACE FUNCTION update_imaging_studies_updated_at()`
- `033_create_xcore_imaging_tables.sql`: `DROP TRIGGER IF EXISTS update_imaging_studies_updated_at ON imaging_studies;`
- `033_create_xcore_imaging_tables.sql`: `CREATE TRIGGER update_imaging_studies_updated_at`
- `034_create_treatment_plans.sql`: `CREATE OR REPLACE FUNCTION update_treatment_plans_updated_at()`
- `034_create_treatment_plans.sql`: `DROP TRIGGER IF EXISTS trigger_treatment_plans_updated_at ON treatment_plans;`
- `034_create_treatment_plans.sql`: `CREATE TRIGGER trigger_treatment_plans_updated_at`
- `034_create_treatment_plans.sql`: `CREATE OR REPLACE FUNCTION update_treatment_items_updated_at()`
- `034_create_treatment_plans.sql`: `DROP TRIGGER IF EXISTS trigger_treatment_items_updated_at ON treatment_items;`
- `034_create_treatment_plans.sql`: `CREATE TRIGGER trigger_treatment_items_updated_at`
- `040_create_study_annotations.sql`: `CREATE OR REPLACE FUNCTION update_study_annotations_updated_at()`
- `040_create_study_annotations.sql`: `DROP TRIGGER IF EXISTS trg_study_annotations_updated_at ON study_annotations;`
- `040_create_study_annotations.sql`: `CREATE TRIGGER trg_study_annotations_updated_at`
- `048_create_verified_case_workspace.sql`: `CREATE OR REPLACE FUNCTION update_verified_case_updated_at()`
- `048_create_verified_case_workspace.sql`: `DROP TRIGGER IF EXISTS trigger_verified_case_updated_at ON verified_cases;`
- `048_create_verified_case_workspace.sql`: `CREATE TRIGGER trigger_verified_case_updated_at`
- `048_create_verified_case_workspace.sql`: `CREATE OR REPLACE FUNCTION prevent_case_audit_event_mutation()`
- `048_create_verified_case_workspace.sql`: `DROP TRIGGER IF EXISTS trigger_case_audit_events_no_update ON case_audit_events;`
- `048_create_verified_case_workspace.sql`: `CREATE TRIGGER trigger_case_audit_events_no_update`
- `048_create_verified_case_workspace.sql`: `DROP TRIGGER IF EXISTS trigger_case_audit_events_no_delete ON case_audit_events;`
- `048_create_verified_case_workspace.sql`: `CREATE TRIGGER trigger_case_audit_events_no_delete`
- `048_create_verified_case_workspace.sql`: `CREATE OR REPLACE FUNCTION prevent_verified_case_hard_delete()`
- `048_create_verified_case_workspace.sql`: `DROP TRIGGER IF EXISTS trigger_verified_cases_no_delete ON verified_cases;`
- `048_create_verified_case_workspace.sql`: `CREATE TRIGGER trigger_verified_cases_no_delete`
- `052_financial_owner_immutability.sql`: `CREATE OR REPLACE FUNCTION prevent_financial_owner_update()`
- `052_financial_owner_immutability.sql`: `DROP TRIGGER IF EXISTS trg_payment_intents_owner_immutable ON payment_intents;`
- `052_financial_owner_immutability.sql`: `CREATE TRIGGER trg_payment_intents_owner_immutable`
- `052_financial_owner_immutability.sql`: `DROP TRIGGER IF EXISTS trg_invoices_owner_immutable ON invoices;`
- `052_financial_owner_immutability.sql`: `CREATE TRIGGER trg_invoices_owner_immutable`

## Notes for Engineering

- Do not treat this file as a migration source. Apply database changes through `backend/migrations` and regenerate or update this document afterward.
- Some legacy migrations create duplicate index names or superseded constraints; this document reflects the current files, not a live database introspection.
- `backend/prisma/schema.prisma` is currently the most complete typed application schema, but verified-case workspace tables are SQL-only and must be handled through SQL/client code until Prisma models are added.
- Financial owner fields have immutability triggers in migration `052_financial_owner_immutability.sql`; ownership changes should go through explicit correction workflows.
- Audit tables such as `case_audit_events` are intentionally immutable through triggers.

