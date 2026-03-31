import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../../../../components/AppIcon';

const AUTO_DECLINE_SECONDS = 30;

const IncomingCallModal = ({ conversation, onAccept, onDecline, callState }) => {
  const [countdown, setCountdown] = useState(AUTO_DECLINE_SECONDS);
  const acceptBtnRef = useRef(null);
  const declineBtnRef = useRef(null);
  const countdownRef = useRef(null);

  const patientName = conversation?.patient?.name || 'Unknown Patient';
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

  // Auto-focus accept button on mount
  useEffect(() => {
    acceptBtnRef.current?.focus();
  }, []);

  // Attach keydown listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const isConnecting = callState === 'connected' || callState === 'requesting_token';

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-elevated rounded-3xl shadow-2xl p-8 max-w-sm w-full mx-4 theme-transition border border-primary/10">
        {/* Patient Avatar with Pulse Ring */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative mb-4">
            {/* Pulsing rings */}
            <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping" style={{ animationDuration: '2s' }} />
            <div
              className="absolute rounded-full bg-accent/10"
              style={{
                inset: '-0.75rem',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                animationDelay: '0.5s',
              }}
            />
            {/* Avatar */}
            <div className="relative w-20 h-20 rounded-full bg-accent/15 flex items-center justify-center border-2 border-accent/30">
              {conversation?.patient?.avatar ? (
                <img
                  src={conversation.patient.avatar}
                  alt={patientName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-accent">{initials}</span>
              )}
            </div>
          </div>

          {/* Patient Info */}
          <h3 className="text-lg font-semibold text-primary theme-transition">{patientName}</h3>
          <p className="text-sm text-muted theme-transition mt-1">Incoming video consultation</p>

          {/* Countdown */}
          <p className="text-xs text-muted/70 mt-2 theme-transition">
            Auto-declining in <span className="font-mono font-semibold text-warning">{countdown}s</span>
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
            <div className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all duration-200 shadow-lg shadow-red-500/25 group-disabled:opacity-50">
              <Icon name="PhoneOff" size={22} className="text-white" />
            </div>
            <span className="text-xs font-medium text-muted theme-transition">Decline</span>
          </button>

          {/* Accept */}
          <button
            ref={acceptBtnRef}
            onClick={onAccept}
            disabled={isConnecting}
            className="flex flex-col items-center gap-2 group"
            aria-label="Accept call"
          >
            <div className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center transition-all duration-200 shadow-lg shadow-emerald-500/25 group-disabled:opacity-50">
              {isConnecting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Icon name="Video" size={22} className="text-white" />
              )}
            </div>
            <span className="text-xs font-medium text-muted theme-transition">
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
