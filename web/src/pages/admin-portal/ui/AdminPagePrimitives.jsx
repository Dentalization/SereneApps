import React from 'react';
import AppIcon from '../../../components/AppIcon';

export const AdminEmptyState = ({ icon = 'Inbox', title = 'Belum ada data', description = 'Data belum tersedia untuk bagian ini.' }) => (
  <div className="rounded-2xl border border-dashed border-primary/20 bg-surface-elevated p-10 text-center">
    <AppIcon name={icon} size={30} className="mx-auto text-secondary/40" />
    <h3 className="mt-3 text-base font-semibold text-primary">{title}</h3>
    <p className="mx-auto mt-1 max-w-md text-sm text-secondary">{description}</p>
  </div>
);

export const AdminErrorState = ({ title = 'Gagal memuat data', message, onRetry }) => (
  <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
    <div className="flex items-start gap-3">
      <AppIcon name="AlertCircle" size={20} className="mt-0.5 flex-shrink-0 text-red-500" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-red-600">{title}</p>
        <p className="mt-1 text-sm text-red-500/80">{message || 'Silakan coba lagi.'}</p>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="rounded-lg border border-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-500/10">
          Coba lagi
        </button>
      )}
    </div>
  </div>
);
