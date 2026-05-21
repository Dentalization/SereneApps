import React from 'react';
import Icon from '../../../../components/AppIcon';
import ParticipantInvitePanel from './ParticipantInvitePanel';

const AVATAR_GRADIENTS = [
  ['#7C3AED', '#4f46e5'],
  ['#6d28d9', '#9333ea'],
  ['#4f46e5', '#0ea5e9'],
  ['#7c3aed', '#ec4899'],
  ['#2563eb', '#7c3aed'],
  ['#9333ea', '#db2777'],
  ['#0891b2', '#7c3aed'],
  ['#d97706', '#7c3aed'],
];

function getAvatarGradient(name = '') {
  const hash = [...String(name)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const [from, to] = AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
  return { background: `linear-gradient(135deg, ${from}, ${to})` };
}

function getInitials(name = '') {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';
}

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

const panelStyle = (isExpanded) => ({
  width: isExpanded ? '300px' : '44px',
  minWidth: isExpanded ? '300px' : '44px',
  background: 'rgba(15,13,26,0.7)',
  backdropFilter: 'blur(12px)',
  borderLeft: '1px solid rgba(255,255,255,0.05)',
});

const toggleButtonStyle = {
  color: 'var(--td-text-muted)',
  background: 'transparent',
};

const InfoCard = ({ title, children }) => (
  <div
    className="mx-3 mb-2 rounded-xl p-3"
    style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.05)',
    }}
  >
    <p className="mb-2 text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--td-text-muted)' }}>
      {title}
    </p>
    {children}
  </div>
);

const InfoRow = ({ label, value }) => (
  <div className="flex items-start justify-between py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
    <span className="text-[10px]" style={{ color: 'var(--td-text-muted)' }}>
      {label}
    </span>
    <span className="max-w-[58%] text-right text-[11px] font-medium leading-relaxed" style={{ color: 'var(--td-text-sub)' }}>
      {value || <span style={{ color: 'var(--td-text-muted)', fontStyle: 'italic' }}>—</span>}
    </span>
  </div>
);

const DetailRow = ({ label, value }) => (
  <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
    <dt className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--td-text-muted)' }}>{label}</dt>
    <dd className="mt-1 whitespace-pre-wrap text-xs leading-relaxed" style={{ color: 'var(--td-text-sub)' }}>
      {value || 'Tidak diisi'}
    </dd>
  </div>
);

const CollapsedPanel = ({ isExpanded, onToggleExpanded }) => (
  <div className="flex flex-shrink-0 flex-col overflow-hidden transition-all duration-300" style={panelStyle(isExpanded)}>
    <div className="flex flex-shrink-0 items-center justify-between px-3 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      {isExpanded && (
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--td-text-muted)' }}>
          Patient Info
        </span>
      )}
      <button
        onClick={() => onToggleExpanded?.(!isExpanded)}
        className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-150 hover:scale-105"
        style={toggleButtonStyle}
        aria-label={isExpanded ? 'Collapse patient panel' : 'Expand patient panel'}
      >
        <Icon name={isExpanded ? 'ChevronRight' : 'ChevronLeft'} size={14} />
      </button>
    </div>
    {isExpanded && (
      <div className="flex flex-1 items-center justify-center p-4 text-center text-sm" style={{ color: 'var(--td-text-muted)' }}>
        Select a conversation to view patient details
      </div>
    )}
  </div>
);

const PreSessionHealthFormCard = ({ state }) => {
  const status = state?.status || 'idle';
  const form = state?.form || null;

  if (status === 'loading') {
    return (
      <InfoCard title="Pre-session health form">
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--td-text-muted)' }}>
          <Icon name="Loader2" size={14} className="animate-spin" />
          Memuat pre-session form...
        </div>
      </InfoCard>
    );
  }

  if (status === 'error') {
    return (
      <InfoCard title="Pre-session health form">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 rounded-lg p-2" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
            <Icon name="AlertTriangle" size={15} />
          </span>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--td-text-sub)' }}>
            Form pra-sesi belum dapat dimuat. Sesi tetap dapat berjalan karena form ini opsional.
          </p>
        </div>
      </InfoCard>
    );
  }

  if (!form) {
    return (
      <InfoCard title="Pre-session health form">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 rounded-lg p-2" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
            <Icon name="ClipboardList" size={15} />
          </span>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--td-text-sub)' }}>
            Pasien belum mengisi form pra-sesi. Form ini opsional, jadi sesi tetap dapat berjalan.
          </p>
        </div>
      </InfoCard>
    );
  }

  return (
    <InfoCard title="Pre-session health form">
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="text-[11px]" style={{ color: 'var(--td-text-muted)' }}>
          Diisi pasien {form.submittedAt ? new Date(form.submittedAt).toLocaleString('id-ID') : ''}
        </p>
        <span
          className="rounded-full px-2 py-1 text-[10px] font-semibold"
          style={{ color: '#86efac', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}
        >
          Submitted
        </span>
      </div>
      <dl className="space-y-2">
        <DetailRow label="Keluhan utama" value={form.symptoms} />
        <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <dt className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--td-text-muted)' }}>Skala nyeri</dt>
          <dd className="mt-1 flex items-center gap-2 text-xs" style={{ color: 'var(--td-text-sub)' }}>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full font-bold" style={{ background: 'rgba(124,58,237,0.12)', color: 'var(--td-accent)' }}>
              {form.painLevel ?? '-'}
            </span>
            <span>{form.painLevel ? `${form.painLevel}/10` : 'Tidak diisi'}</span>
          </dd>
        </div>
        <DetailRow label="Alergi" value={form.allergies} />
        <DetailRow label="Obat yang dikonsumsi" value={form.medications} />
        <DetailRow label="Catatan tambahan" value={form.notes} />
      </dl>
    </InfoCard>
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
  const patientName = patient.name || 'Unknown patient';

  const quickActions = [
    onScheduleAppointment && {
      icon: 'Calendar',
      label: 'Schedule follow-up',
      action: onScheduleAppointment,
    },
    onViewMedicalHistory && {
      icon: 'FileText',
      label: 'View medical history',
      action: onViewMedicalHistory,
    }
  ].filter(Boolean);

  return (
    <div className="flex flex-shrink-0 flex-col overflow-hidden transition-all duration-300" style={panelStyle(isExpanded)}>
      <div className="flex flex-shrink-0 items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {isExpanded && (
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--td-text-muted)' }}>
            Patient Info
          </span>
        )}
        <button
          onClick={() => onToggleExpanded?.(!isExpanded)}
          className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-150 hover:scale-105"
          style={toggleButtonStyle}
          aria-label={isExpanded ? 'Collapse patient panel' : 'Expand patient panel'}
        >
          <Icon name={isExpanded ? 'ChevronRight' : 'ChevronLeft'} size={14} />
        </button>
      </div>

      {isExpanded && (
        <div className="flex-1 overflow-y-auto scrollbar-minimal">
          <div className="flex flex-col items-center px-4 py-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div
              className="mb-3 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full text-2xl font-bold text-white"
              style={{
                ...getAvatarGradient(patientName),
                boxShadow: '0 8px 24px rgba(124,58,237,0.3)',
              }}
            >
              {patient.avatar ? (
                <img src={patient.avatar} alt={patientName} className="h-full w-full object-cover" />
              ) : (
                getInitials(patientName)
              )}
            </div>
            <h4 className="text-center text-sm font-bold" style={{ color: 'var(--td-text-main)' }}>
              {patientName}
            </h4>
            <div className="mt-1 flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full" style={{ background: online ? '#22c55e' : 'var(--td-text-muted)' }} />
              <span className="text-[11px]" style={{ color: 'var(--td-text-muted)' }}>
                {online ? 'Online' : 'Offline'} · #{appointmentId}
              </span>
            </div>
          </div>

          <div className="py-3">
            <InfoCard title="Patient Details">
              <InfoRow label="Email" value={patient.email || 'Not provided'} />
              {patient.phone && <InfoRow label="Phone" value={patient.phone} />}
              <InfoRow label="Role" value={conversation.role || 'patient'} />
            </InfoCard>

            <PreSessionHealthFormCard state={preSessionHealthForm} />

            <InfoCard title="Conversation">
              <InfoRow label="Unread" value={conversation.unreadCount || 0} />
              <InfoRow label="Last activity" value={formatTimeAgo(lastMessage?.createdAt)} />
              <InfoRow label="Last read" value={conversation.lastReadAt ? formatTimeAgo(conversation.lastReadAt) : '—'} />
              {lastMessage && (
                <div className="mt-2 rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--td-text-muted)' }}>Last message</span>
                    <span className="text-[9px]" style={{ color: 'var(--td-text-muted)' }}>{formatTimeAgo(lastMessage.createdAt)}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed" style={{ color: 'var(--td-text-sub)' }}>
                    {lastMessage.messageType === 'file'
                      ? `Shared file: ${lastMessage.fileName || 'Attachment'}`
                      : lastMessage.message}
                  </p>
                </div>
              )}
            </InfoCard>

            {quickActions.length > 0 && (
              <InfoCard title="Quick actions">
                <div className="grid grid-cols-1 gap-2">
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={action.action}
                      className="rounded-xl p-3 text-left transition-all duration-200 hover:-translate-y-0.5"
                      style={{
                        color: 'var(--td-text-sub)',
                        background: 'rgba(124,58,237,0.08)',
                        border: '1px solid rgba(124,58,237,0.14)',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--td-accent)' }}>
                          <Icon name={action.icon} size={16} />
                        </span>
                        <span className="text-xs font-medium">{action.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </InfoCard>
            )}

            <div className="mx-3 mb-2 overflow-hidden rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
              <ParticipantInvitePanel appointmentId={appointmentId} />
            </div>

            <div className="space-y-2 px-4 pb-4 text-xs leading-relaxed" style={{ color: 'var(--td-text-muted)' }}>
              <p>
                Chat, video, and attachments are linked to appointment #{appointmentId}. Downloads require an authenticated session and follow the attachment size/type policy.
              </p>
              <p>
                Need more context? Open the appointment record or patient profile from the clinic dashboard; this panel mirrors live data from the communications API.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientInfoPanel;
