import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SideBar from '../ui/SideBar';
import Icon from '../../../components/AppIcon';
import ConversationList from './components/ConversationList';
import ChatInterface from './components/ChatInterface';
import VideoCallInterface from './components/VideoCallInterface';
import PatientInfoPanel from './components/PatientInfoPanel';
import IncomingCallModal from './components/IncomingCallModal';
import NewConsultationModal from './components/NewConsultationModal';
import PostCallSummaryPanel from './components/PostCallSummaryPanel';
import PreCallChecklistModal from './components/PreCallChecklistModal';
import { useChat } from '../../../hooks/useChat';
import { useAuth } from '../../../contexts/AuthContext';
import { useCallState } from '../../../hooks/useCallState';
import { useToast } from '../../../contexts/ToastContext';
import { recordCommunicationClientEvent } from '../../../services/chatService';

const MIN_LOADING_MS = 900;

const Teledentistry = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    conversations,
    presenceMap,
    loading,
    activeConversation,
    activeAppointmentId,
    messages,
    incomingCall,
    socketConnected,
    connectionState,
    reconnectError,
    attachmentUpload,
    selectConversation,
    sendMessage,
    sendAttachmentMessage,
    emitVideoCall,
    emitVideoCallResponse,
    emitVideoCallEnded,
  } = useChat();

  const {
    callState,
    callError,
    videoSession,
    initiateCall,
    acceptCall,
    endCall,
    receiveIncomingCall,
  } = useCallState({ userId: user?.id?.toString() });

  const [isPatientPanelExpanded, setIsPatientPanelExpanded] = useState(true);
  const [showNewConsultation, setShowNewConsultation] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [showPostCallSummary, setShowPostCallSummary] = useState(false);
  const [showPreCallChecklist, setShowPreCallChecklist] = useState(false);
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

  // ── Handle incoming call from socket (use ref to avoid dep loop) ──
  const receiveIncomingCallRef = useRef(receiveIncomingCall);
  receiveIncomingCallRef.current = receiveIncomingCall;

  useEffect(() => {
    if (!incomingCall) return;
    receiveIncomingCallRef.current({
      appointmentId: incomingCall.appointmentId,
      roomName: null,
      token: null,
      callerId: incomingCall.callerId,
      callerName: incomingCall.callerName,
    });
  }, [incomingCall]);

  // ── Listen for call_accepted → auto-connect (dentist initiated call) ──
  useEffect(() => {
    const onAccepted = () => {
      if (callState === 'ringing' && videoSession?.token) {
        acceptCall();
      }
    };
    const onDeclined = () => {
      if (callState === 'ringing') {
        toast.info('Call was declined by the patient.');
        endCall();
      }
    };
    const onEnded = () => {
      if (callState === 'connected') {
        toast.info('Call ended by the other participant.');
        endCall();
        if (activeAppointmentId) setShowPostCallSummary(true);
      }
    };
    window.addEventListener('teledentistry:call_accepted', onAccepted);
    window.addEventListener('teledentistry:call_declined', onDeclined);
    window.addEventListener('teledentistry:call_ended', onEnded);
    return () => {
      window.removeEventListener('teledentistry:call_accepted', onAccepted);
      window.removeEventListener('teledentistry:call_declined', onDeclined);
      window.removeEventListener('teledentistry:call_ended', onEnded);
    };
  }, [activeAppointmentId, callState, videoSession, acceptCall, endCall, toast]);

  // ── Ringing timeout (60s) for call initiator ──
  useEffect(() => {
    if (callState !== 'ringing') return;
    const timer = setTimeout(() => {
      toast.info('No answer. Call timed out.');
      endCall();
    }, 60000);
    return () => clearTimeout(timer);
  }, [callState, endCall, toast]);

  const handleConversationSelect = (conversation) => {
    if (conversation.appointmentId === activeAppointmentId) return;
    setChatLoading(true);
    selectConversation(conversation.appointmentId);
    // Simulation of data transition
    setTimeout(() => setChatLoading(false), 400);
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
      await initiateCall(activeAppointmentId);
      // Notify the other participant via socket
      emitVideoCall(activeAppointmentId);
    } catch (error) {
      toast.error('Failed to start video call. Please try again.');
    }
  };

  const handleAcceptCall = async () => {
    const apptId = videoSession?.appointmentId || incomingCall?.appointmentId || activeAppointmentId;
    // If accepting an incoming call without a token, fetch one first
    if (apptId && !videoSession?.token) {
      try {
        const session = await initiateCall(apptId);
        if (session) {
          acceptCall();
          emitVideoCallResponse(apptId, true);
        } else {
          toast.error('Failed to connect to video call.');
          endCall();
        }
      } catch (error) {
        toast.error('Failed to connect to video call.');
        endCall();
      }
    } else {
      acceptCall();
      if (apptId) emitVideoCallResponse(apptId, true);
    }
  };

  const handleDeclineCall = () => {
    const apptId = videoSession?.appointmentId || incomingCall?.appointmentId;
    if (apptId) emitVideoCallResponse(apptId, false);
    endCall();
  };

  const handleEndVideoCall = () => {
    const apptId = videoSession?.appointmentId || activeAppointmentId;
    if (apptId) emitVideoCallEnded(apptId);
    endCall();
    if (apptId) setShowPostCallSummary(true);
  };

  // Fix 3: Handle join error from VideoCallInterface
  const handleJoinError = (error) => {
    toast.error(`Video call failed: ${error?.message || 'Connection error'}`);
  };

  // Show toast on call error
  useEffect(() => {
    if (callError) {
      toast.error(callError);
    }
  }, [callError, toast]);

  // ── Fix 4: PatientInfoPanel quick action handlers ─────────────
  const handleScheduleAppointment = () => {
    if (!activeConversation) return;
    navigate('/dentist-portal/schedule');
  };

  const handleViewMedicalHistory = () => {
    if (!activeConversation?.patient?.id) return;
    navigate(`/dentist-portal/patient-emr/${activeConversation.patient.id}`);
  };

  // ── Fix 5: New Consultation modal ─────────────────────────────
  const handleNewConsultationSubmit = async ({ appointmentId, patient, consultationType, notes }) => {
    toast.success(`Joining session with ${patient.name || 'patient'}`);
    setShowNewConsultation(false);
    selectConversation(appointmentId);
  };

  const selectedPresence = useMemo(() => {
    if (!activeAppointmentId) return [];
    return presenceMap[activeAppointmentId] || [];
  }, [presenceMap, activeAppointmentId]);

  useEffect(() => {
    if (!activeAppointmentId) return;
    recordCommunicationClientEvent(activeAppointmentId, 'waiting_room_entered', { surface: 'dentist_web' }).catch(() => null);
  }, [activeAppointmentId]);

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
            <h1 className="text-2xl font-semibold text-primary">Konsol Teledentistry</h1>
            <p className="text-sm text-secondary">
              Kelola konsultasi virtual, pesan aman, dan kolaborasi real-time dengan pasien.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPreCallChecklist(true)}
              disabled={!activeAppointmentId || callState === 'requesting_token' || callState === 'ringing'}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-accent/40 text-accent hover:bg-accent/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {callState === 'requesting_token' ? (
                <Icon name="Loader2" size={16} className="animate-spin" />
              ) : (
                <Icon name="Video" size={16} />
              )}
              <span>{callState === 'requesting_token' ? 'Menghubungkan...' : 'Mulai Panggilan'}</span>
            </button>
            <button
              onClick={() => setShowPostCallSummary(true)}
              disabled={!activeAppointmentId}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/20 text-primary hover:bg-primary/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon name="ClipboardList" size={16} />
              <span>Ringkasan</span>
            </button>
            <button
              onClick={() => setShowNewConsultation(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent-hover transition-all duration-200"
            >
              <Icon name="Plus" size={16} />
              <span>Konsultasi Baru</span>
            </button>
          </div>
        </div>

        {/* Network Banner */}
        {activeAppointmentId && !socketConnected && !loading && !bootstrapping && (
          <div className="w-full bg-amber-500 text-white px-4 py-2.5 flex items-center justify-center gap-2 shadow-sm z-40 relative">
            <Icon name="WifiOff" size={16} className="animate-pulse" />
            <span className="text-sm font-medium leading-none tracking-wide">
              {reconnectError || (connectionState === 'connecting'
                ? 'Menghubungkan ulang sesi chat...'
                : 'Koneksi terputus. Mencoba menghubungkan kembali...')}
            </span>
          </div>
        )}

        <div className="flex flex-1 min-h-0">
          <aside className="w-80 bg-surface-elevated border-r border-primary/20 flex flex-col theme-transition">
            <div className="px-4 py-4 border-b border-primary/10">
              <h2 className="text-sm font-semibold text-primary">Percakapan</h2>
              <p className="text-xs text-muted mt-1">Pilih untuk membuka kanal pasien</p>
            </div>
            <ConversationList
              conversations={conversations}
              presenceMap={presenceMap}
              selectedAppointmentId={activeAppointmentId}
              onConversationSelect={handleConversationSelect}
            />
          </aside>

          <section className="flex-1 flex flex-col min-w-0 bg-surface theme-transition">
            {videoSession && callState === 'connected' ? (
              <VideoCallInterface
                conversation={activeConversation}
                videoSession={videoSession}
                onEndCall={handleEndVideoCall}
                onJoinError={handleJoinError}
                remoteParticipant={activeConversation?.patient}
              />
            ) : (
              <ChatInterface
                conversation={activeConversation}
                messages={messages}
                currentUserId={user?.id?.toString()}
                presence={selectedPresence}
                loading={chatLoading}
                attachmentUpload={attachmentUpload}
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
            onScheduleAppointment={handleScheduleAppointment}
            onViewMedicalHistory={handleViewMedicalHistory}
          />
        </div>
      </main>

      {/* Portaled modals */}
      {callState === 'ringing' && (
        <IncomingCallModal
          conversation={activeConversation}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
          callState={callState}
          remoteParticipant={activeConversation?.patient}
        />
      )}

      {showNewConsultation && (
        <NewConsultationModal
          onClose={() => setShowNewConsultation(false)}
          onSubmit={handleNewConsultationSubmit}
        />
      )}
      <PreCallChecklistModal
        appointmentId={activeAppointmentId}
        open={showPreCallChecklist}
        onClose={() => setShowPreCallChecklist(false)}
        onJoin={() => {
          setShowPreCallChecklist(false);
          handleStartVideoCall();
        }}
      />
      <PostCallSummaryPanel
        appointmentId={activeAppointmentId}
        conversation={activeConversation}
        open={showPostCallSummary && Boolean(activeAppointmentId)}
        onClose={() => setShowPostCallSummary(false)}
      />
    </div>
  );
};

export default Teledentistry;
