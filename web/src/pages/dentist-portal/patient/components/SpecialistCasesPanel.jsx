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
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [error, setError] = useState('');

  const loadCases = useCallback(async () => {
    if (!patient?.id) return;
    setLoading(true);
    setError('');
    try {
      const records = await listSpecialistCases({
        patientId: patient.id,
        caseType: 'radiology',
      });
      setCases(records);
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
    <section className="space-y-5 rounded-3xl border border-primary/10 bg-surface p-6 shadow-theme-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-accent">Clinical workspace</p>
          <h2 className="mt-1 text-2xl font-bold text-primary">Specialist Cases</h2>
          <p className="mt-1 text-sm text-secondary">
            Working case untuk review radiologi. EMR dan X-Core tetap menjadi sumber terpisah.
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

      {!loading && !error && cases.length === 0 && (
        <div className="rounded-2xl border border-dashed border-primary/15 bg-surface-elevated p-8 text-center">
          <Icon name="FolderSearch" size={28} className="mx-auto text-muted" />
          <p className="mt-3 font-semibold text-primary">Belum ada Specialist Case</p>
          <p className="mt-1 text-sm text-secondary">Buat case radiologi dari konteks pasien ini.</p>
        </div>
      )}

      {!loading && cases.length > 0 && (
        <div className="grid gap-3">
          {cases.map((caseRecord) => (
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
