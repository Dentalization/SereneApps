import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { getAccessToken } from '../utils/auth/tokenStorage';
import {
  fetchConversations,
  sendTextMessage,
  uploadAttachment,
  markConversationRead
} from '../services/chatService';
import { useAuth } from '../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_AUTH_API_BASE_URL || 'http://localhost:4000';
const API_VERSION = import.meta.env.VITE_AUTH_API_VERSION || 'v1';
const SOCKET_URL = [API_BASE?.replace(/\/$/, ''), API_VERSION?.replace(/^\//, '')]
  .filter(Boolean)
  .join('/');

export function useChat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [activeAppointmentId, setActiveAppointmentId] = useState(null);
  const [messagesByAppointment, setMessagesByAppointment] = useState({});
  const [presenceMap, setPresenceMap] = useState({});
  const [incomingCall, setIncomingCall] = useState(null);
  const socketRef = useRef(null);

  const token = useMemo(() => getAccessToken(), [user?.id]);

  const activeConversation = useMemo(() => {
    if (!activeAppointmentId) return null;
    return conversations.find((conv) => conv.appointmentId === activeAppointmentId) || null;
  }, [conversations, activeAppointmentId]);

  const activeMessages = useMemo(() => {
    if (!activeAppointmentId) return [];
    return messagesByAppointment[activeAppointmentId] || [];
  }, [messagesByAppointment, activeAppointmentId]);

  useEffect(() => {
    const loadConversations = async () => {
      try {
        setLoading(true);
        const data = await fetchConversations();
        setConversations(data);
      } catch (error) {
        console.error('Failed to load conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, []);

  useEffect(() => {
    if (!token) return;
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: { token }
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('chat:history', ({ appointmentId, messages }) => {
      setMessagesByAppointment((prev) => ({
        ...prev,
        [appointmentId]: messages
      }));
    });

    socket.on('chat:new_message', (message) => {
      const appointmentId = message.appointmentId;
      setMessagesByAppointment((prev) => {
        const current = prev[appointmentId] || [];
        const exists = current.some((m) => m.id === message.id);
        if (exists) return prev;
        return {
          ...prev,
          [appointmentId]: [...current, message]
        };
      });
      let conversationExists = false;
      setConversations((prev) => {
        const list = prev.map((conv) => {
          if (conv.appointmentId === appointmentId) {
            conversationExists = true;
            const unreadIncrement = message.senderId === user?.id?.toString() ? 0 : 1;
            return {
              ...conv,
              lastMessage: message,
              unreadCount: unreadIncrement ? (conv.unreadCount || 0) + unreadIncrement : 0,
              lastReadAt: unreadIncrement ? conv.lastReadAt : new Date().toISOString()
            };
          }
          return conv;
        });
        if (!conversationExists) {
          return list;
        }
        return list;
      });

      if (!conversationExists) {
        fetchConversations()
          .then((data) => setConversations(data))
          .catch((error) => console.error('Failed to refresh conversations:', error));
      }
    });

    socket.on('chat:presence', ({ appointmentId, onlineUserIds }) => {
      setPresenceMap((prev) => ({
        ...prev,
        [appointmentId]: onlineUserIds
      }));
    });

    socket.on('chat:read', ({ appointmentId, userId, lastReadAt }) => {
      if (userId === user?.id?.toString()) return;
      setConversations((prev) =>
        prev.map((conv) =>
          conv.appointmentId === appointmentId
            ? { ...conv, lastReadAt }
            : conv
        )
      );
    });

    socket.on('chat:message_ack', ({ appointmentId, message }) => {
      setMessagesByAppointment((prev) => {
        const current = prev[appointmentId] || [];
        const exists = current.some((m) => m.id === message.id);
        if (exists) return prev;
        return {
          ...prev,
          [appointmentId]: [...current, message]
        };
      });
      setConversations((prev) =>
        prev.map((conv) =>
          conv.appointmentId === appointmentId
            ? {
                ...conv,
                lastMessage: message,
                unreadCount: 0,
                lastReadAt: new Date().toISOString()
              }
            : conv
        )
      );
    });

    socket.on('chat:error', ({ message }) => {
      console.error('Socket chat error:', message);
    });

    // ── Video call signaling ──────────────────────────────────
    socket.on('video:incoming_call', ({ appointmentId, callerId, callerName }) => {
      setIncomingCall({ appointmentId, callerId, callerName });
    });

    socket.on('video:call_accepted', () => {
      setIncomingCall(null);
    });

    socket.on('video:call_declined', () => {
      setIncomingCall(null);
    });

    socket.on('video:error', ({ message }) => {
      console.error('Socket video error:', message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, user?.id]);

  const selectConversation = useCallback(
    async (appointmentId) => {
      setActiveAppointmentId(appointmentId);
      if (!socketRef.current) return;

      socketRef.current.emit('chat:join', { appointmentId });

      setConversations((prev) =>
        prev.map((conv) =>
          conv.appointmentId === appointmentId
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );

      try {
        await markConversationRead(appointmentId);
      } catch (error) {
        console.warn('Failed to mark conversation read:', error);
      }
    },
    []
  );

  const sendMessage = useCallback(
    async ({ appointmentId, text }) => {
      if (!appointmentId || !text) return;
      if (!socketRef.current || !socketConnected) {
        const saved = await sendTextMessage(appointmentId, text);
        if (saved) {
          setMessagesByAppointment((prev) => {
            const current = prev[appointmentId] || [];
            return {
              ...prev,
              [appointmentId]: [...current, saved]
            };
          });
          let needsRefresh = false;
          setConversations((prev) => {
            let found = false;
            const updated = prev.map((conv) => {
              if (conv.appointmentId === appointmentId) {
                found = true;
                return {
                  ...conv,
                  lastMessage: saved,
                  unreadCount: 0,
                  lastReadAt: saved.createdAt || new Date().toISOString()
                };
              }
              return conv;
            });
            if (!found) {
              needsRefresh = true;
              return prev;
            }
            return updated;
          });
          if (needsRefresh) {
            fetchConversations()
              .then((data) => setConversations(data))
              .catch((error) => console.error('Failed to refresh conversations:', error));
          }
          fetchConversations()
            .then((data) => setConversations(data))
            .catch((error) => console.error('Failed to refresh conversations:', error));
        }
        return;
      }
      socketRef.current.emit('chat:message', {
        appointmentId,
        message: text,
        messageType: 'text'
      });
    },
    [socketConnected]
  );

  const sendAttachmentMessage = useCallback(
    async ({ appointmentId, file }) => {
      if (!appointmentId || !file) return;
      const message = await uploadAttachment(appointmentId, file);
      setMessagesByAppointment((prev) => {
        const current = prev[appointmentId] || [];
        const exists = current.some((m) => m.id === message?.id);
        if (exists) return prev;
        return {
          ...prev,
          [appointmentId]: [...current, message]
        };
      });
      if (message) {
        let needsRefresh = false;
        setConversations((prev) => {
          let found = false;
          const updated = prev.map((conv) => {
            if (conv.appointmentId === appointmentId) {
              found = true;
              return {
                ...conv,
                lastMessage: message,
                unreadCount: 0,
                lastReadAt: message.createdAt || new Date().toISOString()
              };
            }
            return conv;
          });
          if (!found) {
            needsRefresh = true;
            return prev;
          }
          return updated;
        });
        if (needsRefresh) {
          fetchConversations()
            .then((data) => setConversations(data))
            .catch((error) => console.error('Failed to refresh conversations:', error));
        }
      }
    },
    []
  );

  const refreshConversations = useCallback(async () => {
    try {
      const data = await fetchConversations();
      setConversations(data);
    } catch (error) {
      console.error('Failed to refresh conversations:', error);
    }
  }, []);

  const emitVideoCall = useCallback((appointmentId) => {
    if (!socketRef.current || !socketConnected) return;
    socketRef.current.emit('video:call', { appointmentId });
  }, [socketConnected]);

  const emitVideoCallResponse = useCallback((appointmentId, accepted) => {
    if (!socketRef.current || !socketConnected) return;
    socketRef.current.emit('video:call_response', { appointmentId, accepted });
    setIncomingCall(null);
  }, [socketConnected]);

  return {
    conversations,
    presenceMap,
    loading,
    socketConnected,
    activeConversation,
    activeAppointmentId,
    messages: activeMessages,
    incomingCall,
    selectConversation,
    sendMessage,
    sendAttachmentMessage,
    refreshConversations,
    emitVideoCall,
    emitVideoCallResponse,
  };
}
