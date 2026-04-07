-- Foundation for internal event-driven flow and idempotent provider webhooks

CREATE TABLE IF NOT EXISTS domain_event_outbox (
  id BIGSERIAL PRIMARY KEY,
  event_id UUID NOT NULL DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  aggregate_type VARCHAR(100) NOT NULL,
  aggregate_id VARCHAR(100) NOT NULL,
  correlation_id VARCHAR(120),
  causation_id VARCHAR(120),
  idempotency_key VARCHAR(180),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_domain_event_outbox_event_id
  ON domain_event_outbox (event_id);

CREATE INDEX IF NOT EXISTS idx_domain_event_outbox_status_available
  ON domain_event_outbox (status, available_at);

CREATE INDEX IF NOT EXISTS idx_domain_event_outbox_aggregate
  ON domain_event_outbox (aggregate_type, aggregate_id, created_at DESC);

CREATE TABLE IF NOT EXISTS webhook_receipts (
  id BIGSERIAL PRIMARY KEY,
  provider VARCHAR(32) NOT NULL,
  source VARCHAR(64),
  delivery_key VARCHAR(191) NOT NULL,
  event_type VARCHAR(100),
  resource_id VARCHAR(191),
  signature VARCHAR(255),
  payload_hash VARCHAR(128) NOT NULL,
  correlation_id VARCHAR(120),
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(32) NOT NULL DEFAULT 'processing',
  attempts INTEGER NOT NULL DEFAULT 1,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uniq_webhook_receipts_provider_delivery UNIQUE (provider, delivery_key)
);

CREATE INDEX IF NOT EXISTS idx_webhook_receipts_status_next_attempt
  ON webhook_receipts (status, next_attempt_at);

CREATE INDEX IF NOT EXISTS idx_webhook_receipts_provider_received_at
  ON webhook_receipts (provider, received_at DESC);
