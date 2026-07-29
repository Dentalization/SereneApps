-- ClinicStaff is the canonical dentist-to-clinic assignment. These legacy
-- DentistProfile columns remain synchronized for financial and directory
-- consumers that have not yet migrated to the canonical relation.
UPDATE clinic_staff AS cs
   SET assigned_branch_id = NULL,
       updated_at = NOW()
 WHERE assigned_branch_id IS NOT NULL
   AND NOT EXISTS (
     SELECT 1
       FROM clinic_branches AS cb
      WHERE cb.id = cs.assigned_branch_id
        AND cb.clinic_profile_id = cs.clinic_profile_id
   );

CREATE OR REPLACE FUNCTION sync_dentist_profile_clinic_assignment()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id BIGINT;
  active_clinic_id BIGINT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_user_id := OLD.user_id;
  ELSE
    target_user_id := NEW.user_id;
  END IF;

  SELECT clinic_profile_id
    INTO active_clinic_id
    FROM clinic_staff
   WHERE user_id = target_user_id
     AND is_active = TRUE
   LIMIT 1;

  UPDATE dentist_profiles
     SET clinic_id = active_clinic_id,
         dentist_type = CASE WHEN active_clinic_id IS NULL THEN 'independent' ELSE 'clinic' END,
         updated_at = NOW()
   WHERE user_id = target_user_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_dentist_profile_clinic_assignment ON clinic_staff;
CREATE TRIGGER trg_sync_dentist_profile_clinic_assignment
AFTER INSERT OR UPDATE OF clinic_profile_id, is_active OR DELETE
ON clinic_staff
FOR EACH ROW
EXECUTE FUNCTION sync_dentist_profile_clinic_assignment();

UPDATE dentist_profiles AS dp
   SET clinic_id = cs.clinic_profile_id,
       dentist_type = 'clinic',
       updated_at = NOW()
  FROM clinic_staff AS cs
 WHERE cs.user_id = dp.user_id
   AND cs.is_active = TRUE;

UPDATE dentist_profiles AS dp
   SET clinic_id = NULL,
       dentist_type = 'independent',
       updated_at = NOW()
 WHERE NOT EXISTS (
   SELECT 1
     FROM clinic_staff AS cs
    WHERE cs.user_id = dp.user_id
      AND cs.is_active = TRUE
 );
