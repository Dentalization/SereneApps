import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Client as ConversationsClient } from '@twilio/conversations';
import { getAccessToken } from '../utils/auth/tokenStorage';
import { fetchConversations, markConversationRead } from '../services/chatService';
import { useAuth } from '../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_AUTH_API_BASE_URL || 'http://localhost:4000';
const API_VERSION = import.meta.env.VITE_AUTH_API_VERSION || 'v1';

const getTwilioToken = async (appointmentId, authToken) => {
  const baseUrl = `${API_BASE.replace(/\/$/, '')}/${API_VERSION.replace(/^\//, '')}`;
  const response = await fetch(`${baseUrl}/communications/appointments/${appointmentId}/token`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  if (!response.ok) {
    throw new Error('Failed to fetch Twilio token');
  }
  return response.json();
};

export function useChat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [activeAppointmentId, setActiveAppointmentId] = useState(null);
  const [messagesByAppointment, setMessagesByAppointment] = useState({});
  const [presenceMap, setPresenceMap] = useState({});
  const [incomingCall, setIncomingCall] = useState(null);
  const notificationSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3'));

  const clientRef = useRef(null);
  const convRef = useRef(null);

  const token = useMemo(() => getAccessToken(), [user?.id]);

  const activeConversation = useMemo(() => {
    if (!activeAppointmentId) return null;
    return conversations.find((conv) => conv.appointmentId === activeAppointmentId) || null;
  }, [conversations, activeAppointmentId]);

  const activeMessages = useMemo(() => {
    if (!activeAppointmentId) return [];
    return messagesByAppointment[activeAppointmentId] || [];
  }, [messagesByAppointment, activeAppointmentId]);

  // Initial load
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
  }, [user?.id]);

  // Tab focus reconnection
  useEffect(() => {
    const handleFocus = async () => {
      if (clientRef.current && activeAppointmentId) {
        console.log('[useChat] Tab focused, fetching fresh Twilio token...');
        try {
          const freshJwt = getAccessToken();
          if (freshJwt) {
            const data = await getTwilioToken(activeAppointmentId, freshJwt);
            if (data?.token) {
              await clientRef.current.updateToken(data.token);
            }
          }
        } catch (error) {
          console.warn('[useChat] Error updating Twilio token on focus:', error.message);
        }
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [activeAppointmentId]);

  // Cleanup Twilio client on unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.shutdown();
        clientRef.current = null;
      }
    };
  }, []);

  const selectConversation = useCallback(
    async (appointmentId) => {
      setActiveAppointmentId(appointmentId);

      try {
        // Fetch Token
        const jwtToken = getAccessToken();
        const data = await getTwilioToken(appointmentId, jwtToken);
        const { token: twilioToken, conversationSid } = data;

        // Init Twilio client if null
        let client = clientRef.current;
        if (!client) {
          client = await ConversationsClient.create(twilioToken);
          clientRef.current = client;

          client.on('connectionStateChanged', (state) => {
            setSocketConnected(state === 'connected');
          });
          
          if (client.connectionState === 'connected') {
            setSocketConnected(true);
          }
        } else {
          try {
            await client.updateToken(twilioToken);
          } catch(e) {
            console.warn('[useChat] update token on select failed', e);
          }
        }

        if (convRef.current) {
          convRef.current.removeAllListeners();
        }

        // Get actual conversation
        const conv = await client.getConversationBySid(conversationSid);
        convRef.current = conv;

        // Load History
        const paginator = await conv.getMessages(50);
        
        const formatMessage = (msg) => {
          let attrs = {};
          try {
            attrs = typeof msg.attributes === 'string' ? JSON.parse(msg.attributes) : (msg.attributes || {});
          } catch (e) {}

          return {
            id: msg.sid,
            senderId: msg.author,
            message: msg.body,
            messageType: msg.type || 'text',
            createdAt: msg.dateCreated,
            twilioMessageSid: msg.sid,
            _attrs: attrs
          };
        };

        const parsedHistory = [];
        paginator.items.forEach((msg) => {
          const formatted = formatMessage(msg);
          // Don't show system signals in actual message UI
          if (formatted._attrs && formatted._attrs.type === 'video_call') return;
          parsedHistory.push(formatted);
        });

        setMessagesByAppointment((prev) => ({
          ...prev,
          [appointmentId]: parsedHistory
        }));

        // Presence via getParticipants()
        const updatePresence = async () => {
          const participants = await conv.getParticipants();
          const onlineUserIds = participants.filter((p) => p.isOnline).map((p) => p.identity);
          setPresenceMap((prev) => ({
            ...prev,
            [appointmentId]: onlineUserIds
          }));
        };
        updatePresence();

        conv.on('participantUpdated', updatePresence);
        conv.on('participantJoined', updatePresence);
        conv.on('participantLeft', updatePresence);

        // Subscriptions
        conv.on('messageAdded', (message) => {
          const formatted = formatMessage(message);

          if (formatted._attrs.type === 'video_call') {
            const callerId = message.author;
            const action = formatted._attrs.action;
            const targetAppt = formatted._attrs.appointmentId || appointmentId;

            if (action === 'incoming') {
              setIncomingCall({ appointmentId: targetAppt, callerId, callerName: 'A Caller' });
            } else if (action === 'accepted') {
              setIncomingCall(null);
              window.dispatchEvent(
                new CustomEvent('teledentistry:call_accepted', {
                  detail: { appointmentId: targetAppt, responderId: callerId }
                })
              );
            } else if (action === 'declined') {
              setIncomingCall(null);
              window.dispatchEvent(
                new CustomEvent('teledentistry:call_declined', {
                  detail: { appointmentId: targetAppt, responderId: callerId }
                })
              );
            } else if (action === 'ended') {
              setIncomingCall(null);
              window.dispatchEvent(
                new CustomEvent('teledentistry:call_ended', {
                  detail: { appointmentId: targetAppt }
                })
              );
            }
            return;
          }

          setMessagesByAppointment((prev) => {
            const current = prev[appointmentId] || [];
            if (current.some((m) => m.id === formatted.id)) return prev;
            return {
              ...prev,
              [appointmentId]: [...current, formatted]
            };
          });

          setConversations((prev) => {
            let found = false;
            const updated = prev.map((c) => {
              if (c.appointmentId === appointmentId) {
                found = true;
                const isOwn = formatted.senderId === user?.id?.toString();
                
                // Play notification sound if message is from patient
                if (!isOwn) {
                  notificationSound.current.play().catch(() => {});
                }

                return {
                  ...c,
                  lastMessage: formatted,
                  unreadCount: isOwn ? 0 : (c.unreadCount || 0) + 1,
                  lastReadAt: isOwn ? new Date().toISOString() : c.lastReadAt
                };
              }
              return c;
            });
            if (!found) {
              fetchConversations()
                .then((data) => setConversations(data))
                .catch(() => {});
            }
            return updated;
          });
        });

        // 10. Mark conversation read via REST
        setConversations((prev) =>
          prev.map((c) => (c.appointmentId === appointmentId ? { ...c, unreadCount: 0 } : c))
        );
        try {
          await markConversationRead(appointmentId);
        } catch (error) {
          console.warn('Failed to mark conversation read:', error);
        }

      } catch (err) {
        console.error('Failed to select Twilio conversation:', err.message);
      }
    },
    [user?.id]
  );

  // ── Actions ──────────────────────────────────────────────────
  const sendMessage = useCallback(async ({ appointmentId, text }) => {
    if (!appointmentId || !text) return;
    if (convRef.current) {
      try {
        await convRef.current.sendMessage(text);
      } catch (err) {
        console.error('[useChat] Twilio send message failed', err.message);
      }
    }
  }, []);

  const sendAttachmentMessage = useCallback(async ({ appointmentId, file }) => {
    if (!appointmentId || !file) return;
    if (convRef.current) {
      const formData = new FormData();
      formData.append('media', file);
      try {
        await convRef.current.sendMessage(formData);
      } catch (err) {
        console.error('[useChat] Twilio send attachment failed', err.message);
      }
    }
  }, []);

  const refreshConversations = useCallback(async () => {
    try {
      const data = await fetchConversations();
      setConversations(data);
    } catch (error) {
      console.error('Failed to refresh conversations:', error);
    }
  }, []);

  const emitVideoCall = useCallback((appointmentId) => {
    if (!convRef.current) return;
    convRef.current.sendMessage(
      'VIDEO_CALL_INITIATED',
      JSON.stringify({ type: 'video_call', action: 'incoming', appointmentId })
    );
  }, []);

  const emitVideoCallResponse = useCallback((appointmentId, accepted) => {
    if (!convRef.current) return;
    convRef.current.sendMessage(
      'VIDEO_CALL_RESPONSE',
      JSON.stringify({ type: 'video_call', action: accepted ? 'accepted' : 'declined', appointmentId })
    );
    setIncomingCall(null);
  }, []);

  const emitVideoCallEnded = useCallback((appointmentId) => {
    if (!convRef.current) return;
    convRef.current.sendMessage(
      'VIDEO_CALL_ENDED',
      JSON.stringify({ type: 'video_call', action: 'ended', appointmentId })
    );
    setIncomingCall(null);
  }, []);

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
    emitVideoCallEnded,
  };
}
