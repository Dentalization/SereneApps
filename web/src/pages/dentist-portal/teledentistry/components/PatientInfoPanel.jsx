import React from 'react';
import Icon from '../../../../components/AppIcon';

const formatTimeAgo = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const diff = Date.now() - date.getTime();
  if (diff < 60 * 1000) return 'just now';
  const minutes = Math.floor(diff / (60 * 1000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
};

const CollapsedPanel = ({ isExpanded, onToggleExpanded }) => (
  <div className={`${isExpanded ? 'w-80' : 'w-12'} bg-surface-elevated border-l border-primary/20 flex flex-col theme-transition transition-all duration-300`}>
    <div className="p-4 border-b border-primary/20 theme-transition flex items-center justify-between">
      {isExpanded && <h3 className="text-sm font-semibold text-primary">Patient Information</h3>}
      <button
        onClick={() => onToggleExpanded?.(!isExpanded)}
        className="p-1.5 text-muted hover:text-primary hover:bg-accent/10 rounded-lg theme-transition"
        aria-label={isExpanded ? 'Collapse patient panel' : 'Expand patient panel'}
      >
        <Icon name={isExpanded ? 'ChevronRight' : 'ChevronLeft'} size={16} />
      </button>
    </div>
    {isExpanded && (
      <div className="flex-1 flex items-center justify-center text-muted text-sm p-4 text-center">
        Select a conversation to view patient details
      </div>
    )}
  </div>
);

const PatientInfoPanel = ({
  conversation,
  presence = [],
  onScheduleAppointment,
  onViewMedicalHistory,
  isExpanded,
  onToggleExpanded
}) => {
  if (!conversation) {
    return <CollapsedPanel isExpanded={isExpanded} onToggleExpanded={onToggleExpanded} />;
  }

  const patient = conversation.patient || {};
  const appointmentId = conversation.appointmentId;
  const patientId = patient.id?.toString?.() ?? patient.id ?? '';
  const online = presence.map((id) => id?.toString?.() ?? id).includes(patientId);
  const lastMessage = conversation.lastMessage;

  const quickActions = [
    onScheduleAppointment && {
      icon: 'Calendar',
      label: 'Schedule follow-up',
      action: onScheduleAppointment,
      color: 'bg-accent/10 text-accent hover:bg-accent/20'
    },
    onViewMedicalHistory && {
      icon: 'FileText',
      label: 'View medical history',
      action: onViewMedicalHistory,
      color: 'bg-purple-500/10 text-purple-600 hover:bg-purple-500/20'
    }
  ].filter(Boolean);

  return (
    <div className={`${isExpanded ? 'w-80' : 'w-12'} bg-surface-elevated border-l border-primary/20 flex flex-col theme-transition transition-all duration-300`}>
      <div className="p-4 border-b border-primary/20 theme-transition flex items-center justify-between">
        {isExpanded && <h3 className="text-sm font-semibold text-primary">Patient Information</h3>}
        <button
          onClick={() => onToggleExpanded?.(!isExpanded)}
          className="p-1.5 text-muted hover:text-primary hover:bg-accent/10 rounded-lg theme-transition"
          aria-label={isExpanded ? 'Collapse patient panel' : 'Expand patient panel'}
        >
          <Icon name={isExpanded ? 'ChevronRight' : 'ChevronLeft'} size={16} />
        </button>
      </div>

      {isExpanded && (
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 border-b border-primary/10 theme-transition">
            <div className="text-center mb-4">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-3 overflow-hidden border border-primary/10 bg-accent/10 flex items-center justify-center text-accent">
                {patient.avatar ? (
                  <img src={patient.avatar} alt={patient.name || 'Patient avatar'} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-bold">
                    {(patient.name || 'Patient')
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()}
                  </span>
                )}
              </div>
              <h4 className="text-sm font-semibold text-primary">
                {patient.name || 'Unknown patient'}
              </h4>
              <p className="text-xs text-muted">Appointment #{appointmentId}</p>
              <p className={`text-xs mt-2 ${online ? 'text-green-600' : 'text-muted'}`}>
                {online ? 'Online now' : 'Offline'}
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1">
                <span className="text-muted">Email</span>
                <span className="text-primary font-medium truncate max-w-[10rem]" title={patient.email || 'Not provided'}>
                  {patient.email || 'Not provided'}
                </span>
              </div>
              {patient.phone && (
                <div className="flex justify-between py-1">
                  <span className="text-muted">Phone</span>
                  <span className="text-primary font-medium truncate max-w-[10rem]" title={patient.phone}>
                    {patient.phone}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-1">
                <span className="text-muted">Role</span>
                <span className="text-primary font-medium capitalize">
                  {conversation.role || 'patient'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 border-b border-primary/10 theme-transition space-y-3">
            <h5 className="text-xs font-semibold text-primary">Conversation Overview</h5>
            <div className="space-y-2.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted">Unread messages</span>
                <span className="text-primary font-semibold">{conversation.unreadCount || 0}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">Last activity</span>
                <span className="text-primary font-medium">
                  {formatTimeAgo(lastMessage?.createdAt)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">Last read</span>
                <span className="text-primary font-medium">
                  {conversation.lastReadAt ? formatTimeAgo(conversation.lastReadAt) : '—'}
                </span>
              </div>
            </div>

            {lastMessage && (
              <div className="rounded-xl border border-primary/10 bg-surface p-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted uppercase tracking-wide">Last message</span>
                  <span className="text-muted">{formatTimeAgo(lastMessage.createdAt)}</span>
                </div>
                <p className="text-primary">
                  {lastMessage.messageType === 'file'
                    ? `Shared file: ${lastMessage.fileName || 'Attachment'}`
                    : lastMessage.message}
                </p>
              </div>
            )}
          </div>

          {quickActions.length > 0 && (
            <div className="p-4 border-b border-primary/10 theme-transition">
              <h5 className="text-xs font-semibold text-primary mb-3">Quick actions</h5>
              <div className="grid grid-cols-1 gap-2">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.action}
                    className={`p-3 rounded-xl text-left transition-all duration-200 theme-transition ${action.color}`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="p-2 rounded-lg bg-white/20">
                        <Icon name={action.icon} size={16} />
                      </span>
                      <span className="text-xs font-medium">{action.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 text-xs text-muted space-y-2">
            <p>
              Chat, video, and attachments are linked to appointment #{appointmentId}. Downloads require an authenticated session and follow the attachment size/type policy.
            </p>
            <p>
              Need more context? Open the appointment record or patient profile from the clinic dashboard; this panel mirrors live data from the communications API.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientInfoPanel;
