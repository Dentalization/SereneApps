import { useRef, useState, useCallback } from 'react';

/**
 * Mobile-specific Twilio Video Client Hook.
 * Wraps the imperative React Native <TwilioVideo> ref methods into declarative state.
 */
export function useTwilioVideoClient() {
  const twilioRef = useRef(null);

  const [isConnected, setIsConnected] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [remoteParticipantSids, setRemoteParticipantSids] = useState([]);
  const [connectError, setConnectError] = useState(null);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [networkQuality, setNetworkQuality] = useState(-1);

  const connect = useCallback(async ({ roomName, token }) => {
    if (!twilioRef.current) return;
    
    try {
      setConnectError(null);
      setConnectionState('connecting');
      // Connect to the room using the React Native Ref
      twilioRef.current.connect({
        roomName,
        accessToken: token,
        enableAudio: true,
        enableVideo: true,
      });
    } catch (error) {
      console.error('[useTwilioVideoClient] Failed to invoke connect', error);
      setConnectError(error?.message || 'Failed to connect to video room');
      throw error;
    }
  }, []);

  const disconnect = useCallback(() => {
    if (twilioRef.current) {
      twilioRef.current.disconnect();
    }
    setIsConnected(false);
    setConnectionState('disconnected');
    setRemoteParticipantSids([]);
  }, []);

  const toggleAudio = useCallback(() => {
    if (!twilioRef.current) return;
    twilioRef.current.setLocalAudioEnabled(!isAudioEnabled).then(enabled => {
      setIsAudioEnabled(enabled);
    });
  }, [isAudioEnabled]);

  const toggleVideo = useCallback(() => {
    if (!twilioRef.current) return;
    twilioRef.current.setLocalVideoEnabled(!isVideoEnabled).then(enabled => {
      setIsVideoEnabled(enabled);
    });
  }, [isVideoEnabled]);

  const flipCamera = useCallback(() => {
    if (!twilioRef.current) return;
    twilioRef.current.flipCamera();
  }, []);

  // ── Twilio Event Handlers ──
  const onRoomDidConnect = () => {
    // console.log('[useTwilioVideoClient] Room connected');
    setIsConnected(true);
    setConnectionState('connected');
    setConnectError(null);
  };

  const onRoomDidDisconnect = ({ error }) => {
    // console.log('[useTwilioVideoClient] Room disconnected', error);
    setIsConnected(false);
    setConnectionState('disconnected');
    setRemoteParticipantSids([]);
    if (error) {
       setConnectError(error.message || 'Room disconnected with error');
    }
  };

  const onRoomDidFailToConnect = (error) => {
    // console.log('[useTwilioVideoClient] Room failed to connect', error);
    setIsConnected(false);
    setConnectionState('disconnected');
    setRemoteParticipantSids([]);
    setConnectError(error?.error || error?.message || 'Failed to connect to video room');
  };

  const onParticipantAddedVideoTrack = ({ participant, track }) => {
    // Add participant to state if not already presenting video
    setRemoteParticipantSids((prev) => {
      if (prev.includes(participant.sid)) return prev;
      return [...prev, participant.sid];
    });
  };

  const onParticipantRemovedVideoTrack = ({ participant, track }) => {
    setRemoteParticipantSids((prev) => prev.filter(sid => sid !== participant.sid));
  };
  
  const onNetworkQualityLevelChanged = ({ participant, isLocalUser, quality }) => {
     if (isLocalUser) {
        setNetworkQuality(quality);
     }
  };

  return {
    twilioRef,
    isConnected,
    isAudioEnabled,
    isVideoEnabled,
    remoteParticipantSids,
    connectError,
    connectionState,
    networkQuality,
    connect,
    disconnect,
    toggleAudio,
    toggleVideo,
    flipCamera,
    // Event bindings for the <TwilioVideo> component
    handlers: {
      onRoomDidConnect,
      onRoomDidDisconnect,
      onRoomDidFailToConnect,
      onParticipantAddedVideoTrack,
      onParticipantRemovedVideoTrack,
      onNetworkQualityLevelsChanged: onNetworkQualityLevelChanged // The rn twilio video lib sometimes refers to this callback as onNetworkQualityLevelsChanged
    }
  };
}
