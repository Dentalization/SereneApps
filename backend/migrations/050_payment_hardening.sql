ALTER TABLE payment_intents
  ADD COLUMN IF NOT EXISTS active_appointment_id BIGINT,
  ADD COLUMN IF NOT EXISTS reconciliation_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reconciliation_error VARCHAR(255);

WITH ranked_active AS (
  SELECT id,
         appointment_id,
         ROW_NUMBER() OVER (PARTITION BY appointment_id ORDER BY created_at DESC) AS rn
  FROM payment_intents
  WHERE status IN ('pending', 'requires_action', 'paid')
)
UPDATE payment_intents p
SET active_appointment_id = p.appointment_id
FROM ranked_active r
WHERE p.id = r.id
  AND r.rn = 1;

UPDATE payment_intents
SET active_appointment_id = NULL
WHERE status NOT IN ('pending', 'requires_action', 'paid')
  OR id NOT IN (
    SELECT id FROM payment_intents WHERE active_appointment_id IS NOT NULL
  );

CREATE UNIQUE INDEX IF NOT EXISTS uniq_payment_intents_active_appointment
  ON payment_intents (active_appointment_id);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_payment_intents_provider_payment_id
  ON payment_intents (provider_payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_intents_appointment
  ON payment_intents (appointment_id);

CREATE INDEX IF NOT EXISTS idx_payment_intents_provider_payment_id
  ON payment_intents (provider_payment_id);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_invoices_reference
  ON invoices (reference);
