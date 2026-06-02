-- AlterTable
ALTER TABLE appointment_clinical_summaries
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
