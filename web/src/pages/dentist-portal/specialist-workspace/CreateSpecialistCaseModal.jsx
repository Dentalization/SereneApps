import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import ModalPortal from '../../../components/ui/ModalPortal';
import {
  createSpecialistCase,
  listPatientXcoreStudies,
} from '../../../services/specialistWorkspaceService';
import PatientSearchPicker from '../components/PatientSearchPicker';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

const CreateSpecialistCaseModal = ({
  isOpen,
  onClose,
  patientId = null,
  patientName = '',
  appointmentId = null,
  appointmentSummary = null,
  xcoreVerifiedCaseId = null,
  xcoreSummary = null,
}) => {
  const navigate = useNavigate();
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [xcoreStudies, setXcoreStudies] = useState([]);
  const [selectedXcoreStudy, setSelectedXcoreStudy] = useState(null);
  const [loadingXcoreStudies, setLoadingXcoreStudies] = useState(false);
  const [xcoreStudiesError, setXcoreStudiesError] = useState('');
  const [studyReloadKey, setStudyReloadKey] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedPatient(
      patientId
        ? { id: patientId, name: patientName || `Patient #${patientId}` }
        : null,
    );
    setTitle('');
    setError('');
    setCreating(false);
    setXcoreStudies([]);
    setSelectedXcoreStudy(null);
    setXcoreStudiesError('');
    setStudyReloadKey(0);
  }, [
    isOpen,
    patientId,
    patientName,
    appointmentId,
    xcoreVerifiedCaseId,
  ]);

  useEffect(() => {
    if (!isOpen || !selectedPatient?.id || xcoreVerifiedCaseId) {
      setXcoreStudies([]);
      setSelectedXcoreStudy(null);
      setLoadingXcoreStudies(false);
      return undefined;
    }

    let active = true;
    setLoadingXcoreStudies(true);
    setXcoreStudies([]);
    setXcoreStudiesError('');
    setSelectedXcoreStudy(null);
    listPatientXcoreStudies(selectedPatient.id)
      .then((studies) => {
        if (active) setXcoreStudies(studies);
      })
      .catch((requestError) => {
        if (!active) return;
        setXcoreStudies([]);
        setXcoreStudiesError(
          requestError.response?.data?.error?.message
          || 'Daftar X-Core study tidak dapat dimuat.',
        );
      })
      .finally(() => {
        if (active) setLoadingXcoreStudies(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, selectedPatient?.id, studyReloadKey, xcoreVerifiedCaseId]);

  if (!isOpen) return null;

  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    setSelectedXcoreStudy(null);
  };

  const handleCreate = async () => {
    const normalizedTitle = title.trim();
    if (!selectedPatient?.id || !normalizedTitle || creating) return;

    setCreating(true);
    setError('');
    try {
      const created = await createSpecialistCase({
        patientId: selectedPatient.id,
        originAppointmentId: appointmentId || null,
        xcoreStudyId: selectedXcoreStudy?.id || null,
        xcoreVerifiedCaseId: xcoreVerifiedCaseId || null,
        title: normalizedTitle,
        caseType: 'radiology',
      });
      onClose?.();
      navigate(`/dentist-portal/specialist-workspace/${created.id}`);
    } catch (requestError) {
      setError(
        requestError.response?.data?.error?.message
        || 'Gagal membuat Specialist Case.',
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-specialist-case-title"
      >
        <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-primary/15 bg-surface shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-primary/10 px-6 py-5">
            <div>
              <h2 id="create-specialist-case-title" className="text-xl font-bold text-primary">
                Create Specialist Case
              </h2>
              <p className="mt-1 text-sm text-secondary">
                Buat working case untuk clinical review radiologi.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={creating}
              aria-label="Tutup modal"
              className="rounded-xl p-2 text-muted hover:bg-primary/5 disabled:opacity-50"
            >
              <Icon name="X" size={18} />
            </button>
          </div>

          <div className="space-y-5 p-6">
            {patientId ? (
              <div className="rounded-2xl border border-primary/10 bg-surface-elevated p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Patient</p>
                <p className="mt-1 font-semibold text-primary">{selectedPatient?.name}</p>
                <p className="mt-1 text-xs text-secondary">#{patientId}</p>
              </div>
            ) : (
              <div>
                <p className="mb-2 text-sm font-semibold text-primary">Pilih pasien</p>
                <PatientSearchPicker
                  selectedPatient={selectedPatient}
                  onSelect={handlePatientSelect}
                />
              </div>
            )}

            {!xcoreVerifiedCaseId && (
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-primary">X-Core Study (optional)</p>
                    <p className="mt-1 text-xs text-secondary">
                      Pilih radiology study pasien ini sebagai evidence case.
                    </p>
                  </div>
                  {selectedXcoreStudy && (
                    <button
                      type="button"
                      onClick={() => setSelectedXcoreStudy(null)}
                      className="text-xs font-semibold text-accent"
                    >
                      Hapus pilihan
                    </button>
                  )}
                </div>

                {!selectedPatient?.id && (
                  <div className="mt-3 rounded-2xl border border-dashed border-primary/15 p-4 text-sm text-secondary">
                    Pilih pasien terlebih dahulu untuk melihat X-Core study.
                  </div>
                )}

                {selectedPatient?.id && loadingXcoreStudies && (
                  <div className="mt-3 flex items-center gap-2 rounded-2xl border border-primary/10 p-4 text-sm text-secondary">
                    <Icon name="Loader2" size={16} className="animate-spin" />
                    Memuat X-Core study…
                  </div>
                )}

                {selectedPatient?.id && !loadingXcoreStudies && xcoreStudiesError && (
                  <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <p>{xcoreStudiesError}</p>
                    <button
                      type="button"
                      onClick={() => setStudyReloadKey((value) => value + 1)}
                      className="mt-2 font-semibold underline"
                    >
                      Coba lagi
                    </button>
                  </div>
                )}

                {selectedPatient?.id
                  && !loadingXcoreStudies
                  && !xcoreStudiesError
                  && xcoreStudies.length === 0 && (
                    <div className="mt-3 rounded-2xl border border-dashed border-primary/15 p-4 text-sm text-secondary">
                      Tidak ada X-Core study yang dapat diakses untuk pasien ini.
                    </div>
                )}

                {xcoreStudies.length > 0 && (
                  <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
                    {xcoreStudies.map((study) => {
                      const selected = selectedXcoreStudy?.id === study.id;
                      return (
                        <button
                          key={study.id}
                          type="button"
                          onClick={() => setSelectedXcoreStudy(selected ? null : study)}
                          aria-pressed={selected}
                          className={`w-full rounded-2xl border p-4 text-left transition ${
                            selected
                              ? 'border-accent bg-accent/5'
                              : 'border-primary/10 bg-surface-elevated hover:border-accent/40'
                          }`}
                        >
                          <span className="flex items-start justify-between gap-3">
                            <span>
                              <span className="block font-semibold text-primary">
                                {study.modality} · {study.description || 'Untitled study'}
                              </span>
                              <span className="mt-1 block text-xs text-secondary">
                                {formatDate(study.studyDate)} · {study.seriesCount} series
                              </span>
                            </span>
                            <span className="rounded-full bg-primary/5 px-2.5 py-1 text-[11px] font-semibold capitalize text-secondary">
                              {study.status}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div>
              <label htmlFor="specialist-case-title" className="text-sm font-semibold text-primary">
                Case title
              </label>
              <input
                id="specialist-case-title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={240}
                placeholder="Contoh: Radiology review — tooth 36"
                className="mt-2 w-full rounded-xl border border-primary/15 bg-surface-elevated px-4 py-3 text-sm text-primary outline-none focus:border-accent"
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-primary">Case type</p>
              <span className="mt-2 inline-flex rounded-full bg-violet-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-violet-700">
                Radiology
              </span>
            </div>

            {(appointmentId || xcoreVerifiedCaseId) && (
              <div className="space-y-2 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900">
                {appointmentId && (
                  <p>
                    Linked appointment:{' '}
                    {appointmentSummary
                      ? `${formatDate(appointmentSummary.startsAt)} — ${appointmentSummary.reason || 'No reason given'}`
                      : `#${appointmentId}`}
                  </p>
                )}
                {xcoreVerifiedCaseId && (
                  <p>
                    Linked X-Core evidence:{' '}
                    {xcoreSummary
                      ? `${xcoreSummary.title || 'Verified X-Core case'} (${xcoreSummary.status || 'verified'})`
                      : xcoreVerifiedCaseId}
                  </p>
                )}
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-primary/10 px-6 py-5">
            <button
              type="button"
              onClick={onClose}
              disabled={creating}
              className="rounded-xl border border-primary/15 px-4 py-2.5 text-sm font-semibold text-secondary disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!selectedPatient?.id || !title.trim() || creating}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating && <Icon name="Loader2" size={15} className="animate-spin" />}
              {creating ? 'Membuat…' : 'Create Case'}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default CreateSpecialistCaseModal;
