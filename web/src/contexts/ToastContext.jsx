import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import Toast from '../components/Toast';
import { subscribeToToastEvents, toastService } from '../utils/toastBus';

const ToastContext = createContext(null);

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
    if (!payload?.message) return;
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
