import React from 'react';
import Icon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';
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

const formatTimeAgo = (value, t) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const diff = Date.now() - date.getTime();
  if (diff < 60 * 1000) return t('dentistTeledentistry.patientInfo.conversation.justNow');
  const minutes = Math.floor(diff / (60 * 1000));
  if (minutes < 60) return t('dentistTeledentistry.patientInfo.conversation.minutesAgo', { minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('dentistTeledentistry.patientInfo.conversation.hoursAgo', { hours });
  return date.toLocaleDateString();
};

const panelClass = (isExpanded) => `flex flex-shrink-0 flex-col overflow-hidden transition-all duration-300 bg-surface border-l border-border/60 rounded-r-2xl ${isExpanded ? 'w-[300px] min-w-[300px]' : 'w-[44px] min-w-[44px]'}`;

const InfoCard = ({ title, children }) => (
  <div className="mx-3 mb-3 rounded-2xl p-3.5 bg-surface border border-border/50 shadow-sm">
    <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-muted">
      {title}
    </p>
    {children}
  </div>
);

const InfoRow = ({ label, value }) => (
  <div className="flex items-start justify-between py-1.5 border-b border-border/40 min-w-0 gap-2">
    <span className="text-[10px] text-muted flex-shrink-0">
      {label}
    </span>
    <span
      className="max-w-[70%] text-right text-[11px] font-medium leading-relaxed text-secondary truncate block"
      title={typeof value === 'string' ? value : undefined}
    >
      {value || <span className="text-muted italic">—</span>}
    </span>
  </div>
);

const DetailRow = ({ label, value }) => (
  <div className="rounded-xl px-3 py-2 bg-surface-elevated/60 border border-border/40">
    <dt className="text-[10px] uppercase tracking-wide text-muted">{label}</dt>
    <dd className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-secondary">
      {value}
    </dd>
  </div>
);

const CollapsedPanel = ({ isExpanded, onToggleExpanded, t }) => (
  <div className={panelClass(isExpanded)}>
    <div className="flex flex-shrink-0 items-center justify-between px-3 py-3 border-b border-border/40 rounded-tr-2xl">
      {isExpanded && (
        <span className="text-xs font-bold uppercase tracking-widest text-muted">
          {t('dentistTeledentistry.patientInfo.title')}
        </span>
      )}
      <button
        onClick={() => onToggleExpanded?.(!isExpanded)}
        className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-150 hover:scale-105 text-muted hover:bg-surface-elevated hover:text-primary"
        aria-label={isExpanded ? 'Collapse patient panel' : 'Expand patient panel'}
      >
        <Icon name={isExpanded ? 'ChevronRight' : 'ChevronLeft'} size={14} />
      </button>
    </div>
    {isExpanded && (
      <div className="flex flex-1 items-center justify-center p-4 text-center text-sm text-muted">
        {t('dentistTeledentistry.patientInfo.selectPatient')}
      </div>
    )}
  </div>
);

const PreSessionHealthFormCard = ({ state, t }) => {
  const status = state?.status || 'idle';
  const form = state?.form || null;

  if (status === 'loading') {
    return (
      <InfoCard title={t('dentistTeledentistry.patientInfo.preSessionForm.title')}>
        <div className="flex items-center gap-2 text-xs text-muted">
          <Icon name="Loader2" size={14} className="animate-spin" />
          {t('dentistTeledentistry.patientInfo.preSessionForm.loading')}
        </div>
      </InfoCard>
    );
  }

  if (status === 'error') {
    return (
      <InfoCard title={t('dentistTeledentistry.patientInfo.preSessionForm.title')}>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 rounded-lg p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500">
            <Icon name="AlertTriangle" size={15} />
          </span>
          <p className="text-xs leading-relaxed text-secondary">
            {t('dentistTeledentistry.patientInfo.preSessionForm.error')}
          </p>
        </div>
      </InfoCard>
    );
  }

  if (!form) {
    return (
      <InfoCard title={t('dentistTeledentistry.patientInfo.preSessionForm.title')}>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 rounded-lg p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500">
            <Icon name="ClipboardList" size={15} />
          </span>
          <p className="text-xs leading-relaxed text-secondary">
            {t('dentistTeledentistry.patientInfo.preSessionForm.notFilled')}
          </p>
        </div>
      </InfoCard>
    );
  }

  return (
    <InfoCard title={t('dentistTeledentistry.patientInfo.preSessionForm.title')}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="text-[11px] text-muted">
          {t('dentistTeledentistry.patientInfo.preSessionForm.submittedBy')} {form.submittedAt ? new Date(form.submittedAt).toLocaleString('id-ID') : ''}
        </p>
        <span className="rounded-full px-2 py-1 text-[10px] font-semibold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
          {t('dentistTeledentistry.patientInfo.preSessionForm.status')}
        </span>
      </div>
      <dl className="space-y-2">
        <DetailRow label={t('dentistTeledentistry.patientInfo.preSessionForm.chiefComplaint')} value={form.symptoms || t('dentistTeledentistry.patientInfo.preSessionForm.notFilled_text')} />
        <div className="rounded-xl px-3 py-2 bg-surface-elevated/60 border border-border/40">
          <dt className="text-[10px] uppercase tracking-wide text-muted">{t('dentistTeledentistry.patientInfo.preSessionForm.painScale')}</dt>
          <dd className="mt-1 flex items-center gap-2 text-xs text-secondary">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full font-bold bg-accent/10 text-accent">
              {form.painLevel ?? '-'}
            </span>
            <span>{form.painLevel ? `${form.painLevel}/10` : t('dentistTeledentistry.patientInfo.preSessionForm.notFilled_text')}</span>
          </dd>
        </div>
        <DetailRow label={t('dentistTeledentistry.patientInfo.preSessionForm.allergies')} value={form.allergies || t('dentistTeledentistry.patientInfo.preSessionForm.notFilled_text')} />
        <DetailRow label={t('dentistTeledentistry.patientInfo.preSessionForm.medications')} value={form.medications || t('dentistTeledentistry.patientInfo.preSessionForm.notFilled_text')} />
        <DetailRow label={t('dentistTeledentistry.patientInfo.preSessionForm.additionalNotes')} value={form.notes || t('dentistTeledentistry.patientInfo.preSessionForm.notFilled_text')} />
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
  const { t } = useLanguage();
  
  if (!conversation) {
    return <CollapsedPanel isExpanded={isExpanded} onToggleExpanded={onToggleExpanded} t={t} />;
  }

  const patient = conversation.patient || {};
  const appointmentId = conversation.appointmentId;
  const patientId = patient.id?.toString?.() ?? patient.id ?? '';
  const online = presence.map((id) => id?.toString?.() ?? id).includes(patientId);
  const lastMessage = conversation.lastMessage;
  const patientName = patient.name || t('dentistTeledentistry.patientInfo.details.unknown');

  const quickActions = [
    onScheduleAppointment && {
      icon: 'Calendar',
      label: t('dentistTeledentistry.patientInfo.quickActions.scheduleFollowUp'),
      action: onScheduleAppointment,
    },
    onViewMedicalHistory && {
      icon: 'FileText',
      label: t('dentistTeledentistry.patientInfo.quickActions.viewMedicalHistory'),
      action: onViewMedicalHistory,
    }
  ].filter(Boolean);

  return (
    <div className={panelClass(isExpanded)}>
      <div className="flex flex-shrink-0 items-center justify-between px-4 py-3 border-b border-border/40 rounded-tr-2xl">
        {isExpanded && (
          <span className="text-xs font-bold uppercase tracking-widest text-muted">
            {t('dentistTeledentistry.patientInfo.title')}
          </span>
        )}
        <button
          onClick={() => onToggleExpanded?.(!isExpanded)}
          className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-150 hover:scale-105 text-muted hover:bg-surface-elevated hover:text-primary"
          aria-label={isExpanded ? 'Collapse patient panel' : 'Expand patient panel'}
        >
          <Icon name={isExpanded ? 'ChevronRight' : 'ChevronLeft'} size={14} />
        </button>
      </div>

      {isExpanded && (
        <div className="flex-1 overflow-y-auto scrollbar-minimal">
          <div className="flex flex-col items-center px-4 py-6 border-b border-border/40">
            <div
              className="mb-3 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full text-2xl font-bold text-white shadow-md shadow-accent/20"
              style={getAvatarGradient(patientName)}
            >
              {patient.avatar ? (
                <img src={patient.avatar} alt={patientName} className="h-full w-full object-cover" />
              ) : (
                getInitials(patientName)
              )}
            </div>
            <h4 className="text-center text-sm font-bold text-primary">
              {patientName}
            </h4>
            <div className="mt-1 flex items-center gap-1.5">
              <div className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-green-500' : 'bg-muted'}`} />
              <span className="text-[11px] text-muted">
                {online ? t('dentistTeledentistry.patientInfo.onlineStatus.online') : t('dentistTeledentistry.patientInfo.onlineStatus.offline')} · #{appointmentId}
              </span>
            </div>
          </div>

          <div className="py-3">
            <InfoCard title={t('dentistTeledentistry.patientInfo.details.title')}>
              <InfoRow label={t('dentistTeledentistry.patientInfo.details.email')} value={patient.email || t('dentistTeledentistry.patientInfo.details.notProvided')} />
              {patient.phone && <InfoRow label={t('dentistTeledentistry.patientInfo.details.phone')} value={patient.phone} />}
              <InfoRow label={t('dentistTeledentistry.patientInfo.details.role')} value={conversation.role || 'patient'} />
            </InfoCard>

            <PreSessionHealthFormCard state={preSessionHealthForm} t={t} />

            <InfoCard title={t('dentistTeledentistry.patientInfo.conversation.title')}>
              <InfoRow label={t('dentistTeledentistry.patientInfo.conversation.unread')} value={conversation.unreadCount || 0} />
              <InfoRow label={t('dentistTeledentistry.patientInfo.conversation.lastActivity')} value={formatTimeAgo(lastMessage?.createdAt, t)} />
              <InfoRow label={t('dentistTeledentistry.patientInfo.conversation.lastRead')} value={conversation.lastReadAt ? formatTimeAgo(conversation.lastReadAt, t) : '—'} />
              {lastMessage && (
                <div className="mt-2 rounded-xl p-2.5 bg-surface-elevated/60 border border-border/40">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[9px] uppercase tracking-wide text-muted">{t('dentistTeledentistry.patientInfo.conversation.lastMessage')}</span>
                    <span className="text-[9px] text-muted">{formatTimeAgo(lastMessage.createdAt, t)}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-secondary">
                    {lastMessage.messageType === 'file'
                      ? t('dentistTeledentistry.patientInfo.conversation.sharedFile', { fileName: lastMessage.fileName || t('dentistTeledentistry.patientInfo.conversation.attachment') })
                      : lastMessage.message}
                  </p>
                </div>
              )}
            </InfoCard>

            {quickActions.length > 0 && (
              <InfoCard title={t('dentistTeledentistry.patientInfo.quickActions.title')}>
                <div className="grid grid-cols-1 gap-2">
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={action.action}
                      className="rounded-xl p-3 text-left transition-all duration-200 hover:-translate-y-0.5 text-secondary bg-accent/10 border border-accent/20 hover:bg-accent/20"
                    >
                      <div className="flex items-center gap-3">
                        <span className="rounded-lg p-2 bg-surface/50 text-accent">
                          <Icon name={action.icon} size={16} />
                        </span>
                        <span className="text-xs font-medium">{action.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </InfoCard>
            )}

            <div className="mx-3 mb-2 overflow-hidden rounded-2xl border border-border/50 bg-surface shadow-sm">
              <ParticipantInvitePanel appointmentId={appointmentId} />
            </div>

            <div className="space-y-2 px-4 pb-4 text-xs leading-relaxed text-muted">
              <p>
                {t('dentistTeledentistry.patientInfo.footer.chatDescription', { appointmentId })}
              </p>
              <p>
                {t('dentistTeledentistry.patientInfo.footer.moreContext')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientInfoPanel;
