import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import SessionDashboard from './SessionDashboard';
import { useChat } from '../../../hooks/useChat';
import { useAuth } from '../../../contexts/AuthContext';
import { useCallState } from '../../../hooks/useCallState';
import { useToast } from '../../../contexts/ToastContext';
import {
  fetchPreSessionHealthForm,
  recordCommunicationClientEvent
} from '../../../services/chatService';

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
  const [preCallAppointmentId, setPreCallAppointmentId] = useState(null);
  const [preSessionHealthForm, setPreSessionHealthForm] = useState({ status: 'idle', form: null, error: null });
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

  const handleConversationSelect = useCallback((conversation) => {
    if (conversation.appointmentId === activeAppointmentId) return;
    setChatLoading(true);
    selectConversation(conversation.appointmentId);
    // Simulation of data transition
    setTimeout(() => setChatLoading(false), 400);
  }, [activeAppointmentId, selectConversation]);

  const handleSendTextMessage = async (text) => {
    if (!activeAppointmentId) return;
    await sendMessage({ appointmentId: activeAppointmentId, text });
  };

  const handleUploadAttachment = async (file) => {
    if (!activeAppointmentId) return;
    await sendAttachmentMessage({ appointmentId: activeAppointmentId, file });
  };

  const openPreCallChecklist = useCallback(() => {
    if (!activeAppointmentId) return;
    setPreCallAppointmentId(activeAppointmentId);
    setShowPreCallChecklist(true);
  }, [activeAppointmentId]);

  const handleDashboardStartVideo = useCallback((appointmentId) => {
    const conversation = conversations.find((item) => item.appointmentId === appointmentId);
    if (conversation && appointmentId !== activeAppointmentId) {
      handleConversationSelect(conversation);
    }
    setPreCallAppointmentId(appointmentId);
    setShowPreCallChecklist(true);
  }, [activeAppointmentId, conversations, handleConversationSelect]);

  const handleDashboardViewPreSession = useCallback((appointmentId) => {
    const conversation = conversations.find((item) => item.appointmentId === appointmentId);
    if (conversation && appointmentId !== activeAppointmentId) {
      handleConversationSelect(conversation);
    }
    setIsPatientPanelExpanded(true);
  }, [activeAppointmentId, conversations, handleConversationSelect]);

  const handleStartVideoCall = async (appointmentIdOverride = activeAppointmentId) => {
    if (!appointmentIdOverride) return;
    try {
      await initiateCall(appointmentIdOverride);
      // Notify the other participant via socket
      emitVideoCall(appointmentIdOverride);
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

  useEffect(() => {
    let ignore = false;
    if (!activeAppointmentId) {
      setPreSessionHealthForm({ status: 'idle', form: null, error: null });
      return () => { ignore = true; };
    }

    setPreSessionHealthForm({ status: 'loading', form: null, error: null });
    fetchPreSessionHealthForm(activeAppointmentId)
      .then((result) => {
        if (ignore) return;
        setPreSessionHealthForm({
          status: result?.form ? 'submitted' : 'missing',
          form: result?.form || null,
          error: null
        });
      })
      .catch((error) => {
        if (ignore) return;
        setPreSessionHealthForm({
          status: 'error',
          form: null,
          error: error?.message || 'Failed to load pre-session health form'
        });
      });

    return () => { ignore = true; };
  }, [activeAppointmentId]);

  if (loading || bootstrapping) {
    return (
      <div className="flex min-h-screen dentist-skeleton" style={{ background: 'var(--td-app-bg)' }}>
        <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
          <SideBar />
        </div>
        <main className="flex-1 min-w-0 flex flex-col h-screen">
          <div
            className="px-6 py-4 skeleton-surface"
            style={{
              background: 'rgba(26,21,40,0.88)',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 w-36 rounded animate-pulse" style={{ background: 'rgba(124,58,237,0.16)' }}></div>
                <div className="h-6 w-64 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.08)' }}></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-9 w-28 rounded-lg animate-pulse" style={{ background: 'rgba(124,58,237,0.16)' }}></div>
                <div className="h-9 w-32 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.08)' }}></div>
              </div>
            </div>
          </div>

          <div
            className="m-3 flex flex-1 min-h-0 overflow-hidden rounded-2xl skeleton-surface"
            style={{
              background: 'rgba(15,13,26,0.4)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
            }}
          >
            <div className="w-80 p-4" style={{ background: 'rgba(15,13,26,0.6)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.07)' }}></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.07)' }}></div>
                      <div className="h-3 rounded w-3/4 animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 flex flex-col items-stretch justify-between px-8 py-6" style={{ background: 'var(--td-app-bg)' }}>
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="h-20 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)' }}></div>
                ))}
              </div>
              <div className="h-16 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)' }}></div>
            </div>
            <div className="w-80 skeleton-surface" style={{ background: 'rgba(15,13,26,0.7)', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="h-full w-full flex flex-col">
                <div className="p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="h-4 w-40 rounded animate-pulse" style={{ background: 'rgba(124,58,237,0.16)' }}></div>
                </div>
                <div className="flex-1 p-6 space-y-4">
                  <div className="h-12 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }}></div>
                  <div className="h-24 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }}></div>
                  <div className="h-32 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }}></div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--td-app-bg)' }}>
      <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
        <SideBar />
      </div>
      <main className="flex-1 min-w-0 flex flex-col h-screen rounded-xl m-4" style={{ overflow: 'hidden' }}>
        <div
          className="flex flex-shrink-0 items-center justify-between px-6 py-3.5"
          style={{
            background: 'rgba(26, 21, 40, 0.88)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            zIndex: 10,
          }}
        >
          <div>
            <div className="mb-0.5 flex items-center gap-1.5">
              <span style={{ color: 'var(--td-text-muted)', fontSize: '0.72rem' }}>Dentist Portal</span>
              <span style={{ color: 'var(--td-text-muted)', fontSize: '0.72rem' }}>/</span>
              <span style={{ color: 'var(--td-text-sub)', fontSize: '0.72rem', fontWeight: 600 }}>Teledentistry</span>
            </div>
            <h1 className="font-bold tracking-tight" style={{ color: 'var(--td-text-main)', fontSize: '1.25rem' }}>
              Teledentistry
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPostCallSummary(true)}
              disabled={!activeAppointmentId}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150 hover:-translate-y-px disabled:opacity-40"
              style={{ color: 'var(--td-text-sub)' }}
            >
              <Icon name="ClipboardList" size={14} />
              <span>Ringkasan</span>
            </button>
            <button
              onClick={() => setShowNewConsultation(true)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all duration-150 hover:-translate-y-px"
              style={{
                color: 'var(--td-text-main)',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <Icon name="Plus" size={14} />
              <span>Konsultasi Baru</span>
            </button>
            <button
              onClick={openPreCallChecklist}
              disabled={!activeAppointmentId || callState === 'requesting_token' || callState === 'ringing'}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-bold transition-all duration-150 hover:-translate-y-px disabled:translate-y-0 disabled:opacity-40"
              style={{
                background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(124,58,237,0.4)',
              }}
            >
              {callState === 'requesting_token' ? (
                <Icon name="Loader2" size={14} className="animate-spin" />
              ) : (
                <Icon name="Video" size={14} />
              )}
              <span>{callState === 'requesting_token' ? 'Menghubungkan...' : 'Mulai Panggilan'}</span>
            </button>
          </div>
        </div>

        {/* Network Banner */}
        {activeAppointmentId && !socketConnected && !loading && !bootstrapping && (
          <div
            className="flex w-full items-center justify-center gap-2 px-4 py-2"
            style={{
              background: 'rgba(239,68,68,0.15)',
              borderBottom: '1px solid rgba(239,68,68,0.2)',
            }}
          >
            <Icon name="WifiOff" size={14} className="animate-pulse" style={{ color: '#f87171' }} />
            <span className="text-xs font-semibold" style={{ color: '#fca5a5' }}>
              {reconnectError || (connectionState === 'connecting'
                ? 'Menghubungkan ulang sesi chat...'
                : 'Koneksi terputus. Mencoba menghubungkan kembali...')}
            </span>
          </div>
        )}

        <SessionDashboard
          conversations={conversations}
          presenceMap={presenceMap}
          selectedAppointmentId={activeAppointmentId}
          loading={loading || bootstrapping}
          onSelectConversation={handleConversationSelect}
          onStartVideo={handleDashboardStartVideo}
          onViewPreSession={handleDashboardViewPreSession}
        />

        <div
          className="mx-3 mb-3 flex flex-1 min-h-0 overflow-hidden rounded-2xl"
          style={{
            background: 'rgba(15, 13, 26, 0.4)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
          }}
        >
          <aside className="flex w-80 flex-col">
            <ConversationList
              conversations={conversations}
              presenceMap={presenceMap}
              selectedAppointmentId={activeAppointmentId}
              onConversationSelect={handleConversationSelect}
            />
          </aside>

          <section className="flex min-w-0 flex-1 flex-col">
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
                onStartVideoCall={openPreCallChecklist}
              />
            )}
          </section>

          <PatientInfoPanel
            conversation={activeConversation}
            presence={selectedPresence}
            preSessionHealthForm={preSessionHealthForm}
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
        appointmentId={preCallAppointmentId || activeAppointmentId}
        open={showPreCallChecklist}
        onClose={() => {
          setShowPreCallChecklist(false);
          setPreCallAppointmentId(null);
        }}
        onJoin={() => {
          const appointmentId = preCallAppointmentId || activeAppointmentId;
          setShowPreCallChecklist(false);
          setPreCallAppointmentId(null);
          handleStartVideoCall(appointmentId);
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
