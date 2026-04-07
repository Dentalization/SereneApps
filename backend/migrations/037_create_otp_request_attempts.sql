-- OTP request/verify audit trail for throttling, observability, and idempotency

CREATE TABLE IF NOT EXISTS otp_request_attempts (
  id BIGSERIAL PRIMARY KEY,
  otp_verification_id TEXT,
  action VARCHAR(16) NOT NULL,
  identifier_hash VARCHAR(128),
  ip_hash VARCHAR(128),
  channel VARCHAR(16) NOT NULL,
  outcome VARCHAR(32) NOT NULL,
  reason VARCHAR(64),
  correlation_id VARCHAR(120),
  user_id BIGINT,
  idempotency_key VARCHAR(180),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_request_attempts_ip_window
  ON otp_request_attempts (ip_hash, action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_otp_request_attempts_identifier_window
  ON otp_request_attempts (identifier_hash, action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_otp_request_attempts_idempotency
  ON otp_request_attempts (idempotency_key, created_at DESC);
