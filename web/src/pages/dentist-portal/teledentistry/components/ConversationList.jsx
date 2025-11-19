import React from 'react';
import Icon from '../../../../components/AppIcon';

const ConversationList = ({ conversations, presenceMap, selectedAppointmentId, onConversationSelect }) => {
  const formatDisplayName = (conversation) => conversation.patient?.name || 'Unknown Patient';

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60 * 60 * 1000) {
      return `${Math.max(1, Math.floor(diff / (60 * 1000)))}m ago`;
    }
    if (diff < 24 * 60 * 60 * 1000) {
      return `${Math.floor(diff / (60 * 60 * 1000))}h ago`;
    }
    return date.toLocaleDateString();
  };

  const isOnline = (conversation) => {
    const ids = presenceMap[conversation.appointmentId];
    if (!ids || ids.length === 0) return false;
    return ids.some((id) => id !== conversation.dentist?.id);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          <div className="w-12 h-12 bg-surface-elevated rounded-lg flex items-center justify-center mb-3 border border-primary/10">
            <Icon name="MessageCircle" size={20} className="text-muted" />
          </div>
          <p className="text-sm text-muted">No conversations</p>
        </div>
      ) : (
        <div className="space-y-1 px-2 pt-4">
          {conversations.map((conversation) => {
            const active = selectedAppointmentId === conversation.appointmentId;
            const lastMessage = conversation.lastMessage;
            const unreadCount = conversation.unreadCount || 0;
            const online = isOnline(conversation);

            return (
              <div
                key={conversation.appointmentId}
                onClick={() => onConversationSelect(conversation)}
                className={`mx-2 mb-1 rounded-xl cursor-pointer theme-transition relative transition-all duration-200 ${
                  active
                    ? 'bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/20 shadow-lg shadow-accent/10'
                    : 'hover:bg-surface/50 hover:shadow-sm'
                }`}
              >
                <div className="px-4 py-3">
                  <div className="flex items-start space-x-3">
                    <div className="relative flex-shrink-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center theme-transition border-2 transition-all duration-200 ${
                        active ? 'bg-accent text-white border-accent shadow-lg' : 'bg-surface border-primary/10'
                      }`}>
                        {conversation.patient?.avatar ? (
                          <img
                            src={conversation.patient.avatar}
                            alt={formatDisplayName(conversation)}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <span className={`text-xs font-bold transition-colors duration-200 ${
                            active ? 'text-white' : 'text-muted'
                          }`}>
                            {formatDisplayName(conversation)
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .toUpperCase()}
                          </span>
                        )}
                      </div>
                      {online && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border border-surface-elevated"></div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h4 className={`text-sm font-semibold truncate theme-transition transition-colors duration-200 ${
                          active ? 'text-accent' : 'text-primary'
                        }`}>
                          {formatDisplayName(conversation)}
                        </h4>
                        <span className="text-xs text-muted theme-transition ml-2 flex-shrink-0">
                          {formatTime(lastMessage?.createdAt)}
                        </span>
                      </div>

                      <p className={`text-xs truncate mb-2 theme-transition transition-colors duration-200 ${
                        active ? 'text-accent/80' : 'text-secondary'
                      }`}>
                        {lastMessage?.messageType === 'file'
                          ? `Shared file: ${lastMessage.fileName || 'Attachment'}`
                          : lastMessage?.message || 'No messages yet'}
                      </p>

                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary/5 text-primary">
                          #{conversation.appointmentId}
                        </span>
                        {unreadCount > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] text-xs font-medium text-white bg-accent rounded-full">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ConversationList;
