import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import SideBar from '../ui/SideBar';
import { listSpecialistCases } from '../../../services/specialistWorkspaceService';
import CreateSpecialistCaseModal from './CreateSpecialistCaseModal';

const statusStyles = {
  draft: 'bg-slate-100 text-slate-700',
  active: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-amber-100 text-amber-700',
};

const statusOptions = ['all', 'draft', 'active', 'completed', 'archived'];

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

const CaseDirectory = () => {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const loadCases = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const records = await listSpecialistCases({ caseType: 'radiology' });
      setCases(records);
    } catch (requestError) {
      setError(
        requestError.response?.data?.error?.message
        || 'Specialist Workspace belum dapat dimuat.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  const visibleCases = useMemo(
    () => (status === 'all' ? cases : cases.filter((caseRecord) => caseRecord.status === status)),
    [cases, status],
  );

  return (
    <div className="flex h-screen overflow-hidden theme-transition bg-background">
      <SideBar />
      <main className="flex-1 p-4 md:p-8 overflow-y-auto scroll-smooth custom-scrollbar bg-background">
        <div className="max-w-[1600px] mx-auto pb-10 space-y-6">
          <header className="bg-surface border border-primary/10 rounded-3xl shadow-theme-sm p-8 mb-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div>
                <h1 className="text-3xl font-bold text-primary tracking-tight">Specialist Workspace</h1>
                <p className="text-secondary mt-1 text-lg">Kelola radiology-linked working cases. EMR dan X-Core tetap menjadi sumber data klinis terpisah.</p>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className="group relative bg-accent hover:bg-accent/90 text-white px-6 py-3.5 rounded-xl font-semibold text-sm shadow-lg shadow-accent/30 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-3"
              >
                <Icon name="UserSearch" size={17} />
                <span>Pilih Pasien untuk Buat Case</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Cases', value: cases.length, icon: 'Folder' },
                { label: 'Active Cases', value: cases.filter(c => c.status === 'active').length, icon: 'Activity' },
                { label: 'Completed Cases', value: cases.filter(c => c.status === 'completed').length, icon: 'CheckCircle' },
                { label: 'Draft Cases', value: cases.filter(c => c.status === 'draft').length, icon: 'FileText' }
              ].map((stat, index) => (
                <div key={index} className="bg-gradient-to-br from-surface-elevated to-surface rounded-2xl p-5 border border-primary/10 shadow-sm relative overflow-hidden group">
                  <div className="absolute -right-3 -top-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Icon name={stat.icon} size={48} className="text-primary" />
                  </div>
                  <div className="relative z-10">
                    <div className="p-2 w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-3">
                      <Icon name={stat.icon} size={20} />
                    </div>
                    <div className="text-3xl font-bold text-primary tracking-tight">{stat.value}</div>
                    <div className="text-sm font-medium text-secondary mt-1">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </header>

          <section className="rounded-3xl border border-primary/10 bg-surface p-6 shadow-theme-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-primary/10 mb-6">
              <div className="flex flex-wrap gap-2" aria-label="Filter case berdasarkan status">
                {statusOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setStatus(option)}
                    className={`rounded-xl px-4 py-2 text-xs font-semibold capitalize transition ${status === option
                      ? 'bg-accent text-white shadow-sm'
                      : 'bg-primary/5 text-secondary hover:bg-primary/10 hover:text-primary'
                      }`}
                  >
                    {option === 'all' ? 'Semua' : option}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={loadCases}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/10 hover:bg-primary/5 text-sm font-semibold text-secondary hover:text-primary transition disabled:opacity-50"
              >
                <Icon name="RefreshCw" size={14} className={loading ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
            </div>

            {loading && (
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-surface-elevated p-12 text-sm text-secondary">
                <Icon name="Loader2" size={20} className="animate-spin text-accent" />
                Memuat Specialist Cases…
              </div>
            )}

            {!loading && error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
                <p>{error}</p>
                <button type="button" onClick={loadCases} className="mt-3 font-semibold underline text-accent">
                  Coba lagi
                </button>
              </div>
            )}

            {!loading && !error && visibleCases.length === 0 && (
              <div className="rounded-2xl border border-dashed border-primary/15 bg-surface-elevated p-12 text-center">
                <Icon name="FolderSearch" size={36} className="mx-auto text-secondary/40 mb-3" />
                <p className="font-semibold text-primary">Belum ada Specialist Case</p>
                <p className="mt-1 text-sm text-secondary">
                  {status === 'all'
                    ? 'Pilih pasien untuk membuat radiology case pertama.'
                    : `Tidak ada case dengan status ${status}.`}
                </p>
              </div>
            )}

            {!loading && !error && visibleCases.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visibleCases.map((caseRecord) => (
                  <button
                    key={caseRecord.id}
                    type="button"
                    onClick={() => navigate(`/dentist-portal/specialist-workspace/${caseRecord.id}`)}
                    className="group flex flex-col justify-between rounded-2xl border border-primary/10 bg-surface-elevated p-5 text-left transition duration-300 hover:border-accent/40 hover:shadow-theme-md hover:-translate-y-0.5"
                  >
                    <div className="w-full space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="p-2.5 rounded-xl bg-accent/5 text-accent group-hover:bg-accent/15 transition duration-300">
                          <Icon name="Folder" size={20} />
                        </div>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusStyles[caseRecord.status] || statusStyles.draft}`}>
                          {caseRecord.status}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-primary text-base group-hover:text-accent transition truncate" title={caseRecord.title}>
                          {caseRecord.title}
                        </h3>
                        <p className="text-xs text-secondary mt-1.5 flex items-center gap-1 font-medium">
                          <Icon name="User" size={12} className="text-secondary/70" />
                          <span>{caseRecord.patient?.name || 'Nama pasien tidak tersedia'}</span>
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted">#{caseRecord.patientId}</p>
                      </div>
                    </div>

                    <div className="w-full mt-4 pt-3 border-t border-primary/5 flex items-center justify-between text-[11px] text-secondary">
                      <span className="font-medium">Radiology Case</span>
                      <span className="font-mono text-secondary/80">{formatDate(caseRecord.updatedAt)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
      <CreateSpecialistCaseModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </div>
  );
};

export default CaseDirectory;
