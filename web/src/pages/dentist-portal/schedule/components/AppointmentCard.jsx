import React, { useMemo } from 'react';
import Icon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';

const AppointmentCard = ({ 
  appointment, 
  onConfirm, 
  onReschedule, 
  onCancel, 
  onStartVideo, 
  onViewDetails,
  onRequestPhotos 
}) => {
  const { t, language } = useLanguage();
  const locale = useMemo(() => (language === 'id' ? 'id-ID' : 'en-US'), [language]);
  
  const getStatusConfig = (status) => {
    const configs = {
      pending: { 
        label: t('dentistSchedule.status.pending'), 
        bg: 'bg-amber-100 dark:bg-amber-900/30', 
        text: 'text-amber-700 dark:text-amber-300',
        border: 'border-amber-200'
      },
      confirmed: { 
        label: t('dentistSchedule.status.confirmed'), 
        bg: 'bg-blue-100 dark:bg-blue-900/30', 
        text: 'text-blue-700 dark:text-blue-300',
        border: 'border-blue-200'
      },
      'check-in': { 
        label: t('dentistSchedule.status.checkIn'), 
        bg: 'bg-cyan-100 dark:bg-cyan-900/30', 
        text: 'text-cyan-700 dark:text-cyan-300',
        border: 'border-cyan-200'
      },
      'in-chair': { 
        label: t('dentistSchedule.status.inChair'), 
        bg: 'bg-purple-100 dark:bg-purple-900/30', 
        text: 'text-purple-700 dark:text-purple-300',
        border: 'border-purple-200'
      },
      completed: { 
        label: t('dentistSchedule.status.completed'), 
        bg: 'bg-emerald-100 dark:bg-emerald-900/30', 
        text: 'text-emerald-700 dark:text-emerald-300',
        border: 'border-emerald-200'
      },
      cancelled: { 
        label: t('dentistSchedule.status.cancelled'), 
        bg: 'bg-red-100 dark:bg-red-900/30', 
        text: 'text-red-700 dark:text-red-300',
        border: 'border-red-200'
      },
      'no-show': { 
        label: t('dentistSchedule.status.noShow'), 
        bg: 'bg-slate-100 dark:bg-slate-800/30', 
        text: 'text-slate-700 dark:text-slate-300',
        border: 'border-slate-200'
      },
      'reschedule-requested': { 
        label: t('dentistSchedule.status.rescheduleRequested'), 
        bg: 'bg-orange-100 dark:bg-orange-900/30', 
        text: 'text-orange-700 dark:text-orange-300',
        border: 'border-orange-200'
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

  const status = getStatusConfig(appointment.status);
  const channel = getChannelConfig(appointment.channel);

  const ActionButton = ({ onClick, variant = 'secondary', children, icon, disabled = false }) => {
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
        disabled={disabled}
        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 ${variants[variant]}`}
      >
        {icon && <Icon name={icon} size={14} />}
        <span>{children}</span>
      </button>
    );
  };

  return (
    <div className="bg-surface-elevated border border-primary/10 rounded-2xl p-4 hover:shadow-theme-md transition-all duration-300 theme-transition group">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          {/* Risk Indicator */}
          <div
            className={`w-3 h-3 rounded-full ${getRiskColor(appointment.risk)} shadow-sm flex-shrink-0`}
            title={t('dentistSchedule.card.riskTooltip', { value: Math.round((appointment.risk || 0) * 100) })}
          />
          
          {/* Time & Patient */}
          <div>
            <div className="text-xs text-secondary theme-transition">
              {formatTime(appointment.start)} — {formatTime(appointment.end)}
            </div>
            <div className="font-semibold text-primary theme-transition">
              {appointment.patient.name}
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${status.bg} ${status.text} ${status.border}`}>
          {status.label}
        </span>
      </div>

      {/* Tags */}
      <div className="flex items-center space-x-2 mb-3 flex-wrap gap-y-1">
        {/* Channel Tag */}
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full flex items-center space-x-1 ${channel.bg} ${channel.text}`}>
          <Icon name={channel.icon} size={12} />
          <span>{channel.label}</span>
        </span>

        {/* Type Tag */}
        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-accent/10 text-accent">
          {appointment.type}
        </span>

        {/* Additional Tags */}
        {appointment.depositRequired && (
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
            {t('dentistSchedule.card.badges.depositRequired')}
          </span>
        )}

                {appointment.isUrgent && (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
            {t('dentistSchedule.card.badges.urgent')}
          </span>
        )}
      </div>

      {/* Reason */}
      {appointment.reason && (
        <div className="text-sm text-secondary theme-transition mb-4 line-clamp-2">
          {appointment.reason}
        </div>
      )}

      {/* Provider & Location */}
      <div className="text-xs text-muted theme-transition mb-4 flex items-center space-x-4">
        <span>
          👨‍⚕️ {appointment.provider?.name || t('dentistSchedule.card.labels.providerFallback')}
        </span>
        <span>
          📍 {appointment.location?.name || t('dentistSchedule.card.labels.locationFallback')}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Status-based Actions */}
        {appointment.status === 'pending' && (
          <>
            <ActionButton onClick={() => onConfirm(appointment)} variant="success" icon="Check">
              {t('dentistSchedule.actions.confirm')}
            </ActionButton>
            <ActionButton onClick={() => onReschedule(appointment)} variant="warning" icon="Calendar">
              {t('dentistSchedule.actions.reschedule')}
            </ActionButton>
          </>
        )}

        {appointment.status === 'reschedule-requested' && (
          <ActionButton onClick={() => onReschedule(appointment)} variant="warning" icon="Calendar">
            {t('dentistSchedule.actions.reschedule')}
          </ActionButton>
        )}

        {appointment.status === 'confirmed' && (
          <ActionButton onClick={() => onReschedule(appointment)} variant="secondary" icon="Calendar">
            {t('dentistSchedule.actions.reschedule')}
          </ActionButton>
        )}

        {/* Channel-based Actions */}
        {appointment.channel === 'tele' && !['cancelled', 'no-show', 'completed'].includes(appointment.status) && (
          <ActionButton onClick={() => onStartVideo(appointment)} variant="info" icon="Video">
            {t('dentistSchedule.actions.startVideo')}
          </ActionButton>
        )}

        {/* General Actions */}
        <ActionButton onClick={() => onRequestPhotos(appointment)} variant="secondary" icon="Camera">
          {t('dentistSchedule.actions.requestPhotos')}
        </ActionButton>

        {!['cancelled', 'completed'].includes(appointment.status) && (
          <ActionButton onClick={() => onCancel(appointment)} variant="danger" icon="X">
            {t('dentistSchedule.actions.cancel')}
          </ActionButton>
        )}

        {/* Details Button */}
        <ActionButton onClick={() => onViewDetails(appointment)} variant="secondary" icon="ChevronRight">
          {t('dentistSchedule.actions.viewDetails')}
        </ActionButton>
      </div>
    </div>
  );
};

export default AppointmentCard;
