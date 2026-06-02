import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../../../components/AppIcon';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { getAvatarGradient, getInitials } from '../../../utils/avatarGradients';
import { parseDateValue } from './utils/dateUtils';
import { resolveMediaUrl } from '../../../utils/media';

function identityMatchesUser(rawIdentity, userId) {
  const identity = String(rawIdentity || '');
  const target = String(userId || '');
  if (!identity || !target) return false;
  return identity === target || identity.includes(`user-${target}`) || identity.includes(`user:${target}`) || identity.includes(target);
}

const sessionStatus = (conversation, presenceMap = {}, now = new Date()) => {
  if (conversation.status === 'completed') return 'completed';
  const startsAt = parseDateValue(
    conversation.startsAt
      || conversation.starts_at
      || conversation.appointmentStartsAt
      || conversation.scheduledAt
      || conversation.scheduled_time
      || conversation.appointment?.startsAt
      || conversation.appointment?.starts_at
      || conversation.appointment?.scheduledAt
      || conversation.appointment?.scheduled_time
  );
  if (startsAt && conversation.status !== 'cancelled' && startsAt.getTime() < now.getTime()) {
    return 'overdue';
  }
  const appointmentId = conversation.appointmentId?.toString?.() || String(conversation.appointmentId || '');
  const patientId = conversation.patient?.id?.toString?.() || conversation.patientId?.toString?.() || '';
  const onlineIdentities = presenceMap?.[appointmentId] || [];
  const patientOnline = patientId
    ? onlineIdentities.some((identity) => identityMatchesUser(identity, patientId))
    : onlineIdentities.length > 0;
  if (conversation.videoRoomRef && patientOnline) return 'live';
  return patientOnline ? 'waiting' : 'upcoming';
};

const statusConfig = {
  live: { dot: '#22c55e', label: 'LIVE' },
  waiting: { dot: '#f59e0b', label: 'WAITING' },
  upcoming: { dot: '#7C3AED', label: 'UPCOMING' },
  overdue: { dot: '#f97316', label: 'OVERDUE' },
  completed: { dot: '#6b7280', label: 'DONE' },
};

const statusBadgeStyles = {
  live: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-200/50 dark:border-green-900/30',
  waiting: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/30',
  upcoming: 'bg-accent/10 text-accent border-accent/20',
  overdue: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200/50 dark:border-orange-900/30',
  completed: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200/50 dark:border-slate-800/30',
};

const getRelativeDateLabel = (startsAt, t, language) => {
  if (!startsAt) {
    return t('clinic.teledentistry.date.unknown', { defaultValue: '-' });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(startsAt);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / 86400000);

  let relativeDayLabel = '';
  if (diffDays === 0) {
    relativeDayLabel = t('clinic.teledentistry.date.today', { defaultValue: 'Hari ini' });
  } else if (diffDays === 1) {
    relativeDayLabel = t('clinic.teledentistry.date.tomorrow', { defaultValue: 'Besok' });
  } else if (diffDays === -1) {
    relativeDayLabel = t('clinic.teledentistry.date.yesterday', { defaultValue: 'Kemarin' });
  } else {
    relativeDayLabel = startsAt.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
      day: 'numeric',
      month: 'short',
    });
  }

  const timeStr = startsAt.toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${relativeDayLabel}, ${timeStr}`;
};

const SessionDashboard = ({
  conversations = [],
  presenceMap = {},
  selectedAppointmentId,
  loading = false,
  onSelectConversation,
  onStartVideo,
  onViewPreSession,
}) => {
  const { t, language } = useLanguage();
  const { isDark } = useTheme();
  const [showAll, setShowAll] = useState(false);
  const [nowTick, setNowTick] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNowTick(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const statusLabels = useMemo(() => ({
    live: t('teledentistry.dashboard.status.live', { fallbackText: 'Live' }),
    waiting: t('teledentistry.dashboard.status.waiting', { fallbackText: 'Menunggu' }),
    upcoming: t('teledentistry.dashboard.status.upcoming', { fallbackText: 'Akan Datang' }),
    completed: t('teledentistry.dashboard.status.completed', { fallbackText: 'Selesai' }),
  }), [t]);

  const allSessions = useMemo(() => {
    return conversations
      .map((conversation) => {
        const startsAt = parseDateValue(
          conversation.startsAt
            || conversation.starts_at
            || conversation.appointmentStartsAt
            || conversation.scheduledAt
            || conversation.scheduled_time
            || conversation.appointment?.startsAt
            || conversation.appointment?.starts_at
            || conversation.appointment?.scheduledAt
            || conversation.appointment?.scheduled_time
        );
        const status = sessionStatus(conversation, presenceMap, nowTick);
        return {
          conversation,
          status,
          startsAt,
        };
      })
      .filter(({ startsAt, status }) => {
        // Always show live or waiting sessions
        if (status === 'live' || status === 'waiting') return true;

        if (!startsAt) return true;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const targetDate = new Date(startsAt);
        targetDate.setHours(0, 0, 0, 0);

        const diffTime = targetDate.getTime() - today.getTime();
        const diffDays = Math.round(diffTime / 86400000);

        // For completed sessions, only show if they were scheduled for today
        if (status === 'completed') {
          return diffDays === 0;
        }

        if (status === 'overdue') {
          return true;
        }

        // Show upcoming sessions
        return true;
      })
      .sort((a, b) => {
        const order = { live: 0, waiting: 1, upcoming: 2, overdue: 3, completed: 4 };
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
        return (a.startsAt?.getTime?.() || 0) - (b.startsAt?.getTime?.() || 0);
      });
  }, [conversations, presenceMap, nowTick]);

  const sessions = useMemo(() => {
    if (showAll) return allSessions;
    return allSessions.slice(0, 6);
  }, [allSessions, showAll]);

  if (loading) {
    return (
      <div className="flex-shrink-0 px-6 pt-2 pb-4 bg-surface/90 border-b border-border/40 shadow-sm backdrop-blur-md">
        <div className="mb-2.5 flex items-center gap-2">
          <div className="h-4 w-28 animate-pulse rounded bg-border/40" />
        </div>
        <div className="flex gap-2.5 overflow-x-auto py-2.5 -my-2.5 scrollbar-minimal">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-[62px] flex-shrink-0 animate-pulse rounded-2xl w-[220px] bg-surface-elevated border border-border/40 shadow-sm"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!allSessions.length) {
    return (
      <div className="flex-shrink-0 px-6 pt-2 pb-4 bg-surface/90 border-b border-border/40 shadow-sm backdrop-blur-md">
        <div className="mb-2.5 flex items-center gap-2">
          <span className="text-sm font-semibold text-primary">
            {t('teledentistry.dashboard.title', { fallbackText: 'Dashboard Sesi Hari Ini' })}
          </span>
        </div>
        <div className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-muted bg-surface-elevated border border-dashed border-border/60 shadow-sm">
          <Icon name="CalendarClock" size={16} className="text-accent" />
          <span>{t('teledentistry.dashboard.empty', { fallbackText: 'Tidak ada sesi hari ini' })}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 px-6 pt-2 pb-4 bg-surface/90 border-b border-border/40 shadow-sm backdrop-blur-md">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-primary">
            {t('teledentistry.dashboard.title', { fallbackText: 'Dashboard Sesi Hari Ini' })}
          </span>
          <span className="rounded-full px-2 py-0.5 text-xs font-medium text-accent bg-accent/10">
            {allSessions.length}
          </span>
        </div>
        <span className="text-[11px] text-muted">
          {t('teledentistry.dashboard.subtitle', { fallbackText: 'Live, menunggu, dan appointment virtual terdekat.' })}
        </span>
      </div>

      <div className="flex gap-2.5 overflow-x-auto py-2.5 -my-2.5 scrollbar-minimal">
        {sessions.map(({ conversation, status, startsAt }) => {
          const selected = selectedAppointmentId === conversation.appointmentId;
          const patient = conversation.patient || {};
          const cfg = statusConfig[status] || statusConfig.upcoming;
          const initials = getInitials(patient.name || 'Pasien');
          const avatarStyle = getAvatarGradient(patient.name || 'Pasien', isDark);

          return (
            <div
              key={conversation.appointmentId}
              role="button"
              tabIndex={0}
              onClick={() => onSelectConversation?.(conversation)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectConversation?.(conversation);
                }
              }}
              className={`flex flex-shrink-0 cursor-pointer items-center gap-3 rounded-2xl px-3.5 py-3 transition-all duration-300 hover:-translate-y-0.5 border shadow-theme-sm hover:shadow-theme-md ${selected ? 'bg-accent/5 border-accent/50 ring-1 ring-accent/15' : 'bg-surface-elevated border-border/50 hover:border-accent/30'}`}
              style={{ minWidth: '220px' }}
              title="Mulai Chat"
              aria-label={`${patient.name || 'Pasien'} ${statusLabels[status]}`}
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center text-xs font-bold text-white rounded-full overflow-hidden shadow-sm" style={avatarStyle}>
                {patient.avatar ? (
                  <img src={resolveMediaUrl(patient.avatar)} alt={patient.name || 'Pasien'} className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold text-primary">
                    {patient.name || 'Pasien'}
                  </span>
                  {status === 'live' ? (
                    <span className="relative flex h-2 w-2 flex-shrink-0" aria-label={statusLabels.live}>
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 bg-green-500" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                    </span>
                  ) : null}
                  {conversation.preSessionHealthFormStatus === 'submitted' || conversation.hasPreSessionHealthForm ? (
                    <Icon name="ClipboardCheck" size={12} className="text-green-500" title={t('teledentistry.dashboard.formSubmitted', { fallbackText: 'Form pra-sesi sudah diisi' })} />
                  ) : null}
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="font-mono text-[9px] text-muted">
                    #{conversation.appointmentId}
                  </span>
                  <span className="text-muted text-[9px]">·</span>
                  <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-bold border leading-none ${statusBadgeStyles[status]}`}>
                    {cfg.label}
                  </span>
                  <span className="text-muted text-[9px]">·</span>
                  <span className="font-mono text-[9px] text-muted">
                    {getRelativeDateLabel(startsAt, t, language)}
                  </span>
                </div>
              </div>

              {conversation.unreadCount > 0 ? (
                <span
                  className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white bg-accent"
                  style={{ animation: 'badgePulse 1.5s infinite' }}
                >
                  {conversation.unreadCount}
                </span>
              ) : null}

              <div className="flex flex-shrink-0 items-center gap-1.5">
                {(conversation.preSessionHealthFormStatus === 'submitted' || conversation.hasPreSessionHealthForm) && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onViewPreSession?.(conversation.appointmentId);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-xl transition-all duration-200 text-secondary bg-surface-elevated border border-border/40 hover:text-accent hover:border-accent/30 hover:shadow-sm"
                    title="Form pra-sesi"
                    aria-label="Form pra-sesi"
                  >
                    <Icon name="ClipboardList" size={12} />
                  </button>
                )}
                {status === 'overdue' ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectConversation?.(conversation);
                    }}
                    className="flex h-7 items-center gap-1.5 rounded-xl px-2.5 text-[11px] font-semibold transition-all duration-200 bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200/50 dark:border-orange-900/30 hover:bg-orange-500/15"
                    title="Lihat riwayat chat"
                    aria-label="Lihat riwayat chat"
                  >
                    <Icon name="History" size={12} />
                    <span>Riwayat</span>
                  </button>
                ) : (
                  <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onStartVideo?.(conversation.appointmentId);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-xl text-white transition-all duration-200 bg-accent hover:bg-accent-hover shadow-sm hover:scale-105"
                  title="Mulai Video"
                  aria-label="Mulai Video"
                >
                  <Icon name="Video" size={12} />
                </button>
                )}
              </div>
            </div>
          );
        })}

        {allSessions.length > 6 && (
          <button
            type="button"
            onClick={() => setShowAll((prev) => !prev)}
            className="flex flex-shrink-0 cursor-pointer items-center justify-center gap-2 rounded-2xl px-5 py-3 transition-all duration-300 bg-surface-elevated border border-border/50 hover:border-accent/30 hover:-translate-y-0.5 shadow-theme-sm text-sm font-semibold text-secondary hover:text-accent"
            style={{ minWidth: '150px' }}
          >
            <Icon name={showAll ? 'ChevronLeft' : 'ChevronRight'} size={16} />
            <span>{showAll ? 'Tampilkan Lebih Sedikit' : `+${allSessions.length - 6} Lainnya`}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default SessionDashboard;
