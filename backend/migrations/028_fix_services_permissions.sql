-- Migration: Fix clinic services permissions and timestamp trigger
-- Description: Ensure new service tables/sequences are owned by the application user
--              and restore the updated_at trigger compatibility with snake_case/camelCase columns.

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
DECLARE
  new_record jsonb := to_jsonb(NEW);
BEGIN
  IF new_record ? 'updated_at' THEN
    NEW := jsonb_populate_record(NEW, jsonb_build_object('updated_at', CURRENT_TIMESTAMP));
  ELSIF new_record ? 'updatedAt' THEN
    NEW := jsonb_populate_record(NEW, jsonb_build_object('updatedAt', CURRENT_TIMESTAMP));
  ELSE
    RAISE WARNING 'update_updated_at_column trigger on % has no updated_at or updatedAt column', TG_TABLE_NAME;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER FUNCTION update_updated_at_column OWNER TO serene;

ALTER TABLE IF EXISTS clinic_services OWNER TO serene;
ALTER SEQUENCE IF EXISTS clinic_services_id_seq OWNER TO serene;

ALTER TABLE IF EXISTS dentist_services OWNER TO serene;
ALTER SEQUENCE IF EXISTS dentist_services_id_seq OWNER TO serene;

ALTER TABLE IF EXISTS service_dentist_assignments OWNER TO serene;
ALTER SEQUENCE IF EXISTS service_dentist_assignments_id_seq OWNER TO serene;

ALTER TABLE IF EXISTS clinic_gallery OWNER TO serene;
ALTER SEQUENCE IF EXISTS clinic_gallery_id_seq OWNER TO serene;

ALTER TABLE IF EXISTS clinic_highlights OWNER TO serene;
ALTER SEQUENCE IF EXISTS clinic_highlights_id_seq OWNER TO serene;

ALTER TABLE IF EXISTS clinic_facilities OWNER TO serene;
ALTER SEQUENCE IF EXISTS clinic_facilities_id_seq OWNER TO serene;
