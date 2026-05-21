import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../../../../components/AppIcon';

const AUTO_DECLINE_SECONDS = 30;

const AVATAR_GRADIENTS = [
  ['#7C3AED', '#4f46e5'],
  ['#6d28d9', '#9333ea'],
  ['#4f46e5', '#0ea5e9'],
  ['#7c3aed', '#ec4899'],
  ['#2563eb', '#7c3aed'],
  ['#9333ea', '#db2777'],
  ['#0891b2', '#7c3aed'],
  ['#d97706', '#7c3aed'],
];

function getAvatarGradient(name = '') {
  const hash = [...String(name)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const [from, to] = AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
  return { background: `linear-gradient(135deg, ${from}, ${to})` };
}

const IncomingCallModal = ({ conversation, onAccept, onDecline, callState, remoteParticipant }) => {
  const [countdown, setCountdown] = useState(AUTO_DECLINE_SECONDS);
  const acceptBtnRef = useRef(null);
  const declineBtnRef = useRef(null);
  const countdownRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Use remoteParticipant if provided, otherwise fall back to conversation.patient
  const remote = remoteParticipant || conversation?.patient || {};
  const patientName = remote?.name || 'Unknown';
  const initials = patientName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  // Auto-decline countdown
  useEffect(() => {
    setCountdown(AUTO_DECLINE_SECONDS);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          onDecline?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [onDecline]);

  // Focus trap between accept and decline buttons
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDecline?.();
        return;
      }

      if (e.key === 'Tab') {
        const focusable = [acceptBtnRef.current, declineBtnRef.current].filter(Boolean);
        if (!focusable.length) return;

        const currentIndex = focusable.indexOf(document.activeElement);
        e.preventDefault();

        if (e.shiftKey) {
          const prev = currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1;
          focusable[prev]?.focus();
        } else {
          const next = currentIndex >= focusable.length - 1 ? 0 : currentIndex + 1;
          focusable[next]?.focus();
        }
      }
    },
    [onDecline]
  );

  // Auto-focus accept button on mount & save previous focus
  useEffect(() => {
    previousActiveElement.current = document.activeElement;
    acceptBtnRef.current?.focus();
    return () => {
      previousActiveElement.current?.focus();
    };
  }, []);

  // Attach keydown listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const isConnecting = callState === 'connected' || callState === 'requesting_token';

  return createPortal(
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center"
      style={{
        background: 'rgba(15,13,26,0.75)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div
        className="mx-4 w-full max-w-sm p-8"
        style={{
          background: 'rgba(26,21,40,0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '1.5rem',
          boxShadow: '0 25px 50px rgba(0,0,0,0.7)',
        }}
      >
        {/* Patient Avatar with Pulse Ring */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative mb-4">
            {/* Pulsing rings */}
            <div className="absolute inset-0 rounded-full animate-ping opacity-75" style={{ background: 'rgba(124,58,237,0.3)', animationDuration: '2s' }} />
            <div
              className="absolute rounded-full"
              style={{
                inset: '-0.75rem',
                background: 'rgba(124,58,237,0.12)',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                animationDelay: '0.5s',
              }}
            />
            {/* Avatar */}
            <div
              className="relative flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white"
              style={{
                ...getAvatarGradient(patientName),
                border: '2px solid rgba(124,58,237,0.4)',
                boxShadow: '0 0 0 6px rgba(124,58,237,0.12)',
              }}
            >
              {conversation?.patient?.avatar ? (
                <img
                  src={conversation.patient.avatar}
                  alt={patientName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
          </div>

          {/* Patient Info */}
          <h3 className="text-lg font-semibold" style={{ color: 'var(--td-text-main)' }}>{patientName}</h3>
          <p className="mt-1 text-sm" style={{ color: 'var(--td-text-sub)' }}>Incoming video consultation</p>

          {/* Countdown Progress Bar */}
          <div className="mt-4 h-1 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div 
              className="h-full transition-all duration-1000 ease-linear"
              style={{
                width: `${(countdown / AUTO_DECLINE_SECONDS) * 100}%`,
                background: 'linear-gradient(90deg, #7C3AED, #9333ea)',
              }}
            />
          </div>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--td-text-muted)' }}>
            Auto-declining in {countdown}s
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-6">
          {/* Decline */}
          <button
            ref={declineBtnRef}
            onClick={onDecline}
            disabled={isConnecting}
            className="flex flex-col items-center gap-2 group"
            aria-label="Decline call"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200 group-hover:scale-105 group-disabled:opacity-50" style={{ background: 'rgba(239,68,68,0.85)', boxShadow: '0 4px 12px rgba(239,68,68,0.35)' }}>
              <Icon name="PhoneOff" size={22} className="text-white" />
            </div>
            <span className="text-xs font-medium" style={{ color: 'var(--td-text-muted)' }}>Decline</span>
          </button>

          {/* Accept */}
          <button
            ref={acceptBtnRef}
            onClick={onAccept}
            disabled={isConnecting}
            className="flex flex-col items-center gap-2 group"
            aria-label="Accept call"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200 group-hover:scale-105 group-disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', boxShadow: '0 4px 12px rgba(124,58,237,0.45)' }}>
              {isConnecting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Icon name="Video" size={22} className="text-white" />
              )}
            </div>
            <span className="text-xs font-medium" style={{ color: 'var(--td-text-muted)' }}>
              {isConnecting ? 'Connecting...' : 'Accept'}
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default IncomingCallModal;
