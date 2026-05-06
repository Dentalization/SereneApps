import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getChatTokenReadiness,
  messageFromTokenFetchError,
} from '../src/utils/teledentistryTokenReadiness.mjs';

test('chat token readiness blocks payment-pending waiting room before Twilio init', () => {
  const readiness = getChatTokenReadiness({
    waitingRoom: {
      state: 'payment_pending',
      canChat: false,
    },
    chat: {
      token: 'token',
      conversationSid: 'CH123',
    },
  });

  assert.equal(readiness.ready, false);
  assert.equal(readiness.code, 'PAYMENT_PENDING');
});

test('chat token readiness blocks ended sessions from live Twilio subscription', () => {
  const readiness = getChatTokenReadiness({
    waitingRoom: {
      state: 'ended',
      canChat: true,
    },
    chat: {
      token: 'token',
      conversationSid: 'CH123',
    },
  });

  assert.equal(readiness.ready, false);
  assert.equal(readiness.code, 'SESSION_ENDED');
});

test('chat token readiness requires a readable chat token and conversation sid', () => {
  assert.equal(getChatTokenReadiness({
    waitingRoom: { state: 'ready', canChat: true },
    chat: { token: '', conversationSid: 'CH123' },
  }).code, 'CHAT_TOKEN_MISSING');

  assert.equal(getChatTokenReadiness({
    waitingRoom: { state: 'ready', canChat: true },
    chat: { token: 'token', conversationSid: '' },
  }).code, 'CONVERSATION_NOT_READY');
});

test('chat token readiness accepts ready unified token envelope', () => {
  assert.deepEqual(getChatTokenReadiness({
    waitingRoom: { state: 'ready', canChat: true },
    chat: { token: 'token', conversationSid: 'CH123' },
  }), { ready: true });
});

test('token fetch errors produce specific waiting-room messages', () => {
  const error = {
    response: {
      data: {
        error: { code: 'COMMUNICATIONS_NOT_READY' },
        waitingRoom: { state: 'payment_pending', canChat: false },
      },
    },
  };

  assert.equal(messageFromTokenFetchError(error).code, 'PAYMENT_PENDING');
});
