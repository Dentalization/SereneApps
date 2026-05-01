import { useCallback, useRef, useState } from 'react';
import { connect } from 'twilio-video';

const DEFAULT_VIDEO_SETTINGS = { audio: true, video: { width: 640 } };

export function useTwilioVideoClient() {
  const roomRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const remoteVideoTrackRef = useRef(null);
  const localElementRef = useRef(null);
  const remoteElementRef = useRef(null);
  const remoteContainerRef = useRef(null);
  const remoteTrackElementsRef = useRef(new Map());

  const [isConnected, setIsConnected] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [networkQuality, setNetworkQuality] = useState(5); // 0-5
  const [connectionState, setConnectionState] = useState('disconnected');
  const [reconnectError, setReconnectError] = useState(null);
  const [observeOnly, setObserveOnly] = useState(false);
  const [remoteTrackCount, setRemoteTrackCount] = useState(0);

  const detachFromElement = (track, element) => {
    if (!track) return;
    track.detach(element);
  };

  const attachRemoteTrack = (track) => {
    if (!track || track.kind !== 'video') return;
    if (remoteContainerRef.current) {
      if (remoteTrackElementsRef.current.has(track.sid)) return;
      const element = track.attach();
      element.autoplay = true;
      element.playsInline = true;
      element.className = 'h-full min-h-[180px] w-full rounded-lg bg-black object-contain';
      remoteContainerRef.current.appendChild(element);
      remoteTrackElementsRef.current.set(track.sid, { track, element });
      setRemoteTrackCount(remoteTrackElementsRef.current.size);
      return;
    }

    if (remoteVideoTrackRef.current && remoteVideoTrackRef.current.sid === track.sid) {
      return;
    }

    detachFromElement(remoteVideoTrackRef.current, remoteElementRef.current);
    remoteVideoTrackRef.current = track;
    if (remoteElementRef.current) {
      track.attach(remoteElementRef.current);
    }
  };

  const detachRemoteTrack = (track) => {
    if (!track) return;
    const tracked = remoteTrackElementsRef.current.get(track.sid);
    if (tracked) {
      track.detach(tracked.element);
      tracked.element.remove();
      remoteTrackElementsRef.current.delete(track.sid);
      setRemoteTrackCount(remoteTrackElementsRef.current.size);
      return;
    }

    detachFromElement(track, remoteElementRef.current);
    if (remoteVideoTrackRef.current === track) {
      remoteVideoTrackRef.current = null;
    }
  };

  const subscribeParticipantTracks = (participant) => {
    participant.tracks.forEach((publication) => {
      if (publication.track && publication.track.kind === 'video' && publication.isSubscribed) {
        attachRemoteTrack(publication.track);
      }
      publication.on('subscribed', (track) => {
        if (track.kind === 'video') {
          attachRemoteTrack(track);
        }
      });
      publication.on('unsubscribed', (track) => {
        if (track.kind === 'video') {
          detachRemoteTrack(track);
        }
      });
    });
  };

  const leave = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;

    room.disconnect();
    roomRef.current = null;

    localVideoTrackRef.current?.detach(localElementRef.current);
    localVideoTrackRef.current?.stop();
    localVideoTrackRef.current = null;

    localAudioTrackRef.current?.stop();
    localAudioTrackRef.current = null;

    remoteVideoTrackRef.current?.detach(remoteElementRef.current);
    remoteVideoTrackRef.current = null;
    remoteTrackElementsRef.current.forEach(({ track, element }) => {
      track.detach(element);
      element.remove();
    });
    remoteTrackElementsRef.current.clear();

    localElementRef.current = null;
    remoteElementRef.current = null;
    remoteContainerRef.current = null;

    setIsConnected(false);
    setConnectionState('disconnected');
    setAudioEnabled(true);
    setVideoEnabled(true);
    setObserveOnly(false);
    setRemoteTrackCount(0);
  }, []);

  const join = useCallback(
    async ({
      roomName,
      token,
      localVideoEl,
      remoteVideoEl,
      remoteContainerEl,
      observeOnly: nextObserveOnly = false
    }) => {
      if (!roomName || !token) {
        throw new Error('Missing Twilio video credentials');
      }

      if (roomRef.current) {
        await leave();
      }

      localElementRef.current = localVideoEl;
      remoteElementRef.current = remoteVideoEl;
      remoteContainerRef.current = remoteContainerEl || null;

      let room;
      try {
        setConnectionState('connecting');
        setReconnectError(null);
        room = await connect(token, {
          name: roomName,
          networkQuality: true,
          ...(nextObserveOnly ? { audio: false, video: false } : DEFAULT_VIDEO_SETTINGS)
        });
      } catch (error) {
        if (error.name === 'NotAllowedError' || error.message?.includes('Permission denied')) {
          throw new Error('Kamera & Mikrofon tidak diizinkan. Mohon izinkan akses di pengaturan browser Anda.');
        } else if (error.name === 'NotFoundError') {
          throw new Error('Kamera/Mikrofon tidak ditemukan di perangkat Anda.');
        }
        throw new Error(`Video connection failed: ${error.message || 'Unknown error'}`);
      }
      roomRef.current = room;
      setIsConnected(true);
      setConnectionState('connected');
      setObserveOnly(nextObserveOnly);
      setAudioEnabled(!nextObserveOnly);
      setVideoEnabled(!nextObserveOnly);
      setNetworkQuality(room.localParticipant.networkQualityLevel || 5);

      room.localParticipant.on('networkQualityLevelChanged', (level) => {
        setNetworkQuality(level);
      });

      room.on('reconnecting', (error) => {
        setConnectionState('reconnecting');
        setReconnectError(error?.message || 'Video connection is recovering');
      });
      room.on('reconnected', () => {
        setConnectionState('connected');
        setReconnectError(null);
      });
      room.on('disconnected', (_room, error) => {
        setConnectionState('disconnected');
        setIsConnected(false);
        if (error) setReconnectError(error.message || 'Video disconnected');
      });

      const attachLocalTracks = () => {
        const videoPublication = Array.from(room.localParticipant.videoTracks.values())[0];
        const audioPublication = Array.from(room.localParticipant.audioTracks.values())[0];

        if (videoPublication?.track && localVideoEl && !nextObserveOnly) {
          videoPublication.track.attach(localVideoEl);
          localVideoTrackRef.current = videoPublication.track;
        }
        if (audioPublication?.track && !nextObserveOnly) {
          localAudioTrackRef.current = audioPublication.track;
        }
      };

      attachLocalTracks();
      room.participants.forEach(subscribeParticipantTracks);
      room.on('participantConnected', subscribeParticipantTracks);
      room.on('participantDisconnected', (participant) => {
        participant.tracks.forEach((publication) => {
          if (publication.track?.kind === 'video') {
            detachRemoteTrack(publication.track);
          }
        });
      });
    },
    [leave]
  );

  const toggleAudio = useCallback(() => {
    const track = localAudioTrackRef.current;
    if (!track) return;
    const next = !track.isEnabled;
    track.enable(next);
    setAudioEnabled(next);
  }, []);

  const toggleVideo = useCallback(() => {
    const track = localVideoTrackRef.current;
    if (!track) return;
    const next = !track.isEnabled;
    track.enable(next);
    setVideoEnabled(next);
  }, []);

  return {
    join,
    leave,
    isJoined: isConnected,
    connectionState,
    reconnectError,
    audioEnabled,
    videoEnabled,
    networkQuality,
    observeOnly,
    remoteTrackCount,
    toggleAudio,
    toggleVideo
  };
}
