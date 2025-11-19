-- Migration: payment intents tied to appointments

CREATE TABLE IF NOT EXISTS payment_intents (
  id BIGSERIAL PRIMARY KEY,
  appointment_id BIGINT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  patient_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  currency VARCHAR NOT NULL DEFAULT 'IDR',
  status VARCHAR NOT NULL DEFAULT 'pending',
  provider VARCHAR,
  provider_payment_id VARCHAR,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE payment_intents
  DROP CONSTRAINT IF EXISTS payment_intents_positive_amount,
  ADD CONSTRAINT payment_intents_positive_amount CHECK (amount > 0);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_intents_appointment
  ON payment_intents (appointment_id)
  WHERE status IN ('pending', 'requires_action', 'authorized');

CREATE INDEX IF NOT EXISTS idx_payment_intents_patient
  ON payment_intents (patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_intents_status
  ON payment_intents (status);
