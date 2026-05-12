import React, { useMemo } from 'react';
import Icon from '../../../components/AppIcon';

const toDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const sessionStatus = (conversation, presenceMap = {}) => {
  if (conversation.status === 'completed') return 'completed';
  const patientId = conversation.patient?.id?.toString?.() || conversation.patientId?.toString?.();
  const online = patientId && presenceMap?.[patientId];
  if (conversation.videoRoomRef && online) return 'live';
  return online ? 'waiting' : 'upcoming';
};

const statusStyles = {
  live: 'border-green-400 bg-green-500/5 text-green-700',
  waiting: 'border-amber-300 bg-amber-500/5 text-amber-700',
  upcoming: 'border-primary/15 bg-surface-elevated text-primary',
  completed: 'border-slate-200 bg-slate-50 text-slate-500 opacity-75',
};

const SessionDashboard = ({
  conversations = [],
  presenceMap = {},
  selectedAppointmentId,
  onSelectConversation,
  onStartVideo,
  onViewPreSession,
}) => {
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

  if (!sessions.length) return null;

  return (
    <div className="border-b border-primary/10 bg-surface px-5 py-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-primary">Dashboard Sesi Hari Ini</h2>
          <p className="text-xs text-muted">Live, menunggu, dan appointment virtual terdekat.</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {sessions.length} sesi
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        {sessions.map(({ conversation, status, startsAt }) => {
          const selected = selectedAppointmentId === conversation.appointmentId;
          const patient = conversation.patient || {};
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
              className={`min-w-0 rounded-xl border p-3 text-left transition ${statusStyles[status]} ${selected ? 'ring-2 ring-primary/30' : ''} ${status === 'live' ? 'animate-pulse' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 text-sm font-bold text-primary">
                  {(patient.name || 'P').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-primary">{patient.name || 'Pasien'}</p>
                    {conversation.preSessionHealthFormStatus === 'submitted' || conversation.hasPreSessionHealthForm ? (
                      <Icon name="ClipboardCheck" size={14} className="text-green-600" />
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {startsAt ? startsAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Hari ini'} · {status}
                  </p>
                </div>
                {conversation.unreadCount > 0 ? (
                  <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    {conversation.unreadCount}
                  </span>
                ) : null}
              </div>
              <div className="mt-3 flex gap-2">
                <span className="inline-flex items-center gap-1 rounded-lg bg-white/70 px-2 py-1 text-[11px] font-semibold">
                  <Icon name="MessageCircle" size={12} /> Mulai Chat
                </span>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onStartVideo?.(conversation.appointmentId);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-white/70 px-2 py-1 text-[11px] font-semibold"
                >
                  <Icon name="Video" size={12} /> Mulai Video
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onViewPreSession?.(conversation.appointmentId);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-white/70 px-2 py-1 text-[11px] font-semibold"
                >
                  <Icon name="ClipboardList" size={12} /> Form
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
