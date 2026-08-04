-- X-Core multi-image analysis cases and immutable report versions.
CREATE TABLE IF NOT EXISTS xcore_analysis_cases (
  id UUID PRIMARY KEY,
  patient_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  clinical_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  conclusion TEXT,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT xcore_analysis_cases_status_check CHECK (status IN ('DRAFT', 'FINALIZED')),
  CONSTRAINT xcore_analysis_cases_clinical_data_check CHECK (jsonb_typeof(clinical_data) = 'object')
);

CREATE TABLE IF NOT EXISTS xcore_analysis_case_items (
  id UUID PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES xcore_analysis_cases(id) ON DELETE CASCADE,
  study_id BIGINT NOT NULL REFERENCES imaging_studies(id) ON DELETE RESTRICT,
  series_id BIGINT REFERENCES imaging_series(id) ON DELETE RESTRICT,
  series_uid TEXT NOT NULL,
  viewer_type VARCHAR(16) NOT NULL DEFAULT '2d',
  radiograph_type VARCHAR(24) NOT NULL,
  tooth_numbers VARCHAR(3)[] NOT NULL DEFAULT ARRAY[]::VARCHAR(3)[],
  display_order INTEGER NOT NULL,
  title VARCHAR(255),
  findings TEXT,
  render_storage_path TEXT,
  render_checksum VARCHAR(64),
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT xcore_case_items_radiograph_type_check CHECK (radiograph_type IN ('PERIAPICAL', 'PANORAMIC', 'BITEWING', 'OCCLUSAL', 'CEPHALOMETRIC', 'OTHER')),
  CONSTRAINT xcore_case_items_viewer_type_check CHECK (viewer_type IN ('2d', 'slice', '3d')),
  CONSTRAINT xcore_case_items_order_check CHECK (display_order >= 0),
  CONSTRAINT xcore_case_items_periapical_teeth_check CHECK (radiograph_type <> 'PERIAPICAL' OR cardinality(tooth_numbers) > 0),
  CONSTRAINT xcore_case_items_tooth_numbers_check CHECK (tooth_numbers <@ ARRAY['11','12','13','14','15','16','17','18','21','22','23','24','25','26','27','28','31','32','33','34','35','36','37','38','41','42','43','44','45','46','47','48']::VARCHAR(3)[]),
  UNIQUE (case_id, display_order)
);

CREATE TABLE IF NOT EXISTS xcore_analysis_reports (
  id UUID PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES xcore_analysis_cases(id) ON DELETE RESTRICT,
  version INTEGER NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
  created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  storage_path TEXT NOT NULL,
  checksum VARCHAR(64) NOT NULL,
  case_snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT xcore_analysis_reports_status_check CHECK (status IN ('DRAFT', 'FINAL')),
  CONSTRAINT xcore_analysis_reports_snapshot_check CHECK (jsonb_typeof(case_snapshot) = 'object'),
  UNIQUE (case_id, version)
);

CREATE TABLE IF NOT EXISTS xcore_analysis_report_items (
  id UUID PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES xcore_analysis_reports(id) ON DELETE CASCADE,
  source_case_item_id UUID NOT NULL,
  display_order INTEGER NOT NULL,
  radiograph_type VARCHAR(24) NOT NULL,
  tooth_numbers VARCHAR(3)[] NOT NULL DEFAULT ARRAY[]::VARCHAR(3)[],
  title VARCHAR(255),
  findings TEXT,
  study_id BIGINT NOT NULL,
  series_uid TEXT NOT NULL,
  viewer_type VARCHAR(16) NOT NULL,
  annotation_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  measurement_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  render_storage_path TEXT NOT NULL,
  render_checksum VARCHAR(64) NOT NULL,
  CONSTRAINT xcore_analysis_report_items_annotations_check CHECK (jsonb_typeof(annotation_snapshot) = 'array'),
  CONSTRAINT xcore_analysis_report_items_measurements_check CHECK (jsonb_typeof(measurement_snapshot) = 'array'),
  UNIQUE (report_id, display_order)
);

CREATE INDEX IF NOT EXISTS idx_xcore_analysis_cases_owner ON xcore_analysis_cases(created_by, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_xcore_analysis_cases_patient ON xcore_analysis_cases(patient_id);
CREATE INDEX IF NOT EXISTS idx_xcore_analysis_case_items_case ON xcore_analysis_case_items(case_id, display_order);
CREATE INDEX IF NOT EXISTS idx_xcore_analysis_case_items_study_scope ON xcore_analysis_case_items(study_id, series_uid, viewer_type);
CREATE INDEX IF NOT EXISTS idx_xcore_analysis_reports_case ON xcore_analysis_reports(case_id, version DESC);

CREATE OR REPLACE FUNCTION update_xcore_analysis_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_xcore_analysis_cases_updated_at ON xcore_analysis_cases;
CREATE TRIGGER trg_xcore_analysis_cases_updated_at BEFORE UPDATE ON xcore_analysis_cases
FOR EACH ROW EXECUTE FUNCTION update_xcore_analysis_updated_at();
DROP TRIGGER IF EXISTS trg_xcore_analysis_case_items_updated_at ON xcore_analysis_case_items;
CREATE TRIGGER trg_xcore_analysis_case_items_updated_at BEFORE UPDATE ON xcore_analysis_case_items
FOR EACH ROW EXECUTE FUNCTION update_xcore_analysis_updated_at();
