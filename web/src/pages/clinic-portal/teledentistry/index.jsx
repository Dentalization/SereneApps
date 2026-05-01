import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import { useAuth } from '../../../contexts/AuthContext';
import ClinicSideBar from '../ui/SideBar-Clinic';
import { useTwilioVideoClient } from '../../../hooks/useTwilioVideoClient';
import {
  fetchClinicCommunicationAuditLog,
  fetchClinicObserverToken,
  fetchClinicTeledentistryMessages,
  fetchClinicTeledentistrySessions,
  fetchClinicTeledentistrySummary
} from '../../../services/clinicTeledentistryService';
import { canObserveSessions, canViewSummaries, getClinicRole } from '../../../utils/clinicRoles';

function localDateKey(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDuration(seconds = 0) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins <= 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

function statusClass(status) {
  if (status === 'live') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'waiting') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (status === 'completed') return 'bg-slate-100 text-slate-700 border-slate-200';
  if (status === 'ended') return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
}

function SummaryDrawer({ open, summary, loading, error, onClose }) {
  if (!open) return null;
  const body = summary?.summary;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">
      <aside className="h-full w-full max-w-2xl bg-surface-elevated border-l border-primary/20 shadow-2xl flex flex-col">
        <header className="px-5 py-4 border-b border-primary/10 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-primary">Clinical Summary</h2>
            <p className="text-sm text-secondary">
              {summary?.appointment?.patient?.name || 'Patient'} · Appointment #{summary?.appointment?.id || '-'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-primary/10 text-muted" aria-label="Close summary">
            <Icon name="X" size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading && <p className="text-sm text-secondary">Memuat ringkasan...</p>}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {!loading && !error && !body && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Summary belum final atau belum tersedia untuk klinik.
            </div>
          )}
          {body && (
            <>
              <SummaryField label="Keluhan utama" value={body.chiefComplaint} />
              <SummaryField label="Temuan objektif" value={body.objectiveFindings} />
              <SummaryField label="Assessment" value={body.assessment} />
              <SummaryField label="Rencana tindakan" value={body.plan} />
              <SummaryField label="Rekomendasi lanjutan" value={(body.recommendations || []).join('\n')} />
              <div className="rounded-xl border border-primary/10 bg-surface p-4 text-sm text-secondary">
                Follow-up: {body.followUpNeeded ? `Ya${body.followUpAt ? ` · ${formatDateTime(body.followUpAt)}` : ''}` : 'Tidak'}
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function MessagesDrawer({ open, messagesState, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">
      <aside className="h-full w-full max-w-2xl bg-surface-elevated border-l border-primary/20 shadow-2xl flex flex-col">
        <header className="px-5 py-4 border-b border-primary/10 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-primary">Chat Projection</h2>
            <p className="text-sm text-secondary">
              Appointment #{messagesState.appointmentId || '-'} · local chat_messages
            </p>
            <p className="mt-1 text-xs text-muted">
              Clinic owner can review local projected chat history for compliance. Attachment downloads are not enabled in observer review.
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-primary/10 text-muted" aria-label="Close messages">
            <Icon name="X" size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {messagesState.loading && <p className="text-sm text-secondary">Memuat chat history...</p>}
          {messagesState.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {messagesState.error}
            </div>
          )}
          {!messagesState.loading && !messagesState.error && messagesState.messages.length === 0 && (
            <div className="rounded-xl border border-primary/10 bg-surface p-4 text-sm text-secondary">
              Belum ada chat message yang tersinkron ke projection lokal.
            </div>
          )}
          {messagesState.messages.map((message) => (
            <div key={message.id} className="rounded-xl border border-primary/10 bg-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-primary">{message.senderName}</span>
                <span className="text-xs text-muted">{formatDateTime(message.createdAt)}</span>
              </div>
              {message.messageType === 'file' ? (
                <div className="mt-2 rounded-lg border border-primary/10 bg-surface-elevated px-3 py-2 text-sm">
                  <div className="font-medium text-primary">{message.fileName || 'Attachment'}</div>
                  <div className="text-xs text-secondary">
                    {message.attachmentAvailable ? 'Attachment tersedia via signed download.' : `Attachment tidak tersedia (${message.mediaTombstoneReason || 'expired/deleted'}).`}
                  </div>
                </div>
              ) : (
                <p className="mt-2 whitespace-pre-wrap text-sm text-secondary">{message.message || '-'}</p>
              )}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function SummaryField({ label, value }) {
  return (
    <section className="rounded-xl border border-primary/10 bg-surface p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm text-primary">{value || '-'}</p>
    </section>
  );
}

function ObserverModal({ appointmentId, open, onClose }) {
  const remoteContainerRef = useRef(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const { join, leave, connectionState, reconnectError, networkQuality, remoteTrackCount } = useTwilioVideoClient();

  useEffect(() => {
    if (!open || !appointmentId) return undefined;
    let cancelled = false;
    setStatus('connecting');
    setError('');

    fetchClinicObserverToken(appointmentId)
      .then(async (session) => {
        if (cancelled) return;
        await join({
          roomName: session.video?.roomName || session.roomName,
          token: session.video?.token || session.videoToken || session.token,
          remoteContainerEl: remoteContainerRef.current,
          observeOnly: true
        });
        if (!cancelled) setStatus('connected');
      })
      .catch((err) => {
        if (!cancelled) {
          const code = err?.response?.data?.error?.code;
          setStatus('error');
          setError(code === 'ROOM_ENDED'
            ? 'Sesi telah berakhir. Observer tidak dapat bergabung lagi.'
            : code || err?.message || 'Gagal membuka observer room.');
        }
      });

    return () => {
      cancelled = true;
      leave();
    };
  }, [appointmentId, join, leave, open]);

  if (!open) return null;

  const handleClose = async () => {
    await leave();
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Clinic Observer View</h2>
            <p className="text-xs text-slate-400">Appointment #{appointmentId} · observer monitoring</p>
            <p className="mt-1 text-xs text-slate-500">
              Observer mode connects without camera/mic tracks. Token misuse is audited and may trigger disconnect.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-300">
              Quality {networkQuality ?? '-'}
            </span>
            <button onClick={handleClose} className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15">
              Close
            </button>
          </div>
        </header>

        <div className="relative min-h-[60vh] bg-black">
          <div
            ref={remoteContainerRef}
            className={`grid h-full min-h-[60vh] gap-2 p-2 ${
              remoteTrackCount > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
            }`}
          />
          {status !== 'connected' && (
            <div className="absolute inset-0 flex items-center justify-center text-center">
              <div className="rounded-xl bg-slate-900/90 px-4 py-3 text-sm text-slate-200">
                {status === 'error' ? error : 'Menghubungkan observer ke room...'}
              </div>
            </div>
          )}
          {status === 'connected' && remoteTrackCount === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-center">
              <div className="rounded-xl bg-slate-900/90 px-4 py-3 text-sm text-slate-300">
                Terhubung sebagai observer. Menunggu video participant.
              </div>
            </div>
          )}
          {connectionState === 'reconnecting' && (
            <div className="absolute left-4 top-4 rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white">
              Koneksi terputus, mencoba menyambungkan ulang...
            </div>
          )}
          {connectionState === 'disconnected' && status === 'connected' && (
            <div className="absolute left-4 top-4 rounded-lg bg-slate-800 px-3 py-2 text-sm text-white">
              Sesi telah berakhir atau koneksi observer terputus.
            </div>
          )}
          {reconnectError && (
            <div className="absolute bottom-4 left-4 rounded-lg bg-red-600 px-3 py-2 text-sm text-white">
              {reconnectError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SessionRow({ session, canObserve, onObserve, onViewSummary, onViewMessages }) {
  return (
    <div className="rounded-xl border border-primary/10 bg-surface-elevated p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-primary">{session.patient?.name || 'Patient unavailable'}</h3>
            <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusClass(session.sessionStatus)}`}>
              {session.sessionStatus}
            </span>
            <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-xs font-medium text-cyan-700">
              Teledentistry
            </span>
          </div>
          <p className="mt-1 text-sm text-secondary">
            {session.dentist?.name || 'Assigned dentist'} · {formatDateTime(session.startsAt)} · {session.roomName}
          </p>
          <p className="mt-1 text-xs text-muted">
            Summary: {session.summaryStatus || 'pending'} · Active participants: {session.activeParticipantCount} · Duration {formatDuration(session.durationSeconds || 0)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onViewSummary(session.appointmentId)}
            className="rounded-lg border border-primary/15 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5"
          >
            View Summary
          </button>
          {canObserve && (
            <button
              onClick={() => onViewMessages(session.appointmentId)}
              className="rounded-lg border border-primary/15 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5"
            >
              Chat History
            </button>
          )}
          {canObserve && session.canObserve && (
            <button
              onClick={() => onObserve(session.appointmentId)}
              className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-700"
            >
              Observe
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ClinicTeledentistryPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const clinicRole = getClinicRole(user);
  const canObserve = canObserveSessions(clinicRole);
  const canReadSummaries = canViewSummaries(clinicRole);
  const [activeTab, setActiveTab] = useState('live');
  const [date, setDate] = useState(localDateKey());
  const [liveSessions, setLiveSessions] = useState([]);
  const [historySessions, setHistorySessions] = useState([]);
  const [counts, setCounts] = useState({ live: 0, waiting: 0, completed: 0, ended: 0, total: 0 });
  const [auditEvents, setAuditEvents] = useState([]);
  const [eventFilter, setEventFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [observingAppointmentId, setObservingAppointmentId] = useState(null);
  const [summaryState, setSummaryState] = useState({ open: false, loading: false, error: '', data: null });
  const [messagesState, setMessagesState] = useState({
    open: false,
    loading: false,
    error: '',
    appointmentId: null,
    messages: []
  });

  const tabs = useMemo(() => ([
    { id: 'live', label: 'Live Sessions', icon: 'Radio', visible: canObserve },
    { id: 'history', label: 'Session History', icon: 'History', visible: canReadSummaries },
    { id: 'audit', label: 'Audit Log', icon: 'ShieldCheck', visible: canObserve }
  ]), [canObserve, canReadSummaries]);

  const visibleTabs = tabs.filter((tab) => tab.visible);

  useEffect(() => {
    if (visibleTabs.length && !visibleTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [activeTab, visibleTabs]);

  const loadSessions = useCallback(async () => {
    if (!canReadSummaries) return;
    setLoading(true);
    setError('');
    try {
      const [live, history] = await Promise.all([
        fetchClinicTeledentistrySessions({ status: 'live' }),
        fetchClinicTeledentistrySessions({ status: 'completed', date })
      ]);
      setLiveSessions(live.sessions || []);
      setHistorySessions(history.sessions || []);
      setCounts(live.counts || history.counts || { live: 0, waiting: 0, completed: 0, ended: 0, total: 0 });
    } catch (err) {
      setError(err?.response?.data?.error?.code || 'Gagal memuat sesi teledentistry klinik.');
    } finally {
      setLoading(false);
    }
  }, [canReadSummaries, date]);

  const loadAudit = useCallback(async () => {
    if (!canObserve) return;
    try {
      const result = await fetchClinicCommunicationAuditLog({
        date,
        eventType: eventFilter || undefined,
        limit: 100
      });
      setAuditEvents(result.events || []);
    } catch (err) {
      setError(err?.response?.data?.error?.code || 'Gagal memuat audit log.');
    }
  }, [canObserve, date, eventFilter]);

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 30000);
    return () => clearInterval(interval);
  }, [loadSessions]);

  useEffect(() => {
    if (activeTab === 'audit') loadAudit();
  }, [activeTab, loadAudit]);

  useEffect(() => {
    const appointmentId = searchParams.get('appointmentId');
    const shouldObserve = searchParams.get('observe') === 'true';
    if (appointmentId && shouldObserve && canObserve) {
      setObservingAppointmentId(appointmentId);
      setActiveTab('live');
    }
  }, [canObserve, searchParams]);

  const openSummary = async (appointmentId) => {
    setSummaryState({ open: true, loading: true, error: '', data: null });
    try {
      const data = await fetchClinicTeledentistrySummary(appointmentId);
      setSummaryState({ open: true, loading: false, error: '', data });
    } catch (err) {
      setSummaryState({
        open: true,
        loading: false,
        error: err?.response?.data?.error?.code || 'Gagal memuat summary.',
        data: null
      });
    }
  };

  const openMessages = async (appointmentId) => {
    setMessagesState({ open: true, loading: true, error: '', appointmentId, messages: [] });
    try {
      const data = await fetchClinicTeledentistryMessages(appointmentId, { limit: 150 });
      setMessagesState({
        open: true,
        loading: false,
        error: '',
        appointmentId,
        messages: data.messages || []
      });
    } catch (err) {
      setMessagesState({
        open: true,
        loading: false,
        error: err?.response?.data?.error?.code || 'Gagal memuat chat history.',
        appointmentId,
        messages: []
      });
    }
  };

  if (!canReadSummaries) {
    return (
      <div className="flex min-h-screen bg-background theme-transition">
        <ClinicSideBar />
        <main className="flex-1 p-8">
          <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
            Role klinik ini hanya dapat melihat status appointment. Akses teledentistry memerlukan clinic owner atau clinic admin.
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background theme-transition">
      <ClinicSideBar />
      <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-primary">Teledentistry</h1>
            <p className="text-sm text-secondary">Clinic-level visibility for live sessions, finalized summaries, and audit events.</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="rounded-lg border border-primary/20 bg-surface px-3 py-2 text-sm text-primary"
            />
            <div className="rounded-lg border border-primary/10 bg-surface px-3 py-2 text-sm text-secondary">
              Live: <span className="font-semibold text-primary">{counts.live || 0}</span>
            </div>
          </div>
        </header>

        <nav className="flex flex-wrap gap-2 border-b border-primary/10 pb-3">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                activeTab === tab.id ? 'bg-accent text-white' : 'text-secondary hover:bg-primary/5 hover:text-primary'
              }`}
            >
              <Icon name={tab.icon} size={16} />
              {tab.label}
            </button>
          ))}
        </nav>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {activeTab === 'live' && canObserve && (
          <section className="space-y-3">
            {loading ? <p className="text-sm text-secondary">Memuat live sessions...</p> : null}
            {!loading && liveSessions.length === 0 ? (
              <div className="rounded-xl border border-primary/10 bg-surface p-6 text-sm text-secondary">
                Tidak ada sesi teledentistry aktif.
              </div>
            ) : liveSessions.map((session) => (
              <SessionRow
                key={session.appointmentId}
                session={session}
                canObserve={canObserve}
                onObserve={setObservingAppointmentId}
                onViewSummary={openSummary}
                onViewMessages={openMessages}
              />
            ))}
          </section>
        )}

        {activeTab === 'history' && (
          <section className="space-y-3">
            {historySessions.length === 0 ? (
              <div className="rounded-xl border border-primary/10 bg-surface p-6 text-sm text-secondary">
                Tidak ada riwayat sesi pada tanggal ini.
              </div>
            ) : historySessions.map((session) => (
              <SessionRow
                key={session.appointmentId}
                session={session}
                canObserve={false}
                onObserve={setObservingAppointmentId}
                onViewSummary={openSummary}
                onViewMessages={openMessages}
              />
            ))}
          </section>
        )}

        {activeTab === 'audit' && canObserve && (
          <section className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <input
                value={eventFilter}
                onChange={(event) => setEventFilter(event.target.value)}
                placeholder="Filter event type"
                className="rounded-lg border border-primary/20 bg-surface px-3 py-2 text-sm text-primary"
              />
              <button onClick={loadAudit} className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white">
                Refresh Audit
              </button>
            </div>
            <div className="overflow-hidden rounded-xl border border-primary/10 bg-surface-elevated">
              {auditEvents.length === 0 ? (
                <p className="p-5 text-sm text-secondary">Tidak ada audit event.</p>
              ) : auditEvents.map((event) => (
                <div key={event.id} className="border-b border-primary/10 px-4 py-3 last:border-b-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium text-primary">{event.eventType}</div>
                    <div className="text-xs text-secondary">{formatDateTime(event.occurredAt)}</div>
                  </div>
                  <p className="mt-1 text-xs text-secondary">
                    Appointment #{event.appointmentId} · {event.actorRole || 'system'} · {event.provider || 'local'}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <ObserverModal
        appointmentId={observingAppointmentId}
        open={Boolean(observingAppointmentId)}
        onClose={() => setObservingAppointmentId(null)}
      />
      <SummaryDrawer
        open={summaryState.open}
        summary={summaryState.data}
        loading={summaryState.loading}
        error={summaryState.error}
        onClose={() => setSummaryState({ open: false, loading: false, error: '', data: null })}
      />
      <MessagesDrawer
        open={messagesState.open}
        messagesState={messagesState}
        onClose={() => setMessagesState({ open: false, loading: false, error: '', appointmentId: null, messages: [] })}
      />
    </div>
  );
}
