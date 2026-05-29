-- Financial ownership is immutable after payment/invoice creation.
-- Corrections must be handled by an explicit reversal/correction workflow, not silent UPDATEs.

CREATE OR REPLACE FUNCTION prevent_financial_owner_update()
RETURNS trigger AS $$
BEGIN
  IF OLD.owner_type IS DISTINCT FROM NEW.owner_type
     OR OLD.owner_clinic_id IS DISTINCT FROM NEW.owner_clinic_id
     OR OLD.owner_dentist_id IS DISTINCT FROM NEW.owner_dentist_id THEN
    RAISE EXCEPTION 'financial ownership is immutable for % id %', TG_TABLE_NAME, OLD.id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payment_intents_owner_immutable ON payment_intents;
CREATE TRIGGER trg_payment_intents_owner_immutable
  BEFORE UPDATE OF owner_type, owner_clinic_id, owner_dentist_id
  ON payment_intents
  FOR EACH ROW
  EXECUTE FUNCTION prevent_financial_owner_update();

DROP TRIGGER IF EXISTS trg_invoices_owner_immutable ON invoices;
CREATE TRIGGER trg_invoices_owner_immutable
  BEFORE UPDATE OF owner_type, owner_clinic_id, owner_dentist_id
  ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION prevent_financial_owner_update();
