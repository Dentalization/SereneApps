-- Add twilio_message_sid to chat_messages for synchronization with Twilio Conversations
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS twilio_message_sid VARCHAR(255) UNIQUE;

-- Index for faster lookup during webhook processing
CREATE INDEX IF NOT EXISTS idx_chat_messages_twilio_sid ON chat_messages(twilio_message_sid);
