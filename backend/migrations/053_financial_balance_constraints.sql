-- Migration: Add CHECK constraints to secure AvailableBalance columns against corruption/overflows

ALTER TABLE available_balances ADD CONSTRAINT check_non_negative_pending CHECK (pending_amount >= 0);
ALTER TABLE available_balances ADD CONSTRAINT check_reasonable_available CHECK (available_amount >= -1000000000);
