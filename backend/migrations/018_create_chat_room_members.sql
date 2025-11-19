-- Migration: chat room members & last read tracking

CREATE TABLE IF NOT EXISTS chat_room_members (
  id BIGSERIAL PRIMARY KEY,
  chat_room_id BIGINT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL,
  last_read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(chat_room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_room_members_user
  ON chat_room_members (user_id, chat_room_id);
