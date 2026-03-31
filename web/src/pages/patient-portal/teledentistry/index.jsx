import React, { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../../../components/AppIcon';
import ChatInterface from '../../dentist-portal/teledentistry/components/ChatInterface';
import VideoCallInterface from '../../dentist-portal/teledentistry/components/VideoCallInterface';
import IncomingCallModal from '../../dentist-portal/teledentistry/components/IncomingCallModal';
import { useChat } from '../../../hooks/useChat';
import { useAuth } from '../../../contexts/AuthContext';
import { useCallState } from '../../../hooks/useCallState';
import { useToast } from '../../../contexts/ToastContext';

const MIN_LOADING_MS = 600;

const PatientTeledentistry = () => {
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

  const [bootstrapping, setBootstrapping] = useState(true);
  const loadStartRef = useRef(Date.now());

  // Auto-select the first (and typically only) conversation for patients
  useEffect(() => {
    if (!loading && conversations.length > 0 && !activeAppointmentId) {
      selectConversation(conversations[0].appointmentId);
    }
  }, [loading, conversations, activeAppointmentId, selectConversation]);

  // Bootstrap timer
  useEffect(() => {
    loadStartRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (loading) return;
    const elapsed = Date.now() - loadStartRef.current;
    const remaining = MIN_LOADING_MS - elapsed;
    if (remaining > 0) {
      const timer = setTimeout(() => setBootstrapping(false), remaining);
      return () => clearTimeout(timer);
    }
    setBootstrapping(false);
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

  // ── Listen for call_accepted → auto-connect (patient initiated call) ──
  useEffect(() => {
    const onAccepted = () => {
      if (callState === 'ringing' && videoSession?.token) {
        acceptCall();
      }
    };
    const onDeclined = () => {
      if (callState === 'ringing') {
        toast.info('Panggilan ditolak oleh dokter.');
        endCall();
      }
    };
    const onEnded = () => {
      if (callState === 'connected') {
        toast.info('Panggilan diakhiri oleh partisipan lain.');
        endCall();
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
  }, [callState, videoSession, acceptCall, endCall, toast]);

  // ── Ringing timeout (60s) for call initiator ──
  useEffect(() => {
    if (callState !== 'ringing') return;
    const timer = setTimeout(() => {
      toast.info('Tidak ada jawaban. Panggilan berakhir.');
      endCall();
    }, 60000);
    return () => clearTimeout(timer);
  }, [callState, endCall, toast]);

  // Show toast on call error
  useEffect(() => {
    if (callError) {
      toast.error(callError);
    }
  }, [callError, toast]);

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
      await initiateCall(activeAppointmentId, 'subscriber');
      emitVideoCall(activeAppointmentId);
    } catch (error) {
      toast.error('Failed to start video call. Please try again.');
    }
  };

  const handleAcceptCall = async () => {
    const apptId = videoSession?.appointmentId || incomingCall?.appointmentId || activeAppointmentId;
    if (apptId && !videoSession?.token) {
      try {
        const session = await initiateCall(apptId, 'subscriber');
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
  };

  const handleJoinError = (error) => {
    toast.error(`Video call failed: ${error?.message || 'Connection error'}`);
  };

  const selectedPresence = useMemo(() => {
    if (!activeAppointmentId) return [];
    return presenceMap[activeAppointmentId] || [];
  }, [presenceMap, activeAppointmentId]);

  const dentistName = activeConversation?.dentist?.name || 'Your Dentist';
  const appointmentStatus = activeConversation?.status || 'active';

  // ── Loading State ──────────────────────────────────────────────
  if (loading || bootstrapping) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center theme-transition">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 mx-auto border-3 border-accent/20 border-t-accent rounded-full animate-spin" />
          <p className="text-sm text-muted theme-transition">Loading your consultation…</p>
        </div>
      </div>
    );
  }

  // ── No Active Appointment ──────────────────────────────────────
  if (!conversations.length) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center theme-transition">
        <div className="text-center space-y-4 max-w-md px-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-accent/10 flex items-center justify-center">
            <Icon name="Video" size={28} className="text-accent" />
          </div>
          <h2 className="text-xl font-semibold text-primary theme-transition">No Active Consultation</h2>
          <p className="text-sm text-muted theme-transition">
            You don't have any active teledentistry sessions. Please check your appointments or contact your clinic to schedule a consultation.
          </p>
          <a
            href="/patient-portal/appointments"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent-hover transition-all duration-200"
          >
            <Icon name="Calendar" size={16} />
            <span>View Appointments</span>
          </a>
        </div>
      </div>
    );
  }

  // ── Main UI ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface flex flex-col theme-transition">
      {/* Header */}
      <header className="px-6 py-4 border-b border-primary/20 bg-surface-elevated theme-transition flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a
            href="/patient-portal/appointments"
            className="p-2 text-muted hover:text-primary hover:bg-surface rounded-lg theme-transition"
            aria-label="Back to appointments"
          >
            <Icon name="ArrowLeft" size={18} />
          </a>
          <div>
            <h1 className="text-lg font-semibold text-primary theme-transition">Virtual Consultation</h1>
            <p className="text-xs text-muted theme-transition">
              With {dentistName} • Appointment #{activeAppointmentId}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
              appointmentStatus === 'confirmed'
                ? 'bg-emerald-100 text-emerald-700'
                : appointmentStatus === 'cancelled'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-amber-100 text-amber-700'
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${
              appointmentStatus === 'confirmed' ? 'bg-emerald-500' : 'bg-amber-500'
            }`} />
            {appointmentStatus}
          </span>
          <button
            onClick={handleStartVideoCall}
            disabled={!activeAppointmentId || callState === 'requesting_token' || callState === 'ringing'}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent-hover transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {callState === 'requesting_token' ? (
              <Icon name="Loader2" size={16} className="animate-spin" />
            ) : (
              <Icon name="Video" size={16} />
            )}
            <span>{callState === 'requesting_token' ? 'Connecting...' : 'Start Call'}</span>
          </button>
        </div>
      </header>

      {/* Network Banner */}
      {!socketConnected && !loading && !bootstrapping && (
        <div className="w-full bg-amber-500 text-white px-4 py-2.5 flex items-center justify-center gap-2 shadow-sm z-40 relative">
          <Icon name="WifiOff" size={16} className="animate-pulse" />
          <span className="text-sm font-medium leading-none tracking-wide">Koneksi terputus. Mencoba menghubungkan kembali...</span>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0">
        {videoSession && callState === 'connected' ? (
          <VideoCallInterface
            conversation={activeConversation}
            videoSession={videoSession}
            onEndCall={handleEndVideoCall}
            onJoinError={handleJoinError}
            remoteParticipant={activeConversation?.dentist}
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
      </main>

      {/* Portaled modals */}
      {callState === 'ringing' && (
        <IncomingCallModal
          conversation={activeConversation}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
          callState={callState}
          remoteParticipant={activeConversation?.dentist}
        />
      )}
    </div>
  );
};

export default PatientTeledentistry;
