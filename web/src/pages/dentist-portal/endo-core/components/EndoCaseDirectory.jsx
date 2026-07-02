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
    <div className="mx-auto max-w-[1600px] space-y-6 pb-10">
      <header className="rounded-3xl border border-primary/10 bg-surface p-7 shadow-theme-sm">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-accent">Specialist Workspace</p>
            <h1 className="mt-1 text-3xl font-bold text-primary">Endo-Core</h1>
            <p className="mt-2 text-secondary">Endodontic case workspace</p>
          </div>
          <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white">
            <Icon name="Plus" size={17} />
            Create Endo Case
          </button>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-4">
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
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((record) => (
              <article key={record.id} className="rounded-2xl border border-primary/10 bg-surface-elevated p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-xl bg-accent/10 px-3 py-2 text-sm font-bold text-accent">FDI {record.endo?.toothNumber}</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[record.status] || statusStyles.draft}`}>{record.status}</span>
                </div>
                <h2 className="mt-4 truncate text-lg font-bold text-primary">{record.title}</h2>
                <p className="mt-1 text-sm text-secondary">{record.patient?.name || 'Patient unavailable'}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  {record.hasXcoreEvidence && <span className="rounded-full bg-violet-100 px-2.5 py-1 font-semibold text-violet-700">X-Core linked</span>}
                  {record.endo?.difficultyLevel && <span className="rounded-full bg-primary/5 px-2.5 py-1 font-semibold text-secondary">Difficulty: {record.endo.difficultyLevel}</span>}
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-primary/10 pt-4">
                  <span className="text-xs text-muted">{formatDate(record.updatedAt)}</span>
                  <button type="button" onClick={() => navigate(`/dentist-portal/endo-core/${record.id}`)} className="text-sm font-semibold text-accent">Open Case</button>
                </div>
              </article>
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
