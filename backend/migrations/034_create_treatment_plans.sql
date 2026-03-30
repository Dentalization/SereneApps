-- Migration: Create treatment plan tables used by dentist portal and Prisma relations

CREATE TABLE IF NOT EXISTS treatment_plans (
  id BIGSERIAL PRIMARY KEY,
  patient_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dentist_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  progress INT NOT NULL DEFAULT 0,
  estimated_cost INT NOT NULL DEFAULT 0,
  actual_cost INT NOT NULL DEFAULT 0,
  target_completion DATE,
  completed_at TIMESTAMPTZ(6),
  notes TEXT,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient
  ON treatment_plans (patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_treatment_plans_dentist
  ON treatment_plans (dentist_id);

CREATE INDEX IF NOT EXISTS idx_treatment_plans_status
  ON treatment_plans (status);

CREATE TABLE IF NOT EXISTS treatment_items (
  id BIGSERIAL PRIMARY KEY,
  treatment_plan_id BIGINT NOT NULL REFERENCES treatment_plans(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  cost INT NOT NULL DEFAULT 0,
  actual_cost INT NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  scheduled_date DATE,
  completed_date DATE,
  notes TEXT,
  result_notes TEXT,
  image_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_treatment_items_plan
  ON treatment_items (treatment_plan_id);

CREATE INDEX IF NOT EXISTS idx_treatment_items_status
  ON treatment_items (status);

CREATE OR REPLACE FUNCTION update_treatment_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_treatment_plans_updated_at ON treatment_plans;
CREATE TRIGGER trigger_treatment_plans_updated_at
  BEFORE UPDATE ON treatment_plans
  FOR EACH ROW EXECUTE FUNCTION update_treatment_plans_updated_at();

CREATE OR REPLACE FUNCTION update_treatment_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_treatment_items_updated_at ON treatment_items;
CREATE TRIGGER trigger_treatment_items_updated_at
  BEFORE UPDATE ON treatment_items
  FOR EACH ROW EXECUTE FUNCTION update_treatment_items_updated_at();

COMMENT ON TABLE treatment_plans IS 'Dentist treatment plans for patients';
COMMENT ON TABLE treatment_items IS 'Line items/procedures inside a treatment plan';
