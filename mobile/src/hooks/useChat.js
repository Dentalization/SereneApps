import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, API_VERSION } from '../services/api';
import api from '../services/api';

const SOCKET_URL = `${API_BASE_URL}/${API_VERSION}`;

/**
 * Mobile version of useChat — mirrors web/src/hooks/useChat.js
 * Manages socket connection, conversations, messages, presence, and video signaling.
 */
export function useChat({ userId } = {}) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [activeAppointmentId, setActiveAppointmentId] = useState(null);
  const [messagesByAppointment, setMessagesByAppointment] = useState({});
  const [presenceMap, setPresenceMap] = useState({});
  const [incomingCall, setIncomingCall] = useState(null);
  const socketRef = useRef(null);
  const tokenRef = useRef(null);

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
    return messagesByAppointment[activeAppointmentId] || [];
  }, [messagesByAppointment, activeAppointmentId]);

  // ── Handle Background AppState Reconnects ────────────────────
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        if (socketRef.current && socketRef.current.disconnected) {
          console.log('[useChat] App returned to foreground, forcing socket reconnect...');
          socketRef.current.connect();
        }
      }
    });
    return () => {
      subscription.remove();
    };
  }, []);

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
  }, [fetchConversations]);

  // ── Socket connection ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const connectSocket = async () => {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token || cancelled) return;
      tokenRef.current = token;

      const socket = io(SOCKET_URL, {
        transports: ['websocket'],
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        if (!cancelled) setSocketConnected(true);
      });

      socket.on('disconnect', () => {
        if (!cancelled) setSocketConnected(false);
      });

      socket.on('chat:history', ({ appointmentId, messages }) => {
        setMessagesByAppointment((prev) => ({
          ...prev,
          [appointmentId]: messages,
        }));
      });

      socket.on('chat:new_message', (message) => {
        const apptId = message.appointmentId;
        setMessagesByAppointment((prev) => {
          const current = prev[apptId] || [];
          if (current.some((m) => m.id === message.id)) return prev;
          return { ...prev, [apptId]: [...current, message] };
        });
        setConversations((prev) => {
          let found = false;
          const updated = prev.map((conv) => {
            if (conv.appointmentId === apptId) {
              found = true;
              const isOwn = message.senderId === userId?.toString();
              return {
                ...conv,
                lastMessage: message,
                unreadCount: isOwn ? 0 : (conv.unreadCount || 0) + 1,
              };
            }
            return conv;
          });
          if (!found) {
            // New conversation — refresh list
            fetchConversations().then((data) => setConversations(data)).catch(() => {});
          }
          return updated;
        });
      });

      socket.on('chat:presence', ({ appointmentId, onlineUserIds }) => {
        setPresenceMap((prev) => ({ ...prev, [appointmentId]: onlineUserIds }));
      });

      socket.on('chat:read', ({ appointmentId, userId: readUserId, lastReadAt }) => {
        if (readUserId === userId?.toString()) return;
        setConversations((prev) =>
          prev.map((conv) =>
            conv.appointmentId === appointmentId ? { ...conv, lastReadAt } : conv
          )
        );
      });

      socket.on('chat:message_ack', ({ appointmentId, message }) => {
        setMessagesByAppointment((prev) => {
          const current = prev[appointmentId] || [];
          if (current.some((m) => m.id === message.id)) return prev;
          return { ...prev, [appointmentId]: [...current, message] };
        });
        setConversations((prev) =>
          prev.map((conv) =>
            conv.appointmentId === appointmentId
              ? { ...conv, lastMessage: message, unreadCount: 0 }
              : conv
          )
        );
      });

      socket.on('chat:error', ({ message }) => {
        console.error('[useChat] Socket error:', message);
      });

      // ── Video call signaling ──────────────────────────────────
      socket.on('video:incoming_call', ({ appointmentId, callerId, callerName }) => {
        setIncomingCall({ appointmentId, callerId, callerName });
      });

      socket.on('video:call_accepted', ({ appointmentId }) => {
        setIncomingCall(null);
      });

      socket.on('video:call_declined', ({ appointmentId }) => {
        setIncomingCall(null);
      });

      socket.on('video:call_ended', ({ appointmentId }) => {
        // Will be handled by the screen component
        setIncomingCall(null);
      });

      socket.on('video:error', ({ message }) => {
        console.error('[useChat] Video error:', message);
      });
    };

    connectSocket();

    return () => {
      cancelled = true;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [userId, fetchConversations]);

  // ── Actions ──────────────────────────────────────────────────
  const selectConversation = useCallback(async (appointmentId) => {
    setActiveAppointmentId(appointmentId);
    if (!socketRef.current) return;
    socketRef.current.emit('chat:join', { appointmentId });
    setConversations((prev) =>
      prev.map((conv) =>
        conv.appointmentId === appointmentId ? { ...conv, unreadCount: 0 } : conv
      )
    );
    // Mark as read via REST
    try {
      await api.patch(`/communications/appointments/${appointmentId}/chat/read`);
    } catch (error) {
      console.warn('[useChat] Failed to mark read:', error.message);
    }
  }, []);

  const sendMessage = useCallback(async ({ appointmentId, text }) => {
    if (!appointmentId || !text) return;

    if (socketRef.current && socketConnected) {
      socketRef.current.emit('chat:message', {
        appointmentId,
        message: text,
        messageType: 'text',
      });
    } else {
      // HTTP fallback
      try {
        const { data } = await api.post(`/communications/appointments/${appointmentId}/chat/messages`, {
          message: text,
          messageType: 'text',
        });
        const saved = data?.message;
        if (saved) {
          setMessagesByAppointment((prev) => ({
            ...prev,
            [appointmentId]: [...(prev[appointmentId] || []), saved],
          }));
        }
      } catch (error) {
        console.error('[useChat] HTTP send failed:', error.message);
      }
    }
  }, [socketConnected]);

  const sendAttachmentMessage = useCallback(async ({ appointmentId, file }) => {
    if (!appointmentId || !file) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post(
        `/communications/appointments/${appointmentId}/chat/attachments`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      const saved = data?.message;
      if (saved) {
        setMessagesByAppointment((prev) => ({
          ...prev,
          [appointmentId]: [...(prev[appointmentId] || []), saved],
        }));
      }
    } catch (error) {
      console.error('[useChat] Attachment upload failed:', error.message);
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

  const emitVideoCallEnded = useCallback((appointmentId) => {
    if (!socketRef.current || !socketConnected) return;
    socketRef.current.emit('video:call_ended', { appointmentId });
  }, [socketConnected]);

  const fetchVideoToken = useCallback(async (appointmentId) => {
    try {
      const { data } = await api.post(`/communications/appointments/${appointmentId}/video/token`, {
        role: 'publisher',
      });
      return {
        ...data,
        roomName: data.roomName || data.channelName,
      };
    } catch (error) {
      console.error('[useChat] Failed to fetch video token:', error.message);
      throw error;
    }
  }, []);

  return {
    // State
    conversations,
    presenceMap,
    loading,
    socketConnected,
    activeConversation,
    activeAppointmentId,
    messages: activeMessages,
    incomingCall,
    // Actions
    selectConversation,
    sendMessage,
    sendAttachmentMessage,
    refreshConversations,
    emitVideoCall,
    emitVideoCallResponse,
    emitVideoCallEnded,
    fetchVideoToken,
  };
}
