const CHAT_READINESS_COPY = {
  TOKEN_RESPONSE_MISSING: {
    key: 'teledentistry.chatReadiness.tokenResponseMissing',
    defaultMessage: 'The teledentistry session response is incomplete. Please try again.',
  },
  PAYMENT_PENDING: {
    key: 'teledentistry.chatReadiness.paymentPending',
    defaultMessage: 'Payment is not complete yet. Chat will be available after payment is confirmed.',
  },
  SESSION_ENDED: {
    key: 'teledentistry.chatReadiness.sessionEnded',
    defaultMessage: 'The teledentistry session has ended. Chat history is shown from the local archive.',
  },
  CHAT_NOT_READY: {
    key: 'teledentistry.chatReadiness.chatNotReady',
    defaultMessage: 'Chat is not available for this appointment yet. Please try again shortly.',
  },
  CHAT_TOKEN_MISSING: {
    key: 'teledentistry.chatReadiness.chatTokenMissing',
    defaultMessage: 'Chat token is not available yet. Please try again or contact admin.',
  },
  CONVERSATION_NOT_READY: {
    key: 'teledentistry.chatReadiness.conversationNotReady',
    defaultMessage: 'The chat conversation is not ready yet. Please try again shortly.',
  },
};

function issue(code, waitingRoom = null) {
  const copy = CHAT_READINESS_COPY[code] || CHAT_READINESS_COPY.CHAT_NOT_READY;
  return {
    ready: false,
    code,
    messageKey: copy.key,
    defaultMessage: copy.defaultMessage,
    waitingRoom,
  };
}

export function getChatTokenReadiness(tokenEnvelope) {
  if (!tokenEnvelope || typeof tokenEnvelope !== 'object') {
    return issue('TOKEN_RESPONSE_MISSING');
  }

  const waitingRoom = tokenEnvelope.waitingRoom || null;
  const chat = tokenEnvelope.chat || {};
  const canChat = waitingRoom?.canChat ?? chat.canRead ?? true;

  if (waitingRoom?.state === 'payment_pending') {
    return issue('PAYMENT_PENDING', waitingRoom);
  }

  if (waitingRoom?.state === 'ended') {
    return issue('SESSION_ENDED', waitingRoom);
  }

  if (canChat === false || chat.canRead === false) {
    return issue('CHAT_NOT_READY', waitingRoom);
  }

  const token = chat.token || tokenEnvelope.token;
  if (!token) {
    return issue('CHAT_TOKEN_MISSING', waitingRoom);
  }

  const conversationSid = chat.conversationSid || tokenEnvelope.conversationSid;
  if (!conversationSid) {
    return issue('CONVERSATION_NOT_READY', waitingRoom);
  }

  return { ready: true };
}

export function messageFromTokenFetchError(error) {
  const payload = error?.response?.data || {};
  const waitingRoom = payload.waitingRoom || null;
  const code = payload.error?.code || error?.code || '';

  if (waitingRoom?.state === 'payment_pending' || code === 'COMMUNICATIONS_NOT_READY') {
    return issue('PAYMENT_PENDING', waitingRoom);
  }

  if (waitingRoom?.state === 'ended' || code === 'ROOM_ENDED') {
    return issue('SESSION_ENDED', waitingRoom);
  }

  return issue('CHAT_NOT_READY', waitingRoom);
}

export function makeChatReadinessError(readiness) {
  const error = new Error(readiness?.defaultMessage || CHAT_READINESS_COPY.CHAT_NOT_READY.defaultMessage);
  error.code = readiness?.code || 'CHAT_NOT_READY';
  error.waitingRoom = readiness?.waitingRoom || null;
  return error;
}
