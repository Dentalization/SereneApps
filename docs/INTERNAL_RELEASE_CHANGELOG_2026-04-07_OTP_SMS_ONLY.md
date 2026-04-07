# Internal Release Changelog: OTP SMS-Only Rollout

Date: 2026-04-07  
Owner: Backend Platform / Mobile  
Status: Active rollout

## Summary
- Public OTP contract is now SMS-only.
- Email OTP is deprecated and must not be used by web/mobile clients.
- Legacy compatibility routes remain temporarily available only for safe transition.
- `OTP_EMAIL_DEPRECATED=true` is the default and must stay enabled in all production environments.

## Effective API Contract

### Public OTP endpoints
- `POST /v1/otp/requests`
- `POST /v1/otp/requests/:challengeId/resend`
- `POST /v1/otp/verifications`

### Required request format
```json
{
  "channel": "sms",
  "phone_number": "+628123456789",
  "purpose": "login"
}
```

### Verification format
```json
{
  "channel": "sms",
  "phone_number": "+628123456789",
  "otp": "123456"
}
```

## Deprecated Legacy Routes
- `POST /v1/auth/send-phone-otp`
- `POST /v1/auth/send-email-otp`
- `POST /v1/auth/verify-otp`

### Deprecation behavior
- `POST /v1/auth/send-email-otp` now returns:

```json
{
  "error": {
    "code": "OTP_CHANNEL_DEPRECATED",
    "message": "Email OTP is deprecated. Use SMS OTP.",
    "retryable": false
  }
}
```

- Legacy auth routes are compatibility-only and must not be referenced by active client code, release notes, or test scripts.

## Client Rollout Notes
- Mobile app has been migrated to `/v1/otp/*`.
- Web runtime has no active OTP client implementation in `web/src`; internal docs and handoff references are updated to point to `/v1/otp/*`.
- Any remaining legacy traffic should be treated as stale client usage or manual QA scripts.

## Operational Monitoring
- Track deprecated traffic with `reason="OTP_CHANNEL_DEPRECATED"`.
- Track abuse/backpressure with `reason="OTP_RATE_LIMITED"`.
- Track lockouts with `reason="OTP_LOCKED"`.
- Observability artifacts are located under `/backend/observability`.

## Removal Gate For Final Cleanup
Assumption used for safe rollout:
- Remove legacy email OTP route and `email` from OTP verify schema only after:
- 14 consecutive days of zero `OTP_CHANNEL_DEPRECATED` events in production.
- Zero requests to `/v1/auth/send-email-otp` in access logs for the same period.
- Mobile release using `/v1/otp/*` is fully rolled out to production users.

## Final Cleanup Scope Once Gate Is Met
- Remove `POST /v1/auth/send-email-otp`.
- Remove `email` from public OTP verify schema.
- Remove any internal fallback docs that mention email OTP.
- Re-run OTP integration and regression tests after schema cleanup.
