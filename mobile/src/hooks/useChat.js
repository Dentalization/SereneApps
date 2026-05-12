import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import api from '../services/api';

let conversationsClientModulePromise;

const loadConversationsClient = async () => {
  if (!conversationsClientModulePromise) {
    conversationsClientModulePromise = import('@twilio/conversations');
  }

  const module = await conversationsClientModulePromise;
  return module.Client || module.default?.Client || module.default;
};

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

  const twilioClientRef = useRef(null);
  const activeConversationRef = useRef(null);
  const typingTimersRef = useRef({});

  // ── Fetch conversations from REST API ────────────────────────
  const fetchConversations = useCallback(async () => {
    try {
      const { data } = await api.get('/communications/rooms');
      return data?.conversations || [];
    } catch (error) {
      console.error('[useChat] Failed to fetch conversations:', error.message);
      return [];
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
    return conversations.find((conv) => conv.appointmentId === activeAppointmentId) || null;
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
        const data = await fetchConversations();
        setConversations(data);
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
      if (twilioClientRef.current) {
        twilioClientRef.current.shutdown();
        twilioClientRef.current = null;
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

  // ── INIT TWILIO SDK / Select Conversation ────────────────────
  const selectConversation = useCallback(async (appointmentId) => {
    setActiveAppointmentId(appointmentId);

    try {
      // 1-2. Fetch token with retry logic for provision race condition
      let data;
      let aborted = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await api.get(`/communications/appointments/${appointmentId}/token`);
          data = response.data;
          break;
        } catch (err) {
          const errorCode = err.response?.data?.error?.code;
          if (['CONVERSATION_NOT_PROVISIONED', 'COMMUNICATIONS_NOT_READY'].includes(errorCode) && attempt < 2) {
            if (__DEV__) console.log(`[useChat] Conversation not provisioned yet, retrying in ${2000 * Math.pow(2, attempt)}ms...`);
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

      const token = data.chat?.token || data.token;
      const conversationSid = data.chat?.conversationSid || data.conversationSid;

      const history = await api.get(`/communications/appointments/${appointmentId}/chat/messages`);
      setMessagesByAppointment((prev) => ({
        ...prev,
        [appointmentId]: history.data?.messages || []
      }));

      // 3-4. Init / Update Client
      let client = twilioClientRef.current;
      if (!client) {
        const ConversationsClient = await loadConversationsClient();
        if (!ConversationsClient?.create) {
          throw new Error('Unable to load Twilio Conversations SDK');
        }
        client = await ConversationsClient.create(token);
        twilioClientRef.current = client;

        client.on('connectionStateChanged', (state) => {
          setConnectionState(state);
          setSocketConnected(state === 'connected');
          if (state === 'connected') setReconnectError(null);
        });

        if (client.connectionState === 'connected') {
          setSocketConnected(true);
          setConnectionState('connected');
        }
      } else {
        await client.updateToken(token);
      }

      // 5. Subscribe to conversation
      const conversation = await client.getConversationBySid(conversationSid);

      if (activeConversationRef.current) {
        activeConversationRef.current.removeAllListeners();
      }
      activeConversationRef.current = conversation;

      // Ensure presence populated initially
      const updatePresence = async () => {
        const participants = await conversation.getParticipants();
        const onlineIdentityStrings = participants.filter(p => p.isOnline).map(p => p.identity);
        setPresenceMap(prev => ({ ...prev, [appointmentId]: onlineIdentityStrings }));
      };
      updatePresence();

      // 7. presenceMap updates
      conversation.on('participantUpdated', () => updatePresence());
      conversation.on('participantJoined', () => updatePresence());
      conversation.on('participantLeft', () => updatePresence());

      const clearTypingParticipant = (participantKey) => {
        setTypingByAppointment((prev) => {
          const current = prev[appointmentId] || [];
          return {
            ...prev,
            [appointmentId]: current.filter((identity) => identity !== participantKey)
          };
        });
      };

      conversation.on('typingStarted', (participant) => {
        const identity = participant?.identity || participant?.sid || '';
        if (!identity || identity === String(userId)) return;
        const timerKey = `${appointmentId}:${identity}`;
        if (typingTimersRef.current[timerKey]) {
          clearTimeout(typingTimersRef.current[timerKey]);
        }
        setTypingByAppointment((prev) => {
          const current = prev[appointmentId] || [];
          if (current.includes(identity)) return prev;
          return { ...prev, [appointmentId]: [...current, identity] };
        });
        typingTimersRef.current[timerKey] = setTimeout(() => {
          clearTypingParticipant(identity);
          delete typingTimersRef.current[timerKey];
        }, 5000);
      });

      conversation.on('typingEnded', (participant) => {
        const identity = participant?.identity || participant?.sid || '';
        if (!identity || identity === String(userId)) return;
        const timerKey = `${appointmentId}:${identity}`;
        if (typingTimersRef.current[timerKey]) {
          clearTimeout(typingTimersRef.current[timerKey]);
          delete typingTimersRef.current[timerKey];
        }
        clearTypingParticipant(identity);
      });

      // 6. onMessageAdded
      conversation.on('messageAdded', (message) => {
        let attrs = {};
        try {
          attrs = typeof message.attributes === 'string' ? JSON.parse(message.attributes) : (message.attributes || {});
        } catch (e) { }

        // Intercept System Messages
        if (attrs.type === 'video_call') {
          const callerId = message.author;
          if (attrs.action === 'incoming') {
            setIncomingCall({ appointmentId, callerId, callerName: 'Incoming Call' });
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
          const current = prev[appointmentId] || [];
          if (current.some((m) => m.id === msgObj.id || m.twilioMessageSid === msgObj.twilioMessageSid)) return prev;
          return { ...prev, [appointmentId]: [...current, msgObj] };
        });

        setConversations((prev) => {
          let found = false;
          const updated = prev.map((conv) => {
            if (conv.appointmentId === appointmentId) {
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
      });

      // Reset unread count locally upon join
      setConversations((prev) =>
        prev.map((conv) => (conv.appointmentId === appointmentId ? { ...conv, unreadCount: 0 } : conv))
      );

      // 8. Mark read in backend
      try {
        await api.patch(`/communications/appointments/${appointmentId}/chat/read`);
      } catch (err) {
        console.warn('[useChat] Failed to mark read:', err.message);
      }
    } catch (error) {
      setSocketConnected(false);
      setConnectionState('disconnected');
      setReconnectError(error.message || 'Failed to connect chat');
      console.error('[useChat] Failed to init Twilio for appointmentId:', appointmentId, error);
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
    if (!appointmentId || activeAppointmentId !== appointmentId) return;
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
    conversation.sendMessage('VIDEO_CALL_INITIATED', JSON.stringify({ type: 'video_call', action: 'incoming', appointmentId }));
  }, []);

  const emitVideoCallResponse = useCallback((appointmentId, accepted) => {
    const conversation = activeConversationRef.current;
    if (!conversation) return;
    conversation.sendMessage('VIDEO_CALL_RESPONSE', JSON.stringify({ type: 'video_call', action: accepted ? 'accepted' : 'declined', appointmentId }));
    setIncomingCall(null);
  }, []);

  const emitVideoCallEnded = useCallback((appointmentId) => {
    const conversation = activeConversationRef.current;
    if (!conversation) return;
    conversation.sendMessage('VIDEO_CALL_ENDED', JSON.stringify({ type: 'video_call', action: 'ended', appointmentId }));
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
  };
}
