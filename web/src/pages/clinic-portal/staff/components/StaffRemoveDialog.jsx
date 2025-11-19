import React from 'react';
import AppIcon from '../../../../components/AppIcon';
import ModalPortal from '../../../../components/ui/ModalPortal';

const StaffRemoveDialog = ({
  open,
  staff,
  translations,
  loading,
  error,
  onClose,
  onConfirm
}) => {
  if (!open || !staff) {
    return null;
  }

  const description = applyNamePlaceholder(translations?.description, staff?.name);
  const warningBody = applyNamePlaceholder(translations?.warningBody, staff?.name);

  return (
    <ModalPortal>
      {/* Backdrop overlay - fixed to viewport */}
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" aria-hidden="true" />
      
      {/* Modal wrapper - positioned at current scroll location */}
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto my-8">
          {/* Modal container */}
          <div className="relative w-full max-w-md max-h-[80vh] rounded-3xl bg-surface-elevated shadow-2xl overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-red-600">
                {translations?.badge || 'Hapus Staff'}
              </p>
              <h2 className="text-2xl font-semibold text-primary">
                {translations?.title || 'Konfirmasi Penghapusan'}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-secondary transition hover:bg-border/20"
              aria-label="Close"
            >
              <AppIcon name="X" size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-6 px-6 pb-6">
          {/* Staff Info */}
          <div className="flex items-center gap-4 rounded-2xl border border-border/40 bg-surface p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <AppIcon name="User" size={24} className="text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-primary">{staff.name}</h3>
              <p className="text-sm text-secondary">{staff.email}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <AppIcon name="Shield" size={12} />
                  {staff.role}
                </span>
                {staff.position && (
                  <>
                    <span className="text-xs text-secondary">•</span>
                    <span className="text-xs text-secondary">{staff.position}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="rounded-2xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
                <AppIcon name="AlertTriangle" size={20} className="text-red-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-red-800 dark:text-red-300">
                  {translations?.warningTitle || 'Perhatian!'}
                </h4>
                <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                  {warningBody || `Tindakan ini akan menghapus akses ${staff.name} dari sistem klinik secara permanen.`}
                </p>
                <ul className="mt-3 space-y-1 text-xs text-red-600 dark:text-red-400">
                  <li className="flex items-center gap-2">
                    <AppIcon name="X" size={12} />
                    <span>Akses login akan dihapus</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <AppIcon name="Archive" size={12} />
                    <span>Data historis akan tetap tersimpan</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <AppIcon name="AlertCircle" size={12} />
                    <span>Tindakan ini tidak dapat dibatalkan</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
                  <AppIcon name="AlertCircle" size={16} className="text-red-600" />
                </div>
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            </div>
          )}

        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 px-6 pb-6 pt-4 border-t border-border/40 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-lg border border-border/40 px-4 py-2 text-sm font-medium text-secondary transition hover:border-border/60 hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
          >
            {translations?.actions?.cancel || 'Batal'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-400"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <AppIcon name="Loader2" size={16} className="animate-spin" />
                <span>{translations?.actions?.deleting || 'Menghapus...'}</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <AppIcon name="Trash2" size={16} />
                <span>{translations?.actions?.confirm || 'Ya, Hapus'}</span>
              </div>
            )}
          </button>
        </div>
        </div>
        </div>
      </div>
    </ModalPortal>
  );
};

const applyNamePlaceholder = (text, name) => {
  if (!text) {
    return '';
  }
  if (!name) {
    return text;
  }
  return text.replace('{name}', name).replace('{{name}}', name);
};

export default StaffRemoveDialog;
