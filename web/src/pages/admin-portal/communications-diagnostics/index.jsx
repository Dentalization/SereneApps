import React, { useState } from 'react';
import AdminSideBar from '../ui/sidebar-admin';
import AppIcon from '../../../components/AppIcon';
import {
  fetchCommunicationDiagnostics,
  reconcileCommunicationDiagnostics
} from '../../../services/chatService';

const STATUS_TONE = {
  healthy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  error: 'bg-red-50 text-red-700 border-red-200'
};

function toneForDiagnostics(diagnostics) {
  if (!diagnostics) return 'warning';
  if (diagnostics.inconsistencies?.some((item) => item.severity === 'error')) return 'error';
  if (diagnostics.inconsistencies?.length) return 'warning';
  return 'healthy';
}

export default function AppointmentDiagnosticsDashboard() {
  const [appointmentId, setAppointmentId] = useState('');
  const [diagnostics, setDiagnostics] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const load = async () => {
    if (!appointmentId.trim()) return;
    setStatus('loading');
    setError('');
    try {
      setDiagnostics(await fetchCommunicationDiagnostics(appointmentId.trim()));
    } catch (err) {
      setError(err?.response?.data?.error?.code || 'Failed to load diagnostics.');
    } finally {
      setStatus('idle');
    }
  };

  const reconcile = async () => {
    if (!diagnostics?.appointmentId) return;
    if (!window.confirm('Run safe reconciliation for this appointment?')) return;
    setStatus('reconciling');
    setError('');
    try {
      const result = await reconcileCommunicationDiagnostics(diagnostics.appointmentId);
      setDiagnostics(result.diagnostics);
    } catch (err) {
      setError(err?.response?.data?.error?.code || 'Reconciliation failed.');
    } finally {
      setStatus('idle');
    }
  };

  const tone = toneForDiagnostics(diagnostics);

  return (
    <div className="min-h-screen bg-surface flex theme-transition">
      <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
        <AdminSideBar />
      </div>
      <main className="flex-1 min-w-0 p-6 overflow-y-auto">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-primary">Communication Diagnostics</h1>
            <p className="text-sm text-secondary">Internal appointment health, projection status, webhook receipts, and safe reconciliation.</p>
          </div>
          <div className="flex gap-2">
            <input
              value={appointmentId}
              onChange={(event) => setAppointmentId(event.target.value)}
              placeholder="Appointment ID"
              className="w-56 rounded-lg border border-primary/20 bg-surface-elevated px-3 py-2 text-sm text-primary"
            />
            <button onClick={load} disabled={status === 'loading'} className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              <AppIcon name={status === 'loading' ? 'Loader2' : 'Search'} size={16} className={status === 'loading' ? 'animate-spin' : ''} />
              Check
            </button>
          </div>
        </header>

        {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {!diagnostics ? (
          <div className="mt-8 rounded-lg border border-primary/10 bg-surface-elevated p-8 text-center text-muted">
            Enter an appointment ID to inspect communication health. Secrets are never displayed.
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <section className={`rounded-lg border p-4 ${STATUS_TONE[tone]}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">Appointment #{diagnostics.appointmentId}</h2>
                  <p className="text-sm">Expected room: {diagnostics.expectedRoomName}</p>
                </div>
                <button onClick={() => navigator.clipboard?.writeText(diagnostics.appointmentId)} className="rounded-md border border-current/20 px-3 py-1.5 text-sm">
                  Copy ID
                </button>
              </div>
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <StatusCard title="Appointment" rows={diagnostics.status} />
              <StatusCard title="Readiness" rows={diagnostics.readiness} />
              <StatusCard title="Resources" rows={diagnostics.resources} copyable />
            </div>

            <section className="rounded-lg border border-primary/10 bg-surface-elevated p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-primary">Reconciliation</h2>
                  <p className="text-sm text-secondary">Idempotent: re-ensures missing resources using appointment-{diagnostics.appointmentId} only.</p>
                </div>
                <button onClick={reconcile} disabled={status === 'reconciling' || diagnostics.status?.appointment === 'cancelled'} className="inline-flex items-center gap-2 rounded-lg border border-accent/40 px-4 py-2 text-sm font-semibold text-accent disabled:opacity-50">
                  <AppIcon name={status === 'reconciling' ? 'Loader2' : 'RefreshCw'} size={16} className={status === 'reconciling' ? 'animate-spin' : ''} />
                  Reconcile
                </button>
              </div>
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <ListCard title="Participants" items={diagnostics.participants} />
              <StatusCard title="Chat projection" rows={diagnostics.projection} />
              <ListCard title="Webhook receipts" items={diagnostics.webhookReceipts} />
              <ListCard title="Outbox attempts" items={diagnostics.outbox} />
            </div>

            {diagnostics.inconsistencies?.length > 0 && (
              <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <h2 className="text-base font-semibold text-amber-800">Detected inconsistencies</h2>
                <div className="mt-3 space-y-2">
                  {diagnostics.inconsistencies.map((item) => (
                    <div key={item.code} className="text-sm text-amber-800">
                      <span className="font-semibold">{item.code}</span>: {item.message}
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="rounded-lg border border-primary/10 bg-surface-elevated p-4">
              <h2 className="text-base font-semibold text-primary">Timeline</h2>
              <div className="mt-3 divide-y divide-primary/10">
                {(diagnostics.timeline || []).map((event) => (
                  <div key={event.id} className="py-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-primary">{event.eventType}</span>
                      <span className="text-xs text-muted">{new Date(event.occurredAt).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-muted">
                      {event.actorRole || 'system'} • {event.provider || 'local'} • {event.providerSid || 'no sid'}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function StatusCard({ title, rows = {}, copyable = false }) {
  return (
    <section className="rounded-lg border border-primary/10 bg-surface-elevated p-4">
      <h2 className="text-base font-semibold text-primary">{title}</h2>
      <dl className="mt-3 space-y-2">
        {Object.entries(rows || {}).map(([key, value]) => (
          <div key={key} className="flex items-start justify-between gap-3 text-sm">
            <dt className="text-muted">{key}</dt>
            <dd className="text-right text-primary break-all">
              {String(value)}
              {copyable && value && (
                <button onClick={() => navigator.clipboard?.writeText(String(value))} className="ml-2 text-accent">
                  copy
                </button>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ListCard({ title, items = [] }) {
  return (
    <section className="rounded-lg border border-primary/10 bg-surface-elevated p-4">
      <h2 className="text-base font-semibold text-primary">{title}</h2>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted">No records.</p>
        ) : items.map((item, index) => (
          <pre key={item.id || index} className="overflow-x-auto rounded-md bg-surface p-3 text-xs text-primary">
            {JSON.stringify(item, null, 2)}
          </pre>
        ))}
      </div>
    </section>
  );
}
