import React, { useMemo } from 'react';
import Icon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';
import ModalPortal from '../../../../components/ui/ModalPortal';

const AppointmentDetailDrawer = ({ appointment, isOpen, onClose, onConfirm, onReschedule, onCancel, onStartVideo }) => {
  if (!isOpen || !appointment) return null;

  const { t, language } = useLanguage();
  const locale = useMemo(() => (language === 'id' ? 'id-ID' : 'en-US'), [language]);

  const getStatusConfig = (status) => {
    const configs = {
      pending: { 
        label: t('dentistSchedule.detail.status.pending'), 
        bg: 'bg-amber-100 dark:bg-amber-900/30', 
        text: 'text-amber-700 dark:text-amber-300' 
      },
      confirmed: { 
        label: t('dentistSchedule.detail.status.confirmed'), 
        bg: 'bg-blue-100 dark:bg-blue-900/30', 
        text: 'text-blue-700 dark:text-blue-300' 
      },
      'check-in': { 
        label: t('dentistSchedule.detail.status.checkIn'), 
        bg: 'bg-emerald-100 dark:bg-emerald-900/30', 
        text: 'text-emerald-700 dark:text-emerald-300' 
      },
      'in-chair': { 
        label: t('dentistSchedule.detail.status.inChair'), 
        bg: 'bg-emerald-100 dark:bg-emerald-900/30', 
        text: 'text-emerald-700 dark:text-emerald-300' 
      },
      completed: { 
        label: t('dentistSchedule.detail.status.completed'), 
        bg: 'bg-slate-100 dark:bg-slate-800/50', 
        text: 'text-slate-700 dark:text-slate-300' 
      },
      cancelled: { 
        label: t('dentistSchedule.detail.status.cancelled'), 
        bg: 'bg-red-100 dark:bg-red-900/30', 
        text: 'text-red-700 dark:text-red-300' 
      },
      'reschedule-requested': { 
        label: t('dentistSchedule.detail.status.rescheduleRequested'), 
        bg: 'bg-purple-100 dark:bg-purple-900/30', 
        text: 'text-purple-700 dark:text-purple-300' 
      }
    };
    return configs[status] || configs.pending;
  };

  const getChannelConfig = (channel) => {
    return {
      clinic: { 
        bg: 'bg-slate-100 dark:bg-slate-800/60', 
        text: 'text-slate-700 dark:text-slate-300', 
        icon: 'Building2',
        label: t('dentistSchedule.channels.clinic')
      },
      tele: { 
        bg: 'bg-cyan-100 dark:bg-cyan-900/30', 
        text: 'text-cyan-700 dark:text-cyan-300', 
        icon: 'Video',
        label: t('dentistSchedule.channels.teledentistry')
      }
    }[channel];
  };

  const getRiskColor = (risk) => {
    if (risk >= 0.75) return 'bg-red-500';
    if (risk >= 0.45) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const formatTime = (datetime) => {
    return new Date(datetime).toLocaleTimeString(locale, { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const formatDate = (datetime) => {
    return new Date(datetime).toLocaleDateString(locale, { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const status = getStatusConfig(appointment.status);
  const channel = getChannelConfig(appointment.channel);

  const InfoCard = ({ icon, title, children }) => (
    <div className="p-4 rounded-xl bg-surface border border-primary/10 theme-transition">
      <div className="flex items-center space-x-2 mb-2">
        <Icon name={icon} size={16} className="text-muted" />
        <h4 className="text-sm font-medium text-secondary">{title}</h4>
      </div>
      <div className="text-sm text-primary">{children}</div>
    </div>
  );

  const ActionButton = ({ onClick, variant = 'secondary', children, icon }) => {
    const variants = {
      primary: 'bg-accent hover:bg-accent/90 text-white',
      secondary: 'bg-accent/10 hover:bg-accent/20 text-accent',
      success: 'bg-emerald-500 hover:bg-emerald-600 text-white',
      warning: 'bg-amber-500 hover:bg-amber-600 text-white',
      danger: 'bg-red-500 hover:bg-red-600 text-white',
      info: 'bg-cyan-500 hover:bg-cyan-600 text-white'
    };

    return (
      <button
        onClick={onClick}
        className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${variants[variant]}`}
      >
        {icon && <Icon name={icon} size={16} />}
        <span>{children}</span>
      </button>
    );
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
        <div
          className="relative w-full max-w-2xl max-h-[90vh] bg-surface-elevated border border-primary/20 rounded-3xl shadow-2xl overflow-y-auto flex flex-col"
          onClick={(event) => event.stopPropagation()}
        >
        {/* Header */}
        <div className="flex-shrink-0 bg-surface-elevated border-b border-primary/10 p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-secondary mb-1">
                {formatDate(appointment.start)}
              </div>
              <div className="text-sm text-secondary mb-2">
                {formatTime(appointment.start)} — {formatTime(appointment.end)}
              </div>
              <h2 className="text-xl font-bold text-primary">
                {appointment.patient.name}
              </h2>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 text-muted hover:text-primary hover:bg-surface rounded-lg border border-primary/10 transition-all"
            >
              <Icon name="X" size={18} />
            </button>
          </div>

          {/* Status & Channel Tags */}
          <div className="flex items-center space-x-2 mt-4">
            <span className={`px-3 py-1.5 text-sm font-medium rounded-lg ${status.bg} ${status.text}`}>
              {status.label}
            </span>
            <span className={`px-3 py-1.5 text-sm font-medium rounded-lg flex items-center space-x-1 ${channel.bg} ${channel.text}`}>
              <Icon name={channel.icon} size={14} />
              <span>{channel.label}</span>
            </span>
            <span className="px-3 py-1.5 text-sm font-medium rounded-lg bg-accent/10 text-accent">
              {appointment.type}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Patient Information */}
            <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary">{t('dentistSchedule.detail.sections.patientInfo.title')}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoCard icon="User" title={t('dentistSchedule.detail.sections.patientInfo.details')}>
                <div className="space-y-2">
                  <div><strong>{t('dentistSchedule.detail.fields.name')}:</strong> {appointment.patient.name}</div>
                  <div><strong>{t('dentistSchedule.detail.fields.patientId')}:</strong> {appointment.patient.id}</div>
                  {appointment.patient.contact?.wa && (
                    <div><strong>{t('dentistSchedule.detail.fields.whatsApp')}:</strong> {appointment.patient.contact.wa}</div>
                  )}
                </div>
              </InfoCard>

              <InfoCard icon="FileText" title={t('dentistSchedule.detail.sections.appointmentDetails.title')}>
                <div className="space-y-2">
                  <div><strong>{t('dentistSchedule.detail.fields.type')}:</strong> {appointment.type}</div>
                  <div><strong>{t('dentistSchedule.detail.fields.reason')}:</strong> {appointment.reason || t('dentistSchedule.detail.fields.reasonFallback')}</div>
                  <div><strong>{t('dentistSchedule.detail.fields.duration')}:</strong> {Math.round((new Date(appointment.end) - new Date(appointment.start)) / (1000 * 60))} {t('dentistSchedule.detail.fields.minuteUnit')}</div>
                </div>
              </InfoCard>

              <InfoCard icon="MapPin" title={t('dentistSchedule.detail.sections.providerLocation.title')}>
                <div className="space-y-2">
                  <div><strong>{t('dentistSchedule.detail.fields.provider')}:</strong> {appointment.provider?.name || t('dentistSchedule.card.labels.providerFallback')}</div>
                  <div><strong>{t('dentistSchedule.detail.fields.location')}:</strong> {appointment.location?.name || t('dentistSchedule.card.labels.locationFallback')}</div>
                </div>
              </InfoCard>

              <InfoCard icon="AlertTriangle" title={t('dentistSchedule.detail.sections.riskAssessment.title')}>
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full ${getRiskColor(appointment.risk)}`} />
                  <div>
                    <div><strong>{t('dentistSchedule.detail.fields.riskLevel')}:</strong> {Math.round(appointment.risk * 100)}%</div>
                    <div className="text-xs text-muted">
                      {appointment.risk >= 0.75
                        ? t('dentistSchedule.detail.sections.riskAssessment.labels.high')
                        : appointment.risk >= 0.45
                          ? t('dentistSchedule.detail.sections.riskAssessment.labels.medium')
                          : t('dentistSchedule.detail.sections.riskAssessment.labels.low')}
                    </div>
                  </div>
                </div>
              </InfoCard>

              {appointment.depositRequired && (
                <InfoCard icon="DollarSign" title={t('dentistSchedule.detail.sections.payment.title')}>
                  <div className="text-amber-600 font-medium">{t('dentistSchedule.detail.sections.payment.depositRequired')}</div>
                </InfoCard>
              )}

              {appointment.channel === 'tele' && appointment.tele?.videoRoomUrl && (
                <InfoCard icon="Video" title={t('dentistSchedule.detail.sections.teledentistry.title')}>
                  <div>{t('dentistSchedule.detail.sections.teledentistry.description')}</div>
                </InfoCard>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary">{t('dentistSchedule.detail.quickActions.title')}</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <ActionButton variant="secondary" icon="MessageSquare">
                {t('dentistSchedule.detail.quickActions.sendMessage')}
              </ActionButton>
              <ActionButton variant="secondary" icon="Camera">
                {t('dentistSchedule.detail.quickActions.requestPhotos')}
              </ActionButton>
              <ActionButton variant="secondary" icon="FileText">
                {t('dentistSchedule.detail.quickActions.sendInstructions')}
              </ActionButton>
              <ActionButton variant="secondary" icon="Phone">
                {t('dentistSchedule.detail.quickActions.callPatient')}
              </ActionButton>
            </div>
          </div>

          {/* Main Actions */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-primary">{t('dentistSchedule.detail.actions.title')}</h3>
            
            <div className="flex flex-wrap gap-3">
              {appointment.status === 'pending' && (
                <>
                  <ActionButton onClick={() => onConfirm(appointment)} variant="success" icon="Check">
                    {t('dentistSchedule.detail.actions.confirm')}
                  </ActionButton>
                  <ActionButton onClick={() => onReschedule(appointment)} variant="warning" icon="Calendar">
                    {t('dentistSchedule.detail.actions.reschedule')}
                  </ActionButton>
                </>
              )}

              {appointment.status === 'reschedule-requested' && (
                <ActionButton onClick={() => onReschedule(appointment)} variant="warning" icon="Calendar">
                  {t('dentistSchedule.detail.actions.handleReschedule')}
                </ActionButton>
              )}

              {appointment.status === 'confirmed' && (
                <>
                  <ActionButton onClick={() => onReschedule(appointment)} variant="secondary" icon="Calendar">
                    {t('dentistSchedule.detail.actions.reschedule')}
                  </ActionButton>
                  {appointment.channel === 'clinic' && (
                    <ActionButton variant="success" icon="UserCheck">
                      {t('dentistSchedule.detail.actions.checkIn')}
                    </ActionButton>
                  )}
                </>
              )}

              {appointment.channel === 'tele' && !['cancelled', 'no-show', 'completed'].includes(appointment.status) && (
                <ActionButton onClick={() => onStartVideo(appointment)} variant="info" icon="Video">
                  {t('dentistSchedule.detail.actions.startVideo')}
                </ActionButton>
              )}

              {!['cancelled', 'completed'].includes(appointment.status) && (
                <ActionButton onClick={() => onCancel(appointment)} variant="danger" icon="X">
                  {t('dentistSchedule.detail.actions.cancel')}
                </ActionButton>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};

export default AppointmentDetailDrawer;
