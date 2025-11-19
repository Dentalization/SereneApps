-- Create OTP verification table
CREATE TABLE IF NOT EXISTS "OTPVerification" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "identifier" TEXT NOT NULL UNIQUE,
  "otp" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS "OTPVerification_identifier_idx" ON "OTPVerification"("identifier");
CREATE INDEX IF NOT EXISTS "OTPVerification_expiresAt_idx" ON "OTPVerification"("expiresAt");

-- Auto-update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists first (for idempotency)
DROP TRIGGER IF EXISTS update_otp_verification_updated_at ON "OTPVerification";

CREATE TRIGGER update_otp_verification_updated_at BEFORE UPDATE
ON "OTPVerification" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
