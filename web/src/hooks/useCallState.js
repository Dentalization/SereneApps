import { useState, useCallback, useRef } from 'react';
import { fetchVideoToken } from '../services/chatService';

const CALL_STATES = {
  IDLE: 'idle',
  REQUESTING_TOKEN: 'requesting_token',
  RINGING: 'ringing',
  CONNECTED: 'connected',
  ENDED: 'ended',
  ERROR: 'error',
};

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
    async (appointmentId) => {
      if (!appointmentId) return;
      cleanup();

      try {
        setCallState(CALL_STATES.REQUESTING_TOKEN);
        setCallError(null);

        const tokenData = await fetchVideoToken(appointmentId, 'publisher');

        const session = {
          appointmentId,
          roomName: tokenData.roomName || tokenData.channelName,
          token: tokenData.token,
          uid: userId || undefined,
        };

        setVideoSession(session);
        setCallState(CALL_STATES.RINGING);
      } catch (error) {
        console.error('[useCallState] Failed to initiate call:', error);
        setCallError(error?.message || 'Failed to start video call');
        setCallState(CALL_STATES.ERROR);
        resetToIdle();
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
