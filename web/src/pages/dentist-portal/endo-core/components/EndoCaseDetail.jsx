import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../../components/AppIcon';
import {
  getEndoCase,
  updateEndoCase,
} from '../../../../services/endoCoreService';
import {
  addSpecialistCaseNote,
  updateSpecialistCaseStatus,
} from '../../../../services/specialistWorkspaceService';
import EndoDiagnosticTests from './EndoDiagnosticTests';
import EndoTreatmentTimeline from './EndoTreatmentTimeline';
import EndoXCoreEvidence from './EndoXCoreEvidence';

const statusStyles = {
  draft: 'bg-slate-100 text-slate-700',
  active: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-amber-100 text-amber-700',
};
const editableStatuses = new Set(['draft', 'active']);
const fieldsFrom = (detail = {}) => ({
  chiefComplaint: detail.chiefComplaint || '',
  pulpDiagnosis: detail.pulpDiagnosis || '',
  periapicalDiagnosis: detail.periapicalDiagnosis || '',
  difficultyLevel: detail.difficultyLevel || '',
  difficultyFactors: Array.isArray(detail.difficultyFactors) ? detail.difficultyFactors.join(', ') : '',
  restorabilityStatus: detail.restorabilityStatus || '',
  finalRestorationStatus: detail.finalRestorationStatus || '',
  retreatmentReason: detail.retreatmentReason || '',
  traumaHistory: detail.traumaHistory || '',
  periodontalConcern: detail.periodontalConcern || '',
  cbctReason: detail.cbctReason || '',
  swelling: Boolean(detail.swelling),
  sinusTract: Boolean(detail.sinusTract),
  spontaneousPain: detail.spontaneousPain ?? '',
  lingeringPain: detail.lingeringPain ?? '',
  thermalSensitivity: detail.thermalSensitivity ?? '',
  bitingPain: detail.bitingPain ?? '',
  previousEndoTreatment: Boolean(detail.previousEndoTreatment),
  cbctConsidered: Boolean(detail.cbctConsidered),
});
const formatDate = (value) => value
  ? new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
  : '—';
const displayContext = (value) => {
  if (!value) return '—';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.join(', ') || '—';
  const copy = { ...value };
  delete copy.allergies;
  return Object.values(copy).flat().filter(Boolean).join(' · ') || '—';
};

const EndoCaseDetail = ({ caseId }) => {
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [form, setForm] = useState(fieldsFrom());
  const [completionSummary, setCompletionSummary] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getEndoCase(caseId);
      setRecord(result);
      setForm(fieldsFrom(result.endo));
      setCompletionSummary(result.completionSummary || '');
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Endo Case tidak dapat dimuat.');
    } finally {
      setLoading(false);
    }
  }, [caseId]);
  useEffect(() => { load(); }, [load]);

  const saveDetail = async () => {
    setSaving(true);
    setNotice('');
    try {
      await updateEndoCase(caseId, {
        ...form,
        difficultyLevel: form.difficultyLevel || null,
        difficultyFactors: form.difficultyFactors.split(',').map((value) => value.trim()).filter(Boolean),
      });
      await load();
      setNotice('Endodontic case detail tersimpan.');
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Endodontic detail tidak dapat disimpan.');
    } finally {
      setSaving(false);
    }
  };
  const changeStatus = async (status) => {
    if (status === 'archived' && !window.confirm('Archive Endo Case ini?')) return;
    setSaving(true);
    setError('');
    try {
      await updateSpecialistCaseStatus(
        caseId,
        status,
        status === 'completed' ? completionSummary.trim() : null,
      );
      await load();
      setNotice(`Case diperbarui menjadi ${status}.`);
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Status case tidak dapat diperbarui.');
    } finally {
      setSaving(false);
    }
  };
  const addNote = async () => {
    if (!note.trim() || saving) return;
    setSaving(true);
    try {
      await addSpecialistCaseNote(caseId, note.trim());
      setNote('');
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Catatan tidak dapat ditambahkan.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center text-secondary"><Icon name="Loader2" size={28} className="animate-spin text-accent" /></div>;
  if (!record) return (
    <div className="mx-auto max-w-lg rounded-3xl border border-red-200 bg-surface p-8 text-center">
      <p className="font-semibold text-red-700">{error || 'Endo Case tidak ditemukan.'}</p>
      <button type="button" onClick={() => navigate('/dentist-portal/endo-core')} className="mt-4 text-sm font-semibold text-accent">Back to Endo-Core</button>
    </div>
  );

  const editable = editableStatuses.has(record.status);
  const medical = record.patient?.medicalContext || {};
  const allergyValue = (() => {
    const val = medical.allergies;
    if (!val) return null;
    if (Array.isArray(val)) return val.length ? val.join(', ') : null;
    if (typeof val === 'string') return val.trim() || null;
    return null;
  })();

  return (
    <div className="mx-auto max-w-[1700px] space-y-6 pb-10">
      <header className="rounded-3xl border border-primary/10 bg-surface p-6 shadow-theme-sm">
        <button type="button" onClick={() => navigate('/dentist-portal/endo-core')} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-secondary hover:text-accent"><Icon name="ArrowLeft" size={16} /> Endo-Core</button>
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-bold uppercase text-accent">Endo-Core</span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyles[record.status]}`}>{record.status}</span>
              <span className="rounded-full bg-primary/5 px-3 py-1 text-xs font-bold text-primary">FDI {record.endo?.toothNumber}</span>
            </div>
            <h1 className="mt-3 text-3xl font-bold text-primary">{record.title}</h1>
            <p className="mt-2 text-sm text-secondary">{record.patient?.name} · updated {formatDate(record.updatedAt)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {record.status === 'draft' && <button type="button" onClick={() => changeStatus('active')} disabled={saving} className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">Mark Active</button>}
            {record.status === 'active' && <button type="button" onClick={() => changeStatus('completed')} disabled={saving || !completionSummary.trim()} className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">Mark Completed</button>}
            {['draft', 'completed'].includes(record.status) && <button type="button" onClick={() => changeStatus('archived')} disabled={saving} className="rounded-xl border border-amber-300 px-4 py-2.5 text-sm font-semibold text-amber-700 disabled:opacity-60">Archive</button>}
          </div>
        </div>
        {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {notice && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>}
      </header>
 
      <div className="grid gap-6 xl:grid-cols-[minmax(250px,0.8fr)_minmax(520px,1.6fr)_minmax(280px,0.9fr)]">
        <aside className="space-y-5">
          <section className="rounded-3xl border border-primary/10 bg-surface p-5 shadow-theme-sm">
            <h2 className="text-lg font-bold text-primary">Patient & Tooth Context</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div><dt className="text-muted">Patient</dt><dd className="font-semibold text-primary">{record.patient?.name}</dd></div>
              <div><dt className="text-muted">Tooth</dt><dd className="font-semibold text-primary">FDI {record.endo?.toothNumber}</dd></div>
              <div><dt className="text-muted">Odontogram snapshot</dt><dd className="text-primary">{record.endo?.odontogramCodeAtCreation || 'No mark'} {record.endo?.odontogramPosition ? `· ${record.endo.odontogramPosition}` : ''}</dd></div>
              <div><dt className="text-muted">Medical context</dt><dd className="text-primary">{displayContext(medical)}</dd></div>
              <div><dt className="text-muted">Linked appointment</dt><dd className="text-primary">{record.appointment ? formatDate(record.appointment.startsAt) : '—'}</dd></div>
            </dl>
            {allergyValue && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-semibold flex items-center gap-1.5"><Icon name="AlertTriangle" size={15} className="text-amber-600" /> Allergies Detected</p>
                <p className="mt-1 font-semibold">{allergyValue}</p>
              </div>
            )}
            {(record.endo?.swelling || record.endo?.sinusTract) && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <p className="font-semibold">Review required</p>
                <p className="mt-1">{[record.endo.swelling && 'Swelling', record.endo.sinusTract && 'Sinus tract'].filter(Boolean).join(' · ')}</p>
              </div>
            )}
          </section>
          {record.appointment?.healthForm && (
            <section className="rounded-3xl border border-primary/10 bg-surface p-5 shadow-theme-sm">
              <h2 className="font-bold text-primary">Health Form Context</h2>
              <p className="mt-3 text-sm text-secondary">Symptoms: {record.appointment.healthForm.symptoms || '—'}</p>
              <p className="mt-2 text-sm text-secondary">Allergies: {record.appointment.healthForm.allergies || '—'}</p>
              <p className="mt-2 text-sm text-secondary">Pain: {record.appointment.healthForm.painLevel ?? '—'}</p>
            </section>
          )}
        </aside>

        <div className="space-y-6">
          <section className="rounded-3xl border border-primary/10 bg-surface p-5 shadow-theme-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-primary">Endodontic Case</h2>
              {editable && <button type="button" onClick={saveDetail} disabled={saving} className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Save detail</button>}
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {[
                ['chiefComplaint', 'Chief complaint'],
                ['pulpDiagnosis', 'Pulp diagnosis'],
                ['periapicalDiagnosis', 'Periapical diagnosis'],
                ['difficultyFactors', 'Difficulty factors (comma separated)'],
                ['restorabilityStatus', 'Restorability status'],
                ['finalRestorationStatus', 'Final restoration status'],
                ['retreatmentReason', 'Retreatment reason'],
                ['traumaHistory', 'Trauma history'],
                ['periodontalConcern', 'Periodontal concern'],
                ['cbctReason', 'CBCT reason'],
              ].map(([field, label]) => (
                <label key={field} className={`text-sm font-semibold text-primary ${field === 'chiefComplaint' ? 'md:col-span-2' : ''}`}>
                  {label}
                  <textarea value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} disabled={!editable} rows={field === 'chiefComplaint' ? 3 : 2} className="mt-2 w-full rounded-xl border border-primary/15 bg-surface-elevated px-3 py-2.5 font-normal text-primary disabled:opacity-70" />
                </label>
              ))}
              <label className="text-sm font-semibold text-primary">
                Difficulty level
                <select value={form.difficultyLevel} onChange={(event) => setForm({ ...form, difficultyLevel: event.target.value })} disabled={!editable} className="mt-2 w-full rounded-xl border border-primary/15 bg-surface-elevated px-3 py-2.5 font-normal text-primary disabled:opacity-70">
                  <option value="">Not selected</option>
                  <option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option>
                </select>
              </label>
              <div className="grid gap-2 sm:grid-cols-2 md:col-span-2">
                {[
                  ['swelling', 'Swelling'], ['sinusTract', 'Sinus tract'],
                  ['previousEndoTreatment', 'Previous endo'], ['cbctConsidered', 'CBCT considered'],
                ].map(([field, label]) => (
                  <label key={field} className="flex items-center gap-2 rounded-xl border border-primary/10 bg-surface-elevated p-3 text-sm font-medium text-primary">
                    <input type="checkbox" checked={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.checked })} disabled={!editable} /> {label}
                  </label>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 md:col-span-2">
                {[
                  ['spontaneousPain', 'Spontaneous pain'],
                  ['lingeringPain', 'Lingering pain'],
                  ['thermalSensitivity', 'Thermal sensitivity'],
                  ['bitingPain', 'Biting pain'],
                ].map(([field, label]) => (
                  <label key={field} className="text-sm font-semibold text-primary">
                    {label}
                    <select
                      value={form[field] === '' ? '' : String(form[field])}
                      onChange={(event) => setForm({
                        ...form,
                        [field]: event.target.value === ''
                          ? ''
                          : event.target.value === 'true',
                      })}
                      disabled={!editable}
                      className="mt-2 w-full rounded-xl border border-primary/15 bg-surface-elevated px-3 py-2.5 font-normal text-primary disabled:opacity-70"
                    >
                      <option value="">Not recorded</option>
                      <option value="true">Present</option>
                      <option value="false">Absent</option>
                    </select>
                  </label>
                ))}
              </div>
            </div>
          </section>

          <EndoDiagnosticTests caseId={caseId} tests={record.endo?.diagnosticTests} editable={editable} onChanged={load} onError={setError} />
          <EndoTreatmentTimeline caseId={caseId} stages={record.endo?.treatmentStages} editable={editable} onChanged={load} onError={setError} patientId={record.patientId} />

          <section className="rounded-3xl border border-primary/10 bg-surface p-5 shadow-theme-sm">
            <h2 className="text-lg font-bold text-primary">Clinical Notes</h2>
            <div className="mt-4 space-y-3">
              {record.notes?.length === 0 && <p className="text-sm text-secondary">Belum ada catatan.</p>}
              {record.notes?.map((item) => <div key={item.id} className="rounded-2xl bg-surface-elevated p-4"><p className="text-sm text-primary">{item.content}</p><p className="mt-2 text-xs text-muted">{item.authorName} · {formatDate(item.createdAt)}</p></div>)}
            </div>
            {editable && <div className="mt-4 flex gap-2"><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} placeholder="Dentist-authored working note" className="min-w-0 flex-1 rounded-xl border border-primary/15 bg-surface-elevated px-3 py-2.5 text-sm text-primary" /><button type="button" onClick={addNote} disabled={saving || !note.trim()} className="self-end rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">Add note</button></div>}
          </section>

          <section className="rounded-3xl border border-primary/10 bg-surface p-5 shadow-theme-sm">
            <h2 className="text-lg font-bold text-primary">Completion Summary</h2>
            <textarea value={completionSummary} onChange={(event) => setCompletionSummary(event.target.value)} disabled={record.status !== 'active'} rows={4} placeholder="Required dentist-authored summary before completion" className="mt-3 w-full rounded-xl border border-primary/15 bg-surface-elevated px-3 py-2.5 text-sm text-primary disabled:opacity-70" />
            <p className="mt-2 text-xs text-secondary">Working notes are never copied automatically into this field.</p>
          </section>
        </div>

        <aside className="space-y-5">
          <EndoXCoreEvidence
            evidence={record.xcore}
            caseId={caseId}
            patientId={record.patientId}
            editable={editable}
            onChanged={load}
            onError={setError}
          />
          <section className="rounded-3xl border border-accent/20 bg-accent/5 p-5">
            <h2 className="flex items-center gap-2 font-bold text-primary"><Icon name="ShieldCheck" size={18} /> Clinical safety</h2>
            <p className="mt-3 text-sm leading-relaxed text-secondary">
              Endo-Core structures endodontic documentation. It does not diagnose, prescribe, or replace dentist judgment.
            </p>
          </section>
          {record.status === 'completed' && (
            <section className="rounded-3xl border border-primary/10 bg-surface p-5 text-sm text-secondary shadow-theme-sm">
              If the tooth should be marked RCT, update the EMR odontogram manually. Endo-Core does not mutate it.
            </section>
          )}
        </aside>
      </div>
    </div>
  );
};

export default EndoCaseDetail;
