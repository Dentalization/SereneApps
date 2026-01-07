-- Migration: Create AI Analysis Results table
-- This table stores AI dental analysis results from the mobile app

CREATE TABLE IF NOT EXISTS ai_analysis_results (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL,
  image_url TEXT,
  annotated_image_url TEXT,
  findings TEXT,
  summary TEXT,
  overall_assessment TEXT,
  risk_level VARCHAR(50),
  confidence_score DOUBLE PRECISION,
  detections JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_ai_analysis_user_created ON ai_analysis_results(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_session ON ai_analysis_results(session_id);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_ai_analysis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ai_analysis_updated_at ON ai_analysis_results;
CREATE TRIGGER trigger_ai_analysis_updated_at
BEFORE UPDATE ON ai_analysis_results
FOR EACH ROW
EXECUTE FUNCTION update_ai_analysis_updated_at();

-- Comment on table
COMMENT ON TABLE ai_analysis_results IS 'Stores AI dental diagnosis results from mobile app for dentist reference';
COMMENT ON COLUMN ai_analysis_results.session_id IS 'DeepDental AI session ID';
COMMENT ON COLUMN ai_analysis_results.risk_level IS 'Overall risk level: low, moderate, high';
COMMENT ON COLUMN ai_analysis_results.detections IS 'Array of detected issues with labels, confidence, area';
COMMENT ON COLUMN ai_analysis_results.recommendations IS 'Array of treatment recommendations';
