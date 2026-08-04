-- Canonical X-Core report renders, structured marker findings, and immutable
-- render metadata. Existing single-render columns remain as an annotated-render
-- compatibility pointer and no historical report row is rewritten.

ALTER TABLE xcore_analysis_case_items
  ADD COLUMN IF NOT EXISTS structured_findings JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE xcore_analysis_case_items
  DROP CONSTRAINT IF EXISTS xcore_case_items_structured_findings_check;
ALTER TABLE xcore_analysis_case_items
  ADD CONSTRAINT xcore_case_items_structured_findings_check
  CHECK (jsonb_typeof(structured_findings) = 'array');

CREATE TABLE IF NOT EXISTS xcore_analysis_case_item_renders (
  id UUID PRIMARY KEY,
  case_item_id UUID NOT NULL REFERENCES xcore_analysis_case_items(id) ON DELETE CASCADE,
  render_type VARCHAR(16) NOT NULL,
  storage_path TEXT NOT NULL,
  checksum VARCHAR(64) NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  mime_type VARCHAR(32) NOT NULL,
  render_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  analysis_fingerprint VARCHAR(64) NOT NULL,
  validation_result JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT xcore_case_item_renders_type_check CHECK (render_type IN ('CLEAN', 'ANNOTATED')),
  CONSTRAINT xcore_case_item_renders_dimensions_check CHECK (width >= 256 AND height >= 256),
  CONSTRAINT xcore_case_item_renders_metadata_check CHECK (jsonb_typeof(render_metadata) = 'object'),
  CONSTRAINT xcore_case_item_renders_validation_check CHECK (jsonb_typeof(validation_result) = 'object'),
  UNIQUE (case_item_id, render_type, checksum, analysis_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_xcore_case_item_renders_latest
  ON xcore_analysis_case_item_renders(case_item_id, render_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xcore_case_item_renders_fingerprint
  ON xcore_analysis_case_item_renders(case_item_id, analysis_fingerprint);

ALTER TABLE xcore_analysis_report_items
  ADD COLUMN IF NOT EXISTS structured_findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS render_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS clean_render_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS clean_render_checksum VARCHAR(64);

ALTER TABLE xcore_analysis_report_items
  DROP CONSTRAINT IF EXISTS xcore_report_items_structured_findings_check;
ALTER TABLE xcore_analysis_report_items
  ADD CONSTRAINT xcore_report_items_structured_findings_check
  CHECK (jsonb_typeof(structured_findings) = 'array');

ALTER TABLE xcore_analysis_report_items
  DROP CONSTRAINT IF EXISTS xcore_report_items_render_metadata_check;
ALTER TABLE xcore_analysis_report_items
  ADD CONSTRAINT xcore_report_items_render_metadata_check
  CHECK (jsonb_typeof(render_metadata) = 'object');

COMMENT ON COLUMN xcore_analysis_case_items.render_storage_path IS
  'Backward-compatible pointer to the latest ANNOTATED render. Canonical render history is stored in xcore_analysis_case_item_renders.';
COMMENT ON TABLE xcore_analysis_case_item_renders IS
  'Immutable CLEAN and ANNOTATED report render revisions for one analysis-case item.';
