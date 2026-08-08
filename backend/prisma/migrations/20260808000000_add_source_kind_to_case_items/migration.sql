-- Phase 6: Add source_kind to xcore_analysis_case_items
-- Tracks whether each imaging source is DICOM, STATIC_JPG, STATIC_PNG, or MORITA.
-- Null = unknown / legacy items (backward-compatible).

ALTER TABLE "xcore_analysis_case_items"
  ADD COLUMN IF NOT EXISTS "source_kind" VARCHAR(16);
