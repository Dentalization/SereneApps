-- Migration: payment provider fields and ledger

ALTER TABLE payment_intents
  ADD COLUMN IF NOT EXISTS redirect_url TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provider_response JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS payment_ledgers (
  id BIGSERIAL PRIMARY KEY,
  payment_intent_id BIGINT NOT NULL REFERENCES payment_intents(id) ON DELETE CASCADE,
  entry_type VARCHAR NOT NULL,
  status VARCHAR NOT NULL,
  amount INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_ledgers_intent_status
  ON payment_ledgers (payment_intent_id, status);

CREATE INDEX IF NOT EXISTS idx_payment_ledgers_created_at
  ON payment_ledgers (created_at DESC);
