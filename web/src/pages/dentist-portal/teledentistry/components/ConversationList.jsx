import React, { useMemo, useState, useEffect } from 'react';
import Icon from '../../../../components/AppIcon';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { getAvatarGradient, getInitials } from '../../../../utils/avatarGradients';
import { resolveMediaUrl } from '../../../../utils/media';

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
      className="text-accent/30 mb-4"
      style={{
        animation: 'pulseGlow 3s infinite alternate',
      }}
    />
    <p className="text-sm font-medium text-secondary">
      No active sessions
    </p>
    <p className="mt-1 text-xs text-muted">
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
      className={`group relative flex w-full items-stretch text-left outline-none transition-all duration-200 rounded-2xl border ${
        active
          ? 'bg-accent/5 border-accent/40 ring-2 ring-accent/10 shadow-sm'
          : 'bg-surface border-border/40 hover:bg-surface-elevated hover:border-accent/20'
      }`}
    >
      <div className="flex min-w-0 flex-1 gap-3 px-3.5 py-3 transition-colors duration-200">
        <div className="relative flex-shrink-0">
          <div
            className={`flex h-11 w-11 items-center justify-center overflow-hidden text-sm font-bold text-white shadow-sm rounded-2xl ${active ? 'shadow-md shadow-accent/20' : ''}`}
            style={avatarStyle}
          >
            {conversation.patient?.avatar ? (
              <img src={resolveMediaUrl(conversation.patient.avatar)} alt={name} className="h-full w-full object-cover rounded-2xl" />
            ) : (
              getInitials(name)
            )}
          </div>
          {online && (
            <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-35" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 bg-green-500 border-surface" />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className={`truncate text-sm font-semibold ${active ? 'text-primary' : 'text-secondary'}`}>
              {name}
            </h4>
            <span className="flex-shrink-0 text-right font-mono text-[10px] text-muted">
              {formatTime(lastMessage?.createdAt)}
            </span>
          </div>

          <div className={`mt-1 flex min-w-0 items-center gap-1.5 text-xs ${active ? 'text-secondary' : 'text-muted'}`}>
            {lastMessage?.messageType === 'file' ? (
              <>
                <Icon name="Paperclip" size={12} className="flex-shrink-0 text-accent/70" />
                <span className="truncate">Shared file: {lastMessage.fileName || 'Attachment'}</span>
              </>
            ) : (
              <span className="truncate">{lastMessage?.message || 'No messages yet'}</span>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between">
            <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-accent/10 text-accent">
              #{conversation.appointmentId}
            </span>
            {unread > 0 && (
              <span
                className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-xs font-bold text-white bg-accent"
                style={{ animation: 'badgePulse 1.5s infinite' }}
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
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const { isDark } = useTheme();
  const { t } = useLanguage();

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const isOnline = (conversation) => {
    const ids = presenceMap[conversation.appointmentId];
    if (!ids || ids.length === 0) return false;
    return ids.some((id) => id !== conversation.dentist?.id);
  };

  const filteredConversations = useMemo(() => {
    const query = debouncedQuery.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((conversation) => {
      const patient = conversation.patient || {};
      return [patient.name, patient.email, String(conversation.appointmentId || '')]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [conversations, debouncedQuery]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-surface/50 border-r border-border/40 rounded-l-2xl">
      <div className="flex-shrink-0 px-4 py-3 bg-surface/80 backdrop-blur-md border-b border-border/40 rounded-tl-2xl">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted" style={{ letterSpacing: '0.1em' }}>
          Serene Chat
        </h2>
        <div className="relative">
          <Icon
            name="Search"
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t('dentistTeledentistry.search.placeholder')}
            className="w-full rounded-xl py-2 pl-8 pr-3 text-xs transition-all duration-300 focus:outline-none bg-surface border border-border text-primary focus:border-accent focus:ring-1 focus:ring-accent/20"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-minimal p-3 space-y-2">
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
