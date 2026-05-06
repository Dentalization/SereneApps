import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Client as ConversationsClient } from '@twilio/conversations';
import {
  fetchAppointmentCommunicationsToken,
  fetchConversations,
  fetchMessages,
  markConversationRead,
  sendTextMessage,
  uploadAttachment
} from '../services/chatService';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  getChatTokenReadiness,
  messageFromTokenFetchError
} from '../utils/teledentistryTokenReadiness.mjs';

export function useChat() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [activeAppointmentId, setActiveAppointmentId] = useState(null);
  const [messagesByAppointment, setMessagesByAppointment] = useState({});
  const [presenceMap, setPresenceMap] = useState({});
  const [incomingCall, setIncomingCall] = useState(null);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [reconnectError, setReconnectError] = useState(null);
  const [attachmentUpload, setAttachmentUpload] = useState({ status: 'idle', progress: 0, error: '' });
  const notificationSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3'));

  const clientRef = useRef(null);
  const convRef = useRef(null);

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
        try {
          const data = await fetchAppointmentCommunicationsToken(activeAppointmentId);
          if (data?.token) {
            await clientRef.current.updateToken(data.token);
            setReconnectError(null);
          }
        } catch (error) {
          console.warn('[useChat] Error updating Twilio token on focus:', error.message);
          setReconnectError(error.message || 'Failed to refresh chat session');
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
        const data = await fetchAppointmentCommunicationsToken(appointmentId);

        const history = await fetchMessages(appointmentId);
        setMessagesByAppointment((prev) => ({
          ...prev,
          [appointmentId]: history.messages || []
        }));

        const readiness = getChatTokenReadiness(data);
        if (!readiness.ready) {
          if (convRef.current) {
            convRef.current.removeAllListeners();
            convRef.current = null;
          }
          setSocketConnected(false);
          setConnectionState(readiness.code === 'SESSION_ENDED' ? 'ended' : 'disconnected');
          setReconnectError(t(readiness.messageKey, { defaultValue: readiness.defaultMessage }));
          return;
        }

        const twilioToken = data.chat?.token || data.token;
        const conversationSid = data.chat?.conversationSid || data.conversationSid;

        // Init Twilio client if null
        let client = clientRef.current;
        if (!client) {
          client = await ConversationsClient.create(twilioToken);
          clientRef.current = client;

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

        const formatMessage = (msg) => {
          let attrs = {};
          try {
            attrs = typeof msg.attributes === 'string' ? JSON.parse(msg.attributes) : (msg.attributes || {});
          } catch (e) {}

          return {
            id: msg.sid,
            senderId: msg.author,
            message: msg.body,
            messageType: attrs.type || msg.type || 'text',
            createdAt: msg.dateCreated,
            twilioMessageSid: msg.sid,
            fileUrl: attrs.fileUrl,
            fileName: attrs.fileName,
            mimeType: attrs.mimeType,
            fileSizeBytes: attrs.fileSizeBytes,
            mediaRetentionUntil: attrs.mediaRetentionUntil,
            storageProvider: attrs.storageProvider,
            mediaScanStatus: attrs.mediaScanStatus,
            mediaTombstoneReason: attrs.mediaTombstoneReason,
            attachmentAvailable: attrs.type !== 'file' || attrs.deleted !== true,
            metadata: attrs,
            _attrs: attrs
          };
        };

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
            if (current.some((m) => m.id === formatted.id || m.twilioMessageSid === formatted.twilioMessageSid)) return prev;
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
        const readiness = err?.response?.data
          ? messageFromTokenFetchError(err)
          : null;
        const displayError = readiness
          ? t(readiness.messageKey, { defaultValue: readiness.defaultMessage })
          : err.message || t('teledentistry.chatReadiness.connectFailed', { defaultValue: 'Failed to connect chat' });
        setConnectionState('disconnected');
        setReconnectError(displayError);
      }
    },
    [t, user?.id]
  );

  // ── Actions ──────────────────────────────────────────────────
  const sendMessage = useCallback(async ({ appointmentId, text }) => {
    if (!appointmentId || !text) return;
    try {
      const saved = await sendTextMessage(appointmentId, text);
      if (saved) {
        setMessagesByAppointment((prev) => {
          const current = prev[appointmentId] || [];
          if (current.some((m) => m.id === saved.id || m.twilioMessageSid === saved.twilioMessageSid)) return prev;
          return { ...prev, [appointmentId]: [...current, saved] };
        });
      }
    } catch (err) {
      console.error('[useChat] send message failed', err.message);
      setReconnectError(err.message || 'Failed to send message');
    }
  }, []);

  const sendAttachmentMessage = useCallback(async ({ appointmentId, file }) => {
    if (!appointmentId || !file) return;
    try {
      setAttachmentUpload({ status: 'uploading', progress: 0, error: '' });
      const saved = await uploadAttachment(appointmentId, file, {
        onUploadProgress: (event) => {
          if (!event.total) return;
          setAttachmentUpload({
            status: 'uploading',
            progress: Math.min(99, Math.round((event.loaded / event.total) * 100)),
            error: ''
          });
        }
      });
      if (saved) {
        setMessagesByAppointment((prev) => {
          const current = prev[appointmentId] || [];
          if (current.some((m) => m.id === saved.id || m.twilioMessageSid === saved.twilioMessageSid)) return prev;
          return { ...prev, [appointmentId]: [...current, saved] };
        });
      }
      setAttachmentUpload({
        status: saved?.mediaScanStatus === 'pending' ? 'scan_pending' : 'complete',
        progress: 100,
        error: ''
      });
      setTimeout(() => {
        setAttachmentUpload((current) => (
          ['complete', 'scan_pending'].includes(current.status)
            ? { status: 'idle', progress: 0, error: '' }
            : current
        ));
      }, 4000);
    } catch (err) {
      console.error('[useChat] upload attachment failed', err.message);
      const message = err?.response?.data?.error?.code || err.message || 'Failed to upload attachment';
      setAttachmentUpload({ status: 'error', progress: 0, error: message });
      setReconnectError(message);
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
    connectionState,
    reconnectError,
    attachmentUpload,
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
