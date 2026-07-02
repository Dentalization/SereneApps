import React, { useState } from 'react';
import Icon from '../../../../components/AppIcon';
import {
  addEndoDiagnosticTest,
  updateEndoDiagnosticTest,
} from '../../../../services/endoCoreService';

const TEST_TYPES = ['cold', 'percussion', 'palpation', 'mobility', 'probing'];
const emptyForm = { testType: 'cold', result: '', notes: '', performedAt: '' };

const EndoDiagnosticTests = ({ caseId, tests = [], editable, onChanged, onError }) => {
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        result: form.result.trim() || null,
        notes: form.notes.trim() || null,
        performedAt: form.performedAt || null,
      };
      if (editingId) await updateEndoDiagnosticTest(caseId, editingId, payload);
      else await addEndoDiagnosticTest(caseId, payload);
      setForm(emptyForm);
      setEditingId(null);
      await onChanged?.();
    } catch (error) {
      onError?.(error.response?.data?.error?.message || 'Diagnostic test tidak dapat disimpan.');
    } finally {
      setSaving(false);
    }
  };

  const edit = (test) => {
    setEditingId(test.id);
    setForm({
      testType: test.testType,
      result: test.result || '',
      notes: test.notes || '',
      performedAt: test.performedAt ? new Date(test.performedAt).toISOString().slice(0, 16) : '',
    });
  };

  return (
    <section className="rounded-3xl border border-primary/10 bg-surface p-5 shadow-theme-sm">
      <h2 className="flex items-center gap-2 text-lg font-bold text-primary"><Icon name="TestTube2" size={18} /> Diagnostic Tests</h2>
      <div className="mt-4 space-y-3">
        {tests.length === 0 && <p className="rounded-xl border border-dashed border-primary/15 p-4 text-sm text-secondary">Belum ada diagnostic test.</p>}
        {tests.map((test) => (
          <div key={test.id} className="rounded-2xl border border-primary/10 bg-surface-elevated p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold capitalize text-primary">{test.testType.replaceAll('_', ' ')}</p>
                <p className="mt-1 text-sm text-secondary">{test.result || 'No result recorded'}</p>
                {test.notes && <p className="mt-1 text-xs text-muted">{test.notes}</p>}
              </div>
              {editable && <button type="button" onClick={() => edit(test)} className="text-xs font-semibold text-accent">Edit</button>}
            </div>
          </div>
        ))}
      </div>
      {editable && (
        <div className="mt-4 grid gap-3 rounded-2xl border border-primary/10 bg-surface-elevated p-4 md:grid-cols-2">
          <select value={form.testType} onChange={(event) => setForm({ ...form, testType: event.target.value })} className="rounded-xl border border-primary/15 bg-surface px-3 py-2.5 text-sm text-primary">
            {TEST_TYPES.map((type) => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}
          </select>
          <input value={form.result} onChange={(event) => setForm({ ...form, result: event.target.value })} placeholder="Result" className="rounded-xl border border-primary/15 bg-surface px-3 py-2.5 text-sm text-primary" />
          <input type="datetime-local" value={form.performedAt} onChange={(event) => setForm({ ...form, performedAt: event.target.value })} className="rounded-xl border border-primary/15 bg-surface px-3 py-2.5 text-sm text-primary" />
          <input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Notes" className="rounded-xl border border-primary/15 bg-surface px-3 py-2.5 text-sm text-primary" />
          <div className="flex gap-2 md:col-span-2">
            <button type="button" onClick={submit} disabled={saving} className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{editingId ? 'Update test' : 'Add test'}</button>
            {editingId && <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }} className="rounded-xl border border-primary/15 px-4 py-2 text-sm font-semibold text-secondary">Cancel</button>}
          </div>
        </div>
      )}
    </section>
  );
};

export default EndoDiagnosticTests;
