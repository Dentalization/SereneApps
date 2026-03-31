import React, { useEffect, useRef, useState } from 'react';
import Icon from '../../../../components/AppIcon';
import { useTwilioVideoClient } from '../../../../hooks/useTwilioVideoClient';

const VideoCallInterface = ({ conversation, videoSession, onEndCall }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const controlsHideTimerRef = useRef(null);
  const [showControls, setShowControls] = useState(true);
  const [callDuration, setCallDuration] = useState(0);

  const {
    join,
    leave,
    isJoined,
    audioEnabled,
    videoEnabled,
    toggleAudio,
    toggleVideo
  } = useTwilioVideoClient();

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

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
      className="relative h-full bg-black flex flex-col"
      onMouseMove={resetControlsTimer}
    >
      <div className={`absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/50 to-transparent transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium">
                {conversation?.patient?.name
                  ?.split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-medium">{conversation?.patient?.name}</h3>
              <p className="text-xs text-gray-300">
                {isJoined ? 'Connected' : 'Connecting'} • {formatDuration(callDuration)}
              </p>
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
                  {conversation?.patient?.name
                    ?.split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()}
                </span>
              </div>
              <p className="text-lg font-medium">{conversation?.patient?.name}</p>
              <p className="text-sm text-gray-300">Connecting video...</p>
            </div>
          </div>
        </div>

        <div className="absolute top-4 right-4 w-48 h-36 bg-gray-900 rounded-lg overflow-hidden border-2 border-white/20">
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

          <button onClick={handleEndCall} className="p-4 bg-red-600 hover:bg-red-700 rounded-full transition-colors">
            <Icon name="PhoneOff" size={20} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCallInterface;
