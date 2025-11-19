-- Migration: link appointments to communication rooms

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS chat_room_ref TEXT,
  ADD COLUMN IF NOT EXISTS video_room_ref TEXT,
  ADD COLUMN IF NOT EXISTS comm_status VARCHAR NOT NULL DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_appointments_comm_status
  ON appointments (comm_status);
