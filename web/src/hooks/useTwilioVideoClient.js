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

  const [isConnected, setIsConnected] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);

  const detachFromElement = (track, element) => {
    if (!track) return;
    track.detach(element);
  };

  const attachRemoteTrack = (track) => {
    if (!track || track.kind !== 'video') return;
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

    localElementRef.current = null;
    remoteElementRef.current = null;

    setIsConnected(false);
    setAudioEnabled(true);
    setVideoEnabled(true);
  }, []);

  const join = useCallback(
    async ({ roomName, token, localVideoEl, remoteVideoEl }) => {
      if (!roomName || !token) {
        throw new Error('Missing Twilio video credentials');
      }

      if (roomRef.current) {
        await leave();
      }

      localElementRef.current = localVideoEl;
      remoteElementRef.current = remoteVideoEl;

      const room = await connect(token, {
        name: roomName,
        ...DEFAULT_VIDEO_SETTINGS
      });
      roomRef.current = room;
      setIsConnected(true);
      setAudioEnabled(true);
      setVideoEnabled(true);

      const attachLocalTracks = () => {
        const videoPublication = Array.from(room.localParticipant.videoTracks.values())[0];
        const audioPublication = Array.from(room.localParticipant.audioTracks.values())[0];

        if (videoPublication?.track && localVideoEl) {
          videoPublication.track.attach(localVideoEl);
          localVideoTrackRef.current = videoPublication.track;
        }
        if (audioPublication?.track) {
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
    audioEnabled,
    videoEnabled,
    toggleAudio,
    toggleVideo
  };
}