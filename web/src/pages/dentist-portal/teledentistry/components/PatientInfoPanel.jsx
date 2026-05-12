import React from 'react';
import Icon from '../../../../components/AppIcon';
import ParticipantInvitePanel from './ParticipantInvitePanel';

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

const DetailRow = ({ label, value }) => (
  <div className="rounded-lg border border-primary/10 bg-surface px-3 py-2">
    <dt className="text-[10px] uppercase tracking-wide text-muted">{label}</dt>
    <dd className="mt-1 text-xs text-primary leading-relaxed whitespace-pre-wrap">
      {value || 'Tidak diisi'}
    </dd>
  </div>
);

const PreSessionHealthFormCard = ({ state }) => {
  const status = state?.status || 'idle';
  const form = state?.form || null;

  if (status === 'loading') {
    return (
      <div className="p-4 border-b border-primary/10 theme-transition">
        <div className="rounded-xl border border-primary/10 bg-surface p-3">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Icon name="Loader2" size={14} className="animate-spin" />
            Memuat pre-session form...
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="p-4 border-b border-primary/10 theme-transition">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 rounded-lg bg-amber-500/10 p-2 text-amber-700">
              <Icon name="AlertTriangle" size={15} />
            </span>
            <div>
              <h5 className="text-xs font-semibold text-primary">Pre-session health form</h5>
              <p className="mt-1 text-xs text-muted leading-relaxed">
                Form pra-sesi belum dapat dimuat. Sesi tetap dapat berjalan karena form ini opsional.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="p-4 border-b border-primary/10 theme-transition">
        <div className="rounded-xl border border-dashed border-primary/20 bg-surface p-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 rounded-lg bg-accent/10 p-2 text-accent">
              <Icon name="ClipboardList" size={15} />
            </span>
            <div>
              <h5 className="text-xs font-semibold text-primary">Pre-session health form</h5>
              <p className="mt-1 text-xs text-muted leading-relaxed">
                Pasien belum mengisi form pra-sesi. Form ini opsional, jadi sesi tetap dapat berjalan.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-b border-primary/10 theme-transition space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h5 className="text-xs font-semibold text-primary">Pre-session health form</h5>
          <p className="text-[11px] text-muted mt-0.5">
            Diisi pasien {form.submittedAt ? new Date(form.submittedAt).toLocaleString('id-ID') : ''}
          </p>
        </div>
        <span className="rounded-full bg-green-500/10 px-2 py-1 text-[10px] font-semibold text-green-700">
          Submitted
        </span>
      </div>

      <dl className="space-y-2">
        <DetailRow label="Keluhan utama" value={form.symptoms} />
        <div className="rounded-lg border border-primary/10 bg-surface px-3 py-2">
          <dt className="text-[10px] uppercase tracking-wide text-muted">Skala nyeri</dt>
          <dd className="mt-1 flex items-center gap-2 text-xs text-primary">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 font-bold text-accent">
              {form.painLevel ?? '-'}
            </span>
            <span>{form.painLevel ? `${form.painLevel}/10` : 'Tidak diisi'}</span>
          </dd>
        </div>
        <DetailRow label="Alergi" value={form.allergies} />
        <DetailRow label="Obat yang dikonsumsi" value={form.medications} />
        <DetailRow label="Catatan tambahan" value={form.notes} />
      </dl>
    </div>
  );
};

const PatientInfoPanel = ({
  conversation,
  presence = [],
  preSessionHealthForm,
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

          <PreSessionHealthFormCard state={preSessionHealthForm} />

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

          <ParticipantInvitePanel appointmentId={appointmentId} />

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
