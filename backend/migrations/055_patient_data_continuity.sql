-- Treatment-plan, invoice, and patient-data continuity scaffolding.
-- Additive only: legacy treatment plan/item columns remain available.

ALTER TABLE treatment_plans
  ADD COLUMN IF NOT EXISTS clinic_id BIGINT REFERENCES clinic_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS appointment_id BIGINT REFERENCES appointments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS consultation_session_id BIGINT REFERENCES video_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS medical_record_id VARCHAR(64) REFERENCES dentist_emr_records(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ai_analysis_result_id BIGINT REFERENCES ai_analysis_results(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS diagnosis_summary TEXT,
  ADD COLUMN IF NOT EXISTS clinical_notes TEXT,
  ADD COLUMN IF NOT EXISTS patient_friendly_summary TEXT,
  ADD COLUMN IF NOT EXISTS currency VARCHAR(8) NOT NULL DEFAULT 'IDR',
  ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE treatment_items
  ADD COLUMN IF NOT EXISTS tooth_number VARCHAR(16),
  ADD COLUMN IF NOT EXISTS area_label VARCHAR(80),
  ADD COLUMN IF NOT EXISTS procedure_code VARCHAR(64),
  ADD COLUMN IF NOT EXISTS procedure_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS clinical_reason TEXT,
  ADD COLUMN IF NOT EXISTS priority VARCHAR(20),
  ADD COLUMN IF NOT EXISTS estimated_cost INTEGER,
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS phase VARCHAR(80);

UPDATE treatment_items
SET procedure_name = COALESCE(procedure_name, name),
    estimated_cost = COALESCE(estimated_cost, cost)
WHERE procedure_name IS NULL
   OR estimated_cost IS NULL;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS treatment_plan_id BIGINT REFERENCES treatment_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS platform_fee INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clinic_share INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dentist_share INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grand_total INTEGER NOT NULL DEFAULT 0;

UPDATE invoices
SET grand_total = total
WHERE grand_total = 0
  AND total IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_treatment_plans_clinic
  ON treatment_plans (clinic_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_treatment_plans_appointment
  ON treatment_plans (appointment_id);

CREATE INDEX IF NOT EXISTS idx_treatment_plans_ai_result
  ON treatment_plans (ai_analysis_result_id);

CREATE INDEX IF NOT EXISTS idx_treatment_plans_medical_record
  ON treatment_plans (medical_record_id);

CREATE INDEX IF NOT EXISTS idx_invoices_treatment_plan
  ON invoices (treatment_plan_id);
