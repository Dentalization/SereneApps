ALTER TABLE study_annotations
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS reviewed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewer_comment TEXT,
  ADD COLUMN IF NOT EXISTS confidence_score DOUBLE PRECISION NOT NULL DEFAULT 0.7;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'study_annotations_review_status_check'
  ) THEN
    ALTER TABLE study_annotations
      ADD CONSTRAINT study_annotations_review_status_check
      CHECK (review_status IN ('draft', 'submitted', 'approved', 'rejected')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'study_annotations_confidence_score_check'
  ) THEN
    ALTER TABLE study_annotations
      ADD CONSTRAINT study_annotations_confidence_score_check
      CHECK (confidence_score >= 0 AND confidence_score <= 1) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_study_annotations_review_status
  ON study_annotations(review_status);

CREATE INDEX IF NOT EXISTS idx_study_annotations_reviewed_by
  ON study_annotations(reviewed_by);

CREATE TABLE IF NOT EXISTS annotation_snapshots (
  id TEXT PRIMARY KEY,
  study_id BIGINT NOT NULL REFERENCES imaging_studies(id) ON DELETE CASCADE,
  series_uid TEXT NOT NULL,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note TEXT,
  annotations JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_annotation_snapshots_scope
  ON annotation_snapshots(study_id, series_uid, snapshot_at);

CREATE INDEX IF NOT EXISTS idx_annotation_snapshots_created_by
  ON annotation_snapshots(created_by);
