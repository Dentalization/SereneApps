-- Enforce single financial owner semantics for payments, invoices, and financial ledger rows.
-- Stored owner_type values remain lowercase for backward compatibility with existing Prisma models:
--   clinic  = clinic-owned payment
--   dentist = independent dentist-owned payment

UPDATE appointments
SET owner_type = CASE
  WHEN owner_type IN ('CLINIC', 'clinic') OR clinic_branch_id IS NOT NULL THEN 'clinic'
  WHEN owner_type IN ('INDEPENDENT_DENTIST', 'DENTIST', 'dentist') THEN 'dentist'
  ELSE owner_type
END;

UPDATE appointments a
SET owner_clinic_id = cb.clinic_profile_id
FROM clinic_branches cb
WHERE a.clinic_branch_id = cb.id
  AND a.owner_type = 'clinic'
  AND a.owner_clinic_id IS NULL;

UPDATE appointments
SET owner_clinic_id = NULL
WHERE owner_type = 'dentist';

UPDATE payment_intents pi
SET owner_type = a.owner_type,
    owner_clinic_id = CASE WHEN a.owner_type = 'clinic' THEN a.owner_clinic_id ELSE NULL END,
    owner_dentist_id = CASE WHEN a.owner_type = 'dentist' THEN a.dentist_id ELSE NULL END
FROM appointments a
WHERE pi.appointment_id = a.id
  AND (
    pi.owner_type NOT IN ('clinic', 'dentist')
    OR (pi.owner_type = 'clinic' AND (pi.owner_clinic_id IS NULL OR pi.owner_dentist_id IS NOT NULL))
    OR (pi.owner_type = 'dentist' AND (pi.owner_dentist_id IS NULL OR pi.owner_clinic_id IS NOT NULL))
  );

UPDATE invoices i
SET owner_type = pi.owner_type,
    owner_clinic_id = pi.owner_clinic_id,
    owner_dentist_id = pi.owner_dentist_id
FROM payment_intents pi
WHERE i.payment_intent_id = pi.id
  AND (
    i.owner_type NOT IN ('clinic', 'dentist')
    OR (i.owner_type = 'clinic' AND (i.owner_clinic_id IS NULL OR i.owner_dentist_id IS NOT NULL))
    OR (i.owner_type = 'dentist' AND (i.owner_dentist_id IS NULL OR i.owner_clinic_id IS NOT NULL))
  );

UPDATE invoices i
SET owner_type = a.owner_type,
    owner_clinic_id = CASE WHEN a.owner_type = 'clinic' THEN a.owner_clinic_id ELSE NULL END,
    owner_dentist_id = CASE WHEN a.owner_type = 'dentist' THEN a.dentist_id ELSE NULL END
FROM appointments a
WHERE i.appointment_id = a.id
  AND i.payment_intent_id IS NULL
  AND (
    i.owner_type NOT IN ('clinic', 'dentist')
    OR (i.owner_type = 'clinic' AND (i.owner_clinic_id IS NULL OR i.owner_dentist_id IS NOT NULL))
    OR (i.owner_type = 'dentist' AND (i.owner_dentist_id IS NULL OR i.owner_clinic_id IS NOT NULL))
  );

UPDATE financial_ledger_entries fle
SET owner_type = pi.owner_type,
    owner_clinic_id = pi.owner_clinic_id,
    owner_dentist_id = pi.owner_dentist_id
FROM payment_intents pi
WHERE fle.payment_intent_id = pi.id
  AND (
    fle.owner_type NOT IN ('clinic', 'dentist')
    OR (fle.owner_type = 'clinic' AND (fle.owner_clinic_id IS NULL OR fle.owner_dentist_id IS NOT NULL))
    OR (fle.owner_type = 'dentist' AND (fle.owner_dentist_id IS NULL OR fle.owner_clinic_id IS NOT NULL))
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_appointments_financial_owner'
  ) THEN
    ALTER TABLE appointments
      ADD CONSTRAINT chk_appointments_financial_owner
      CHECK (
        (owner_type = 'clinic' AND owner_clinic_id IS NOT NULL)
        OR
        (owner_type = 'dentist' AND owner_clinic_id IS NULL)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_payment_intents_financial_owner'
  ) THEN
    ALTER TABLE payment_intents
      ADD CONSTRAINT chk_payment_intents_financial_owner
      CHECK (
        (owner_type = 'clinic' AND owner_clinic_id IS NOT NULL AND owner_dentist_id IS NULL)
        OR
        (owner_type = 'dentist' AND owner_clinic_id IS NULL AND owner_dentist_id IS NOT NULL)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_invoices_financial_owner'
  ) THEN
    ALTER TABLE invoices
      ADD CONSTRAINT chk_invoices_financial_owner
      CHECK (
        (owner_type = 'clinic' AND owner_clinic_id IS NOT NULL AND owner_dentist_id IS NULL)
        OR
        (owner_type = 'dentist' AND owner_clinic_id IS NULL AND owner_dentist_id IS NOT NULL)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_financial_ledger_entries_owner'
  ) THEN
    ALTER TABLE financial_ledger_entries
      ADD CONSTRAINT chk_financial_ledger_entries_owner
      CHECK (
        (owner_type = 'clinic' AND owner_clinic_id IS NOT NULL AND owner_dentist_id IS NULL)
        OR
        (owner_type = 'dentist' AND owner_clinic_id IS NULL AND owner_dentist_id IS NOT NULL)
      ) NOT VALID;
  END IF;
END $$;
