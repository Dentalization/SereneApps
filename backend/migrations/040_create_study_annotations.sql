CREATE TABLE IF NOT EXISTS study_annotations (
  id TEXT PRIMARY KEY,
  study_id BIGINT NOT NULL REFERENCES imaging_studies(id) ON DELETE CASCADE,
  series_uid TEXT NOT NULL,
  viewer_type TEXT NOT NULL,
  slice_axis TEXT,
  slice_index INTEGER,
  type TEXT NOT NULL,
  coordinates JSONB NOT NULL,
  label TEXT,
  color TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'study_annotations_viewer_type_check'
  ) THEN
    ALTER TABLE study_annotations
      ADD CONSTRAINT study_annotations_viewer_type_check
      CHECK (viewer_type IN ('2d', 'slice', '3d')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'study_annotations_type_check'
  ) THEN
    ALTER TABLE study_annotations
      ADD CONSTRAINT study_annotations_type_check
      CHECK (type IN ('arrow', 'circle', 'text', 'freehand', 'region')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'study_annotations_coordinates_object_check'
  ) THEN
    ALTER TABLE study_annotations
      ADD CONSTRAINT study_annotations_coordinates_object_check
      CHECK (jsonb_typeof(coordinates) = 'object') NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'study_annotations_metadata_object_check'
  ) THEN
    ALTER TABLE study_annotations
      ADD CONSTRAINT study_annotations_metadata_object_check
      CHECK (metadata IS NULL OR jsonb_typeof(metadata) = 'object') NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_study_annotations_scope
  ON study_annotations(study_id, series_uid, viewer_type);

CREATE INDEX IF NOT EXISTS idx_study_annotations_slice
  ON study_annotations(study_id, series_uid, viewer_type, slice_axis, slice_index);

CREATE INDEX IF NOT EXISTS idx_study_annotations_created_by
  ON study_annotations(created_by);

CREATE OR REPLACE FUNCTION update_study_annotations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_study_annotations_updated_at ON study_annotations;
CREATE TRIGGER trg_study_annotations_updated_at
  BEFORE UPDATE ON study_annotations
  FOR EACH ROW
  EXECUTE FUNCTION update_study_annotations_updated_at();
