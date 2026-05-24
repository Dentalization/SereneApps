-- Add ownership + financial history scaffolding

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS owner_type VARCHAR(24) NOT NULL DEFAULT 'dentist',
  ADD COLUMN IF NOT EXISTS owner_clinic_id BIGINT REFERENCES clinic_profiles(id);

ALTER TABLE payment_intents
  ADD COLUMN IF NOT EXISTS owner_type VARCHAR(24) NOT NULL DEFAULT 'dentist',
  ADD COLUMN IF NOT EXISTS owner_clinic_id BIGINT REFERENCES clinic_profiles(id),
  ADD COLUMN IF NOT EXISTS owner_dentist_id BIGINT REFERENCES users(id);

-- Replace active-payment uniqueness index to include new lifecycle states
DROP INDEX IF EXISTS idx_payment_intents_appointment;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_intents_appointment
  ON payment_intents (appointment_id)
  WHERE status IN ('pending', 'requires_action', 'paid', 'settled');

CREATE INDEX IF NOT EXISTS idx_payment_intents_owner_clinic
  ON payment_intents (owner_type, owner_clinic_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_owner_dentist
  ON payment_intents (owner_type, owner_dentist_id);

-- Financial ledger (audit-safe, append-only)
CREATE TABLE IF NOT EXISTS financial_ledger_entries (
  id BIGSERIAL PRIMARY KEY,
  payment_intent_id BIGINT REFERENCES payment_intents(id) ON DELETE SET NULL,
  appointment_id BIGINT REFERENCES appointments(id) ON DELETE SET NULL,
  owner_type VARCHAR(24) NOT NULL,
  owner_clinic_id BIGINT REFERENCES clinic_profiles(id),
  owner_dentist_id BIGINT REFERENCES users(id),
  entry_type VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL,
  direction VARCHAR(16) NOT NULL,
  amount INTEGER NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'IDR',
  source VARCHAR(32),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_ledger_clinic
  ON financial_ledger_entries (owner_type, owner_clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_dentist
  ON financial_ledger_entries (owner_type, owner_dentist_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_intent
  ON financial_ledger_entries (payment_intent_id, created_at DESC);

-- Invoice-ready tables
CREATE TABLE IF NOT EXISTS invoices (
  id BIGSERIAL PRIMARY KEY,
  appointment_id BIGINT REFERENCES appointments(id) ON DELETE SET NULL,
  payment_intent_id BIGINT REFERENCES payment_intents(id) ON DELETE SET NULL,
  patient_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  owner_type VARCHAR(24) NOT NULL,
  owner_clinic_id BIGINT REFERENCES clinic_profiles(id),
  owner_dentist_id BIGINT REFERENCES users(id),
  reference VARCHAR(64),
  status VARCHAR(24) NOT NULL DEFAULT 'issued',
  subtotal INTEGER NOT NULL,
  tax INTEGER NOT NULL DEFAULT 0,
  discount INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'IDR',
  issued_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_owner_clinic
  ON invoices (owner_type, owner_clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_owner_dentist
  ON invoices (owner_type, owner_dentist_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_patient
  ON invoices (patient_id, created_at DESC);

CREATE TABLE IF NOT EXISTS invoice_items (
  id BIGSERIAL PRIMARY KEY,
  invoice_id BIGINT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL,
  total INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice
  ON invoice_items (invoice_id);

-- Backfill owner_type + owner_clinic_id for existing appointments
UPDATE appointments
SET owner_type = CASE
  WHEN clinic_branch_id IS NOT NULL THEN 'clinic'
  ELSE 'dentist'
END;

UPDATE appointments a
SET owner_clinic_id = cb.clinic_profile_id
FROM clinic_branches cb
WHERE a.clinic_branch_id = cb.id
  AND a.owner_type = 'clinic'
  AND (a.owner_clinic_id IS NULL);

-- Backfill payment_intents ownership from appointments
UPDATE payment_intents pi
SET owner_type = a.owner_type,
    owner_clinic_id = a.owner_clinic_id,
    owner_dentist_id = CASE WHEN a.owner_type = 'dentist' THEN a.dentist_id ELSE NULL END
FROM appointments a
WHERE pi.appointment_id = a.id
  AND (pi.owner_type IS NULL OR pi.owner_type = '');

-- Normalize legacy payment statuses
UPDATE payment_intents
SET status = 'paid'
WHERE status IN ('succeeded', 'completed');

UPDATE payment_intents
SET status = 'requires_action'
WHERE status = 'authorized';
