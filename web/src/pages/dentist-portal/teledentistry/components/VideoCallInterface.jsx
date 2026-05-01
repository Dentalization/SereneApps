import React, { useEffect, useRef, useState } from 'react';
import Icon from '../../../../components/AppIcon';
import { useTwilioVideoClient } from '../../../../hooks/useTwilioVideoClient';
import {
  hardEndConsultationRoom,
  recordCommunicationClientEvent
} from '../../../../services/chatService';
import NetworkQualityBadge from './NetworkQualityBadge';

const VideoCallInterface = ({ conversation, videoSession, onEndCall, onJoinError, remoteParticipant }) => {
  // remoteParticipant = { name, avatar } — the person on the other end
  const remote = remoteParticipant || conversation?.patient || {};
  const remoteName = remote?.name || 'Participant';
  const remoteInitials = remoteName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const controlsHideTimerRef = useRef(null);
  const [showControls, setShowControls] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const lastQualityEventAtRef = useRef(0);

  const {
    join,
    leave,
    isJoined,
    connectionState,
    reconnectError,
    audioEnabled,
    videoEnabled,
    networkQuality,
    toggleAudio,
    toggleVideo
  } = useTwilioVideoClient();

  // PIP Dragging logic
  const [pipPos, setPipPos] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const offsetRef = useRef({ x: 0, y: 0 });

  const handleDragStart = (e) => {
    setIsDragging(true);
    offsetRef.current = {
      x: e.clientX - pipPos.x,
      y: e.clientY - pipPos.y,
    };
  };

  useEffect(() => {
    const handleDragMove = (e) => {
      if (!isDragging) return;
      const container = document.getElementById('video-call-container');
      if (!container) return;
      const rect = container.getBoundingClientRect();
      
      // Calculate new position within bounds (right and top fixed for simplicity, or relative to container)
      // I'll stick to fixed from TOP and RIGHT.
      const newX = rect.right - e.clientX;
      const newY = e.clientY - rect.top;

      setPipPos({
        x: Math.max(8, Math.min(newX - offsetRef.current.x, rect.width - 200)),
        y: Math.max(8, Math.min(newY - offsetRef.current.y, rect.height - 150)),
      });
    };

    const handleDragEnd = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDragging]);

  useEffect(() => {
    let durationTimer;
    if (videoSession) {
      const roomName = videoSession.roomName;
      if (!roomName) {
        console.warn('[VideoCall] videoSession.roomName is undefined — call will fail');
        return;
      }
      join({
        roomName,
        token: videoSession.token,
        localVideoEl: localVideoRef.current,
        remoteVideoEl: remoteVideoRef.current
      }).catch((error) => {
        console.error('Failed to join Twilio room:', error);
        onJoinError?.(error);
        onEndCall?.();
      });
      durationTimer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      clearInterval(durationTimer);
      leave().catch(() => null);
    };
  }, [videoSession, join, leave]);

  const handleEndCall = async () => {
    await leave().catch(() => null);
    onEndCall?.();
  };

  const handleHardEndCall = async () => {
    if (!videoSession?.appointmentId) {
      await handleEndCall();
      return;
    }
    if (!window.confirm('End the consultation room for all participants?')) return;
    await hardEndConsultationRoom(videoSession.appointmentId).catch(() => null);
    await handleEndCall();
  };

  const handleSwitchToAudioOnly = async () => {
    if (videoEnabled) {
      await toggleVideo();
      if (videoSession?.appointmentId) {
        recordCommunicationClientEvent(videoSession.appointmentId, 'network_quality_degraded', {
          level: networkQuality,
          action: 'switched_audio_only',
          surface: 'dentist_web'
        }).catch(() => null);
      }
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!videoSession?.appointmentId || networkQuality > 1) return;
    const now = Date.now();
    if (now - lastQualityEventAtRef.current < 60_000) return;
    lastQualityEventAtRef.current = now;
    recordCommunicationClientEvent(videoSession.appointmentId, 'network_quality_degraded', {
      level: networkQuality,
      surface: 'dentist_web'
    }).catch(() => null);
  }, [networkQuality, videoSession?.appointmentId]);

  useEffect(() => {
    if (!videoSession?.appointmentId || connectionState !== 'reconnecting') return;
    recordCommunicationClientEvent(videoSession.appointmentId, 'participant_reconnected', {
      surface: 'dentist_web',
      state: connectionState
    }).catch(() => null);
  }, [connectionState, videoSession?.appointmentId]);

  const resetControlsTimer = () => {
    setShowControls(true);
    if (controlsHideTimerRef.current) {
      clearTimeout(controlsHideTimerRef.current);
    }
    controlsHideTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (controlsHideTimerRef.current) {
        clearTimeout(controlsHideTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      id="video-call-container"
      className="relative h-full bg-black flex flex-col overflow-hidden"
      onMouseMove={resetControlsTimer}
      onTouchMove={resetControlsTimer}
      onTouchStart={resetControlsTimer}
    >
      <div className={`absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/50 to-transparent transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium">
                {remoteInitials}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">{remoteName}</h3>
                <NetworkQualityBadge level={networkQuality} compact />
              </div>
              <p className="text-xs text-gray-300">
                {connectionState === 'reconnecting' ? 'Reconnecting' : isJoined ? 'Connected' : 'Connecting'} • {formatDuration(callDuration)}
              </p>
              {reconnectError && (
                <p className="text-xs text-amber-200 mt-0.5">{reconnectError}</p>
              )}
              {networkQuality <= 1 && (
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-amber-100">
                  <span>Kualitas jaringan buruk. Pertimbangkan audio-only.</span>
                  {videoEnabled && (
                    <button
                      onClick={handleSwitchToAudioOnly}
                      className="rounded-md border border-amber-200/40 px-2 py-1 font-semibold text-amber-50 hover:bg-amber-200/10"
                    >
                      Audio only
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        <div className="w-full h-full relative">
          <video ref={remoteVideoRef} className="w-full h-full object-cover" autoPlay playsInline />
          <div className="absolute inset-0 bg-gray-800 flex items-center justify-center" hidden={isJoined}>
            <div className="text-center text-white">
              <div className="w-24 h-24 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-medium">
                  {remoteInitials}
                </span>
              </div>
              <p className="text-lg font-medium">{remoteName}</p>
              <p className="text-sm text-gray-300">Connecting video...</p>
            </div>
          </div>
        </div>

        <div 
          onMouseDown={handleDragStart}
          style={{ 
            top: `${pipPos.y}px`, 
            right: `${pipPos.x}px`,
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
          className="absolute w-48 h-36 bg-gray-900 rounded-lg overflow-hidden border-2 border-white/20 shadow-2xl z-20 group"
        >
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
            <Icon name="Move" size={20} className="text-white" />
          </div>
          <video ref={localVideoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
          {!videoEnabled && (
            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
              <Icon name="VideoOff" size={24} className="text-white" />
            </div>
          )}
        </div>
      </div>

      <div className={`absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/50 to-transparent transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={toggleAudio}
            className={`p-4 rounded-full transition-colors ${
              audioEnabled ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            <Icon name={audioEnabled ? 'Mic' : 'MicOff'} size={20} className="text-white" />
          </button>

          <button
            onClick={toggleVideo}
            className={`p-4 rounded-full transition-colors ${
              videoEnabled ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            <Icon name={videoEnabled ? 'Video' : 'VideoOff'} size={20} className="text-white" />
          </button>

          <button onClick={handleEndCall} className="p-4 bg-red-600 hover:bg-red-700 rounded-full transition-colors" title="Leave call">
            <Icon name="PhoneOff" size={20} className="text-white" />
          </button>

          <button onClick={handleHardEndCall} className="p-4 bg-red-800 hover:bg-red-900 rounded-full transition-colors" title="End room for everyone">
            <Icon name="ShieldX" size={20} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCallInterface;
