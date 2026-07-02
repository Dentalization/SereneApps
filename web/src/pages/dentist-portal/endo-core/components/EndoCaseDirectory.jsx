import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import Icon from '../../../../components/AppIcon';
import { listEndoCases } from '../../../../services/endoCoreService';
import CreateEndoCaseModal from './CreateEndoCaseModal';

const statusStyles = {
  draft: 'bg-slate-100 text-slate-700',
  active: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-amber-100 text-amber-700',
};

const formatDate = (value) => value
  ? new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
  : '—';

const EndoCaseDirectory = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [cases, setCases] = useState([]);
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(Boolean(searchParams.get('patientId')));

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setCases(await listEndoCases());
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Endo-Core belum dapat dimuat.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (searchParams.get('patientId')) setCreateOpen(true);
  }, [searchParams]);

  const visible = useMemo(
    () => status === 'all' ? cases : cases.filter((record) => record.status === status),
    [cases, status],
  );
  const closeCreate = () => {
    setCreateOpen(false);
    if (searchParams.toString()) setSearchParams({}, { replace: true });
  };

  return (
    <div className="max-w-[1600px] mx-auto pb-10 space-y-6">
      <header className="bg-surface border border-primary/10 rounded-3xl shadow-theme-sm p-8 mb-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-accent">Specialist Workspace</p>
            <h1 className="text-3xl font-bold text-primary tracking-tight mt-1">Endo-Core</h1>
            <p className="text-secondary mt-1 text-lg">Endodontic case workspace</p>
          </div>
          <button type="button" onClick={() => setCreateOpen(true)} className="group relative bg-accent hover:bg-accent/90 text-white px-6 py-3.5 rounded-xl font-semibold text-sm shadow-lg shadow-accent/30 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-3">
            <Icon name="Plus" size={17} />
            <span>Create Endo Case</span>
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {['draft', 'active', 'completed', 'archived'].map((item) => (
            <button key={item} type="button" onClick={() => setStatus(status === item ? 'all' : item)} className="rounded-2xl border border-primary/10 bg-surface-elevated p-4 text-left">
              <span className="block text-2xl font-bold text-primary">{cases.filter((record) => record.status === item).length}</span>
              <span className="text-xs font-semibold capitalize text-secondary">{item}</span>
            </button>
          ))}
        </div>
      </header>

      <section className="rounded-3xl border border-primary/10 bg-surface p-6 shadow-theme-sm">
        <div className="mb-5 flex items-center justify-between gap-3 border-b border-primary/10 pb-4">
          <p className="text-sm font-semibold text-primary">{status === 'all' ? 'All Endo Cases' : `${status} cases`}</p>
          <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-2 text-sm font-semibold text-secondary hover:text-accent disabled:opacity-60">
            <Icon name="RefreshCw" size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
        {loading && <div className="p-12 text-center text-sm text-secondary">Memuat Endo Cases…</div>}
        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
            <p>{error}</p>
            <button type="button" onClick={load} className="mt-2 font-semibold underline">Coba lagi</button>
          </div>
        )}
        {!loading && !error && visible.length === 0 && (
          <div className="rounded-2xl border border-dashed border-primary/15 bg-surface-elevated p-12 text-center">
            <Icon name="Activity" size={34} className="mx-auto text-muted" />
            <p className="mt-3 font-semibold text-primary">Belum ada Endo Case</p>
            <p className="mt-1 text-sm text-secondary">Buat case pertama dengan pasien, gigi FDI, dan chief complaint.</p>
          </div>
        )}
        {!loading && !error && visible.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((record) => (
              <button
                key={record.id}
                type="button"
                onClick={() => navigate(`/dentist-portal/endo-core/${record.id}`)}
                className="group flex flex-col justify-between rounded-2xl border border-primary/10 bg-surface-elevated p-5 text-left transition duration-300 hover:border-accent/40 hover:shadow-theme-md hover:-translate-y-0.5"
              >
                <div className="w-full space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="px-3 py-1.5 rounded-xl bg-accent/5 text-accent group-hover:bg-accent/15 transition duration-300 font-bold text-xs">
                      FDI {record.endo?.toothNumber || '—'}
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusStyles[record.status] || statusStyles.draft}`}>
                      {record.status}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-primary text-base group-hover:text-accent transition truncate" title={record.title}>
                      {record.title}
                    </h3>
                    <p className="text-xs text-secondary mt-1.5 flex items-center gap-1 font-medium">
                      <Icon name="User" size={13} className="text-muted" />
                      <span>{record.patient?.name || 'Patient unavailable'}</span>
                    </p>
                    <p className="text-xs text-secondary mt-1 flex items-center gap-1">
                      <Icon name="Calendar" size={13} className="text-muted" />
                      <span>Diperbarui {formatDate(record.updatedAt)}</span>
                    </p>
                    {record.hasXcoreEvidence && (
                      <div className="mt-2.5 flex items-center gap-1 text-[10px] font-bold text-violet-700 bg-violet-50 rounded px-1.5 py-0.5 w-fit">
                        <Icon name="ScanLine" size={10} />
                        <span>X-CORE LINKED</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <CreateEndoCaseModal
        isOpen={createOpen}
        onClose={closeCreate}
        patientId={searchParams.get('patientId')}
        patientName={location.state?.patientName || ''}
        appointmentId={searchParams.get('appointmentId')}
      />
    </div>
  );
};

export default EndoCaseDirectory;
