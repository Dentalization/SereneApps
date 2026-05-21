import React, { useMemo, useState } from 'react';
import Icon from '../../../../components/AppIcon';
import { useTheme } from '../../../../contexts/ThemeContext';
import { getAvatarGradient, getInitials } from '../../../../utils/avatarGradients';

const formatDisplayName = (conversation) => conversation.patient?.name || 'Unknown Patient';

const formatTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60 * 60 * 1000) {
    return `${Math.max(1, Math.floor(diff / (60 * 1000)))}m`;
  }
  if (diff < 24 * 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 60 * 1000))}h`;
  }
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
};

const EmptyContactState = () => (
  <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
    <Icon
      name="Inbox"
      size={32}
      style={{
        color: 'rgba(124,58,237,0.3)',
        marginBottom: '1rem',
        animation: 'pulseGlow 3s infinite alternate',
      }}
    />
    <p className="text-sm font-medium" style={{ color: 'var(--td-text-sub)' }}>
      No active sessions
    </p>
    <p className="mt-1 text-xs" style={{ color: 'var(--td-text-muted)' }}>
      Incoming appointments will appear here
    </p>
  </div>
);

const ConversationRow = ({ conversation, active, online, onSelect, isDark }) => {
  const name = formatDisplayName(conversation);
  const lastMessage = conversation.lastMessage;
  const unread = conversation.unreadCount || 0;
  const avatarStyle = getAvatarGradient(name, isDark);

  return (
    <button
      onClick={onSelect}
      aria-selected={active}
      role="tab"
      className="group relative flex w-full items-stretch text-left outline-none transition-all duration-200 hover:translate-x-[3px]"
      style={{
        background: active ? 'linear-gradient(90deg, rgba(124,58,237,0.18), rgba(124,58,237,0.04) 68%, transparent)' : 'transparent',
        borderLeft: `3px solid ${active ? 'var(--td-accent)' : 'transparent'}`,
      }}
    >
      <div
        className="flex min-w-0 flex-1 gap-3 px-4 py-3 transition-colors duration-200"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.035)',
        }}
      >
        <div className="relative flex-shrink-0">
          <div
            className="flex h-11 w-11 items-center justify-center overflow-hidden text-sm font-bold text-white"
            style={{
              ...avatarStyle,
              boxShadow: active ? '0 8px 20px rgba(124,58,237,0.25)' : '0 4px 12px rgba(0,0,0,0.25)',
            }}
          >
            {conversation.patient?.avatar ? (
              <img src={conversation.patient.avatar} alt={name} className="h-full w-full object-cover" />
            ) : (
              getInitials(name)
            )}
          </div>
          {online && (
            <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-35" />
              <span
                className="relative inline-flex h-3.5 w-3.5 rounded-full border-2"
                style={{
                  background: '#22c55e',
                  borderColor: 'var(--td-panel-bg)',
                  boxShadow: '0 0 0 2px rgba(34,197,94,0.22)',
                }}
              />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="truncate text-sm font-semibold" style={{ color: active ? 'var(--td-text-main)' : 'var(--td-text-sub)' }}>
              {name}
            </h4>
            <span className="flex-shrink-0 text-right font-mono text-[10px]" style={{ color: 'var(--td-text-muted)' }}>
              {formatTime(lastMessage?.createdAt)}
            </span>
          </div>

          <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs" style={{ color: active ? 'rgba(241,238,255,0.72)' : 'var(--td-text-muted)' }}>
            {lastMessage?.messageType === 'file' ? (
              <>
                <Icon name="Paperclip" size={12} className="flex-shrink-0" style={{ color: 'rgba(124,58,237,0.65)' }} />
                <span className="truncate">Shared file: {lastMessage.fileName || 'Attachment'}</span>
              </>
            ) : (
              <span className="truncate">{lastMessage?.message || 'No messages yet'}</span>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between">
            <span
              className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium"
              style={{ background: 'rgba(124,58,237,0.1)', color: 'rgba(167,139,250,0.85)' }}
            >
              #{conversation.appointmentId}
            </span>
            {unread > 0 && (
              <span
                className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-xs font-bold text-white"
                style={{
                  background: 'var(--td-accent)',
                  boxShadow: '0 0 14px rgba(124,58,237,0.45)',
                  animation: 'badgePulse 1.5s infinite',
                }}
              >
                {unread}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
};

const ConversationList = ({ conversations, presenceMap, selectedAppointmentId, onConversationSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { isDark } = useTheme();

  const isOnline = (conversation) => {
    const ids = presenceMap[conversation.appointmentId];
    if (!ids || ids.length === 0) return false;
    return ids.some((id) => id !== conversation.dentist?.id);
  };

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((conversation) => {
      const patient = conversation.patient || {};
      return [patient.name, patient.email, String(conversation.appointmentId || '')]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [conversations, searchQuery]);

  return (
    <div
      className="flex flex-1 flex-col overflow-hidden"
      style={{
        background: 'rgba(15,13,26,0.6)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div
        className="flex-shrink-0 px-4 py-3"
        style={{
          background: 'linear-gradient(180deg, rgba(15,13,26,0.9) 0%, rgba(15,13,26,0.4) 100%)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <h2 className="mb-2 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--td-text-muted)', letterSpacing: '0.1em' }}>
          Percakapan
        </h2>
        <div className="relative">
          <Icon
            name="Search"
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--td-text-muted)' }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Cari pasien..."
            className="w-full rounded-xl py-2 pl-8 pr-3 text-xs transition-all duration-300 focus:outline-none"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--td-text-main)',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
            }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-minimal">
        {filteredConversations.length === 0 ? (
          <EmptyContactState />
        ) : (
          filteredConversations.map((conversation) => (
            <ConversationRow
              key={conversation.appointmentId}
              conversation={conversation}
              active={selectedAppointmentId === conversation.appointmentId}
              online={isOnline(conversation)}
              onSelect={() => onConversationSelect(conversation)}
              isDark={isDark}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default ConversationList;
