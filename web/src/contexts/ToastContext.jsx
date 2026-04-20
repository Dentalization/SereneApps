import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import ToastContainer from '../components/ToastContainer';
import { subscribeToToastEvents, toastService } from '../utils/toastBus';

const ToastContext = createContext(null);

const MAX_TOASTS = 3;
const DEFAULT_DURATION = 4000;

const INTERNAL_DEBUG_PATTERNS = [
  /\bLanguageContext\b/i,
  /\bServices response\b/i,
  /\bGallery response\b/i,
  /\bHighlights response\b/i,
  /\bFacilities response\b/i,
  /\bStaff state updated/i,
  /\bREAL Staff data\b/i,
  /✅.*data/i,
  /\bBranches loaded\b/i,
  /\bAPI Response\b/i,
  /\bAPI Response Data\b/i,
  /\bSetting initial clinic data\b/i,
  /✅\s+(services|gallery|highlights|facilities)/i,
  /✅\s+[A-Za-z\s]+response/i,
  /\{[\s\S]*"clinic_branch_id"/i,
  /^\[VolumeViewer3D\]/i,
  /^\[SliceViewer\]/i,
  /^\[useConversionSocket\]/i,
  /ws proxy socket error/i,
  /Maximum update depth exceeded/i,
  /Cannot update a component while rendering a different component/i,
];

export const shouldSuppressToastMessage = (message = '') => {
  const normalized = typeof message === 'string' ? message : String(message);

  if (INTERNAL_DEBUG_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return true;
  }

  if (/butuh perhatian/i.test(normalized)) {
    return true;
  }

  if (/request failed with status code \d+/i.test(normalized)) {
    return true;
  }

  if (/validateDOMNesting/i.test(normalized)) {
    return true;
  }

  if (/Warning:.*react/i.test(normalized)) {
    return true;
  }

  const containsJsonPayload = normalized.includes('{') || normalized.includes('[');
  const isVeryLong = normalized.length > 160;
  if (containsJsonPayload && isVeryLong) {
    return true;
  }

  return false;
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const idCounter = useRef(0);
  const timersRef = useRef({});

  // Schedule auto-dismiss for a toast
  const scheduleDismiss = useCallback((id, duration) => {
    if (timersRef.current[id]) clearTimeout(timersRef.current[id]);
    timersRef.current[id] = setTimeout(() => {
      // Start exit animation
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, dismissing: true } : t)));
      // Remove after animation completes
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        delete timersRef.current[id];
      }, 300);
    }, duration);
  }, []);

  // Clean up all timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const triggerToast = useCallback(
    (payload) => {
      if (!payload?.message || shouldSuppressToastMessage(payload.message)) return;
      if (
        typeof payload.message === 'string' &&
        (payload.message.includes('END ERROR BOUNDARY') ||
          payload.message.includes('BUTUH PERHATIAN'))
      )
        return;

      const id = ++idCounter.current;
      const duration = typeof payload.duration === 'number' ? payload.duration : DEFAULT_DURATION;
      const newToast = {
        id,
        message: String(payload.message),
        status: payload.status || 'info',
        dismissing: false,
      };

      setToasts((prev) => {
        const next = [...prev, newToast];
        // If over max, remove oldest
        if (next.length > MAX_TOASTS) {
          const removed = next.shift();
          if (removed && timersRef.current[removed.id]) {
            clearTimeout(timersRef.current[removed.id]);
            delete timersRef.current[removed.id];
          }
        }
        return next;
      });

      scheduleDismiss(id, duration);
    },
    [scheduleDismiss]
  );

  const dismissToast = useCallback((id) => {
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
    // Start exit animation
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, dismissing: true } : t)));
    // Remove after animation
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  // Legacy showToast / hideToast for backwards compat
  const showToast = useCallback(
    ({ message, status = 'info', duration = DEFAULT_DURATION, meta }) => {
      triggerToast({ message, status, duration, meta });
    },
    [triggerToast]
  );

  const hideToast = useCallback(() => {
    // Dismiss the most recent toast (legacy single-toast behavior)
    setToasts((prev) => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      if (last.dismissing) return prev;
      return prev.map((t) => (t.id === last.id ? { ...t, dismissing: true } : t));
    });
    setTimeout(() => {
      setToasts((prev) => {
        if (!prev.length) return prev;
        return prev.slice(0, -1);
      });
    }, 300);
  }, []);

  useEffect(() => subscribeToToastEvents(triggerToast), [triggerToast]);

  const success = useCallback(
    (message, duration, meta) => {
      triggerToast({ message, status: 'success', duration, meta });
    },
    [triggerToast]
  );

  const error = useCallback(
    (message, duration, meta) => {
      triggerToast({ message, status: 'error', duration, meta });
    },
    [triggerToast]
  );

  const warning = useCallback(
    (message, duration, meta) => {
      triggerToast({ message, status: 'warning', duration, meta });
    },
    [triggerToast]
  );

  const info = useCallback(
    (message, duration, meta) => {
      triggerToast({ message, status: 'info', duration, meta });
    },
    [triggerToast]
  );

  const contextValue = useMemo(
    () => ({
      showToast,
      hideToast,
      success,
      error,
      warning,
      info,
      // Expose toast object with convenience methods for useToast().toast.success() pattern
      toast: { success, error, warning, info },
    }),
    [showToast, hideToast, success, error, warning, info]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};

export { toastService };
