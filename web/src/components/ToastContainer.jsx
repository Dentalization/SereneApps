import React from 'react';
import { createPortal } from 'react-dom';
import ToastItem from './ToastItem';

const ToastContainer = ({ toasts, onDismiss }) => {
  if (!toasts.length) return null;

  return createPortal(
    <div
      className="fixed bottom-4 right-4 z-[9999] flex flex-col-reverse gap-3 pointer-events-none"
      style={{ maxWidth: '24rem' }}
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          id={toast.id}
          message={toast.message}
          status={toast.status}
          dismissing={toast.dismissing}
          onDismiss={() => onDismiss(toast.id)}
        />
      ))}
    </div>,
    document.body
  );
};

export default ToastContainer;
