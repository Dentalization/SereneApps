import React, { useEffect, useState } from 'react';
import AppIcon from '../../../../components/AppIcon';

const DEFAULT_FORM = {
  dentistName: '',
  patientName: '',
  clinicalNotes: '',
  includeScreenshot: true,
  includeMetadataSummary: true,
};

const ReportExportModal = ({
  visible,
  onClose,
  onConfirm,
  initialValues,
  exporting = false,
  clinicName,
  warningMessage = '',
}) => {
  const [form, setForm] = useState(DEFAULT_FORM);

  useEffect(() => {
    if (!visible) return;
    setForm({
      ...DEFAULT_FORM,
      ...initialValues,
    });
  }, [initialValues, visible]);

  if (!visible) return null;

  return (
    <div
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onMouseUp={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <div className="flex items-center gap-2 text-white">
              <AppIcon name="FileText" size={18} className="text-cyan-400" />
              <span className="text-sm font-semibold uppercase tracking-wide">Export Report</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">{clinicName || 'Dental Clinic'} • PDF summary with annotations</p>
          </div>
          <button
            onClick={onClose}
            disabled={exporting}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <AppIcon name="X" size={16} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">Dentist Name</div>
              <input
                type="text"
                value={form.dentistName}
                onChange={(event) => setForm((current) => ({ ...current, dentistName: event.target.value }))}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-500"
              />
            </label>
            <label className="block">
              <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">Patient Name</div>
              <input
                type="text"
                value={form.patientName}
                onChange={(event) => setForm((current) => ({ ...current, patientName: event.target.value }))}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-500"
              />
            </label>
          </div>

          <label className="block">
            <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">Clinical Notes</div>
            <textarea
              value={form.clinicalNotes}
              onChange={(event) => setForm((current) => ({ ...current, clinicalNotes: event.target.value }))}
              rows={6}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-500"
              placeholder="Implant planning observations, pathology notes, treatment recommendation..."
            />
          </label>

          {warningMessage ? (
            <div className="rounded-xl border border-amber-500/35 bg-amber-950/35 px-3 py-2 text-xs text-amber-200">
              {warningMessage}
            </div>
          ) : null}

          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="mb-3 text-[11px] uppercase tracking-wide text-slate-500">Include</div>
            <label className="mb-2 flex items-center gap-3 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={form.includeScreenshot}
                onChange={(event) => setForm((current) => ({ ...current, includeScreenshot: event.target.checked }))}
                className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
              />
              <span>Include current screenshot</span>
            </label>
            <label className="flex items-center gap-3 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={form.includeMetadataSummary}
                onChange={(event) => setForm((current) => ({ ...current, includeMetadataSummary: event.target.checked }))}
                className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
              />
              <span>Include DICOM metadata summary</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-800 px-5 py-4">
          <button
            onClick={onClose}
            disabled={exporting}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(form)}
            disabled={exporting}
            className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <AppIcon name={exporting ? 'Loader2' : 'FileText'} size={16} className={exporting ? 'animate-spin' : ''} />
            <span>{exporting ? 'Generating...' : 'Download PDF'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportExportModal;
