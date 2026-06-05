import { useMemo, useRef, useState, useCallback } from 'react';

/**
 * Mobile-specific Twilio Video Client Hook.
 * Wraps the imperative React Native <TwilioVideo> ref methods into declarative state.
 */
export function useTwilioVideoClient() {
  const twilioRef = useRef(null);

  const [isConnected, setIsConnected] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [remoteVideoTracks, setRemoteVideoTracks] = useState([]);
  const [remoteParticipants, setRemoteParticipants] = useState({});
  const [connectError, setConnectError] = useState(null);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [networkQuality, setNetworkQuality] = useState(-1);
  const [networkQualityEvent, setNetworkQualityEvent] = useState({
    quality: -1,
    timestamp: null,
    sequence: 0,
  });

  const rememberParticipant = useCallback((participant) => {
    if (!participant?.sid) return;
    setRemoteParticipants((prev) => ({
      ...prev,
      [participant.sid]: {
        sid: participant.sid,
        identity: participant.identity || '',
      },
    }));
  }, []);

  const forgetParticipant = useCallback((participantSid) => {
    if (!participantSid) return;
    setRemoteParticipants((prev) => {
      const next = { ...prev };
      delete next[participantSid];
      return next;
    });
    setRemoteVideoTracks((prev) => prev.filter((item) => item.participantSid !== participantSid));
  }, []);

  const connect = useCallback(async ({ roomName, token, enableAudio = true, enableVideo = true }) => {
    if (!twilioRef.current) {
      throw new Error('Twilio Video belum tersedia di runtime ini. Gunakan iOS development build/custom dev client, bukan Expo Go.');
    }
    if (!roomName || !token) {
      throw new Error('Video room token is incomplete');
    }

    try {
      setConnectError(null);
      setConnectionState('connecting');
      setRemoteVideoTracks([]);
      setRemoteParticipants({});
      twilioRef.current.connect({
        roomName,
        accessToken: token,
        enableAudio,
        enableVideo,
      });
      return true;
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
    setRemoteVideoTracks([]);
    setRemoteParticipants({});
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
    setIsConnected(true);
    setConnectionState('connected');
    setConnectError(null);
  };

  const onRoomDidDisconnect = ({ error }) => {
    // console.log('[useTwilioVideoClient] Room disconnected', error);
    setIsConnected(false);
    setConnectionState('disconnected');
    setRemoteVideoTracks([]);
    setRemoteParticipants({});
    if (error) {
       setConnectError(error.message || 'Room disconnected with error');
    }
  };

  const onRoomDidFailToConnect = (error) => {
    // console.log('[useTwilioVideoClient] Room failed to connect', error);
    setIsConnected(false);
    setConnectionState('disconnected');
    setRemoteVideoTracks([]);
    setRemoteParticipants({});
    setConnectError(error?.error || error?.message || 'Failed to connect to video room');
  };

  const onParticipantAddedVideoTrack = ({ participant, track }) => {
    rememberParticipant(participant);
    if (!participant?.sid || !track?.trackSid) return;
    setRemoteVideoTracks((prev) => {
      const nextTrack = {
        participantSid: participant.sid,
        identity: participant.identity || '',
        videoTrackSid: track.trackSid,
        trackName: track.trackName || '',
        enabled: track.enabled !== false,
      };
      const existingIndex = prev.findIndex((item) => (
        item.participantSid === nextTrack.participantSid && item.videoTrackSid === nextTrack.videoTrackSid
      ));
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = nextTrack;
        return next;
      }
      return [...prev, nextTrack];
    });
  };

  const onParticipantRemovedVideoTrack = ({ participant, track }) => {
    setRemoteVideoTracks((prev) => prev.filter((item) => !(
      item.participantSid === participant?.sid && (!track?.trackSid || item.videoTrackSid === track.trackSid)
    )));
  };

  const onParticipantAddedAudioTrack = ({ participant }) => {
    rememberParticipant(participant);
  };

  const onRoomParticipantDidConnect = ({ participant }) => {
    rememberParticipant(participant);
  };

  const onRoomParticipantDidDisconnect = ({ participant }) => {
    forgetParticipant(participant?.sid);
  };

  const onRoomIsReconnecting = ({ error } = {}) => {
    setIsConnected(false);
    setConnectionState('reconnecting');
    setConnectError(error?.message || 'Koneksi video terputus sementara');
  };

  const onRoomDidReconnect = () => {
    setIsConnected(true);
    setConnectionState('connected');
    setConnectError(null);
  };

  const onNetworkQualityLevelChanged = ({ participant, isLocalUser, quality }) => {
     if (isLocalUser) {
        const nextQuality = Number.isFinite(quality) ? quality : -1;
        setNetworkQuality(nextQuality);
        setNetworkQualityEvent((prev) => ({
          quality: nextQuality,
          timestamp: Date.now(),
          sequence: prev.sequence + 1,
        }));
     }
  };

  const onVideoChanged = ({ videoEnabled }) => {
    setIsVideoEnabled(Boolean(videoEnabled));
  };

  const onAudioChanged = ({ audioEnabled }) => {
    setIsAudioEnabled(Boolean(audioEnabled));
  };

  const remoteParticipantSids = useMemo(
    () => Array.from(new Set(remoteVideoTracks.map((item) => item.participantSid))),
    [remoteVideoTracks],
  );

  return {
    twilioRef,
    isConnected,
    isAudioEnabled,
    isVideoEnabled,
    remoteVideoTracks,
    remoteParticipantSids,
    remoteParticipants: Object.values(remoteParticipants),
    connectError,
    connectionState,
    networkQuality,
    networkQualityEvent,
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
      onRoomParticipantDidConnect,
      onRoomParticipantDidDisconnect,
      onParticipantAddedVideoTrack,
      onParticipantRemovedVideoTrack,
      onParticipantAddedAudioTrack,
      onRoomIsReconnecting,
      onRoomDidReconnect,
      onVideoChanged,
      onAudioChanged,
      onNetworkQualityLevelsChanged: onNetworkQualityLevelChanged
    }
  };
}
