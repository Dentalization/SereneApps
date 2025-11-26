import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import Toast from '../components/Toast';
import { subscribeToToastEvents, toastService } from '../utils/toastBus';

const ToastContext = createContext(null);

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
];

export const shouldSuppressToastMessage = (message = '') => {
  const normalized = typeof message === 'string' ? message : String(message);

  // Block all internal debug patterns
  if (INTERNAL_DEBUG_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return true;
  }

  // Block any message containing 'BUTUH PERHATIAN' (case-insensitive)
  if (/butuh perhatian/i.test(normalized)) {
    return true;
  }

  // Block any message containing 'Request failed with status code' (case-insensitive)
  if (/request failed with status code \d+/i.test(normalized)) {
    return true;
  }

  // Block React DOM nesting warnings
  if (/validateDOMNesting/i.test(normalized)) {
    return true;
  }

  // Block React warning patterns
  if (/Warning:.*react/i.test(normalized)) {
    return true;
  }

  // Block long JSON payloads
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

const normalizeToastPayload = ({ message, status = 'info', duration = 5000, meta = {} }) => ({
  message,
  status,
  duration,
  meta,
  visible: true,
});

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);

  const triggerToast = useCallback((payload) => {
    if (!payload?.message || shouldSuppressToastMessage(payload.message)) return;
    // Suppress error boundary and debug logs
    if (typeof payload.message === 'string' && (payload.message.includes('END ERROR BOUNDARY') || payload.message.includes('BUTUH PERHATIAN'))) return;
    setToast(normalizeToastPayload(payload));
  }, []);

  const showToast = useCallback(
    ({ message, status = 'info', duration = 5000, meta }) => {
      triggerToast({ message, status, duration, meta });
    },
    [triggerToast],
  );

  const hideToast = useCallback(() => {
    setToast((prev) => (prev ? { ...prev, visible: false } : null));
  }, []);

  useEffect(() => subscribeToToastEvents(triggerToast), [triggerToast]);

  const success = useCallback((message, duration, meta) => {
    triggerToast({ message, status: 'success', duration, meta });
  }, [triggerToast]);

  const error = useCallback((message, duration, meta) => {
    triggerToast({ message, status: 'error', duration, meta });
  }, [triggerToast]);

  const warning = useCallback((message, duration, meta) => {
    triggerToast({ message, status: 'warning', duration, meta });
  }, [triggerToast]);

  const info = useCallback((message, duration, meta) => {
    triggerToast({ message, status: 'info', duration, meta });
  }, [triggerToast]);

  const contextValue = useMemo(
    () => ({ showToast, hideToast, success, error, warning, info }),
    [showToast, hideToast, success, error, warning, info],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {toast && (
        <Toast
          visible={toast.visible}
          message={toast.message}
          status={toast.status}
          duration={toast.duration}
          onDismiss={hideToast}
        />
      )}
    </ToastContext.Provider>
  );
};

export { toastService };
