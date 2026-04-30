import React, { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../../../../components/AppIcon';
import {
  fetchClinicalSummary,
  finalizeClinicalSummary,
  saveClinicalSummaryDraft
} from '../../../../services/chatService';

const EMPTY_FORM = {
  chiefComplaint: '',
  subjectiveNotes: '',
  objectiveFindings: '',
  assessment: '',
  plan: '',
  recommendationsText: '',
  followUpNeeded: false,
  followUpAt: ''
};

function toForm(summary) {
  if (!summary) return EMPTY_FORM;
  return {
    chiefComplaint: summary.chiefComplaint || '',
    subjectiveNotes: summary.subjectiveNotes || '',
    objectiveFindings: summary.objectiveFindings || '',
    assessment: summary.assessment || '',
    plan: summary.plan || '',
    recommendationsText: Array.isArray(summary.recommendations)
      ? summary.recommendations.join('\n')
      : '',
    followUpNeeded: Boolean(summary.followUpNeeded),
    followUpAt: summary.followUpAt ? new Date(summary.followUpAt).toISOString().slice(0, 16) : ''
  };
}

function toPayload(form) {
  return {
    chiefComplaint: form.chiefComplaint,
    subjectiveNotes: form.subjectiveNotes,
    objectiveFindings: form.objectiveFindings,
    assessment: form.assessment,
    plan: form.plan,
    recommendations: form.recommendationsText
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean),
    followUpNeeded: form.followUpNeeded,
    followUpAt: form.followUpNeeded && form.followUpAt ? new Date(form.followUpAt).toISOString() : null
  };
}

const requiredFields = [
  ['chiefComplaint', 'Keluhan utama'],
  ['objectiveFindings', 'Temuan objektif'],
  ['assessment', 'Assessment'],
  ['plan', 'Rencana tindakan']
];

export default function PostCallSummaryPanel({ appointmentId, conversation, open, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [status, setStatus] = useState('idle');
  const [summaryStatus, setSummaryStatus] = useState('pending');
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const autosaveRef = useRef(null);
  const loadedRef = useRef(false);

  const isFinalized = summaryStatus === 'finalized' || summaryStatus === 'amended';
  const missing = useMemo(
    () => requiredFields.filter(([key]) => !form[key]?.trim()).map(([, label]) => label),
    [form]
  );

  useEffect(() => {
    if (!open || !appointmentId) return;
    loadedRef.current = false;
    setStatus('loading');
    setError('');
    fetchClinicalSummary(appointmentId)
      .then((result) => {
        setSummaryStatus(result.status || 'pending');
        setForm(toForm(result.summary));
        setDirty(false);
      })
      .catch((err) => setError(err?.response?.data?.error?.code || 'Gagal memuat ringkasan.'))
      .finally(() => {
        loadedRef.current = true;
        setStatus('idle');
      });
  }, [appointmentId, open]);

  useEffect(() => {
    if (!open || !dirty || isFinalized || !loadedRef.current) return undefined;
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(() => {
      setStatus('saving');
      saveClinicalSummaryDraft(appointmentId, toPayload(form))
        .then((result) => {
          setSummaryStatus(result.status || 'draft');
          setDirty(false);
          setError('');
        })
        .catch((err) => setError(err?.response?.data?.error?.code || 'Autosave gagal.'))
        .finally(() => setStatus('idle'));
    }, 1200);
    return () => clearTimeout(autosaveRef.current);
  }, [appointmentId, dirty, form, isFinalized, open]);

  useEffect(() => {
    if (!dirty || isFinalized) return undefined;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty, isFinalized]);

  if (!open) return null;

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    setStatus('saving');
    try {
      const result = await saveClinicalSummaryDraft(appointmentId, toPayload(form));
      setSummaryStatus(result.status || 'draft');
      setDirty(false);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.error?.code || 'Gagal menyimpan draft.');
    } finally {
      setStatus('idle');
    }
  };

  const handleFinalize = async () => {
    if (missing.length > 0) {
      setError(`Lengkapi field wajib: ${missing.join(', ')}`);
      return;
    }
    if (!window.confirm('Finalize ringkasan klinis? Setelah final, pasien dapat membacanya.')) return;
    setStatus('saving');
    try {
      const result = await finalizeClinicalSummary(appointmentId, toPayload(form));
      setSummaryStatus(result.status || 'finalized');
      setDirty(false);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.error?.code || 'Gagal finalize ringkasan.');
    } finally {
      setStatus('idle');
    }
  };

  const handleClose = () => {
    if (dirty && !isFinalized && !window.confirm('Draft belum tersimpan. Tutup panel?')) return;
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">
      <aside className="h-full w-full max-w-2xl bg-surface-elevated shadow-2xl border-l border-primary/20 flex flex-col">
        <header className="px-5 py-4 border-b border-primary/10 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-primary">Ringkasan Pasca Konsultasi</h2>
            <p className="text-sm text-secondary">
              {conversation?.patient?.name || 'Pasien'} • Appointment #{appointmentId}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-primary/10 text-muted"
            aria-label="Close summary"
          >
            <Icon name="X" size={18} />
          </button>
        </header>

        {error && (
          <div className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {isFinalized && (
          <div className="mx-5 mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Ringkasan sudah final dan tampil sebagai read-only.
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <Field label="Keluhan utama / Chief complaint" required value={form.chiefComplaint} disabled={isFinalized} onChange={(value) => updateField('chiefComplaint', value)} />
          <Field label="Catatan subjektif" value={form.subjectiveNotes} disabled={isFinalized} onChange={(value) => updateField('subjectiveNotes', value)} />
          <Field label="Temuan objektif" required value={form.objectiveFindings} disabled={isFinalized} onChange={(value) => updateField('objectiveFindings', value)} />
          <Field label="Assessment / diagnosis notes" required value={form.assessment} disabled={isFinalized} onChange={(value) => updateField('assessment', value)} />
          <Field label="Rencana tindakan" required value={form.plan} disabled={isFinalized} onChange={(value) => updateField('plan', value)} />
          <Field label="Rekomendasi lanjutan" value={form.recommendationsText} disabled={isFinalized} onChange={(value) => updateField('recommendationsText', value)} />

          <label className="flex items-center gap-3 rounded-lg border border-primary/10 px-3 py-2">
            <input
              type="checkbox"
              checked={form.followUpNeeded}
              disabled={isFinalized}
              onChange={(event) => updateField('followUpNeeded', event.target.checked)}
            />
            <span className="text-sm font-medium text-primary">Follow-up diperlukan</span>
          </label>

          {form.followUpNeeded && (
            <label className="block">
              <span className="text-sm font-medium text-primary">Jadwal follow-up</span>
              <input
                type="datetime-local"
                value={form.followUpAt}
                disabled={isFinalized}
                onChange={(event) => updateField('followUpAt', event.target.value)}
                className="mt-1 w-full rounded-lg border border-primary/20 bg-surface px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </label>
          )}
        </div>

        <footer className="px-5 py-4 border-t border-primary/10 flex items-center justify-between">
          <div className="text-xs text-muted">
            {status === 'saving' ? 'Menyimpan...' : dirty ? 'Belum tersimpan' : 'Tersimpan'}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleSave} disabled={isFinalized || status === 'saving'} className="px-4 py-2 rounded-lg border border-primary/20 text-primary disabled:opacity-50">
              Save draft
            </button>
            <button onClick={handleFinalize} disabled={isFinalized || status === 'saving'} className="px-4 py-2 rounded-lg bg-accent text-white disabled:opacity-50">
              Finalize
            </button>
          </div>
        </footer>
      </aside>
    </div>
  );
}

function Field({ label, value, onChange, disabled = false, required = false }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-primary">
        {label}{required ? <span className="text-red-500"> *</span> : null}
      </span>
      <textarea
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="mt-1 w-full resize-y rounded-lg border border-primary/20 bg-surface px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-80"
      />
    </label>
  );
}
