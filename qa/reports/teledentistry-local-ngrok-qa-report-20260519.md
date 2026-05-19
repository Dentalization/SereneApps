# Teledentistry Local/ngrok QA Report - 2026-05-19

## Scope

This report records the cleanup-gate status after local/ngrok Teledentistry QA for appointment `8`.

## Cleanup Blockers

| Blocker | Status | Evidence |
| --- | --- | --- |
| Web i18n missing keys | Fixed | `node scripts/i18n-audit.mjs --fail-on-missing-keys --fail-on-parity` reports `en missing keys: 0`, `id missing keys: 0`, and locale parity clean. |
| Token-prefix logging | Fixed for listed files | Unsafe token substring logging was removed from `mobile/src/services/patientService.js` and `backend/src/routes/admin.js`. Remaining search hits are token retrieval/header use or boolean token-presence diagnostics. |
| Worktree helper cleanup | Fixed for temporary helpers | Removed local `check-env.mjs` and `backend/check-env.mjs`. Remaining dirty files are source/package changes under review, plus this QA report. |
| Mobile physical-device QA | Pending | No Android device was connected and no iOS simulator was booted during this local pass. Camera/mic permission, native call accept, reconnect, low bandwidth, and device attachment behavior still require real device/simulator QA. |

## Local/ngrok QA Evidence

- Unified appointment-scoped token flow was exercised for patient, dentist, and clinic observer.
- Twilio Conversations webhooks reached the backend through ngrok and persisted local `chat_messages` projection rows.
- Twilio Video webhooks reached the backend through ngrok for participant events and `room-ended`.
- Missing and invalid Twilio signatures returned `403` for both Video and Conversations webhook routes.
- Clinic observer used VideoGrant-only token behavior and did not receive Conversations access.
- Clinic chat review redacted attachment download URLs.
- Clinical summary draft, finalize, patient acknowledgement, and follow-up task creation were exercised.

## Current Cutover Decision

Production cutover remains **NO-GO**.

The next gate is mobile physical-device/simulator QA, followed by staging/prod environment checks for database migrations, Twilio callback URLs, object storage, CORS, and real-device behavior.
