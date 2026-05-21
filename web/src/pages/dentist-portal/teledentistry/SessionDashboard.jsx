import React, { useMemo } from 'react';
import Icon from '../../../components/AppIcon';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { getAvatarGradient, getInitials } from '../../../utils/avatarGradients';

const toDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

function identityMatchesUser(rawIdentity, userId) {
  const identity = String(rawIdentity || '');
  const target = String(userId || '');
  if (!identity || !target) return false;
  return identity === target || identity.includes(`user-${target}`) || identity.includes(`user:${target}`) || identity.includes(target);
}

const sessionStatus = (conversation, presenceMap = {}) => {
  if (conversation.status === 'completed') return 'completed';
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
  live: { dot: '#22c55e', label: 'LIVE', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)' },
  waiting: { dot: '#f59e0b', label: 'WAITING', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  upcoming: { dot: '#7C3AED', label: 'UPCOMING', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.2)' },
  completed: { dot: '#6b7280', label: 'DONE', bg: 'rgba(107,114,128,0.05)', border: 'rgba(107,114,128,0.15)' },
};

const iconButtonStyle = {
  color: 'var(--td-text-muted)',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.06)',
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
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const statusLabels = useMemo(() => ({
    live: t('teledentistry.dashboard.status.live', { fallbackText: 'Live' }),
    waiting: t('teledentistry.dashboard.status.waiting', { fallbackText: 'Menunggu' }),
    upcoming: t('teledentistry.dashboard.status.upcoming', { fallbackText: 'Akan Datang' }),
    completed: t('teledentistry.dashboard.status.completed', { fallbackText: 'Selesai' }),
  }), [t]);

  const sessions = useMemo(() => {
    const todayKey = new Date().toDateString();
    return conversations
      .filter((conversation) => {
        const date = toDate(conversation.startsAt || conversation.appointmentStartsAt || conversation.scheduledAt);
        return !date || date.toDateString() === todayKey;
      })
      .map((conversation) => ({
        conversation,
        status: sessionStatus(conversation, presenceMap),
        startsAt: toDate(conversation.startsAt || conversation.appointmentStartsAt || conversation.scheduledAt),
      }))
      .sort((a, b) => {
        const order = { live: 0, waiting: 1, upcoming: 2, completed: 3 };
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
        return (a.startsAt?.getTime?.() || 0) - (b.startsAt?.getTime?.() || 0);
      })
      .slice(0, 6);
  }, [conversations, presenceMap]);

  if (loading) {
    return (
      <div className="flex-shrink-0 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="mb-2.5 flex items-center gap-2">
          <div className="h-4 w-1 rounded-full" style={{ background: 'var(--td-accent)' }} />
          <div className="h-3 w-36 animate-pulse rounded" style={{ background: 'rgba(255,255,255,0.08)' }} />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-minimal">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-[66px] flex-shrink-0 animate-pulse rounded-xl"
              style={{
                width: '220px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!sessions.length) {
    return (
      <div className="flex-shrink-0 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="mb-2.5 flex items-center gap-2">
          <div className="h-4 w-1 rounded-full" style={{ background: 'var(--td-accent)' }} />
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--td-text-sub)', letterSpacing: '0.08em' }}>
            {t('teledentistry.dashboard.title', { fallbackText: 'Dashboard Sesi Hari Ini' })}
          </span>
        </div>
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
          style={{
            color: 'var(--td-text-muted)',
            background: 'rgba(255,255,255,0.03)',
            border: '1px dashed rgba(124,58,237,0.25)',
          }}
        >
          <Icon name="CalendarClock" size={16} style={{ color: 'var(--td-accent)' }} />
          <span>{t('teledentistry.dashboard.empty', { fallbackText: 'Tidak ada sesi hari ini' })}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-4 w-1 rounded-full" style={{ background: 'var(--td-accent)' }} />
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--td-text-sub)', letterSpacing: '0.08em' }}>
            {t('teledentistry.dashboard.title', { fallbackText: 'Dashboard Sesi Hari Ini' })}
          </span>
          <span
            className="rounded-md px-1.5 py-0.5 font-mono text-xs"
            style={{ color: 'var(--td-accent)', background: 'rgba(124,58,237,0.12)' }}
          >
            {sessions.length}
          </span>
        </div>
        <span className="text-[10px] font-medium" style={{ color: 'var(--td-text-muted)' }}>
          {t('teledentistry.dashboard.subtitle', { fallbackText: 'Live, menunggu, dan appointment virtual terdekat.' })}
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-minimal">
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
              className="flex flex-shrink-0 cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: selected
                  ? 'linear-gradient(135deg, rgba(124,58,237,0.18), rgba(124,58,237,0.06))'
                  : cfg.bg,
                border: `1px solid ${selected ? 'rgba(124,58,237,0.5)' : cfg.border}`,
                boxShadow: selected ? '0 4px 16px rgba(124,58,237,0.2)' : 'none',
                minWidth: '220px',
              }}
              aria-label={`${patient.name || 'Pasien'} ${statusLabels[status]}`}
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center text-xs font-bold text-white" style={avatarStyle}>
                {patient.avatar ? (
                  <img src={patient.avatar} alt={patient.name || 'Pasien'} className="h-full w-full object-cover" style={{ borderRadius: '10px' }} />
                ) : (
                  initials
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold" style={{ color: 'var(--td-text-main)' }}>
                    {patient.name || 'Pasien'}
                  </span>
                  {status === 'live' ? (
                    <span className="relative flex h-2 w-2 flex-shrink-0" aria-label={statusLabels.live}>
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: cfg.dot }} />
                      <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: cfg.dot }} />
                    </span>
                  ) : null}
                  {conversation.preSessionHealthFormStatus === 'submitted' || conversation.hasPreSessionHealthForm ? (
                    <Icon name="ClipboardCheck" size={12} style={{ color: '#22c55e' }} title={t('teledentistry.dashboard.formSubmitted', { fallbackText: 'Form pra-sesi sudah diisi' })} />
                  ) : null}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="font-mono text-[9px]" style={{ color: 'var(--td-text-muted)' }}>
                    #{conversation.appointmentId}
                  </span>
                  <span style={{ color: 'var(--td-text-muted)', fontSize: '9px' }}>·</span>
                  <span className="font-bold uppercase tracking-wider text-[9px]" style={{ color: cfg.dot }} title={statusLabels[status]}>
                    {cfg.label}
                  </span>
                  <span style={{ color: 'var(--td-text-muted)', fontSize: '9px' }}>·</span>
                  <span className="font-mono text-[9px]" style={{ color: 'var(--td-text-muted)' }}>
                    {startsAt ? startsAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Hari ini'}
                  </span>
                </div>
              </div>

              {conversation.unreadCount > 0 ? (
                <span
                  className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white"
                  style={{ background: 'var(--td-accent)', animation: 'badgePulse 1.5s infinite' }}
                >
                  {conversation.unreadCount}
                </span>
              ) : null}

              <div className="flex flex-shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectConversation?.(conversation);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-150 hover:scale-110"
                  style={iconButtonStyle}
                  title="Mulai Chat"
                  aria-label="Mulai Chat"
                >
                  <Icon name="MessageCircle" size={12} />
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onViewPreSession?.(conversation.appointmentId);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-150 hover:scale-110"
                  style={iconButtonStyle}
                  title="Form"
                  aria-label="Form pra-sesi"
                >
                  <Icon name="ClipboardList" size={12} />
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onStartVideo?.(conversation.appointmentId);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-white transition-all duration-150 hover:scale-110"
                  style={{
                    background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                    boxShadow: '0 2px 8px rgba(124,58,237,0.35)',
                  }}
                  title="Mulai Video"
                  aria-label="Mulai Video"
                >
                  <Icon name="Video" size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SessionDashboard;
