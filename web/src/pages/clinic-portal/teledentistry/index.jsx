import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
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

function formatDateTime(value, language = 'id') {
  if (!value) return '-';
  return new Date(value).toLocaleString(language === 'id' ? 'id-ID' : 'en-US', {
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

const ROLE_LABELS = {
  dentist: 'Dentist',
  patient: 'Patient',
  guardian: 'Guardian',
  interpreter: 'Interpreter',
  assistant: 'Assistant',
  observer: 'Clinic Observer',
  participant: 'Participant'
};

const EVENT_CATEGORY_LABELS = {
  session: 'Session',
  observer: 'Observer',
  security: 'Security',
  chat: 'Chat',
  summary: 'Summary',
  attachment: 'Attachment',
  system: 'System'
};

const TELEDENTISTRY_ERROR_MESSAGES = {
  CLINIC_TELEDENTISTRY_AUDIT_FAILED: 'clinic.teledentistry.errors.auditFailed',
  CLINIC_TELEDENTISTRY_SESSIONS_FAILED: 'clinic.teledentistry.errors.sessionsFailed',
  CLINIC_TELEDENTISTRY_SUMMARY_FAILED: 'clinic.teledentistry.errors.summaryFailed',
  CLINIC_TELEDENTISTRY_MESSAGES_FAILED: 'clinic.teledentistry.errors.messagesFailed',
  CLINIC_TELEDENTISTRY_FORBIDDEN: 'clinic.teledentistry.errors.forbidden',
  APPOINTMENT_NOT_FOUND: 'clinic.teledentistry.errors.appointmentNotFound'
};

function roleLabel(t, role) {
  return t(`clinic.teledentistry.roles.${role}`, { defaultValue: ROLE_LABELS[role] || role });
}

function auditCategoryLabel(t, category) {
  return t(`clinic.teledentistry.categories.${category}`, { defaultValue: EVENT_CATEGORY_LABELS[category] || category });
}

function resolveTeledentistryErrorMessage(error, fallbackMessage, t) {
  const code = String(error?.response?.data?.error?.code || '').trim();
  if (code && TELEDENTISTRY_ERROR_MESSAGES[code]) {
    return t(TELEDENTISTRY_ERROR_MESSAGES[code], { defaultValue: fallbackMessage });
  }
  return fallbackMessage;
}

function sessionStatusLabel(status, t) {
  return t(`clinic.teledentistry.statuses.${status || 'unknown'}`, { defaultValue: status || 'Unknown' });
}

function summaryStatusLabel(status, t) {
  return t(`clinic.teledentistry.summaryStatuses.${status || 'pending'}`, { defaultValue: status || 'Pending' });
}

function auditCategory(eventType = '') {
  if (eventType.includes('observer_publish') || eventType.includes('denied')) return 'security';
  if (eventType.includes('observer')) return 'observer';
  if (eventType.includes('message') || eventType.includes('chat')) return 'chat';
  if (eventType.includes('summary')) return 'summary';
  if (eventType.includes('attachment')) return 'attachment';
  if (eventType.includes('room') || eventType.includes('participant')) return 'session';
  return 'system';
}

function auditCategoryClass(category) {
  if (category === 'security') return 'border-red-200 bg-red-50 text-red-700';
  if (category === 'observer') return 'border-cyan-200 bg-cyan-50 text-cyan-700';
  if (category === 'chat') return 'border-violet-200 bg-violet-50 text-violet-700';
  if (category === 'summary') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (category === 'attachment') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function statusClass(status) {
  if (status === 'live') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'waiting') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (status === 'completed') return 'bg-slate-100 text-slate-700 border-slate-200';
  if (status === 'ended') return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
}

function SummaryDrawer({ open, summary, loading, error, onClose }) {
  const { t } = useLanguage();
  if (!open) return null;
  const body = summary?.summary;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">
      <aside className="h-full w-full max-w-2xl bg-surface-elevated border-l border-primary/20 shadow-2xl flex flex-col">
        <header className="px-5 py-4 border-b border-primary/10 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-primary">{t('clinic.teledentistry.summaryDrawer.title')}</h2>
            <p className="text-sm text-secondary">
              {summary?.appointment?.patient?.name || t('clinic.teledentistry.summaryDrawer.patientFallback')} · {t('clinic.teledentistry.labels.appointment')} #{summary?.appointment?.id || '-'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-primary/10 text-muted" aria-label={t('clinic.teledentistry.summaryDrawer.closeAria')}>
            <Icon name="X" size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading && <p className="text-sm text-secondary">{t('clinic.teledentistry.summaryDrawer.loading')}</p>}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {!loading && !error && !body && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {t('clinic.teledentistry.summaryDrawer.unavailable')}
            </div>
          )}
          {body && (
            <>
              <SummaryField label={t('clinic.teledentistry.summaryDrawer.chiefComplaint')} value={body.chiefComplaint} />
              <SummaryField label={t('clinic.teledentistry.summaryDrawer.objectiveFindings')} value={body.objectiveFindings} />
              <SummaryField label={t('clinic.teledentistry.summaryDrawer.assessment')} value={body.assessment} />
              <SummaryField label={t('clinic.teledentistry.summaryDrawer.plan')} value={body.plan} />
              <SummaryField label={t('clinic.teledentistry.summaryDrawer.recommendations')} value={(body.recommendations || []).join('\n')} />
              <div className="rounded-xl border border-primary/10 bg-surface p-4 text-sm text-secondary">
                {t('clinic.teledentistry.summaryDrawer.followUp')}: {body.followUpNeeded
                  ? `${t('clinic.teledentistry.summaryDrawer.followUpYes')}${body.followUpAt ? ` · ${formatDateTime(body.followUpAt, language)}` : ''}`
                  : t('clinic.teledentistry.summaryDrawer.followUpNo')}
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function MessagesDrawer({ open, messagesState, onClose }) {
  const { t, language } = useLanguage();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">
      <aside className="h-full w-full max-w-2xl bg-surface-elevated border-l border-primary/20 shadow-2xl flex flex-col">
        <header className="px-5 py-4 border-b border-primary/10 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-primary">{t('clinic.teledentistry.messagesDrawer.title')}</h2>
            <p className="text-sm text-secondary">
              {t('clinic.teledentistry.labels.appointment')} #{messagesState.appointmentId || '-'} · {t('clinic.teledentistry.labels.localChatMessages')}
            </p>
            <p className="mt-1 text-xs text-muted">
              {t('clinic.teledentistry.messagesDrawer.policyCopy')}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-primary/10 text-muted" aria-label={t('clinic.teledentistry.messagesDrawer.closeAria')}>
            <Icon name="X" size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {messagesState.loading && <p className="text-sm text-secondary">{t('clinic.teledentistry.messagesDrawer.loading')}</p>}
          {messagesState.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {messagesState.error}
            </div>
          )}
          {!messagesState.loading && !messagesState.error && messagesState.messages.length === 0 && (
            <div className="rounded-xl border border-primary/10 bg-surface p-4 text-sm text-secondary">
              {t('clinic.teledentistry.messagesDrawer.empty')}
            </div>
          )}
          {messagesState.messages.map((message) => (
            <div key={message.id} className="rounded-xl border border-primary/10 bg-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-primary">{message.senderName}</span>
                <span className="text-xs text-muted">{formatDateTime(message.createdAt, language)}</span>
              </div>
              {message.messageType === 'file' ? (
                <div className="mt-2 rounded-lg border border-primary/10 bg-surface-elevated px-3 py-2 text-sm">
                  <div className="font-medium text-primary">{message.fileName || t('clinic.teledentistry.messagesDrawer.attachmentFallback')}</div>
                  <div className="text-xs text-secondary">
                    {message.attachmentAvailable
                      ? t('clinic.teledentistry.messagesDrawer.attachmentStored')
                      : t('clinic.teledentistry.messagesDrawer.attachmentUnavailable', {
                        reason: message.mediaTombstoneReason || t('clinic.teledentistry.messagesDrawer.unavailableReason')
                      })}
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

function participantLabelFromIdentity(identity, session, t) {
  const value = String(identity || '');
  if (session?.dentist?.id && value === String(session.dentist.id)) {
    return `${roleLabel(t, 'dentist')}${session.dentist.name ? ` · ${session.dentist.name}` : ''}`;
  }
  if (session?.patient?.id && value === String(session.patient.id)) {
    return `${roleLabel(t, 'patient')}${session.patient.name ? ` · ${session.patient.name}` : ''}`;
  }
  const invited = value.match(/^appointment-\d+:participant-[0-9a-fA-F-]{36}:([a-z_]+)$/);
  if (invited) return roleLabel(t, invited[1]);
  const observer = value.match(/^appointment-\d+-observer-\d+$/);
  if (observer) return roleLabel(t, 'observer');
  return roleLabel(t, 'participant');
}

function ObserverModal({ appointmentId, session, open, onClose }) {
  const { t } = useLanguage();
  const remoteContainerRef = useRef(null);
  const sessionRef = useRef(session);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const { join, leave, connectionState, reconnectError, networkQuality, remoteTrackCount } = useTwilioVideoClient();

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    if (!open || !appointmentId) return undefined;
    let cancelled = false;
    setStatus('connecting');
    setError('');

    fetchClinicObserverToken(appointmentId)
      .then(async (tokenSession) => {
        if (cancelled) return;
        await join({
          roomName: tokenSession.video?.roomName || tokenSession.roomName,
          token: tokenSession.video?.token || tokenSession.videoToken || tokenSession.token,
          remoteContainerEl: remoteContainerRef.current,
          remoteTrackLabeler: (participant) => participantLabelFromIdentity(participant?.identity, sessionRef.current, t),
          observeOnly: true
        });
        if (!cancelled) setStatus('connected');
      })
        .catch((err) => {
          if (!cancelled) {
            const code = err?.response?.data?.error?.code;
            setStatus('error');
            setError(
              code === 'ROOM_ENDED'
                ? t('clinic.teledentistry.observer.roomEnded')
                : resolveTeledentistryErrorMessage(err, t('clinic.teledentistry.observer.openFailed'), t)
            );
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
            <h2 className="text-sm font-semibold text-white">{t('clinic.teledentistry.observer.title')}</h2>
            <p className="text-xs text-slate-400">{t('clinic.teledentistry.observer.appointmentMeta', { appointmentId })}</p>
            <p className="mt-1 text-xs text-slate-500">
              {t('clinic.teledentistry.observer.policyCopy')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-300">
              {t('clinic.teledentistry.labels.quality')} {networkQuality ?? '-'}
            </span>
            <button onClick={handleClose} className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15">
              {t('clinic.teledentistry.actions.close')}
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
                {status === 'error' ? error : t('clinic.teledentistry.observer.connecting')}
              </div>
            </div>
          )}
          {status === 'connected' && remoteTrackCount === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-center">
              <div className="rounded-xl bg-slate-900/90 px-4 py-3 text-sm text-slate-300">
                {t('clinic.teledentistry.observer.connectedWaiting')}
              </div>
            </div>
          )}
          {connectionState === 'reconnecting' && (
            <div className="absolute left-4 top-4 rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white">
              {t('clinic.teledentistry.observer.reconnecting')}
            </div>
          )}
          {connectionState === 'disconnected' && status === 'connected' && (
            <div className="absolute left-4 top-4 rounded-lg bg-slate-800 px-3 py-2 text-sm text-white">
              {t('clinic.teledentistry.observer.disconnected')}
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

function SessionRow({ session, canObserve, canViewSummary, canViewChat, onObserve, onViewSummary, onViewMessages }) {
  const { t, language } = useLanguage();

  return (
    <div className="rounded-2xl border border-border/40 bg-surface-elevated p-5 shadow-sm transition hover:shadow-md">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-primary">{session.patient?.name || t('clinic.teledentistry.summaryDrawer.patientFallback')}</h3>
            <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(session.sessionStatus)}`}>
              {sessionStatusLabel(session.sessionStatus, t)}
            </span>
            <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700">
              Teledentistry
            </span>
          </div>
          <p className="mt-1 text-sm text-secondary">
            {session.dentist?.name || roleLabel(t, 'dentist')} · {formatDateTime(session.startsAt, language)} · {session.roomName}
          </p>
          <p className="mt-1 text-xs text-muted">
            {t('clinic.teledentistry.labels.summary')}: {summaryStatusLabel(session.summaryStatus, t)} · {t('clinic.teledentistry.labels.activeParticipants')}: {session.activeParticipantCount} · {t('clinic.teledentistry.labels.observer')}: {session.activeObserverCount || 0} · {t('clinic.teledentistry.labels.duration')} {formatDuration(session.durationSeconds || 0)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canViewSummary && (
            <button
              onClick={() => onViewSummary(session.appointmentId)}
              className="rounded-xl border border-primary/15 px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/5"
            >
              {t('clinic.teledentistry.actions.viewSummary')}
            </button>
          )}
          {canViewChat && (
            <button
              onClick={() => onViewMessages(session.appointmentId)}
              className="rounded-xl border border-primary/15 px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/5"
            >
              {t('clinic.teledentistry.actions.viewChat')}
            </button>
          )}
          {canObserve && session.canObserve && (
            <button
              onClick={() => onObserve(session.appointmentId)}
              className="rounded-xl bg-cyan-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-cyan-700"
            >
              {t('clinic.teledentistry.actions.observe')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ClinicTeledentistryPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [searchParams] = useSearchParams();
  const clinicRole = getClinicRole(user);
  const fallbackCanObserve = canObserveSessions(clinicRole);
  const fallbackCanReadSummaries = canViewSummaries(clinicRole);
  const [serverCapabilities, setServerCapabilities] = useState(null);
  const canObserve = serverCapabilities?.canObserve ?? fallbackCanObserve;
  const canReadSummaries = serverCapabilities?.canViewSummaries ?? fallbackCanReadSummaries;
  const canViewChat = serverCapabilities?.canViewChatHistory ?? canObserve;
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
    { id: 'live', label: t('clinic.teledentistry.tabs.live'), icon: 'Radio', visible: canObserve },
    { id: 'history', label: t('clinic.teledentistry.tabs.history'), icon: 'History', visible: canReadSummaries },
    { id: 'audit', label: t('clinic.teledentistry.tabs.audit'), icon: 'ShieldCheck', visible: canObserve }
  ]), [canObserve, canReadSummaries, t]);

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
      setServerCapabilities(live.capabilities || history.capabilities || null);
      setLiveSessions(live.sessions || []);
      setHistorySessions(history.sessions || []);
      setCounts(live.counts || history.counts || { live: 0, waiting: 0, completed: 0, ended: 0, total: 0 });
    } catch (err) {
      setError(resolveTeledentistryErrorMessage(err, t('clinic.teledentistry.errors.sessionsFailed'), t));
    } finally {
      setLoading(false);
    }
  }, [canReadSummaries, date, t]);

  const loadAudit = useCallback(async () => {
    if (!canObserve) return;
    setError('');
    try {
      const result = await fetchClinicCommunicationAuditLog({
        date,
        eventType: eventFilter || undefined,
        limit: 100
      });
      setAuditEvents(result.events || []);
    } catch (err) {
      setError(resolveTeledentistryErrorMessage(err, t('clinic.teledentistry.errors.auditFailed'), t));
    }
  }, [canObserve, date, eventFilter, t]);

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

  const observingSession = useMemo(
    () => liveSessions.find((session) => String(session.appointmentId) === String(observingAppointmentId)) || null,
    [liveSessions, observingAppointmentId]
  );

  const openSummary = async (appointmentId) => {
    setSummaryState({ open: true, loading: true, error: '', data: null });
    try {
      const data = await fetchClinicTeledentistrySummary(appointmentId);
      setSummaryState({ open: true, loading: false, error: '', data });
    } catch (err) {
      setSummaryState({
        open: true,
        loading: false,
        error: resolveTeledentistryErrorMessage(err, t('clinic.teledentistry.errors.summaryFailed'), t),
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
        error: resolveTeledentistryErrorMessage(err, t('clinic.teledentistry.errors.messagesFailed'), t),
        appointmentId,
        messages: []
      });
    }
  };

  if (!canReadSummaries) {
    return (
      <div className="flex min-h-screen bg-background theme-transition">
        <div
          className="flex-shrink-0"
          style={{ width: 'var(--sidebar-width, 20rem)' }}
        >
          <ClinicSideBar />
        </div>
        <main className="flex-1 min-w-0 p-6 md:p-8">
          <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
            {t('clinic.teledentistry.accessDenied')}
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background theme-transition">
      <div
        className="flex-shrink-0"
        style={{ width: 'var(--sidebar-width, 20rem)' }}
      >
        <ClinicSideBar />
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="p-6 md:p-8 pb-0">
          <section className="clinic-page-header space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-primary">{t('clinic.teledentistry.title')}</h1>
                <p className="text-sm text-secondary max-w-2xl">
                  {t('clinic.teledentistry.subtitle')}
                </p>
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3">
                <div className="rounded-2xl border border-border/40 bg-surface px-4 py-2 text-sm text-secondary">
                  {t('clinic.teledentistry.liveCount')}: <span className="font-semibold text-primary">{counts.live || 0}</span>
                </div>
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="rounded-lg border border-border/40 bg-surface px-3 py-2 text-sm text-primary"
                />
              </div>
            </div>
            <div className="border-t border-border/40 pt-4">
              <div className="flex flex-wrap gap-2">
                {visibleTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-accent text-white shadow-sm'
                        : 'text-secondary hover:text-primary hover:bg-surface'
                    }`}
                  >
                    <Icon name={tab.icon} size={16} />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-background theme-transition space-y-8">
          {canReadSummaries && !canObserve && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {t('clinic.teledentistry.adminLimitedAccess')}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {activeTab === 'live' && canObserve && (
            <section className="space-y-4 rounded-3xl border border-border/40 bg-surface-elevated p-5 shadow-sm">
              {loading ? (
                <div className="space-y-3">
                  <div className="h-4 w-48 animate-pulse rounded bg-primary/10" />
                  <div className="h-24 animate-pulse rounded-2xl bg-primary/5" />
                </div>
              ) : null}
              {!loading && liveSessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-primary/20 bg-surface p-8 text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <Icon name="Radio" size={18} />
                  </div>
                  <p className="text-base font-medium text-primary">{t('clinic.teledentistry.empty.liveTitle')}</p>
                  <p className="mt-1 text-sm text-secondary">{t('clinic.teledentistry.empty.liveDescription')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {liveSessions.map((session) => (
                    <SessionRow
                      key={session.appointmentId}
                      session={session}
                      canObserve={canObserve}
                      canViewSummary={canReadSummaries}
                      canViewChat={canViewChat}
                      onObserve={setObservingAppointmentId}
                      onViewSummary={openSummary}
                      onViewMessages={openMessages}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === 'history' && (
            <section className="space-y-4 rounded-3xl border border-border/40 bg-surface-elevated p-5 shadow-sm">
              {historySessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-primary/20 bg-surface p-8 text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon name="History" size={18} />
                  </div>
                  <p className="text-base font-medium text-primary">{t('clinic.teledentistry.empty.historyTitle')}</p>
                  <p className="mt-1 text-sm text-secondary">{t('clinic.teledentistry.empty.historyDescription')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historySessions.map((session) => (
                    <SessionRow
                      key={session.appointmentId}
                      session={session}
                      canObserve={false}
                      canViewSummary={canReadSummaries}
                      canViewChat={false}
                      onObserve={setObservingAppointmentId}
                      onViewSummary={openSummary}
                      onViewMessages={openMessages}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === 'audit' && canObserve && (
            <section className="space-y-4 rounded-3xl border border-border/40 bg-surface-elevated p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <input
                  value={eventFilter}
                  onChange={(event) => setEventFilter(event.target.value)}
                  placeholder={t('clinic.teledentistry.filters.eventType')}
                  className="w-full rounded-xl border border-primary/20 bg-surface px-3 py-2 text-sm text-primary md:max-w-sm"
                />
                <button onClick={loadAudit} className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent/90">
                  {t('clinic.teledentistry.actions.refreshAudit')}
                </button>
              </div>
              <div className="overflow-hidden rounded-2xl border border-primary/10 bg-surface">
                {auditEvents.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                      <Icon name="ShieldCheck" size={18} />
                    </div>
                    <p className="text-base font-medium text-primary">{t('clinic.teledentistry.empty.auditTitle')}</p>
                    <p className="mt-1 text-sm text-secondary">{t('clinic.teledentistry.empty.auditDescription')}</p>
                  </div>
                ) : auditEvents.map((event) => {
                  const category = auditCategory(event.eventType);
                  return (
                  <div key={event.id} className="border-b border-primary/10 px-4 py-3 last:border-b-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${auditCategoryClass(category)}`}>
                          {auditCategoryLabel(t, category)}
                        </span>
                        <div className="font-medium text-primary">{event.eventType}</div>
                      </div>
                      <div className="text-xs text-secondary">{formatDateTime(event.occurredAt, language)}</div>
                    </div>
                    <p className="mt-1 text-xs text-secondary">
                      {t('clinic.teledentistry.labels.appointment')} #{event.appointmentId} · {event.actorRole || t('clinic.teledentistry.roles.system')} · {event.provider || 'local'}
                    </p>
                  </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>

      <ObserverModal
        appointmentId={observingAppointmentId}
        session={observingSession}
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
