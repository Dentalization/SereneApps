import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast from '../components/Toast';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);

  const showToast = useCallback(({ message, status = 'info', duration = 5000 }) => {
    setToast({ message, status, duration, visible: true });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => (prev ? { ...prev, visible: false } : null));
  }, []);

  // Convenience methods
  const success = useCallback((message, duration) => {
    showToast({ message, status: 'success', duration });
  }, [showToast]);

  const error = useCallback((message, duration) => {
    showToast({ message, status: 'error', duration });
  }, [showToast]);

  const warning = useCallback((message, duration) => {
    showToast({ message, status: 'warning', duration });
  }, [showToast]);

  const info = useCallback((message, duration) => {
    showToast({ message, status: 'info', duration });
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, hideToast, success, error, warning, info }}>
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
