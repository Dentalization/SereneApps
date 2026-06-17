DO $$
BEGIN
  ALTER TABLE study_annotations
    DROP CONSTRAINT IF EXISTS study_annotations_type_check;

  ALTER TABLE study_annotations
    ADD CONSTRAINT study_annotations_type_check
    CHECK (type IN ('arrow', 'circle', 'text', 'freehand', 'region', 'brush', 'measurement')) NOT VALID;
END $$;
