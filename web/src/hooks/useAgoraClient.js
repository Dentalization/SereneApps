import { useState, useRef, useCallback } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';

const AGORA_APP_ID = import.meta.env.VITE_AGORA_APP_ID || '';

export function useAgoraClient() {
  const clientRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const remoteUsersRef = useRef(new Map());

  const [isJoined, setIsJoined] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);

  const join = useCallback(async ({ channelName, token, uid, localVideoEl, remoteVideoEl }) => {
    if (!AGORA_APP_ID) {
      throw new Error('Missing VITE_AGORA_APP_ID in environment.');
    }

    if (clientRef.current) {
      await clientRef.current.leave().catch(() => null);
      clientRef.current.removeAllListeners();
      clientRef.current = null;
    }

    const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    clientRef.current = client;

    client.on('user-published', async (user, mediaType) => {
      await client.subscribe(user, mediaType);
      if (mediaType === 'video' && remoteVideoEl) {
        user.videoTrack?.play(remoteVideoEl);
      }
      if (mediaType === 'audio') {
        user.audioTrack?.play();
      }
      remoteUsersRef.current.set(user.uid.toString(), user);
    });

    client.on('user-unpublished', (user, mediaType) => {
      if (mediaType === 'video' && remoteVideoEl) {
        remoteVideoEl.srcObject = null;
      }
      if (mediaType === 'audio') {
        user.audioTrack?.stop();
      }
      remoteUsersRef.current.delete(user.uid.toString());
    });

    client.on('user-left', (user) => {
      remoteUsersRef.current.delete(user.uid.toString());
    });

    const generatedUid = uid || Math.floor(Math.random() * 10_000);
    await client.join(AGORA_APP_ID, channelName, token || null, generatedUid);

    localAudioTrackRef.current = await AgoraRTC.createMicrophoneAudioTrack();
    localVideoTrackRef.current = await AgoraRTC.createCameraVideoTrack();

    if (localVideoEl) {
      localVideoTrackRef.current.play(localVideoEl);
    }

    await client.publish([localAudioTrackRef.current, localVideoTrackRef.current]);

    setAudioEnabled(true);
    setVideoEnabled(true);
    setIsJoined(true);
  }, []);

  const leave = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;

    await client.unpublish().catch(() => null);
    localAudioTrackRef.current?.close();
    localVideoTrackRef.current?.close();
    remoteUsersRef.current.clear();
    await client.leave().catch(() => null);

    client.removeAllListeners();
    clientRef.current = null;
    localAudioTrackRef.current = null;
    localVideoTrackRef.current = null;
    setIsJoined(false);
  }, []);

  const toggleAudio = useCallback(async () => {
    if (!localAudioTrackRef.current) return;
    const next = !audioEnabled;
    await localAudioTrackRef.current.setEnabled(next);
    setAudioEnabled(next);
  }, [audioEnabled]);

  const toggleVideo = useCallback(async () => {
    if (!localVideoTrackRef.current) return;
    const next = !videoEnabled;
    await localVideoTrackRef.current.setEnabled(next);
    setVideoEnabled(next);
  }, [videoEnabled]);

  return {
    join,
    leave,
    isJoined,
    audioEnabled,
    videoEnabled,
    toggleAudio,
    toggleVideo
  };
}
