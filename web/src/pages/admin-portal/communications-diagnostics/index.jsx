import React, { useCallback, useEffect, useRef, useState } from 'react';
import AdminSideBar from '../ui/sidebar-admin';
import AppIcon from '../../../components/AppIcon';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { useToast } from '../../../contexts/ToastContext';
import {
  exportCommunicationAudit,
  fetchCommunicationDiagnostics,
  fetchOperationalCommunicationDiagnostics,
  reconcileCommunicationDiagnostics
} from '../../../services/chatService';
import { BUCKET_BADGE, STATUS_TONE, describeError } from './diagnosticsConstants';

const POLL_INTERVAL_MS = 15000;

function toneForDiagnostics(diagnostics) {
  if (!diagnostics) return 'warning';
  if (diagnostics.inconsistencies?.some((item) => item.severity === 'error')) return 'error';
  if (diagnostics.inconsistencies?.length) return 'warning';
  return 'healthy';
}

function getInitialAppointmentId() {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('appointmentId') || '';
}

function getRequestErrorCode(error) {
  return error?.response?.data?.error?.code || (!error?.response ? 'NETWORK_ERROR' : null);
}

export default function AppointmentDiagnosticsDashboard() {
  const { toast } = useToast();
  const [appointmentId, setAppointmentId] = useState(getInitialAppointmentId);
  const [diagnostics, setDiagnostics] = useState(null);
  const [operational, setOperational] = useState(null);
  const [filters, setFilters] = useState({ status: 'all', bucket: 'all' });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [confirmReconcileOpen, setConfirmReconcileOpen] = useState(false);
  const pollRef = useRef(null);
  const initialLoadStartedRef = useRef(false);

  const load = useCallback(async (idOverride) => {
    const targetId = String(idOverride ?? appointmentId).trim();
    if (!targetId) return;
    setStatus('loading');
    setError('');
    try {
      const result = await fetchCommunicationDiagnostics(targetId);
      setDiagnostics(result);
      setLastRefreshedAt(new Date());

      const url = new URL(window.location.href);
      url.searchParams.set('appointmentId', targetId);
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    } catch (err) {
      setError(describeError(getRequestErrorCode(err), 'Failed to load diagnostics.'));
    } finally {
      setStatus('idle');
    }
  }, [appointmentId]);

  useEffect(() => {
    if (initialLoadStartedRef.current) return;
    initialLoadStartedRef.current = true;
    const initialId = getInitialAppointmentId();
    if (initialId) load(initialId);
  }, [load]);

  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    if (autoRefresh && diagnostics?.appointmentId) {
      pollRef.current = setInterval(() => {
        load(diagnostics.appointmentId);
      }, POLL_INTERVAL_MS);
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [autoRefresh, diagnostics?.appointmentId, load]);

  const handleAppointmentIdKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      load();
    }
  };

  const loadOperational = async () => {
    setStatus('loading');
    setError('');
    try {
      setOperational(await fetchOperationalCommunicationDiagnostics({ ...filters, limit: 50 }));
    } catch (err) {
      setError(describeError(getRequestErrorCode(err), 'Failed to load operational diagnostics.'));
    } finally {
      setStatus('idle');
    }
  };

  const jumpToAppointment = (id) => {
    setAppointmentId(String(id));
    load(String(id));
  };

  const requestReconcile = () => {
    if (!diagnostics?.appointmentId) return;
    setConfirmReconcileOpen(true);
  };

  const reconcile = async () => {
    if (!diagnostics?.appointmentId) return;
    setStatus('reconciling');
    setError('');
    try {
      const result = await reconcileCommunicationDiagnostics(diagnostics.appointmentId);
      setDiagnostics(result.diagnostics);
      setLastRefreshedAt(new Date());
      if (result.skipped) {
        toast.info(`Reconciliation skipped for appointment #${diagnostics.appointmentId}. The appointment is not currently safe to reconcile.`);
      } else {
        toast.success(`Reconciliation complete. Diagnostics refreshed for appointment #${diagnostics.appointmentId}.`);
      }
    } catch (err) {
      const message = describeError(getRequestErrorCode(err), 'Reconciliation failed.');
      setError(message);
      toast.error(`Reconciliation failed. ${message}`);
    } finally {
      setStatus('idle');
      setConfirmReconcileOpen(false);
    }
  };

  const tone = toneForDiagnostics(diagnostics);

  const downloadAudit = async (format = 'csv') => {
    if (!diagnostics?.appointmentId) return;
    try {
      const blob = await exportCommunicationAudit(diagnostics.appointmentId, format);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `communication-audit-${diagnostics.appointmentId}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Communication audit exported as ${format.toUpperCase()}.`);
    } catch (err) {
      const message = describeError(getRequestErrorCode(err), 'Audit export failed.');
      setError(message);
      toast.error(`Export failed. ${message}`);
    }
  };

  return (
    <div className="flex min-h-screen bg-background theme-transition">
      <div className="hidden lg:block flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
        <AdminSideBar />
      </div>

      <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 md:p-8 pb-4">
          <section className="admin-page-header space-y-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-3xl p-5 md:p-8 border border-blue-100 dark:border-blue-800/30">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                  Diagnostics Control
                </p>
                <h1 className="text-2xl font-bold text-primary">
                  Communication Diagnostics
                </h1>
                <p className="text-sm text-secondary max-w-2xl">
                  Internal appointment health, Twilio projection status, webhook receipts, and safe reconciliation tools.
                </p>
                {lastRefreshedAt && (
                  <p className="text-xs text-secondary flex items-center gap-1.5">
                    <AppIcon name="Clock" size={12} />
                    Last refreshed: {lastRefreshedAt.toLocaleTimeString()}
                    {autoRefresh && <span className="text-emerald-600 font-semibold">• Live</span>}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={filters.status}
                  onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
                  className="rounded-xl border border-border/40 bg-surface px-3 py-2 text-sm text-secondary focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                >
                  <option value="all">All status</option>
                  <option value="ready">Ready</option>
                  <option value="pending">Pending</option>
                  <option value="provisioning_failed">Provisioning failed</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                </select>
                <select
                  value={filters.bucket}
                  onChange={(event) => setFilters((current) => ({ ...current, bucket: event.target.value }))}
                  className="rounded-xl border border-border/40 bg-surface px-3 py-2 text-sm text-secondary focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                >
                  <option value="all">All buckets</option>
                  <option value="healthy">Healthy</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                  <option value="info">Info</option>
                </select>
                <button
                  onClick={loadOperational}
                  disabled={status === 'loading'}
                  className="inline-flex items-center gap-2 rounded-xl border border-border/40 bg-surface px-4 py-2 text-sm font-semibold text-secondary hover:text-primary transition disabled:opacity-50"
                >
                  <AppIcon name="Activity" size={15} />
                  <span>Ops Dashboard</span>
                </button>
                <div className="relative">
                  <input
                    value={appointmentId}
                    onChange={(event) => setAppointmentId(event.target.value)}
                    onKeyDown={handleAppointmentIdKeyDown}
                    placeholder="Enter Appointment ID"
                    aria-label="Appointment ID"
                    className="w-56 rounded-xl border border-border/40 bg-surface pl-4 pr-10 py-2 text-sm text-primary placeholder-muted focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                  />
                  <span className="absolute right-3 top-2.5 text-muted">
                    <AppIcon name="Hash" size={14} />
                  </span>
                </div>
                <button
                  onClick={() => load()}
                  disabled={status === 'loading'}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent hover:bg-accent/90 px-4 py-2 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50"
                >
                  <AppIcon name={status === 'loading' ? 'Loader2' : 'Search'} size={15} className={status === 'loading' ? 'animate-spin' : ''} />
                  <span>Check Health</span>
                </button>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-secondary cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(event) => setAutoRefresh(event.target.checked)}
                    disabled={!diagnostics}
                    className="rounded border-border/40 text-accent focus:ring-accent disabled:opacity-50"
                  />
                  Auto-refresh (15s)
                </label>
              </div>
            </div>
          </section>
        </div>

        <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-8 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="flex items-start gap-3">
                <AppIcon name="AlertCircle" size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-primary">Diagnostics Error</p>
                  <p className="text-xs text-secondary mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {operational && (
            <section className="rounded-2xl border border-border/40 bg-surface p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/40">
                <div>
                  <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
                    <AppIcon name="Activity" size={18} className="text-accent" />
                    Operational Overview
                  </h2>
                  <p className="text-sm text-secondary mt-0.5">Replay counters, provisioning retries, and filtered inconsistency buckets.</p>
                </div>
                <div className="text-xs font-semibold text-secondary uppercase tracking-wider bg-primary/5 px-2.5 py-1 rounded">No Secrets Displayed</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatusCard title="Webhook Replay Counters" rows={operational.replayCounters} />
                <StatusCard title="Active Filters" rows={operational.filters} />
                <StatusCard title="Provisioning Retries" rows={{ retries: operational.provisioningRetries }} />
              </div>

              <div className="overflow-hidden border border-border/40 rounded-xl bg-surface">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-elevated text-xs font-bold uppercase tracking-wider text-secondary border-b border-border/40">
                      <tr>
                        <th className="px-5 py-3.5">Appointment ID</th>
                        <th className="px-5 py-3.5">Flow Status</th>
                        <th className="px-5 py-3.5">Error Bucket</th>
                        <th className="px-5 py-3.5">Linked SIDs</th>
                        <th className="px-5 py-3.5 text-right">Messages</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {(operational.rows || []).map((row) => {
                        const bucketKey = String(row.bucket || '').toLowerCase();
                        return (
                          <tr key={row.appointmentId} className="hover:bg-surface-elevated/40 transition">
                            <td className="px-5 py-4 font-semibold">
                              <button
                                type="button"
                                onClick={() => jumpToAppointment(row.appointmentId)}
                                className="text-accent hover:underline focus:outline-none"
                                aria-label={`Load diagnostics for appointment ${row.appointmentId}`}
                              >
                                #{row.appointmentId}
                              </button>
                            </td>
                            <td className="px-5 py-4 text-primary font-medium">
                              {row.status} / {row.commStatus}
                            </td>
                            <td className="px-5 py-4">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${BUCKET_BADGE[bucketKey] || 'bg-slate-500/10 text-secondary border border-border/40'}`}>
                                {row.bucket}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-secondary font-mono text-xs">
                              <span className={`inline-flex items-center gap-1 mr-3 ${row.conversationSidPresent ? 'text-emerald-600' : 'text-secondary/50'}`}>
                                <AppIcon name={row.conversationSidPresent ? 'CheckCircle' : 'X'} size={12} />
                                Chat
                              </span>
                              <span className={`inline-flex items-center gap-1 ${row.videoRoomSidPresent ? 'text-emerald-600' : 'text-secondary/50'}`}>
                                <AppIcon name={row.videoRoomSidPresent ? 'CheckCircle' : 'X'} size={12} />
                                Video
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right font-semibold text-primary">{row.localMessageCount}</td>
                          </tr>
                        );
                      })}
                      {(operational.rows || []).length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-5 py-8 text-center text-secondary italic">No operational records match selected filters.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {status === 'loading' && !diagnostics ? (
            <DashboardSkeleton />
          ) : !diagnostics ? (
            <div className="mt-8 rounded-2xl border border-border/40 bg-surface p-12 text-center shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-4 text-accent">
                <AppIcon name="Activity" size={28} />
              </div>
              <h3 className="text-lg font-semibold text-primary">No diagnostics loaded</h3>
              <p className="mt-2 text-sm text-secondary max-w-sm mx-auto">
                Enter an appointment ID in the dashboard header above to inspect live communication health, Twilio resources, and audit timeline records.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              <section className={`rounded-2xl border p-6 shadow-sm ${STATUS_TONE[tone] || STATUS_TONE.healthy}`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-primary/5">
                      <AppIcon name="Activity" size={24} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">Appointment ID: #{diagnostics.appointmentId}</h2>
                      <p className="text-sm opacity-80 mt-0.5">Expected Twilio Room: <span className="font-mono font-semibold">{diagnostics.expectedRoomName}</span></p>
                    </div>
                  </div>
                  <CopyButton text={String(diagnostics.appointmentId)} label="Copy ID" size="lg" />
                </div>
              </section>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <StatusCard title="Appointment Status" rows={diagnostics.status} />
                <StatusCard title="Readiness Check" rows={diagnostics.readiness} />
                <StatusCard title="Allocated Resources" rows={diagnostics.resources} copyable />
              </div>

              <section className="rounded-2xl border border-border/40 bg-surface p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-primary flex items-center gap-2">
                      <AppIcon name="RefreshCw" size={16} className="text-accent" />
                      Reconciliation control plane
                    </h2>
                    <p className="text-sm text-secondary mt-1 max-w-2xl">
                      Idempotent repair engine: scans configurations and safely re-provisions missing Twilio chats or video rooms.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex rounded-xl border border-border/40 bg-surface shadow-sm overflow-hidden">
                      <button
                        type="button"
                        onClick={() => downloadAudit('csv')}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-secondary hover:text-primary transition border-r border-border/40"
                      >
                        <AppIcon name="Download" size={15} />
                        <span>Export CSV</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadAudit('json')}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-secondary hover:text-primary transition"
                      >
                        <span>JSON</span>
                      </button>
                    </div>
                    <button
                      onClick={requestReconcile}
                      disabled={status === 'reconciling' || diagnostics.status?.appointment === 'cancelled'}
                      className="inline-flex items-center gap-2 rounded-xl bg-accent hover:bg-accent/90 px-4 py-2 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50"
                    >
                      <AppIcon name={status === 'reconciling' ? 'Loader2' : 'Settings'} size={15} className={status === 'reconciling' ? 'animate-spin' : ''} />
                      <span>Run Reconciliation</span>
                    </button>
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <ListCard title="Participants" items={diagnostics.participants} itemType="participant" />
                <StatusCard title="Chat Projection" rows={diagnostics.projection} />
                <ListCard title="Webhook Receipts" items={diagnostics.webhookReceipts} itemType="webhookReceipt" />
                <ListCard title="Outbox Attempts" items={diagnostics.outbox} itemType="outboxAttempt" />
                <StatusCard title="Operational Counters" rows={diagnostics.operational} />
              </div>

              {diagnostics.inconsistencies?.length > 0 && (
                <section className="rounded-2xl border border-rose-200 bg-rose-50/50 dark:border-rose-900/30 dark:bg-rose-950/10 p-6 shadow-sm">
                  <h2 className="text-base font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-2">
                    <AppIcon name="AlertTriangle" size={18} />
                    Detected system inconsistencies
                  </h2>
                  <div className="mt-4 space-y-2">
                    {diagnostics.inconsistencies.map((item) => (
                      <div key={item.code} className="flex items-start gap-2.5 text-sm text-rose-900 dark:text-rose-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 flex-shrink-0" />
                        <p>
                          <span className="font-semibold font-mono text-xs bg-rose-100 dark:bg-rose-900/40 px-1.5 py-0.5 rounded mr-1.5">{item.code}</span>
                          {item.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="rounded-2xl border border-border/40 bg-surface p-6 shadow-sm">
                <h2 className="text-base font-semibold text-primary pb-3 border-b border-border/40 mb-6 flex items-center gap-2">
                  <AppIcon name="History" size={18} className="text-accent" />
                  Audit Timeline Log
                </h2>
                {diagnostics.timeline && diagnostics.timeline.length > 0 ? (
                  <div className="relative pl-6 border-l-2 border-border/60 ml-3 space-y-6">
                    {diagnostics.timeline.map((event) => (
                      <div key={event.id} className="relative group">
                        {/* Visual Bullet dot */}
                        <span className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-surface border-2 border-accent transition-colors group-hover:bg-accent flex-shrink-0">
                          <span className="h-1.5 w-1.5 rounded-full bg-accent group-hover:bg-surface" />
                        </span>
                        <div className="flex flex-col gap-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold text-sm text-primary">{event.eventType}</span>
                            <span className="text-xs text-secondary bg-surface-elevated px-2 py-0.5 rounded border border-border/10 font-medium">
                              {new Date(event.occurredAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-secondary">
                            Actor: <span className="font-semibold text-primary capitalize">{event.actorRole || 'system'}</span> •
                            Provider: <span className="font-semibold text-primary">{event.provider || 'local'}</span>
                            {event.providerSid && (
                              <>
                                {' '}• SID:{' '}
                                <span className="font-mono bg-primary/5 px-1 rounded select-all text-primary">{event.providerSid}</span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <AppIcon name="Inbox" size={24} className="text-secondary/40 mb-2" />
                    <p className="text-sm text-secondary">No timeline events recorded.</p>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={confirmReconcileOpen}
        title="Run safe reconciliation?"
        description={`This will scan appointment #${diagnostics?.appointmentId || ''} and re-provision any missing Twilio chat or video resources. The operation is idempotent, but may change provider state.`}
        confirmLabel="Run Reconciliation"
        busy={status === 'reconciling'}
        onConfirm={reconcile}
        onCancel={() => setConfirmReconcileOpen(false)}
      />
    </div>
  );
}

function CopyButton({ text, label = 'Copy', size = 'sm' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sizeClasses = size === 'lg'
    ? 'gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold'
    : 'gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded';

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? `${label} — copied` : label}
      className={`inline-flex flex-shrink-0 items-center whitespace-nowrap transition-all ${sizeClasses} ${copied
        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
        : 'bg-primary/5 text-secondary hover:bg-primary/10 hover:text-primary'
        }`}
    >
      <AppIcon name={copied ? 'Check' : 'Copy'} size={size === 'lg' ? 14 : 10} />
      <span>{copied ? 'Copied' : label}</span>
    </button>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mt-6 space-y-5 animate-pulse" aria-label="Loading diagnostics" role="status">
      <div className="h-24 rounded-2xl bg-surface-elevated border border-border/40" />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-48 rounded-2xl bg-surface-elevated border border-border/40" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-64 rounded-2xl bg-surface-elevated border border-border/40" />
        ))}
      </div>
    </div>
  );
}

function StatusCard({ title, rows = {}, copyable = false }) {
  return (
    <section className="rounded-2xl border border-border/40 bg-surface p-6 shadow-sm">
      <h2 className="text-base font-semibold text-primary pb-3 border-b border-border/40 mb-4">{title}</h2>
      <dl className="space-y-3">
        {Object.entries(rows || {}).map(([key, value]) => {
          const valStr = value === null || value === undefined ? '—' : String(value);
          const formattedKey = key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (str) => str.toUpperCase())
            .trim();

          return (
            <div key={key} className="flex items-start justify-between gap-4 text-sm py-0.5">
              <dt className="text-secondary font-medium">{formattedKey}</dt>
              <dd className="text-right text-primary font-mono break-all flex items-center justify-end gap-1.5 max-w-[65%]">
                <span className="truncate max-w-[180px]" title={valStr}>{valStr}</span>
                {copyable && value && <CopyButton text={valStr} />}
              </dd>
            </div>
          );
        })}
        {Object.keys(rows || {}).length === 0 && (
          <p className="text-xs text-secondary italic">No data available.</p>
        )}
      </dl>
    </section>
  );
}

function ListCard({ title, items = [], itemType }) {
  const [expandedIndex, setExpandedIndex] = useState(null);

  const toggleExpand = (idx) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  const renderItemContent = (item) => {
    // 1. Participant
    if (itemType === 'participant') {
      return (
        <div className="flex flex-col gap-1.5 w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${item.role === 'dentist' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                item.role === 'patient' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                  'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                }`}>
                {item.role}
              </span>
              <span className="text-sm font-semibold text-primary">User #{item.userId}</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${item.status === 'joined' ? 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-300 border border-green-200 dark:border-green-800/30' :
              item.status === 'assigned' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-300 border border-blue-200 dark:border-blue-800/30' :
                'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300 border border-amber-200 dark:border-amber-800/30'
              }`}>
              {item.status}
            </span>
          </div>
          {item.joinedAt && (
            <p className="text-xs text-secondary flex items-center gap-1">
              <AppIcon name="Clock" size={12} />
              Joined at: {new Date(item.joinedAt).toLocaleString()}
            </p>
          )}
        </div>
      );
    }

    // 2. Webhook Receipt
    if (itemType === 'webhookReceipt') {
      return (
        <div className="flex flex-col gap-1.5 w-full">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-primary truncate" title={item.eventType}>{item.eventType}</p>
              <p className="text-[10px] font-bold text-secondary uppercase tracking-wider mt-0.5">{item.provider} • {item.source || 'webhook'}</p>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${item.status === 'processed' ? 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-300 border border-green-200 dark:border-green-800/30' :
              item.status === 'ignored' ? 'bg-slate-50 text-secondary dark:bg-slate-900 dark:text-slate-400 border border-border/40' :
                'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-300 border border-red-200 dark:border-red-800/30'
              }`}>
              {item.status}
            </span>
          </div>
          {item.resourceId && (
            <p className="text-xs text-secondary font-mono truncate">SID: {item.resourceId}</p>
          )}
          <p className="text-xs text-secondary">
            Received: {new Date(item.receivedAt).toLocaleString()} {item.attempts > 1 && `(Attempts: ${item.attempts})`}
          </p>
          {item.lastError && (
            <p className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/10 p-2 rounded-lg border border-red-100 dark:border-red-900/30 mt-1">
              Error: {item.lastError}
            </p>
          )}
        </div>
      );
    }

    // 3. Outbox Attempt
    if (itemType === 'outboxAttempt') {
      return (
        <div className="flex flex-col gap-1.5 w-full">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-primary truncate" title={item.eventType}>{item.eventType}</p>
              <p className="text-[10px] font-bold text-secondary uppercase tracking-wider mt-0.5">{item.aggregateType} #{item.aggregateId}</p>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${item.status === 'published' ? 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-300 border border-green-200 dark:border-green-800/30' :
              item.status === 'pending' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300 border border-amber-200 dark:border-amber-800/30' :
                'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-300 border border-red-200 dark:border-red-800/30'
              }`}>
              {item.status}
            </span>
          </div>
          {item.publishedAt && (
            <p className="text-xs text-secondary">
              Published: {new Date(item.publishedAt).toLocaleString()}
            </p>
          )}
          {item.lastError && (
            <p className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/10 p-2 rounded-lg border border-red-100 dark:border-red-900/30 mt-1">
              Error: {item.lastError}
            </p>
          )}
        </div>
      );
    }

    // Fallback: simple text string
    return (
      <div className="w-full">
        <p className="text-sm text-primary">{JSON.stringify(item)}</p>
      </div>
    );
  };

  return (
    <section className="rounded-2xl border border-border/40 bg-surface p-6 shadow-sm flex flex-col">
      <h2 className="text-base font-semibold text-primary pb-3 border-b border-border/40 mb-4">{title}</h2>
      <div className="space-y-3 flex-1 overflow-y-auto max-h-[360px] pr-1">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AppIcon name="Inbox" size={24} className="text-secondary/40 mb-2" />
            <p className="text-sm text-secondary">No records found.</p>
          </div>
        ) : (
          items.map((item, index) => {
            const isExpanded = expandedIndex === index;
            return (
              <div key={item.id || index} className="p-4 rounded-xl border border-border/40 hover:bg-surface-elevated/40 transition flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  {renderItemContent(item)}
                  <button
                    type="button"
                    onClick={() => toggleExpand(index)}
                    aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                    className="p-1 hover:bg-primary/5 rounded-lg text-secondary hover:text-primary transition self-start flex-shrink-0"
                    title="Toggle JSON inspector"
                  >
                    <AppIcon name={isExpanded ? 'ChevronUp' : 'Code'} size={14} />
                  </button>
                </div>
                {isExpanded && (
                  <pre className="overflow-x-auto rounded-lg bg-surface-elevated p-3 text-[10px] font-mono text-secondary border border-border/40">
                    {JSON.stringify(item, null, 2)}
                  </pre>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
