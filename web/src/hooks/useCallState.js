import { useState, useCallback, useRef } from 'react';
import { fetchVideoToken, recordCommunicationClientEvent } from '../services/chatService';

const CALL_STATES = {
  IDLE: 'idle',
  REQUESTING_TOKEN: 'requesting_token',
  RINGING: 'ringing',
  CONNECTED: 'connected',
  ENDED: 'ended',
  ERROR: 'error',
};

const DEVICE_CHECK_CACHE_TTL_MS = 2 * 60 * 1000;
const DEVICE_CHECK_CACHE_KEY = 'sereneapps:teledentistry:device-check-passed-at';

function hasRecentDeviceCheck() {
  if (typeof window === 'undefined') return false;
  const value = Number(window.sessionStorage?.getItem(DEVICE_CHECK_CACHE_KEY) || 0);
  return value && Date.now() - value < DEVICE_CHECK_CACHE_TTL_MS;
}

function markDeviceCheckPassed() {
  if (typeof window === 'undefined') return;
  window.sessionStorage?.setItem(DEVICE_CHECK_CACHE_KEY, String(Date.now()));
}

/**
 * useCallState — manages the full lifecycle of a video call.
 *
 * States: idle → requesting_token → ringing → connected → ended → idle
 *                                                          error → idle
 *
 * @param {Object} options
 * @param {string} options.userId — current user ID (for Twilio uid)
 * @returns {{ callState, callError, videoSession, initiateCall, acceptCall, endCall }}
 */
export function useCallState({ userId } = {}) {
  const [callState, setCallState] = useState(CALL_STATES.IDLE);
  const [callError, setCallError] = useState(null);
  const [videoSession, setVideoSession] = useState(null);
  const resetTimerRef = useRef(null);

  const cleanup = useCallback(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  }, []);

  const resetToIdle = useCallback(() => {
    cleanup();
    resetTimerRef.current = setTimeout(() => {
      setCallState(CALL_STATES.IDLE);
      setCallError(null);
      setVideoSession(null);
      resetTimerRef.current = null;
    }, 2000);
  }, [cleanup]);

  const initiateCall = useCallback(
    async (appointmentId, role = 'publisher') => {
      if (!appointmentId) return null;
      cleanup();

      try {
        setCallState(CALL_STATES.REQUESTING_TOKEN);
        setCallError(null);
        recordCommunicationClientEvent(appointmentId, 'device_check_started', { surface: 'dentist_web' }).catch(() => null);

        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          throw new Error('Koneksi internet tidak tersedia. Periksa jaringan Anda lalu coba lagi.');
        }

        // Pre-flight check: reuse the checklist result briefly to avoid duplicate permission prompts.
        try {
          if (!hasRecentDeviceCheck()) {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            stream.getTracks().forEach(t => t.stop());
            markDeviceCheckPassed();
          }
          recordCommunicationClientEvent(appointmentId, 'device_check_passed', { camera: true, microphone: true }).catch(() => null);
        } catch (mediaError) {
          console.warn('[useCallState] Media permission error:', mediaError);
          recordCommunicationClientEvent(appointmentId, 'device_check_failed', {
            reason: mediaError?.name || 'media_unavailable'
          }).catch(() => null);
          if (mediaError.name === 'NotAllowedError' || mediaError.message?.includes('denied')) {
            throw new Error('Kamera & Mikrofon tidak diizinkan. Izinkan akses di browser, lalu coba lagi.');
          }
          throw new Error('Kamera/Mikrofon tidak ditemukan atau tidak dapat diakses. Periksa perangkat atau reload halaman.');
        }

        const tokenData = await fetchVideoToken(appointmentId, role);

        if (!tokenData.roomName) {
          throw { code: 'VIDEO_ROOM_NOT_FOUND', message: 'Room name missing from token response' };
        }

        const session = {
          appointmentId,
          roomName: tokenData.roomName,
          token: tokenData.token,
          uid: userId || undefined,
        };

        setVideoSession(session);
        setCallState(CALL_STATES.RINGING);
        return session;
      } catch (error) {
        console.error('[useCallState] Failed to initiate call:', error);
        recordCommunicationClientEvent(appointmentId, 'device_check_failed', {
          reason: error?.code || error?.message || 'call_initiation_failed'
        }).catch(() => null);
        setCallError(error?.message || 'Failed to start video call');
        setCallState(CALL_STATES.ERROR);
        resetToIdle();
        return null;
      }
    },
    [userId, cleanup, resetToIdle]
  );

  const acceptCall = useCallback(() => {
    if (callState !== CALL_STATES.RINGING) return;
    cleanup();
    setCallState(CALL_STATES.CONNECTED);
  }, [callState, cleanup]);

  const endCall = useCallback(() => {
    cleanup();
    setCallState(CALL_STATES.ENDED);
    resetToIdle();
  }, [cleanup, resetToIdle]);

  /**
   * Receive an incoming call triggered by a socket event.
   * Transitions to RINGING with the provided session data.
   */
  const receiveIncomingCall = useCallback(
    (session) => {
      if (callState !== CALL_STATES.IDLE) return;
      cleanup();
      setVideoSession(session);
      setCallState(CALL_STATES.RINGING);
    },
    [callState, cleanup]
  );

  return {
    callState,
    callError,
    videoSession,
    initiateCall,
    acceptCall,
    endCall,
    receiveIncomingCall,
  };
}

export { CALL_STATES };
