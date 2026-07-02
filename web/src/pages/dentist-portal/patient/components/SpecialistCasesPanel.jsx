import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../../components/AppIcon';
import { listSpecialistCases } from '../../../../services/specialistWorkspaceService';
import CreateSpecialistCaseModal from '../../specialist-workspace/CreateSpecialistCaseModal';

const statusStyles = {
  draft: 'bg-slate-100 text-slate-700',
  active: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-amber-100 text-amber-700',
};

const SpecialistCasesPanel = ({ patient }) => {
  const navigate = useNavigate();
  const [radiologyCases, setRadiologyCases] = useState([]);
  const [endoCases, setEndoCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [error, setError] = useState('');

  const loadCases = useCallback(async () => {
    if (!patient?.id) return;
    setLoading(true);
    setError('');
    try {
      const [radRes, endoRes] = await Promise.all([
        listSpecialistCases({ patientId: patient.id, caseType: 'radiology' }),
        listSpecialistCases({ patientId: patient.id, caseType: 'endodontic' }),
      ]);
      setRadiologyCases(radRes);
      setEndoCases(endoRes.filter((c) => c.status !== 'archived'));
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Specialist Cases belum dapat dimuat.');
    } finally {
      setLoading(false);
    }
  }, [patient?.id]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  if (!patient) return null;

  const candidateAppointments = (patient.appointments || []).filter(
    (item) => !['cancelled', 'no-show'].includes(item.status),
  );
  const appointment = candidateAppointments.length === 1 ? candidateAppointments[0] : null;

  return (
    <section className="space-y-6 rounded-3xl border border-primary/10 bg-surface p-6 shadow-theme-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-accent">Clinical workspace</p>
          <h2 className="mt-1 text-2xl font-bold text-primary">Specialist Cases</h2>
          <p className="mt-1 text-sm text-secondary">
            Manage radiology and endodontic cases from this patient context.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams({
                patientId: String(patient.id),
                ...(appointment?.id ? { appointmentId: String(appointment.id) } : {}),
              });
              navigate(`/dentist-portal/endo-core?${params.toString()}`, {
                state: { patientName: patient.name || '' },
              });
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-4 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent/20"
          >
            <Icon name="Activity" size={16} />
            Create Endo Case
          </button>
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90"
          >
            <Icon name="Plus" size={16} />
            Create Specialist Case
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 rounded-2xl bg-surface-elevated p-4 text-sm text-secondary">
          <Icon name="Loader2" size={16} className="animate-spin" />
          Memuat Specialist Cases…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <button type="button" onClick={loadCases} className="ml-2 font-semibold underline">
            Coba lagi
          </button>
        </div>
      )}

      {/* Radiology Specialist Cases Section */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-primary">Radiology Specialist Cases</h3>
        {!loading && !error && radiologyCases.length === 0 && (
          <div className="rounded-2xl border border-dashed border-primary/15 bg-surface-elevated p-6 text-center">
            <Icon name="FolderSearch" size={24} className="mx-auto text-muted" />
            <p className="mt-2 text-sm font-semibold text-primary">Belum ada Radiology Case</p>
            <p className="mt-0.5 text-xs text-secondary">Buat case radiologi dari konteks pasien ini.</p>
          </div>
        )}
        {!loading && radiologyCases.length > 0 && (
          <div className="grid gap-3">
            {radiologyCases.map((caseRecord) => (
              <button
                key={caseRecord.id}
                type="button"
                onClick={() => navigate(`/dentist-portal/specialist-workspace/${caseRecord.id}`)}
                className="flex w-full items-center justify-between gap-4 rounded-2xl border border-primary/10 bg-surface-elevated p-4 text-left transition hover:border-accent/30 hover:shadow-theme-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-primary">{caseRecord.title}</p>
                  <p className="mt-1 text-xs text-secondary">
                    Radiology · diperbarui {new Date(caseRecord.updatedAt).toLocaleDateString('id-ID')}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyles[caseRecord.status] || statusStyles.draft}`}>
                  {caseRecord.status}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Endo-Core Cases Section */}
      <div className="border-t border-primary/10 pt-5 space-y-3">
        <h3 className="text-base font-bold text-primary">Endo-Core Cases</h3>
        {!loading && !error && endoCases.length === 0 && (
          <div className="rounded-2xl border border-dashed border-primary/15 bg-surface-elevated p-6 text-center">
            <Icon name="Activity" size={24} className="mx-auto text-muted" />
            <p className="mt-2 text-sm font-semibold text-primary">Belum ada Endo-Core Case</p>
            <p className="mt-0.5 text-xs text-secondary">Buat case endodontik dari konteks pasien ini.</p>
          </div>
        )}
        {!loading && endoCases.length > 0 && (
          <div className="grid gap-3">
            {endoCases.map((caseRecord) => (
              <div
                key={caseRecord.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-primary/10 bg-surface-elevated p-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-primary flex flex-wrap items-center gap-2">
                    {caseRecord.title}
                    {(caseRecord.xcoreStudyId || caseRecord.xcoreVerifiedCaseId) && (
                      <span className="inline-flex items-center gap-1 rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                        <Icon name="ScanLine" size={10} /> X-Core Linked
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-secondary">
                    Tooth FDI {caseRecord.toothNumber || '—'} · diperbarui {new Date(caseRecord.updatedAt).toLocaleDateString('id-ID')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyles[caseRecord.status] || statusStyles.draft}`}>
                    {caseRecord.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate(`/dentist-portal/endo-core/${caseRecord.id}`)}
                    className="rounded-xl bg-accent/10 px-3 py-1.5 text-xs font-bold text-accent hover:bg-accent/20"
                  >
                    Open Case
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateSpecialistCaseModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        patientId={patient.id}
        patientName={patient.name}
        appointmentId={appointment?.id || null}
        appointmentSummary={appointment
          ? { startsAt: appointment.startsAt, reason: appointment.reason }
          : null}
      />
    </section>
  );
};

export default SpecialistCasesPanel;
