-- Update trigger helper so it works for both snake_case and camelCase columns
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
