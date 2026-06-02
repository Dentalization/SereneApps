DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_non_negative_pending') THEN
        ALTER TABLE available_balances ADD CONSTRAINT check_non_negative_pending CHECK (pending_amount >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_reasonable_available') THEN
        ALTER TABLE available_balances ADD CONSTRAINT check_reasonable_available CHECK (available_amount >= -1000000000);
    END IF;
END;
$$;
