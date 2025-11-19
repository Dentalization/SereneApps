import React, { useEffect, useMemo, useRef, useState } from 'react';
import SideBar from '../ui/SideBar';
import Icon from '../../../components/AppIcon';
import ConversationList from './components/ConversationList';
import ChatInterface from './components/ChatInterface';
import VideoCallInterface from './components/VideoCallInterface';
import PatientInfoPanel from './components/PatientInfoPanel';
import { useChat } from '../../../hooks/useChat';
import { useAuth } from '../../../contexts/AuthContext';
import { fetchVideoToken } from '../../../services/chatService';

const MIN_LOADING_MS = 900;

const Teledentistry = () => {
  const { user } = useAuth();
  const {
    conversations,
    presenceMap,
    loading,
    activeConversation,
    activeAppointmentId,
    messages,
    selectConversation,
    sendMessage,
    sendAttachmentMessage
  } = useChat();

  const [videoSession, setVideoSession] = useState(null);
  const [isPatientPanelExpanded, setIsPatientPanelExpanded] = useState(true);
  const [bootstrapping, setBootstrapping] = useState(true);
  const loadStartRef = useRef(Date.now());
  const bootTimerRef = useRef(null);

  useEffect(() => {
    loadStartRef.current = Date.now();
    return () => {
      if (bootTimerRef.current) clearTimeout(bootTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    const finalize = () => {
      setBootstrapping(false);
      bootTimerRef.current = null;
    };
    const elapsed = Date.now() - loadStartRef.current;
    const remaining = MIN_LOADING_MS - elapsed;
    if (remaining > 0) {
      bootTimerRef.current = setTimeout(finalize, remaining);
    } else {
      finalize();
    }
  }, [loading]);

  const handleConversationSelect = (conversation) => {
    selectConversation(conversation.appointmentId);
  };

  const handleSendTextMessage = async (text) => {
    if (!activeAppointmentId) return;
    await sendMessage({ appointmentId: activeAppointmentId, text });
  };

  const handleUploadAttachment = async (file) => {
    if (!activeAppointmentId) return;
    await sendAttachmentMessage({ appointmentId: activeAppointmentId, file });
  };

  const handleStartVideoCall = async () => {
    if (!activeAppointmentId) return;
    try {
      const tokenData = await fetchVideoToken(activeAppointmentId, 'publisher');
      setVideoSession({
        appointmentId: activeAppointmentId,
        channelName: tokenData.channelName,
        token: tokenData.token,
        uid: user?.id?.toString() || undefined
      });
    } catch (error) {
      console.error('Failed to start video call:', error);
    }
  };

  const handleEndVideoCall = () => {
    setVideoSession(null);
  };

  const selectedPresence = useMemo(() => {
    if (!activeAppointmentId) return [];
    return presenceMap[activeAppointmentId] || [];
  }, [presenceMap, activeAppointmentId]);

  if (loading || bootstrapping) {
    return (
      <div className="min-h-screen bg-surface flex theme-transition dentist-skeleton">
        <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
          <SideBar />
        </div>
        <main className="flex-1 min-w-0 flex flex-col h-screen">
          <div className="px-6 py-4 border-b border-primary/20 bg-surface-elevated skeleton-surface">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 w-36 bg-accent/10 rounded animate-pulse"></div>
                <div className="h-6 w-64 bg-accent/20 rounded animate-pulse"></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-9 w-28 bg-accent/10 rounded-lg animate-pulse"></div>
                <div className="h-9 w-32 bg-accent/10 rounded-lg animate-pulse"></div>
              </div>
            </div>
          </div>

          <div className="flex flex-1 min-h-0">
            <div className="w-80 bg-surface-elevated border-r border-primary/20 p-4 skeleton-surface">
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-surface rounded-full animate-pulse"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-surface rounded animate-pulse"></div>
                      <div className="h-3 bg-surface rounded w-3/4 animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 flex flex-col items-stretch justify-between bg-surface skeleton-surface px-8 py-6">
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="h-20 rounded-2xl bg-surface-elevated border border-primary/15 animate-pulse"></div>
                ))}
              </div>
              <div className="h-16 rounded-xl bg-surface-elevated border border-primary/15 animate-pulse"></div>
            </div>
            <div className="w-80 bg-surface-elevated border-l border-primary/20 skeleton-surface">
              <div className="h-full w-full flex flex-col">
                <div className="p-4 border-b border-primary/20">
                  <div className="h-4 w-40 rounded bg-accent/10 animate-pulse"></div>
                </div>
                <div className="flex-1 p-6 space-y-4">
                  <div className="h-12 rounded-xl bg-accent/10 animate-pulse"></div>
                  <div className="h-24 rounded-2xl bg-accent/10 animate-pulse"></div>
                  <div className="h-32 rounded-2xl bg-accent/5 animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex theme-transition">
      <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
        <SideBar />
      </div>
      <main className="flex-1 min-w-0 flex flex-col h-screen">
        <div className="px-6 py-4 border-b border-primary/20 bg-surface-elevated theme-transition flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-primary">Teledentistry Console</h1>
            <p className="text-sm text-secondary">
              Manage virtual consultations, secure messaging, and real-time patient collaboration.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleStartVideoCall()}
              disabled={!activeAppointmentId}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-accent/40 text-accent hover:bg-accent/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon name="Video" size={16} />
              <span>Start Instant Call</span>
            </button>
            <button
              onClick={() => console.log('Initiate new consultation flow')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent-hover transition-all duration-200"
            >
              <Icon name="Plus" size={16} />
              <span>New Consultation</span>
            </button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          <aside className="w-80 bg-surface-elevated border-r border-primary/20 flex flex-col theme-transition">
            <div className="px-4 py-4 border-b border-primary/10">
              <h2 className="text-sm font-semibold text-primary">Conversations</h2>
              <p className="text-xs text-muted mt-1">Tap to open the patient channel</p>
            </div>
            <ConversationList
              conversations={conversations}
              presenceMap={presenceMap}
              selectedAppointmentId={activeAppointmentId}
              onConversationSelect={handleConversationSelect}
            />
          </aside>

          <section className="flex-1 flex flex-col min-w-0 bg-surface theme-transition">
            {videoSession ? (
              <VideoCallInterface
                conversation={activeConversation}
                videoSession={videoSession}
                onEndCall={handleEndVideoCall}
              />
            ) : (
              <ChatInterface
                conversation={activeConversation}
                messages={messages}
                currentUserId={user?.id?.toString()}
                presence={selectedPresence}
                onSendText={handleSendTextMessage}
                onUploadAttachment={handleUploadAttachment}
                onStartVideoCall={handleStartVideoCall}
              />
            )}
          </section>

          <PatientInfoPanel
            conversation={activeConversation}
            presence={selectedPresence}
            isExpanded={isPatientPanelExpanded}
            onToggleExpanded={setIsPatientPanelExpanded}
          />
        </div>
      </main>
    </div>
  );
};

export default Teledentistry;
