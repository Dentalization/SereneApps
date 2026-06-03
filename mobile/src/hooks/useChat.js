import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import api from '../services/api';



// Avoid using ES import to bypass Metro's _interopNamespace ESM shim which crashes Hermes with:
// "Cannot assign to property 'default' which has only a getter"
let _cachedConversationsClient = null;

const loadConversationsClient = () => {
  if (_cachedConversationsClient) {
    return _cachedConversationsClient;
  }

  try {
    const Client = require('../shims/twilio-conversations-shim');

    console.log(
      '[useChat] Client typeof:',
      typeof Client
    );

    if (typeof Client !== 'function') {
      throw new Error(
        `Invalid Twilio Client export: ${typeof Client}`
      );
    }

    _cachedConversationsClient = Client;

    return Client;
  } catch (err) {
    console.warn(
      '[useChat] Failed to load Twilio SDK:',
      err
    );

    return null;
  }
};

let globalTwilioClient = null;
let globalTwilioClientPromise = null;
let isInitializingTwilio = false;
let twilioInitAttempts = 0;
const MAX_TWILIO_ATTEMPTS = 1;
let isTeledentistryScreenActive = false;

export function setTeledentistryScreenActive(active) {
  isTeledentistryScreenActive = !!active;
}

export function getTeledentistryScreenActive() {
  return isTeledentistryScreenActive;
}

export function resetTwilioAttempts() {
  twilioInitAttempts = 0;
}

export async function getOrCreateTwilioClient(token) {
  if (globalTwilioClient) {
    try {
      console.log('E');
      await globalTwilioClient.updateToken(token);
      console.log('F');
    } catch (e) {
      console.warn('[useChat] TWILIO_INIT_FAILURE - error updating global Twilio token:', e.message);
    }
    return globalTwilioClient;
  }

  if (isInitializingTwilio && globalTwilioClientPromise) {
    console.log('[useChat] TWILIO_INIT_START - reusing existing initialization promise');
    return globalTwilioClientPromise;
  }

  if (twilioInitAttempts >= MAX_TWILIO_ATTEMPTS) {
    console.warn('[useChat] TWILIO_INIT_FAILURE - max initialization attempts reached, circuit breaker active');
    throw new Error('Twilio Conversations SDK chat is currently unavailable.');
  }

  const ConversationsClient = loadConversationsClient();
  if (!ConversationsClient) {
    console.error('[useChat] TWILIO_INIT_FAILURE - Unable to load Twilio Conversations SDK');
    throw new Error('Unable to load Twilio Conversations SDK');
  }

  console.log('[useChat] TWILIO_INIT_START - creating new Twilio client');
  isInitializingTwilio = true;
  twilioInitAttempts++;

  globalTwilioClientPromise = (async () => {
    try {
      const client = new ConversationsClient(token);
      console.log('A');
      globalTwilioClient = client;
      console.log('B');
      console.log('[useChat] TWILIO_INIT_SUCCESS - client created successfully');

      console.log('C');
      // Prevent crashes from unhandled client-level errors/websockets
      client.on('error', (err) => {
        console.warn('[useChat] Twilio Client internal error event:', err?.message || err);
      });
      client.on('connectionStateChanged', (state) => {
        console.log('[useChat] Event: connectionStateChanged ->', state);
      });
      client.on('connectionError', (err) => {
        console.log('[useChat] Event: connectionError ->', err);
      });
      client.on('tokenAboutToExpire', () => {
        console.log('[useChat] Event: tokenAboutToExpire');
      });
      client.on('tokenExpired', () => {
        console.log('[useChat] Event: tokenExpired');
      });
      client.on('stateChanged', (state) => {
        console.log('[useChat] Event: stateChanged ->', state);
      });
      console.log('D');

      return client;
    } catch (err) {
      console.error('[useChat] TWILIO_INIT_FAILURE - client creation failed:', err.message || err);
      throw err;
    } finally {
      isInitializingTwilio = false;
    }
  })();

  return globalTwilioClientPromise;
}

export function shutdownGlobalTwilioClient() {
  if (globalTwilioClient) {
    try {
      globalTwilioClient.shutdown();
    } catch (e) {
      console.warn('[useChat] Error shutting down global Twilio client:', e.message);
    }
    globalTwilioClient = null;
  }
}

export function getGlobalTwilioClient() {
  return globalTwilioClient;
}

/**
 * Mobile version of useChat using Twilio Conversations SDK
 * Mirrors EXACT return API as the socket.io version.
 */
export function useChat({ userId } = {}) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [activeAppointmentId, setActiveAppointmentId] = useState(null);
  const [messagesByAppointment, setMessagesByAppointment] = useState({});
  const [presenceMap, setPresenceMap] = useState({});
  const [typingByAppointment, setTypingByAppointment] = useState({});
  const [incomingCall, setIncomingCall] = useState(null);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [reconnectError, setReconnectError] = useState(null);
  const [chatUnavailable, setChatUnavailable] = useState(false);

  const twilioClientRef = useRef(null);
  const activeConversationRef = useRef(null);
  const typingTimersRef = useRef({});
  const isSelectingConversationRef = useRef(null);

  const isFetchingConversationsRef = useRef(false);
  // ── Fetch conversations from REST API ────────────────────────
  const fetchConversations = useCallback(async () => {
    if (isFetchingConversationsRef.current) return [];
    isFetchingConversationsRef.current = true;
    try {
      const { data } = await api.get('/communications/rooms');
      return data?.conversations || [];
    } catch (error) {
      console.error('[useChat] Failed to fetch conversations:', error.message);
      return [];
    } finally {
      isFetchingConversationsRef.current = false;
    }
  }, []);

  const refreshConversations = useCallback(async () => {
    try {
      const data = await fetchConversations();
      setConversations(data);
    } catch (error) {
      console.error('[useChat] Failed to refresh conversations:', error);
    }
  }, [fetchConversations]);

  // ── Derived state ────────────────────────────────────────────
  const activeConversation = useMemo(() => {
    if (!activeAppointmentId) return null;
    return conversations.find((conv) => String(conv.appointmentId) === activeAppointmentId) || null;
  }, [conversations, activeAppointmentId]);

  const activeMessages = useMemo(() => {
    if (!activeAppointmentId) return [];
    return (messagesByAppointment[activeAppointmentId] || []).filter((message) => (
      message.messageType !== 'system' && message.metadata?.type !== 'video_call'
    ));
  }, [messagesByAppointment, activeAppointmentId]);

  // ── Load conversations on mount ──────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        console.log('[useChat] LOAD_MESSAGES_START - initial conversations load');
        const data = await fetchConversations();
        setConversations(data);
        console.log('[useChat] LOAD_MESSAGES_END - initial conversations load complete');
      } catch (error) {
        console.error('[useChat] Initial load failed:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchConversations, userId]);

  // ── Handle Background AppState Reconnects ────────────────────
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        const client = twilioClientRef.current;
        if (client && activeAppointmentId) {
          try {
            console.log('[useChat] App returned to foreground, forcing token update...');
            const { data } = await api.get(`/communications/appointments/${activeAppointmentId}/token`);
            const refreshedToken = data?.chat?.token || data?.token;
            if (refreshedToken) {
              await client.updateToken(refreshedToken);
              setReconnectError(null);
            }
          } catch (e) {
            console.warn('[useChat] Error updating Twilio token in foreground:', e.message);
            setReconnectError(e.message || 'Failed to refresh chat session');
          }
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [activeAppointmentId]);

  // ── Clean up Twilio Client ───────────────────────────────────
  useEffect(() => {
    return () => {
      // Do NOT shut down the global client on hook unmount so the patient stays online
      if (activeConversationRef.current) {
        activeConversationRef.current.removeAllListeners();
        activeConversationRef.current = null;
      }
      Object.values(typingTimersRef.current).forEach(clearTimeout);
      typingTimersRef.current = {};
    };
  }, []);

  // ── RISK-003: Proactive token refresh (every 55 min) ─────────
  useEffect(() => {
    if (!activeAppointmentId) return;

    const REFRESH_INTERVAL = 55 * 60 * 1000; // 55 minutes
    const interval = setInterval(async () => {
      const client = twilioClientRef.current;
      if (!client) return;
      try {
        const { data } = await api.get(`/communications/appointments/${activeAppointmentId}/token`);
        const newToken = data?.chat?.token || data?.token;
        if (newToken) {
          await client.updateToken(newToken);
          if (__DEV__) console.log('[useChat] Proactive token refresh succeeded');
        }
      } catch (e) {
        console.warn('[useChat] Proactive token refresh failed:', e.message);
      }
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [activeAppointmentId]);

  const isMarkingReadRef = useRef({});
  const messageCountRef = useRef(0);

  // ── INIT TWILIO SDK / Select Conversation ────────────────────
  const selectConversation = useCallback(async (appointmentId) => {
    const normalizedAppointmentId = appointmentId != null ? String(appointmentId) : null;
    if (!normalizedAppointmentId) return;

    if (isSelectingConversationRef.current === normalizedAppointmentId) {
      console.log('[useChat] selectConversation already in progress for', normalizedAppointmentId, '— skipping');
      return;
    }
    isSelectingConversationRef.current = normalizedAppointmentId;

    setActiveAppointmentId(normalizedAppointmentId);

    console.log('[useChat] LOAD_MESSAGES_START - loading history messages');
    const historyPromise = api.get(`/communications/appointments/${normalizedAppointmentId}/chat/messages`)
      .then((history) => {
        console.log('[useChat] LOAD_MESSAGES_END - loaded history messages successfully');
        return history.data?.messages || [];
      })
      .catch((error) => {
        console.warn('[useChat] Failed to load chat history:', error.message);
        return [];
      });

    try {
      // 1-2. Fetch token with retry logic for provision race condition
      let data;
      let aborted = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await api.get(`/communications/appointments/${normalizedAppointmentId}/token`);
          data = response.data;
          break;
        } catch (err) {
          const errorCode = err.response?.data?.error?.code;
          if (['CONVERSATION_NOT_PROVISIONED', 'COMMUNICATIONS_NOT_READY'].includes(errorCode) && attempt < 2) {
            if (__DEV__) console.log(`[useChat] TWILIO_RETRY - Conversation not provisioned yet, retrying in ${2000 * Math.pow(2, attempt)}ms...`);
            await new Promise((resolve, reject) => {
              const timer = setTimeout(resolve, 2000 * Math.pow(2, attempt));
              // BUG-007: Allow abort on unmount
              if (aborted) {
                clearTimeout(timer);
                reject(new Error('Aborted'));
              }
            });
            continue;
          }
          throw err;
        }
      }

      const history = await historyPromise;
      if (history.length) {
        setMessagesByAppointment((prev) => ({
          ...prev,
          [normalizedAppointmentId]: history
        }));
      }

      const token = data.chat?.token || data.token;
      const conversationSid = data.chat?.conversationSid || data.conversationSid;

      // 3-4. Init / Update Client
      let client = await getOrCreateTwilioClient(token);
      twilioClientRef.current = client;
      setChatUnavailable(false);

      client.removeAllListeners('connectionStateChanged');
      client.on('connectionStateChanged', (state) => {
        setConnectionState(state);
        setSocketConnected(state === 'connected');
        if (state === 'connected') setReconnectError(null);
      });
      console.log('[useChat] connectionStateChanged listeners count:', typeof client.listenerCount === 'function' ? client.listenerCount('connectionStateChanged') : 'N/A');

      if (client.connectionState === 'connected') {
        setSocketConnected(true);
        setConnectionState('connected');
      }

      // 5. Subscribe to conversation
      console.log('A');
      console.log('[useChat] Promise type:', typeof Promise, Promise?.toString());
      console.log('[useChat] global.Promise type:', typeof global.Promise, global.Promise?.toString());
      console.log('[useChat] Promise match:', Promise === global.Promise);
      const conversation = await client.getConversationBySid(conversationSid);
      console.log('B');

      if (activeConversationRef.current) {
        activeConversationRef.current.removeAllListeners();
      }
      activeConversationRef.current = conversation;

      // Ensure presence populated initially with safety lock
      let isUpdatingPresence = false;
      const updatePresence = async () => {
        if (isUpdatingPresence) return;
        isUpdatingPresence = true;
        try {
          console.log('C');
          const participants = await conversation.getParticipants();
          console.log('D');
          const onlineIdentityStrings = participants.filter(p => p.isOnline).map(p => p.identity);
          setPresenceMap(prev => ({ ...prev, [normalizedAppointmentId]: onlineIdentityStrings }));
        } catch (e) {
          console.warn('[useChat] updatePresence error:', e.message);
        } finally {
          isUpdatingPresence = false;
        }
      };
      await updatePresence();

      // 7. presenceMap updates disabled temporarily for stack trace debugging
      // conversation.on('participantUpdated', () => {
      //   updatePresence().catch(err => console.warn('[useChat] participantUpdated presence sync failed:', err));
      // });
      // conversation.on('participantJoined', () => {
      //   updatePresence().catch(err => console.warn('[useChat] participantJoined presence sync failed:', err));
      // });
      // conversation.on('participantLeft', () => {
      //   updatePresence().catch(err => console.warn('[useChat] participantLeft presence sync failed:', err));
      // });

      const clearTypingParticipant = (participantKey) => {
        setTypingByAppointment((prev) => {
          const current = prev[normalizedAppointmentId] || [];
          return {
            ...prev,
            [normalizedAppointmentId]: current.filter((identity) => identity !== participantKey)
          };
        });
      };

      conversation.on('typingStarted', (participant) => {
        try {
          const identity = participant?.identity || participant?.sid || '';
          if (!identity || identity === String(userId)) return;
          const timerKey = `${normalizedAppointmentId}:${identity}`;
          if (typingTimersRef.current[timerKey]) {
            clearTimeout(typingTimersRef.current[timerKey]);
          }
          setTypingByAppointment((prev) => {
            const current = prev[normalizedAppointmentId] || [];
            if (current.includes(identity)) return prev;
            return { ...prev, [normalizedAppointmentId]: [...current, identity] };
          });
          typingTimersRef.current[timerKey] = setTimeout(() => {
            clearTypingParticipant(identity);
            delete typingTimersRef.current[timerKey];
          }, 5000);
        } catch (err) {
          console.warn('[useChat] typingStarted listener failed:', err);
        }
      });

      conversation.on('typingEnded', (participant) => {
        try {
          const identity = participant?.identity || participant?.sid || '';
          if (!identity || identity === String(userId)) return;
          const timerKey = `${normalizedAppointmentId}:${identity}`;
          if (typingTimersRef.current[timerKey]) {
            clearTimeout(typingTimersRef.current[timerKey]);
            delete typingTimersRef.current[timerKey];
          }
          clearTypingParticipant(identity);
        } catch (err) {
          console.warn('[useChat] typingEnded listener failed:', err);
        }
      });

      // 6. onMessageAdded
      conversation.on('messageAdded', (message) => {
        try {
          messageCountRef.current++;
          console.log(`[useChat] MESSAGE_ADDED - received message count: ${messageCountRef.current}`);
          let attrs = {};
          try {
            attrs = typeof message.attributes === 'string' ? JSON.parse(message.attributes) : (message.attributes || {});
          } catch (e) { }

          // Intercept System Messages
          if (attrs.type === 'video_call') {
            const callerId = message.author;
            if (attrs.action === 'incoming') {
              setIncomingCall({ appointmentId: normalizedAppointmentId, callerId, callerName: 'Incoming Call' });
            } else if (['accepted', 'declined', 'ended'].includes(attrs.action)) {
              setIncomingCall(null);
            }
            return;
          }

          const msgObj = {
            id: message.sid,
            senderId: message.author,
            message: message.body,
            messageType: attrs.type || message.type || 'text',
            createdAt: message.dateCreated,
            twilioMessageSid: message.sid,
            fileUrl: attrs.fileUrl,
            fileName: attrs.fileName,
            mimeType: attrs.mimeType,
            fileSizeBytes: attrs.fileSizeBytes,
            mediaRetentionUntil: attrs.mediaRetentionUntil,
            storageProvider: attrs.storageProvider,
            mediaScanStatus: attrs.mediaScanStatus,
            mediaTombstoneReason: attrs.mediaTombstoneReason,
            attachmentAvailable: attrs.type !== 'file' || attrs.deleted !== true,
            metadata: attrs
          };

          setMessagesByAppointment((prev) => {
            const current = prev[normalizedAppointmentId] || [];
            if (current.some((m) => m.id === msgObj.id || m.twilioMessageSid === msgObj.twilioMessageSid)) return prev;
            return { ...prev, [normalizedAppointmentId]: [...current, msgObj] };
          });

          setConversations((prev) => {
            let found = false;
            const updated = prev.map((conv) => {
              if (String(conv.appointmentId) === normalizedAppointmentId) {
                found = true;
                const isOwn = msgObj.senderId === String(userId);
                return {
                  ...conv,
                  lastMessage: msgObj, // This visually updates the list item
                  unreadCount: isOwn ? 0 : (conv.unreadCount || 0) + 1,
                };
              }
              return conv;
            });

            if (!found) {
              fetchConversations().then(setConversations).catch(() => { });
            }
            return updated;
          });
        } catch (err) {
          console.warn('[useChat] messageAdded listener failed:', err);
        }
      });

      // Reset unread count locally upon join
      setConversations((prev) =>
        prev.map((conv) => (String(conv.appointmentId) === normalizedAppointmentId ? { ...conv, unreadCount: 0 } : conv))
      );

      // 8. Mark read in backend with ref-lock protection
      if (!isMarkingReadRef.current[normalizedAppointmentId]) {
        isMarkingReadRef.current[normalizedAppointmentId] = true;
        console.log(`[useChat] MARK_READ_START - marking read for ${normalizedAppointmentId}`);
        try {
          await api.patch(`/communications/appointments/${normalizedAppointmentId}/chat/read`);
          console.log(`[useChat] MARK_READ_END - successfully marked read for ${normalizedAppointmentId}`);
        } catch (err) {
          console.warn('[useChat] Failed to mark read:', err.message);
        } finally {
          isMarkingReadRef.current[normalizedAppointmentId] = false;
        }
      }
    } catch (error) {
      const history = await historyPromise;
      if (history.length) {
        setMessagesByAppointment((prev) => ({
          ...prev,
          [normalizedAppointmentId]: history
        }));
      }

      const isWaitlisted = error?.response?.status === 409;
      if (isWaitlisted && history.length) {
        setSocketConnected(false);
        setConnectionState('ended');
        setReconnectError(null);
        return;
      }

      setSocketConnected(false);
      setConnectionState('disconnected');
      setReconnectError(error.message || 'Failed to connect chat');
      setChatUnavailable(true);
      console.error('[useChat] Failed to init Twilio for appointmentId:', normalizedAppointmentId, error);
    } finally {
      isSelectingConversationRef.current = null;
    }
  }, [userId, fetchConversations]);

  // ── Actions ──────────────────────────────────────────────────
  const sendMessage = useCallback(async ({ appointmentId, text }) => {
    if (!appointmentId || !text) return;
    try {
      const { data } = await api.post(`/communications/appointments/${appointmentId}/chat/messages`, {
        message: text,
        messageType: 'text'
      });
      const saved = data?.message;
      if (saved) {
        setMessagesByAppointment((prev) => {
          const current = prev[appointmentId] || [];
          if (current.some((m) => m.id === saved.id || m.twilioMessageSid === saved.twilioMessageSid)) return prev;
          return { ...prev, [appointmentId]: [...current, saved] };
        });
      }
      return saved;
    } catch (error) {
      console.error('[useChat] send text failed:', error.message);
      setReconnectError(error.message || 'Failed to send message');
      throw error;
    }
  }, []);

  const sendTypingIndicator = useCallback((appointmentId) => {
    if (!appointmentId || activeAppointmentId !== String(appointmentId)) return;
    const conversation = activeConversationRef.current;
    if (!conversation?.typing) return;
    try {
      conversation.typing();
    } catch (error) {
      if (__DEV__) console.warn('[useChat] typing indicator failed:', error.message);
    }
  }, [activeAppointmentId]);

  const sendAttachmentMessage = useCallback(async ({ appointmentId, file, onUploadProgress }) => {
    if (!appointmentId || !file) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post(`/communications/appointments/${appointmentId}/chat/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress
      });
      const saved = data?.message;
      if (saved) {
        setMessagesByAppointment((prev) => {
          const current = prev[appointmentId] || [];
          if (current.some((m) => m.id === saved.id || m.twilioMessageSid === saved.twilioMessageSid)) return prev;
          return { ...prev, [appointmentId]: [...current, saved] };
        });
      }
    } catch (error) {
      console.error('[useChat] upload attachment failed:', error.message);
      setReconnectError(error.message || 'Failed to upload attachment');
      throw error;
    }
  }, []);

  const emitVideoCall = useCallback((appointmentId) => {
    const conversation = activeConversationRef.current;
    if (!conversation) return;
    conversation.sendMessage('VIDEO_CALL_INITIATED', JSON.stringify({ type: 'video_call', action: 'incoming', appointmentId }))
      .catch((err) => console.warn('[useChat] emitVideoCall error:', err));
  }, []);

  const emitVideoCallResponse = useCallback((appointmentId, accepted) => {
    const conversation = activeConversationRef.current;
    if (!conversation) return;
    conversation.sendMessage('VIDEO_CALL_RESPONSE', JSON.stringify({ type: 'video_call', action: accepted ? 'accepted' : 'declined', appointmentId }))
      .catch((err) => console.warn('[useChat] emitVideoCallResponse error:', err));
    setIncomingCall(null);
  }, []);

  const emitVideoCallEnded = useCallback((appointmentId) => {
    const conversation = activeConversationRef.current;
    if (!conversation) return;
    conversation.sendMessage('VIDEO_CALL_ENDED', JSON.stringify({ type: 'video_call', action: 'ended', appointmentId }))
      .catch((err) => console.warn('[useChat] emitVideoCallEnded error:', err));
  }, []);

  const fetchVideoToken = useCallback(async (appointmentId) => {
    try {
      const { data } = await api.get(`/communications/appointments/${appointmentId}/token`);
      return {
        ...data,
        token: data.video?.token || data.videoToken || data.token,
        roomName: data.video?.roomName || data.roomName || data.channelName,
        roomSid: data.video?.roomSid || data.roomSid,
        canJoinVideo: data.video?.canJoin ?? data.waitingRoom?.canJoinVideo ?? true,
        waitingRoom: data.waitingRoom,
      };
    } catch (error) {
      console.error('[useChat] Failed to fetch video token:', error.message);
      throw error;
    }
  }, []);

  return {
    conversations,
    presenceMap,
    loading,
    socketConnected,
    connectionState,
    reconnectError,
    activeConversation,
    activeAppointmentId,
    messages: activeMessages,
    typingParticipants: activeAppointmentId ? typingByAppointment[activeAppointmentId] || [] : [],
    incomingCall,
    selectConversation,
    sendMessage,
    sendTypingIndicator,
    sendAttachmentMessage,
    refreshConversations,
    emitVideoCall,
    emitVideoCallResponse,
    emitVideoCallEnded,
    fetchVideoToken,
    chatUnavailable,
    setChatUnavailable,
    resetTwilioAttempts,
  };
}
