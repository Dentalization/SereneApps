import test from 'node:test';
import assert from 'node:assert/strict';
import ConversationsAdapter from '../src/services/communications/conversationsAdapter.js';

test('mock conversations adapter supports message send workflow without Twilio credentials', async () => {
  const previousMockMode = process.env.TWILIO_MOCK_MODE;
  process.env.TWILIO_MOCK_MODE = 'true';

  try {
    const adapter = new ConversationsAdapter();
    const conversation = await adapter.createConversation({
      uniqueName: 'appointment-123',
      friendlyName: 'Synthetic consultation',
    });
    const participant = await adapter.addParticipant({
      conversationSid: conversation.sid,
      identity: 'patient-1',
      friendlyName: 'Synthetic Patient',
    });
    const message = await adapter.sendMessage({
      conversationSid: conversation.sid,
      author: 'patient-1',
      body: 'Synthetic consultation message',
      attributes: { appointmentId: '123' },
    });

    assert.match(conversation.sid, /^mock_conv_/);
    assert.equal(conversation.uniqueName, 'appointment-123');
    assert.match(participant.participantSid, /^mock_part_/);
    assert.match(message.messageSid, /^mock_msg_/);
    assert.ok(Date.parse(message.dateCreated));
  } finally {
    if (previousMockMode === undefined) {
      delete process.env.TWILIO_MOCK_MODE;
    } else {
      process.env.TWILIO_MOCK_MODE = previousMockMode;
    }
  }
});

test('mock conversations adapter creates bounded access token metadata', async () => {
  const previousMockMode = process.env.TWILIO_MOCK_MODE;
  process.env.TWILIO_MOCK_MODE = 'true';

  try {
    const adapter = new ConversationsAdapter();
    const before = Date.now();
    const token = await adapter.generateAccessToken({ identity: 'dentist-10', ttl: 120 });
    const after = Date.now();

    assert.match(token.token, /^mock_token_/);
    assert.equal(token.identity, 'dentist-10');
    assert.ok(Date.parse(token.expiresAt) >= before + 119_000);
    assert.ok(Date.parse(token.expiresAt) <= after + 121_000);
  } finally {
    if (previousMockMode === undefined) {
      delete process.env.TWILIO_MOCK_MODE;
    } else {
      process.env.TWILIO_MOCK_MODE = previousMockMode;
    }
  }
});
