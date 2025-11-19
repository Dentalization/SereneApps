-- Migration: chat rooms and messages

CREATE TABLE IF NOT EXISTS chat_rooms (
  id BIGSERIAL PRIMARY KEY,
  appointment_id BIGINT NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
  channel_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  chat_room_id BIGINT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type VARCHAR NOT NULL DEFAULT 'text',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created_at
  ON chat_messages (chat_room_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_sender
  ON chat_messages (sender_id, created_at DESC);
