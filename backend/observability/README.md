# OTP Observability Pack

This directory contains ready-to-apply observability artifacts for the SMS-only OTP rollout.

## Files
- `otp-dashboard.grafana.json`: Grafana dashboard for OTP traffic, deprecation, rate limiting, and lockout trends.
- `otp-alerts.loki.yaml`: Loki ruler alerts for `OTP_CHANNEL_DEPRECATED`, `OTP_RATE_LIMITED`, and `OTP_LOCKED`.
- `vector-otp-redaction-example.toml`: Example redaction transform for log forwarders when production log shipping exists.

## Log Assumptions
These queries assume backend OTP logs are shipped as JSON records with at least:
- `domain`
- `event`
- `correlationId`
- `identifier`
- `channel`
- `outcome`
- `reason`

Current backend OTP logging already emits masked identifiers from application code. The forwarder example is included as a second redaction layer for production ingestion pipelines.

## Alert Targets
- Deprecated legacy traffic: `reason="OTP_CHANNEL_DEPRECATED"`
- OTP abuse / rate limiting: `reason="OTP_RATE_LIMITED"`
- Temporary lockout: `reason="OTP_LOCKED"`

## Rollout Gate Query
Use this query to confirm zero deprecated email OTP traffic before removing legacy code:

```logql
sum(count_over_time({app="sereneapps-backend"} | json | domain="otp" | reason="OTP_CHANNEL_DEPRECATED" [24h]))
```

Safe removal assumption used in the release changelog:
- 14 consecutive days at `0`
- mobile release fully migrated to `/v1/otp/*`
