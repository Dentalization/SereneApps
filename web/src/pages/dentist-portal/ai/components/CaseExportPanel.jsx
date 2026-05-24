import React, { useState } from 'react';
import { Download, FileJson, FileText, Loader2 } from 'lucide-react';
import { useLanguage } from '../../../../contexts/LanguageContext';

function formatExportTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function CaseExportPanel({
  caseRecord,
  exports = [],
  onExportPdf,
  onExportJson,
  labels = {},
}) {
  const { t } = useLanguage();
  const [redacted, setRedacted] = useState(true);
  const [pendingFormat, setPendingFormat] = useState(null);
  const canExport = Boolean(caseRecord?.patient_id) && caseRecord?.status === 'verified';

  const runExport = async (format) => {
    setPendingFormat(format);
    try {
      if (format === 'pdf') await onExportPdf?.({ redacted });
      else await onExportJson?.({ redacted });
    } finally {
      setPendingFormat(null);
    }
  };

  return (
    <section className="rounded-2xl border border-border/40 bg-surface p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {labels.title || t('ai.deepDental.workspace.export.title', { fallbackText: 'Case export' })}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {labels.subtitle || t('ai.deepDental.workspace.export.subtitle', { fallbackText: 'Generate auditable PDF or JSON reports.' })}
          </p>
        </div>
        <Download className="h-5 w-5 text-indigo-500" />
      </div>

      <label className="mb-3 flex items-center gap-2 rounded-xl border border-border/40 bg-surface-elevated/60 px-3 py-2 text-xs text-slate-600">
        <input type="checkbox" checked={redacted} onChange={(event) => setRedacted(event.target.checked)} />
        {labels.redact || t('ai.deepDental.workspace.export.redact', { fallbackText: 'Redact patient identifier in export payload where supported' })}
      </label>

      {!canExport && (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
          {labels.blocked || t('ai.deepDental.workspace.export.blocked', { fallbackText: 'Link a patient and verify the case before export.' })}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={!canExport || pendingFormat !== null}
          onClick={() => runExport('pdf')}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {pendingFormat === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          {t('ai.deepDental.workspace.export.pdfButton', { fallbackText: 'PDF' })}
        </button>
        <button
          type="button"
          disabled={!canExport || pendingFormat !== null}
          onClick={() => runExport('json')}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border/40 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pendingFormat === 'json' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileJson className="h-4 w-4" />}
          {t('ai.deepDental.workspace.export.jsonButton', { fallbackText: 'JSON' })}
        </button>
      </div>

      {exports.length > 0 && (
        <div className="mt-4 space-y-2">
          {exports.map((entry) => {
            const isDraft = Boolean(entry.metadata?.draft || entry.draft);
            return (
              <div key={entry.id} className={`rounded-xl border p-3 ${isDraft ? 'border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30' : 'border-border/40 bg-surface-elevated/60'}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="text-xs font-semibold uppercase text-slate-700 dark:text-slate-200">{entry.format}</p>
                    {isDraft && (
                      <span className="shrink-0 rounded bg-red-700 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                        {t('ai.deepDental.workspace.export.draftLabel', { fallbackText: 'DRAFT - NOT CLINICIAN VERIFIED' })}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500">{formatExportTime(entry.exported_at)}</span>
                </div>
                <p className="mt-1 truncate text-[11px] text-slate-500">{entry.storage_ref}</p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
