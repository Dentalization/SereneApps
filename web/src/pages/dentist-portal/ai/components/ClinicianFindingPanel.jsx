import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Edit3, Plus, ShieldCheck, Stethoscope, XCircle } from 'lucide-react';
import { useLanguage } from '../../../../contexts/LanguageContext';

const STATUS_LABELS = {
  ai_suggested: 'AI suggestion',
  clinician_confirmed: 'Clinician confirmed',
  clinician_rejected: 'Rejected',
  clinician_edited: 'Edited by clinician',
  manual_added: 'Manual clinician finding',
};

const SEVERITIES = ['minimal', 'mild', 'moderate', 'severe', 'critical'];

function FindingBadge({ status }) {
  const cls = {
    ai_suggested: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
    clinician_confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    clinician_rejected: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    clinician_edited: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    manual_added: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  }[status] || 'bg-slate-100 text-slate-700 border-slate-200';
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}`}>{STATUS_LABELS[status] || status}</span>;
}

function FindingEditor({ initial = {}, submitLabel, onSubmit, onCancel }) {
  const [draft, setDraft] = useState({
    label: initial.label || '',
    tooth_or_region: initial.tooth_or_region || '',
    severity: initial.severity || 'mild',
    notes: initial.notes || '',
    urgent_referral: Boolean(initial.urgent_referral),
    needs_in_person_exam: Boolean(initial.needs_in_person_exam),
  });

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          value={draft.label}
          onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))}
          placeholder="Finding label"
          aria-label="Finding label"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
        />
        <input
          value={draft.tooth_or_region}
          onChange={(event) => setDraft((current) => ({ ...current, tooth_or_region: event.target.value }))}
          placeholder="Tooth or region"
          aria-label="Tooth or region"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
        />
        <select
          value={draft.severity}
          onChange={(event) => setDraft((current) => ({ ...current, severity: event.target.value }))}
          aria-label="Finding severity"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
        >
          {SEVERITIES.map((severity) => <option key={severity} value={severity}>{severity}</option>)}
        </select>
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-700">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={draft.urgent_referral} onChange={(event) => setDraft((current) => ({ ...current, urgent_referral: event.target.checked }))} />
            Urgent referral
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={draft.needs_in_person_exam} onChange={(event) => setDraft((current) => ({ ...current, needs_in_person_exam: event.target.checked }))} />
            In-person exam
          </label>
        </div>
      </div>
      <textarea
        value={draft.notes}
        onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
        placeholder="Clinician notes"
        aria-label="Clinician notes"
        className="mt-2 min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
      />
      <div className="mt-2 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-700">Cancel</button>
        <button type="button" onClick={() => onSubmit?.(draft)} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white">{submitLabel}</button>
      </div>
    </div>
  );
}

export default function ClinicianFindingPanel({
  findings = [],
  caseStatus,
  onConfirm,
  onReject,
  onEdit,
  onAddManual,
  onVerifyCase,
  labels = {},
}) {
  const { t } = useLanguage();
  const [editingId, setEditingId] = useState(null);
  const [addingManual, setAddingManual] = useState(false);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const aiFindings = useMemo(() => findings.filter((finding) => finding.status === 'ai_suggested'), [findings]);
  const clinicianFindings = useMemo(() => findings.filter((finding) => finding.status !== 'ai_suggested'), [findings]);
  const canVerify = clinicianFindings.some((finding) => ['clinician_confirmed', 'clinician_edited', 'manual_added'].includes(finding.status));

  return (
    <section className="rounded-2xl border border-border/40 bg-surface p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {labels.title || t('ai.deepDental.workspace.findings.title', { fallbackText: 'Clinician findings' })}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {labels.subtitle || t('ai.deepDental.workspace.findings.subtitle', { fallbackText: 'Review AI suggestions separately from final clinician findings.' })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddingManual(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300"
        >
          <Plus className="h-4 w-4" />
          {labels.addManual || t('ai.deepDental.workspace.findings.manualFinding', { fallbackText: 'Manual finding' })}
        </button>
      </div>

      {addingManual && (
        <FindingEditor
          submitLabel="Add finding"
          onCancel={() => setAddingManual(false)}
          onSubmit={(draft) => { onAddManual?.(draft); setAddingManual(false); }}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
            <Stethoscope className="h-4 w-4" />
            {t('ai.deepDental.workspace.findings.aiSuggestion', { fallbackText: 'AI suggestion' })}
          </div>
          <div className="space-y-2">
            {aiFindings.length === 0 && (
              <p className="rounded-xl border border-slate-200 p-3 text-xs text-slate-500 dark:border-slate-800">
                {t('ai.deepDental.workspace.findings.noAI', { fallbackText: 'No AI suggestions yet.' })}
              </p>
            )}
            {aiFindings.map((finding) => (
              <div key={finding.id} className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 dark:border-indigo-900 dark:bg-indigo-950/20">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{finding.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{finding.tooth_or_region || 'Region not assigned'} · {finding.severity}</p>
                  </div>
                  <FindingBadge status={finding.status} />
                </div>
                {finding.notes && <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{finding.notes}</p>}
                {finding.confidence !== null && finding.confidence !== undefined && (
                  <p className="mt-1 text-[11px] text-slate-500">Confidence {Math.round(finding.confidence * 100)}%</p>
                )}
                {rejectingId === finding.id ? (
                  <div className="mt-3">
                    <input
                      value={rejectReason}
                      onChange={(event) => setRejectReason(event.target.value)}
                      placeholder="Rejection reason"
                      aria-label="Rejection reason"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                    />
                    <div className="mt-2 flex justify-end gap-2">
                      <button type="button" onClick={() => setRejectingId(null)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold">Cancel</button>
                      <button type="button" onClick={() => { onReject?.(finding, rejectReason); setRejectingId(null); setRejectReason(''); }} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white">Reject</button>
                    </div>
                  </div>
                ) : editingId === finding.id ? (
                  <FindingEditor
                    initial={finding}
                    submitLabel="Save edited finding"
                    onCancel={() => setEditingId(null)}
                    onSubmit={(draft) => { onEdit?.(finding, draft); setEditingId(null); }}
                  />
                ) : (
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <button type="button" onClick={() => setRejectingId(finding.id)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-700 dark:border-rose-900 dark:text-rose-300"><XCircle className="h-3 w-3" /> Reject</button>
                    <button type="button" onClick={() => setEditingId(finding.id)} className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:border-amber-900 dark:text-amber-300"><Edit3 className="h-3 w-3" /> Edit</button>
                    <button type="button" onClick={() => onConfirm?.(finding)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white"><CheckCircle2 className="h-3 w-3" /> Confirm</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-300">
            <ShieldCheck className="h-4 w-4" />
            {t('ai.deepDental.workspace.findings.confirmed', { fallbackText: 'Clinician confirmed' })}
          </div>
          <div className="space-y-2">
            {clinicianFindings.length === 0 && (
              <p className="rounded-xl border border-slate-200 p-3 text-xs text-slate-500 dark:border-slate-800">
                {t('ai.deepDental.workspace.findings.noConfirmed', { fallbackText: 'No clinician findings confirmed yet.' })}
              </p>
            )}
            {clinicianFindings.map((finding) => (
              <div key={finding.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{finding.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{finding.tooth_or_region || 'Region not assigned'} · {finding.severity}</p>
                  </div>
                  <FindingBadge status={finding.status} />
                </div>
                {finding.notes && <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{finding.notes}</p>}
                {(finding.urgent_referral || finding.needs_in_person_exam) && (
                  <p className="mt-2 inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    <AlertTriangle className="h-3 w-3" />
                    {finding.urgent_referral ? 'Urgent referral' : 'Needs in-person examination'}
                  </p>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            disabled={!canVerify || caseStatus === 'verified' || caseStatus === 'exported'}
            onClick={onVerifyCase}
            className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {caseStatus === 'verified' || caseStatus === 'exported'
              ? 'Case verified'
              : t('ai.deepDental.workspace.findings.verifyCase', { fallbackText: 'Verify case' })}
          </button>
        </div>
      </div>
    </section>
  );
}
