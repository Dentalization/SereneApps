-- Migration: Verified Case Workspace clinical workflow
-- Supports sessions, patients, case images, quality checks, AI/clinician findings,
-- immutable audit events, exports, and patient timeline linkage.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS verified_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NULL,
  clinic_id TEXT NULL,
  patient_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(255) NULL,
  title TEXT NOT NULL,
  status VARCHAR(64) NOT NULL DEFAULT 'draft',
  created_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ NULL,
  exported_at TIMESTAMPTZ NULL,
  archived_at TIMESTAMPTZ NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT verified_case_status_check CHECK (
    status IN (
      'draft',
      'images_uploaded',
      'quality_checked',
      'analysis_completed',
      'pending_clinician_review',
      'verified',
      'exported',
      'archived'
    )
  )
);

CREATE TABLE IF NOT EXISTS case_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES verified_cases(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  mime_type VARCHAR(128) NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  content_hash VARCHAR(128) NOT NULL,
  storage_ref TEXT NOT NULL,
  annotated_image_ref TEXT NULL,
  annotated_image_mime_type VARCHAR(128) NULL,
  duplicate_of UUID NULL REFERENCES case_images(id) ON DELETE SET NULL,
  upload_status VARCHAR(64) NOT NULL DEFAULT 'uploaded',
  quality_status VARCHAR(64) NULL,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS image_quality_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES verified_cases(id) ON DELETE CASCADE,
  image_id UUID NOT NULL REFERENCES case_images(id) ON DELETE CASCADE,
  quality_score INTEGER NOT NULL,
  quality_status VARCHAR(64) NOT NULL,
  issues JSONB NOT NULL DEFAULT '[]',
  recommendation TEXT NULL,
  can_continue_analysis BOOLEAN NOT NULL DEFAULT FALSE,
  metrics JSONB NOT NULL DEFAULT '{}',
  checked_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT image_quality_status_check CHECK (
    quality_status IN ('acceptable', 'warning', 'rejected', 'needs_retake')
  )
);

CREATE TABLE IF NOT EXISTS ai_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES verified_cases(id) ON DELETE CASCADE,
  image_id UUID NULL REFERENCES case_images(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  tooth_or_region TEXT NULL,
  severity VARCHAR(64) NOT NULL DEFAULT 'mild',
  confidence DOUBLE PRECISION NULL,
  source VARCHAR(64) NOT NULL DEFAULT 'ai',
  status VARCHAR(64) NOT NULL DEFAULT 'ai_suggested',
  notes TEXT NULL,
  raw_ai_result JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ai_finding_status_check CHECK (status = 'ai_suggested')
);

CREATE TABLE IF NOT EXISTS clinician_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES verified_cases(id) ON DELETE CASCADE,
  image_id UUID NULL REFERENCES case_images(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  tooth_or_region TEXT NULL,
  severity VARCHAR(64) NOT NULL DEFAULT 'mild',
  confidence DOUBLE PRECISION NULL,
  source VARCHAR(64) NOT NULL DEFAULT 'clinician',
  status VARCHAR(64) NOT NULL,
  notes TEXT NULL,
  urgent_referral BOOLEAN NOT NULL DEFAULT FALSE,
  needs_in_person_exam BOOLEAN NOT NULL DEFAULT FALSE,
  confirmed_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT clinician_finding_status_check CHECK (
    status IN (
      'clinician_confirmed',
      'clinician_rejected',
      'clinician_edited',
      'manual_added'
    )
  )
);

CREATE TABLE IF NOT EXISTS case_audit_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES verified_cases(id) ON DELETE RESTRICT,
  actor_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  actor_role VARCHAR(64) NOT NULL,
  event_type VARCHAR(96) NOT NULL,
  before_json JSONB NULL,
  after_json JSONB NULL,
  reason TEXT NULL,
  request_id VARCHAR(128) NULL,
  device_metadata JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS case_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES verified_cases(id) ON DELETE CASCADE,
  format VARCHAR(16) NOT NULL,
  redacted BOOLEAN NOT NULL DEFAULT FALSE,
  mime_type VARCHAR(128) NOT NULL,
  storage_ref TEXT NOT NULL,
  exported_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  exported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT case_export_format_check CHECK (format IN ('pdf', 'json'))
);

CREATE TABLE IF NOT EXISTS patient_timeline_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  case_id UUID NULL REFERENCES verified_cases(id) ON DELETE SET NULL,
  event_type VARCHAR(96) NOT NULL,
  event_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  case_title TEXT NULL,
  case_status VARCHAR(64) NULL,
  confirmed_findings_summary TEXT NULL,
  image_count INTEGER NOT NULL DEFAULT 0,
  report_link TEXT NULL,
  related_session_id VARCHAR(255) NULL,
  details JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_verified_cases_patient_updated ON verified_cases(patient_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_verified_cases_tenant_clinic_updated ON verified_cases(tenant_id, clinic_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_verified_cases_session ON verified_cases(session_id);
CREATE INDEX IF NOT EXISTS idx_verified_cases_status_updated ON verified_cases(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_images_case ON case_images(case_id);
CREATE INDEX IF NOT EXISTS idx_case_images_hash ON case_images(case_id, content_hash);
CREATE INDEX IF NOT EXISTS idx_quality_checks_case_image ON image_quality_checks(case_id, image_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_findings_case ON ai_findings(case_id);
CREATE INDEX IF NOT EXISTS idx_clinician_findings_case ON clinician_findings(case_id);
CREATE INDEX IF NOT EXISTS idx_case_audit_case_created ON case_audit_events(case_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_case_exports_case ON case_exports(case_id, exported_at DESC);
CREATE INDEX IF NOT EXISTS idx_patient_timeline_patient_date ON patient_timeline_events(patient_id, event_date DESC);

CREATE OR REPLACE FUNCTION update_verified_case_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_verified_case_updated_at ON verified_cases;
CREATE TRIGGER trigger_verified_case_updated_at
BEFORE UPDATE ON verified_cases
FOR EACH ROW
EXECUTE FUNCTION update_verified_case_updated_at();

CREATE OR REPLACE FUNCTION prevent_case_audit_event_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'case_audit_events are immutable';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_case_audit_events_no_update ON case_audit_events;
CREATE TRIGGER trigger_case_audit_events_no_update
BEFORE UPDATE ON case_audit_events
FOR EACH ROW
EXECUTE FUNCTION prevent_case_audit_event_mutation();

DROP TRIGGER IF EXISTS trigger_case_audit_events_no_delete ON case_audit_events;
CREATE TRIGGER trigger_case_audit_events_no_delete
BEFORE DELETE ON case_audit_events
FOR EACH ROW
EXECUTE FUNCTION prevent_case_audit_event_mutation();

CREATE OR REPLACE FUNCTION prevent_verified_case_hard_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'verified_cases must be archived, not deleted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_verified_cases_no_delete ON verified_cases;
CREATE TRIGGER trigger_verified_cases_no_delete
BEFORE DELETE ON verified_cases
FOR EACH ROW
EXECUTE FUNCTION prevent_verified_case_hard_delete();

COMMENT ON TABLE verified_cases IS 'Clinical case workspace records linking sessions, patients, images, findings, exports, and timeline events.';
COMMENT ON TABLE case_audit_events IS 'Immutable case audit log; events must never be deleted or updated by application code.';
