-- Migration: Create study_shares table for public X-Core study links

CREATE TABLE IF NOT EXISTS study_shares (
  id BIGSERIAL PRIMARY KEY,
  study_id BIGINT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ(6) NOT NULL,
  created_at TIMESTAMPTZ(6) DEFAULT NOW() NOT NULL,

  CONSTRAINT fk_study_shares_study
    FOREIGN KEY (study_id) REFERENCES imaging_studies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_study_shares_study ON study_shares(study_id);
CREATE INDEX IF NOT EXISTS idx_study_shares_expires_at ON study_shares(expires_at);

COMMENT ON TABLE study_shares IS 'Public share links for read-only X-Core studies';
