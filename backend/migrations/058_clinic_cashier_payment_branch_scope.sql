-- Clinic cashier payment flow branch ownership.
-- Existing clinic appointments already carry clinic_branch_id; invoices and payment intents
-- need their own nullable branch columns so branch-scoped billing queries do not rely on
-- frontend filtering or joined appointment state only.

ALTER TABLE payment_intents
  ADD COLUMN IF NOT EXISTS clinic_branch_id BIGINT REFERENCES clinic_branches(id);

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS clinic_branch_id BIGINT REFERENCES clinic_branches(id);

UPDATE payment_intents pi
SET clinic_branch_id = a.clinic_branch_id
FROM appointments a
WHERE pi.appointment_id = a.id
  AND pi.clinic_branch_id IS NULL
  AND a.clinic_branch_id IS NOT NULL;

UPDATE invoices i
SET clinic_branch_id = a.clinic_branch_id
FROM appointments a
WHERE i.appointment_id = a.id
  AND i.clinic_branch_id IS NULL
  AND a.clinic_branch_id IS NOT NULL;

UPDATE invoices i
SET clinic_branch_id = pi.clinic_branch_id
FROM payment_intents pi
WHERE i.payment_intent_id = pi.id
  AND i.clinic_branch_id IS NULL
  AND pi.clinic_branch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_intents_clinic_branch
  ON payment_intents (clinic_branch_id);

CREATE INDEX IF NOT EXISTS idx_invoices_clinic_branch
  ON invoices (clinic_branch_id);
