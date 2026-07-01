import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../../components/AppIcon';
import ModalPortal from '../../../../components/ui/ModalPortal';
import PatientSearchPicker from '../../components/PatientSearchPicker';
import { getPatientEmrRecords } from '../../../../services/dentistPortalService';
import { createEndoCase } from '../../../../services/endoCoreService';
import { listPatientXcoreStudies } from '../../../../services/specialistWorkspaceService';
import { useToast } from '../../../../contexts/ToastContext';
import EndoOdontogramPicker from './EndoOdontogramPicker';

const initialForm = {
  toothNumber: '',
  odontogramPosition: null,
  odontogramCodeAtCreation: null,
  title: '',
  chiefComplaint: '',
  swelling: false,
  sinusTract: false,
  previousEndoTreatment: false,
  retreatmentReason: '',
  xcoreStudyId: '',
};

const CreateEndoCaseModal = ({
  isOpen,
  onClose,
  patientId = null,
  patientName = '',
  appointmentId = null,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [patient, setPatient] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [marks, setMarks] = useState([]);
  const [studies, setStudies] = useState([]);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPatient(patientId ? { id: patientId, name: patientName || `Patient #${patientId}` } : null);
    setForm(initialForm);
    setMarks([]);
    setStudies([]);
    setContextError('');
    setError('');
    setCreating(false);
  }, [isOpen, patientId, patientName, appointmentId]);

  useEffect(() => {
    if (!isOpen || !patient?.id) return undefined;
    let active = true;
    setContextLoading(true);
    setContextError('');
    Promise.allSettled([
      getPatientEmrRecords(patient.id),
      listPatientXcoreStudies(patient.id),
    ]).then(([emrResult, studyResult]) => {
      if (!active) return;
      if (emrResult.status === 'fulfilled') {
        const latest = [...emrResult.value]
          .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))[0];
        setMarks(Array.isArray(latest?.odontogramMarks) ? latest.odontogramMarks : []);
      } else {
        setMarks([]);
      }
      if (studyResult.status === 'fulfilled') setStudies(studyResult.value);
      else setStudies([]);
      if (emrResult.status === 'rejected' || studyResult.status === 'rejected') {
        setContextError('Sebagian konteks EMR/X-Core tidak tersedia. Pilihan FDI tetap dapat digunakan.');
      }
    }).finally(() => {
      if (active) setContextLoading(false);
    });
    return () => { active = false; };
  }, [isOpen, patient?.id]);

  if (!isOpen) return null;

  const setValue = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const handleTooth = (selection) => {
    setForm((current) => ({
      ...current,
      ...selection,
      title: !current.title || /^Endodontic case - tooth \d{2}$/.test(current.title)
        ? `Endodontic case - tooth ${selection.toothNumber}`
        : current.title,
    }));
  };
  const handleSubmit = async () => {
    if (creating) return;
    if (!patient?.id || !form.toothNumber || !form.chiefComplaint.trim() || !form.title.trim()) {
      setError('Pasien, gigi FDI, judul, dan chief complaint wajib diisi.');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const created = await createEndoCase({
        patientId: patient.id,
        originAppointmentId: appointmentId || null,
        xcoreStudyId: form.xcoreStudyId || null,
        title: form.title.trim(),
        toothNumber: form.toothNumber,
        odontogramPosition: form.odontogramPosition,
        odontogramCodeAtCreation: form.odontogramCodeAtCreation,
        chiefComplaint: form.chiefComplaint.trim(),
        swelling: form.swelling,
        sinusTract: form.sinusTract,
        previousEndoTreatment: form.previousEndoTreatment,
        retreatmentReason: form.previousEndoTreatment ? form.retreatmentReason.trim() || null : null,
      });
      onClose?.();
      navigate(`/dentist-portal/endo-core/${created.id}`);
    } catch (requestError) {
      const apiError = requestError.response?.data?.error;
      if (requestError.response?.status === 409 && apiError?.existingCaseId) {
        toast?.info?.('An active Endo-Core case already exists for this tooth — opening it.');
        onClose?.();
        navigate(`/dentist-portal/endo-core/${apiError.existingCaseId}`);
        return;
      }
      setError(apiError?.message || 'Gagal membuat Endo Case.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="create-endo-title">
        <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-primary/15 bg-surface shadow-2xl">
          <div className="sticky top-0 z-10 flex items-start justify-between border-b border-primary/10 bg-surface px-6 py-5">
            <div>
              <h2 id="create-endo-title" className="text-xl font-bold text-primary">Create Endo Case</h2>
              <p className="mt-1 text-sm text-secondary">Dokumentasikan case endodontik berbasis pasien dan gigi FDI.</p>
            </div>
            <button type="button" onClick={onClose} disabled={creating} aria-label="Tutup modal" className="rounded-xl p-2 text-muted hover:bg-primary/5">
              <Icon name="X" size={18} />
            </button>
          </div>

          <div className="space-y-5 p-6">
            {patientId ? (
              <div className="rounded-2xl border border-primary/10 bg-surface-elevated p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Patient</p>
                <p className="mt-1 font-semibold text-primary">{patient?.name}</p>
              </div>
            ) : (
              <div>
                <p className="mb-2 text-sm font-semibold text-primary">Pilih pasien *</p>
                <PatientSearchPicker selectedPatient={patient} onSelect={setPatient} />
              </div>
            )}

            {patient?.id && (
              <>
                {contextLoading && <p className="text-xs text-secondary">Memuat konteks EMR dan X-Core…</p>}
                {contextError && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">{contextError}</p>}
                <EndoOdontogramPicker value={form.toothNumber} onChange={handleTooth} odontogramMarks={marks} disabled={creating} />
              </>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-primary">
                Case title *
                <input value={form.title} onChange={(event) => setValue('title', event.target.value)} maxLength={240} className="mt-2 w-full rounded-xl border border-primary/15 bg-surface-elevated px-4 py-3 font-normal outline-none focus:border-accent" />
              </label>
              <label className="text-sm font-semibold text-primary">
                X-Core study (optional)
                <select value={form.xcoreStudyId} onChange={(event) => setValue('xcoreStudyId', event.target.value)} className="mt-2 w-full rounded-xl border border-primary/15 bg-surface-elevated px-4 py-3 font-normal outline-none focus:border-accent">
                  <option value="">No linked imaging</option>
                  {studies.map((study) => (
                    <option key={study.id} value={study.id}>{study.modality} · {study.description || `Study #${study.id}`}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-sm font-semibold text-primary">
              Chief complaint *
              <textarea value={form.chiefComplaint} onChange={(event) => setValue('chiefComplaint', event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-primary/15 bg-surface-elevated px-4 py-3 font-normal outline-none focus:border-accent" />
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ['swelling', 'Swelling'],
                ['sinusTract', 'Sinus tract'],
                ['previousEndoTreatment', 'Previous endo treatment'],
              ].map(([field, label]) => (
                <label key={field} className="flex items-center gap-2 rounded-xl border border-primary/10 bg-surface-elevated p-3 text-sm font-medium text-primary">
                  <input type="checkbox" checked={form[field]} onChange={(event) => setValue(field, event.target.checked)} />
                  {label}
                </label>
              ))}
            </div>
            {form.previousEndoTreatment && (
              <label className="block text-sm font-semibold text-primary">
                Retreatment reason
                <textarea value={form.retreatmentReason} onChange={(event) => setValue('retreatmentReason', event.target.value)} rows={2} className="mt-2 w-full rounded-xl border border-primary/15 bg-surface-elevated px-4 py-3 font-normal outline-none focus:border-accent" />
              </label>
            )}
            {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          </div>
          <div className="sticky bottom-0 flex justify-end gap-3 border-t border-primary/10 bg-surface px-6 py-4">
            <button type="button" onClick={onClose} disabled={creating} className="rounded-xl border border-primary/15 px-4 py-2.5 text-sm font-semibold text-secondary">Batal</button>
            <button type="button" onClick={handleSubmit} disabled={creating} className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              {creating && <Icon name="Loader2" size={16} className="animate-spin" />}
              Create Endo Case
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default CreateEndoCaseModal;
