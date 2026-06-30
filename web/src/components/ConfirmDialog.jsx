import React, { useEffect, useRef } from 'react';
import AppIcon from './AppIcon';

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  busy = false,
  onConfirm,
  onCancel
}) {
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    cancelButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) {
        onCancel?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [busy, onCancel, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby={description ? 'confirm-dialog-description' : undefined}
    >
      <div className="w-full max-w-md rounded-2xl border border-border/40 bg-surface-elevated p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl flex-shrink-0 ${tone === 'danger' ? 'bg-red-500/10 text-red-500' : 'bg-accent/10 text-accent'}`}>
            <AppIcon name={tone === 'danger' ? 'AlertTriangle' : 'HelpCircle'} size={20} />
          </div>
          <div className="min-w-0">
            <h2 id="confirm-dialog-title" className="text-base font-semibold text-primary">{title}</h2>
            {description && (
              <p id="confirm-dialog-description" className="text-sm text-secondary mt-1.5">
                {description}
              </p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-xl border border-border/40 bg-surface px-4 py-2 text-sm font-semibold text-secondary hover:text-primary transition disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50 ${
              tone === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-accent hover:bg-accent/90'
            }`}
          >
            {busy && <AppIcon name="Loader2" size={14} className="animate-spin" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
