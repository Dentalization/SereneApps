-- Harden payment tracking and OTP abuse controls

ALTER TABLE payment_intents
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(180),
  ADD COLUMN IF NOT EXISTS provider_order_id VARCHAR(191),
  ADD COLUMN IF NOT EXISTS reconciliation_status VARCHAR(32) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS last_reconciled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS callback_verified_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_payment_intents_idempotency_key
  ON payment_intents (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_intents_provider_order_id
  ON payment_intents (provider_order_id);

CREATE INDEX IF NOT EXISTS idx_payment_intents_reconciliation
  ON payment_intents (reconciliation_status, updated_at DESC);

ALTER TABLE "OTPVerification"
  ADD COLUMN IF NOT EXISTS purpose VARCHAR(50) NOT NULL DEFAULT 'login',
  ADD COLUMN IF NOT EXISTS resend_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS cooldown_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_request_ip_hash VARCHAR(128),
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_otp_verification_cooldown
  ON "OTPVerification" (cooldown_until);

CREATE INDEX IF NOT EXISTS idx_otp_verification_locked
  ON "OTPVerification" (locked_until);
