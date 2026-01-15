-- Add consultationType to appointments table
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS consultation_type VARCHAR DEFAULT 'onsite';

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_appointments_consultation_type 
ON appointments(consultation_type);

-- Backfill existing appointments based on videoRoomRef presence
UPDATE appointments
SET consultation_type = CASE 
  WHEN video_room_ref IS NOT NULL THEN 'virtual'
  ELSE 'onsite'
END
WHERE consultation_type = 'onsite' OR consultation_type IS NULL;
