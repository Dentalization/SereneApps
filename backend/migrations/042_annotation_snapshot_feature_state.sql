ALTER TABLE annotation_snapshots
  ADD COLUMN IF NOT EXISTS feature_state JSONB NOT NULL DEFAULT '{}'::jsonb;

