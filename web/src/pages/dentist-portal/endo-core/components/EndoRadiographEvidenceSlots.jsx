import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../../components/AppIcon';
import { listPatientXcoreStudies } from '../../../../services/specialistWorkspaceService';
import {
  unlinkEndoRadiographEvidence,
  upsertEndoRadiographEvidence,
} from '../../../../services/endoCoreService';

const SLOT_DEFINITIONS = [
  { type: 'preoperative', label: 'Preoperative' },
  { type: 'working_length', label: 'Working length' },
  { type: 'master_cone', label: 'Master cone' },
  { type: 'obturation', label: 'Obturation' },
  { type: 'follow_up', label: 'Follow-up' },
  { type: 'cbct', label: 'CBCT' },
];

const formatDate = (value) => value
  ? new Date(value).toLocaleDateString('id-ID', { dateStyle: 'medium' })
  : 'Date unavailable';

const EndoRadiographEvidenceSlots = ({
  caseId,
  patientId,
  slots = [],
  treatmentStages = [],
  editable,
  onChanged,
  onError,
}) => {
  const [studies, setStudies] = useState([]);
  const [studiesLoading, setStudiesLoading] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [form, setForm] = useState({
    xcoreStudyId: '',
    treatmentStageId: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editable || !patientId) return undefined;
    let active = true;
    setStudiesLoading(true);
    listPatientXcoreStudies(patientId)
      .then((result) => {
        if (active) setStudies(result);
      })
      .catch((error) => {
        if (active) {
          setStudies([]);
          onError?.(
            error.response?.data?.error?.message
            || 'Daftar X-Core study tidak dapat dimuat.',
          );
        }
      })
      .finally(() => {
        if (active) setStudiesLoading(false);
      });
    return () => { active = false; };
  }, [editable, onError, patientId]);

  const slotFor = (type) => slots.find((slot) => slot.evidenceType === type)
    || { evidenceType: type, linked: false };

  const beginEdit = (slot) => {
    setEditingType(slot.evidenceType);
    setForm({
      xcoreStudyId: slot.xcoreStudyId || '',
      treatmentStageId: slot.treatmentStageId || '',
      notes: slot.notes || '',
    });
  };

  const saveSlot = async (evidenceType) => {
    if (!form.xcoreStudyId || saving) return;
    setSaving(true);
    try {
      await upsertEndoRadiographEvidence(caseId, evidenceType, {
        xcoreStudyId: form.xcoreStudyId,
        treatmentStageId: form.treatmentStageId || null,
        notes: form.notes.trim() || null,
      });
      setEditingType(null);
      await onChanged?.();
    } catch (error) {
      onError?.(
        error.response?.data?.error?.message
        || 'Radiograph evidence tidak dapat dihubungkan.',
      );
    } finally {
      setSaving(false);
    }
  };

  const unlink = async (evidenceType) => {
    if (saving) return;
    setSaving(true);
    try {
      await unlinkEndoRadiographEvidence(caseId, evidenceType);
      setEditingType(null);
      await onChanged?.();
    } catch (error) {
      onError?.(
        error.response?.data?.error?.message
        || 'Radiograph evidence tidak dapat dilepas.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-3xl border border-primary/10 bg-surface p-5 shadow-theme-sm">
      <h2 className="flex items-center gap-2 text-lg font-bold text-primary">
        <Icon name="Images" size={18} />
        Radiograph Evidence Slots
      </h2>
      <p className="mt-2 text-sm text-secondary">
        Use these workflow-stage-specific X-Core references for defined endodontic workflow
        points. The primary case-level reference is managed separately in X-Core Evidence.
      </p>

      <div className="mt-4 space-y-3">
        {SLOT_DEFINITIONS.map(({ type, label }) => {
          const slot = slotFor(type);
          const editing = editingType === type;
          return (
            <article key={type} className="rounded-2xl border border-primary/10 bg-surface-elevated p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-primary">{label}</p>
                  <p className={`mt-1 text-xs font-semibold ${slot.linked ? 'text-emerald-700' : 'text-muted'}`}>
                    {slot.linked ? 'Linked from X-Core' : 'Not linked'}
                  </p>
                </div>
                {editable && !editing && (
                  <button
                    type="button"
                    onClick={() => beginEdit(slot)}
                    className="text-xs font-semibold text-accent"
                  >
                    {slot.linked ? 'Change Study' : 'Link X-Core Study'}
                  </button>
                )}
              </div>

              {slot.linked && !editing && (
                <div className="mt-3 rounded-xl border border-primary/10 bg-surface p-3">
                  {slot.xcore?.available === false ? (
                    <p className="text-xs text-amber-700">
                      Linked study details are unavailable. The slot can still be unlinked.
                    </p>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-primary">
                        {slot.xcore?.modality || 'Imaging study'} · #{slot.xcore?.referenceId}
                      </p>
                      <p className="mt-1 text-xs text-secondary">
                        {slot.xcore?.description || 'No description'} · {formatDate(slot.xcore?.studyDate)}
                      </p>
                      <p className="mt-1 text-xs text-muted">{slot.xcore?.status || 'Status unavailable'}</p>
                    </>
                  )}
                  {slot.notes && <p className="mt-2 text-xs text-secondary">{slot.notes}</p>}
                  <div className="mt-3 flex flex-wrap gap-3">
                    {slot.xcore?.openPath && (
                      <Link to={slot.xcore.openPath} className="inline-flex items-center gap-1 text-xs font-semibold text-accent">
                        Open in X-Core <Icon name="ExternalLink" size={12} />
                      </Link>
                    )}
                    {editable && (
                      <button
                        type="button"
                        onClick={() => unlink(type)}
                        disabled={saving}
                        className="text-xs font-semibold text-red-600 disabled:opacity-50"
                      >
                        Unlink
                      </button>
                    )}
                  </div>
                </div>
              )}

              {editing && (
                <div className="mt-3 space-y-3 rounded-xl border border-accent/20 bg-surface p-3">
                  <label className="block text-xs font-semibold text-primary">
                    X-Core study
                    <select
                      value={form.xcoreStudyId}
                      onChange={(event) => setForm({ ...form, xcoreStudyId: event.target.value })}
                      disabled={studiesLoading || saving}
                      className="mt-1.5 w-full rounded-xl border border-primary/15 bg-surface-elevated px-3 py-2 text-sm font-normal text-primary"
                    >
                      <option value="">{studiesLoading ? 'Loading studies…' : 'Select study'}</option>
                      {studies.map((study) => (
                        <option key={study.id} value={study.id}>
                          {study.modality} · {study.description || `Study #${study.id}`} · {formatDate(study.studyDate)} · {study.status}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-semibold text-primary">
                    Treatment stage (optional)
                    <select
                      value={form.treatmentStageId}
                      onChange={(event) => setForm({ ...form, treatmentStageId: event.target.value })}
                      disabled={saving}
                      className="mt-1.5 w-full rounded-xl border border-primary/15 bg-surface-elevated px-3 py-2 text-sm font-normal text-primary"
                    >
                      <option value="">No linked stage</option>
                      {treatmentStages.map((stage) => (
                        <option key={stage.id} value={stage.id}>
                          {stage.stageType.replaceAll('_', ' ')} · {stage.status.replaceAll('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-semibold text-primary">
                    Dentist-authored note
                    <textarea
                      value={form.notes}
                      onChange={(event) => setForm({ ...form, notes: event.target.value })}
                      disabled={saving}
                      rows={2}
                      className="mt-1.5 w-full rounded-xl border border-primary/15 bg-surface-elevated px-3 py-2 text-sm font-normal text-primary"
                    />
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => saveSlot(type)}
                      disabled={saving || !form.xcoreStudyId}
                      className="rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Save link
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingType(null)}
                      disabled={saving}
                      className="rounded-xl border border-primary/15 px-3 py-2 text-xs font-semibold text-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      <p className="mt-4 rounded-2xl bg-accent/5 p-4 text-xs leading-relaxed text-secondary">
        X-Core remains the source of truth. Endo-Core stores only study references and dentist-authored slot notes.
      </p>
    </section>
  );
};

export default EndoRadiographEvidenceSlots;
