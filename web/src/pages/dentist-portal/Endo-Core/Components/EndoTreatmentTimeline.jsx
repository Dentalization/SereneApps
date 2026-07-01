import React, { useState, useEffect } from 'react';
import Icon from '../../../../components/AppIcon';
import {
  addEndoTreatmentStage,
  updateEndoTreatmentStage,
} from '../../../../services/endoCoreService';
import { fetchAppointments } from '../../../../services/appointmentService';

const STAGES = ['assessment', 'access', 'working_length', 'cleaning_shaping', 'medication', 'obturation', 'restoration', 'follow_up'];
const STATUSES = ['planned', 'in_progress', 'completed', 'skipped'];
const emptyForm = { stageType: 'assessment', status: 'planned', performedAt: '', appointmentId: '', notes: '' };

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
  } catch (e) {
    return String(value);
  }
};

const EndoTreatmentTimeline = ({ caseId, stages = [], editable, onChanged, onError, patientId }) => {
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [loadingAppts, setLoadingAppts] = useState(false);

  useEffect(() => {
    if (!patientId) return undefined;
    let mounted = true;
    const loadAppointments = async () => {
      setLoadingAppts(true);
      try {
        const response = await fetchAppointments({ view: 'dentist', status: 'scheduled,confirmed,completed' });
        if (mounted) {
          const filtered = (response.appointments || []).filter(
            (a) => String(a.patientId || a.patient?.id) === String(patientId),
          );
          setAppointments(filtered);
        }
      } catch (error) {
        console.error('Failed to load appointments:', error);
      } finally {
        if (mounted) setLoadingAppts(false);
      }
    };
    loadAppointments();
    return () => { mounted = false; };
  }, [patientId]);

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        appointmentId: form.appointmentId || null,
        performedAt: form.performedAt || null,
        notes: form.notes.trim() || null,
      };
      if (editingId) await updateEndoTreatmentStage(caseId, editingId, payload);
      else await addEndoTreatmentStage(caseId, payload);
      setForm(emptyForm);
      setEditingId(null);
      await onChanged?.();
    } catch (error) {
      onError?.(error.response?.data?.error?.message || 'Treatment stage tidak dapat disimpan.');
    } finally {
      setSaving(false);
    }
  };
  const edit = (stage) => {
    setEditingId(stage.id);
    setForm({
      stageType: stage.stageType,
      status: stage.status,
      appointmentId: stage.appointmentId || '',
      notes: stage.notes || '',
      performedAt: stage.performedAt ? new Date(stage.performedAt).toISOString().slice(0, 16) : '',
    });
  };

  return (
    <section className="rounded-3xl border border-primary/10 bg-surface p-5 shadow-theme-sm">
      <h2 className="flex items-center gap-2 text-lg font-bold text-primary"><Icon name="ListChecks" size={18} /> RCT Treatment Timeline</h2>
      <div className="mt-4 space-y-3">
        {stages.length === 0 && <p className="rounded-xl border border-dashed border-primary/15 p-4 text-sm text-secondary">Belum ada treatment stage.</p>}
        {stages.map((stage) => (
          <div key={stage.id} className="flex gap-3 rounded-2xl border border-primary/10 bg-surface-elevated p-4">
            <div className={`mt-1 h-3 w-3 shrink-0 rounded-full ${stage.status === 'completed' ? 'bg-emerald-500' : stage.status === 'in_progress' ? 'bg-blue-500' : 'bg-slate-300'}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold capitalize text-primary">{stage.stageType.replaceAll('_', ' ')}</p>
                {editable && <button type="button" onClick={() => edit(stage)} className="text-xs font-semibold text-accent">Edit</button>}
              </div>
              <p className="mt-1 text-xs font-semibold capitalize text-secondary">{stage.status.replaceAll('_', ' ')}</p>
              {stage.notes && <p className="mt-1 text-sm text-secondary">{stage.notes}</p>}
            </div>
          </div>
        ))}
      </div>
      {editable && (
        <div className="mt-4 grid gap-3 rounded-2xl border border-primary/10 bg-surface-elevated p-4 md:grid-cols-2">
          <select value={form.stageType} onChange={(event) => setForm({ ...form, stageType: event.target.value })} className="rounded-xl border border-primary/15 bg-surface px-3 py-2.5 text-sm text-primary">
            {STAGES.map((stage) => <option key={stage} value={stage}>{stage.replaceAll('_', ' ')}</option>)}
          </select>
          <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="rounded-xl border border-primary/15 bg-surface px-3 py-2.5 text-sm text-primary">
            {STATUSES.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
          </select>
          <input type="datetime-local" value={form.performedAt} onChange={(event) => setForm({ ...form, performedAt: event.target.value })} className="rounded-xl border border-primary/15 bg-surface px-3 py-2.5 text-sm text-primary" />
          <select value={form.appointmentId} onChange={(event) => setForm({ ...form, appointmentId: event.target.value })} className="rounded-xl border border-primary/15 bg-surface px-3 py-2.5 text-sm text-primary">
            <option value="">No linked appointment</option>
            {appointments.map((appt) => (
              <option key={appt.id} value={appt.id}>
                {formatDate(appt.startsAt)} — {appt.reason || 'No reason given'}
              </option>
            ))}
          </select>
          <input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Stage notes" className="rounded-xl border border-primary/15 bg-surface px-3 py-2.5 text-sm text-primary md:col-span-2" />
          <div className="flex gap-2 md:col-span-2">
            <button type="button" onClick={submit} disabled={saving} className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{editingId ? 'Update stage' : 'Add stage'}</button>
            {editingId && <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }} className="rounded-xl border border-primary/15 px-4 py-2 text-sm font-semibold text-secondary">Cancel</button>}
          </div>
        </div>
      )}
    </section>
  );
};

export default EndoTreatmentTimeline;
