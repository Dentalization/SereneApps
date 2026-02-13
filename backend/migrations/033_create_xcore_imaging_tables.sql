-- Migration: Create X-Core imaging tables
-- Description: Create imaging_studies, imaging_series, and ai_results tables for X-Core functionality

-- Create imaging_studies table
CREATE TABLE IF NOT EXISTS imaging_studies (
  id BIGSERIAL PRIMARY KEY,
  patient_id BIGINT NOT NULL,
  dentist_id BIGINT,
  clinic_id BIGINT,
  study_date DATE NOT NULL,
  description TEXT,
  modality VARCHAR(50) NOT NULL,
  folder_name TEXT NOT NULL,
  original_name TEXT,
  status TEXT DEFAULT 'uploading' NOT NULL,
  metadata JSONB DEFAULT '{}',
  size_in_bytes BIGINT DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ(6) DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ(6) DEFAULT NOW() NOT NULL,
  
  CONSTRAINT fk_imaging_studies_patient FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_imaging_studies_dentist FOREIGN KEY (dentist_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_imaging_studies_patient ON imaging_studies(patient_id);
CREATE INDEX IF NOT EXISTS idx_imaging_studies_date ON imaging_studies(study_date);

-- Create imaging_series table
CREATE TABLE IF NOT EXISTS imaging_series (
  id BIGSERIAL PRIMARY KEY,
  study_id BIGINT NOT NULL,
  series_number INT,
  modality VARCHAR(50) NOT NULL,
  description TEXT,
  body_part TEXT,
  slice_thickness DOUBLE PRECISION,
  pixel_spacing JSONB,
  kv DOUBLE PRECISION,
  ma DOUBLE PRECISION,
  exposure_time DOUBLE PRECISION,
  num_slices INT DEFAULT 0 NOT NULL,
  folder_path TEXT NOT NULL,
  preview_image_url TEXT,
  created_at TIMESTAMPTZ(6) DEFAULT NOW() NOT NULL,
  
  CONSTRAINT fk_imaging_series_study FOREIGN KEY (study_id) REFERENCES imaging_studies(id) ON DELETE CASCADE
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_imaging_series_study ON imaging_series(study_id);

-- Create ai_results table
CREATE TABLE IF NOT EXISTS ai_results (
  id BIGSERIAL PRIMARY KEY,
  series_id BIGINT NOT NULL,
  model_name TEXT NOT NULL,
  analyzed_at TIMESTAMPTZ(6) DEFAULT NOW() NOT NULL,
  findings JSONB DEFAULT '[]' NOT NULL,
  status TEXT DEFAULT 'completed' NOT NULL,
  created_at TIMESTAMPTZ(6) DEFAULT NOW() NOT NULL,
  
  CONSTRAINT fk_ai_results_series FOREIGN KEY (series_id) REFERENCES imaging_series(id) ON DELETE CASCADE
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_ai_results_series ON ai_results(series_id);

-- Add trigger for updated_at on imaging_studies
CREATE OR REPLACE FUNCTION update_imaging_studies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_imaging_studies_updated_at ON imaging_studies;
CREATE TRIGGER update_imaging_studies_updated_at
    BEFORE UPDATE ON imaging_studies
    FOR EACH ROW
    EXECUTE FUNCTION update_imaging_studies_updated_at();

-- Add comment for documentation
COMMENT ON TABLE imaging_studies IS 'X-Core medical imaging studies storage';
COMMENT ON TABLE imaging_series IS 'DICOM series within imaging studies';
COMMENT ON TABLE ai_results IS 'AI analysis results for imaging series';
