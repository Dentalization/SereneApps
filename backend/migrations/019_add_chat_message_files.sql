-- Migration: chat message attachments

ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT;

CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at
  ON chat_messages (created_at DESC);
