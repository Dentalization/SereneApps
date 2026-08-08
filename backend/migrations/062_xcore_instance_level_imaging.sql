-- Migration 062: Instance-Level Imaging for X-Core Analysis Cases and Study Annotations

ALTER TABLE xcore_analysis_case_items
  ADD COLUMN IF NOT EXISTS sop_instance_uid TEXT,
  ADD COLUMN IF NOT EXISTS instance_number INTEGER,
  ADD COLUMN IF NOT EXISTS frame_index INTEGER,
  ADD COLUMN IF NOT EXISTS image_index INTEGER,
  ADD COLUMN IF NOT EXISTS source_instance_key TEXT;

ALTER TABLE xcore_analysis_case_items
  DROP CONSTRAINT IF EXISTS xcore_case_items_frame_index_check,
  DROP CONSTRAINT IF EXISTS xcore_case_items_image_index_check,
  DROP CONSTRAINT IF EXISTS xcore_case_items_instance_number_check,
  DROP CONSTRAINT IF EXISTS xcore_case_items_source_key_check;

ALTER TABLE xcore_analysis_case_items
  ADD CONSTRAINT xcore_case_items_frame_index_check CHECK (frame_index IS NULL OR frame_index >= 0),
  ADD CONSTRAINT xcore_case_items_image_index_check CHECK (image_index IS NULL OR image_index >= 0),
  ADD CONSTRAINT xcore_case_items_instance_number_check CHECK (instance_number IS NULL OR instance_number > 0),
  ADD CONSTRAINT xcore_case_items_source_key_check CHECK (source_instance_key IS NULL OR length(trim(source_instance_key)) > 0);

UPDATE xcore_analysis_case_items
SET source_instance_key = 'series:' || series_uid || ':legacy'
WHERE source_instance_key IS NULL;

ALTER TABLE xcore_analysis_case_items
  ALTER COLUMN source_instance_key SET NOT NULL,
  ALTER COLUMN source_instance_key SET DEFAULT 'series:legacy';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'xcore_analysis_case_items_instance_unique'
  ) THEN
    ALTER TABLE xcore_analysis_case_items
      ADD CONSTRAINT xcore_analysis_case_items_instance_unique
      UNIQUE (case_id, study_id, series_uid, source_instance_key);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_xcore_analysis_case_items_instance_scope
  ON xcore_analysis_case_items(study_id, series_uid, source_instance_key);

-- Add instance columns to study_annotations
ALTER TABLE study_annotations
  ADD COLUMN IF NOT EXISTS sop_instance_uid TEXT,
  ADD COLUMN IF NOT EXISTS instance_number INTEGER,
  ADD COLUMN IF NOT EXISTS frame_index INTEGER,
  ADD COLUMN IF NOT EXISTS image_index INTEGER,
  ADD COLUMN IF NOT EXISTS source_instance_key TEXT;

CREATE INDEX IF NOT EXISTS idx_study_annotations_instance_scope
  ON study_annotations(study_id, series_uid, viewer_type, source_instance_key);

-- Add instance columns to xcore_analysis_report_items for immutable snapshots
ALTER TABLE xcore_analysis_report_items
  ADD COLUMN IF NOT EXISTS sop_instance_uid TEXT,
  ADD COLUMN IF NOT EXISTS instance_number INTEGER,
  ADD COLUMN IF NOT EXISTS frame_index INTEGER,
  ADD COLUMN IF NOT EXISTS image_index INTEGER,
  ADD COLUMN IF NOT EXISTS source_instance_key TEXT;

COMMENT ON COLUMN xcore_analysis_case_items.source_instance_key IS
  'Canonical identity for single 2D image/instance (sop:<uid>, sop:<uid>:frame:<idx>, series:<uid>:image:<idx>, or series:<uid>:legacy).';
COMMENT ON COLUMN study_annotations.source_instance_key IS
  'Canonical instance key to isolate annotations to specific 2D image instances.';
