# Authentication Testing Guide

Status: current  
Last updated: 2026-04-07

## OTP Contract
- Public OTP is SMS-only.
- Use `/v1/otp/*` for all active client integrations.
- Email OTP is deprecated and must not be used by web/mobile clients.

## Supported Endpoints
- `POST /v1/otp/requests`
- `POST /v1/otp/requests/:challengeId/resend`
- `POST /v1/otp/verifications`

## Deprecated Compatibility Routes
- `POST /v1/auth/send-phone-otp`
- `POST /v1/auth/send-email-otp`
- `POST /v1/auth/verify-otp`

Do not write new tests against legacy auth OTP routes.

## Environment Setup
```bash
OTP_EXPIRY_MINUTES=5
OTP_LENGTH=6
OTP_REQUEST_COOLDOWN_SECONDS=60
OTP_MAX_SEND_PER_HOUR=5
OTP_MAX_VERIFY_ATTEMPTS=5
OTP_LOCKOUT_MINUTES=30
OTP_EMAIL_DEPRECATED=true
OTP_DEV_RETURN_CODE=true
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_SMS_FROM_NUMBER=
```

## Test 1: Request SMS OTP
```bash
curl -X POST http://localhost:4000/v1/otp/requests \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: otp-test-001" \
  -d '{
    "channel": "sms",
    "phone_number": "+628123456789",
    "purpose": "login"
  }'
```

Expected:
```json
{
  "challengeId": "otp-uuid",
  "identifier": "+628123456789",
  "channel": "sms",
  "expiresAt": "2026-04-07T10:20:00.000Z",
  "cooldownUntil": "2026-04-07T10:16:00.000Z",
  "remainingAttempts": 5,
  "idempotent": false,
  "provider": {
    "name": "twilio",
    "delivered": true
  }
}
```

## Test 2: Verify SMS OTP
```bash
curl -X POST http://localhost:4000/v1/otp/verifications \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "sms",
    "phone_number": "+628123456789",
    "otp": "123456"
  }'
```

Expected:
```json
{
  "verified": true,
  "verifiedAt": "2026-04-07T10:17:20.000Z",
  "challengeId": "otp-uuid"
}
```

## Test 3: Email OTP Must Be Rejected
```bash
curl -X POST http://localhost:4000/v1/otp/requests \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "email",
    "email": "legacy@test.com"
  }'
```

Expected:
```json
{
  "error": {
    "code": "OTP_CHANNEL_DEPRECATED",
    "message": "Email OTP is deprecated. Use SMS OTP.",
    "retryable": false
  }
}
```

## Test 4: Cooldown
Repeat the same request within 60 seconds:

```bash
curl -X POST http://localhost:4000/v1/otp/requests \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "sms",
    "phone_number": "+628123456789",
    "purpose": "login"
  }'
```

Expected error:
```json
{
  "error": {
    "code": "OTP_COOLDOWN_ACTIVE",
    "retryable": true
  }
}
```

## Test 5: Lockout
Submit an invalid OTP until the policy limit is reached.

Expected terminal error:
```json
{
  "error": {
    "code": "OTP_LOCKED",
    "retryable": false
  }
}
```

## Test 6: Idempotent Request
Replay the same request with the same `Idempotency-Key`.

Expected:
- same `challengeId`
- `idempotent: true`
- no second provider delivery side effect

## Release Notes
- Internal release changelog: `/docs/INTERNAL_RELEASE_CHANGELOG_2026-04-07_OTP_SMS_ONLY.md`
- Observability pack: `/backend/observability`
