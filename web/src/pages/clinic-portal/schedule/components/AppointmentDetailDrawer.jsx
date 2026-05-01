import React from 'react';
import Icon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';
import ModalPortal from '../../../../components/ui/ModalPortal';

// Inject animation keyframes (only once)
if (typeof document !== 'undefined' && !document.getElementById('modal-animations')) {
  const style = document.createElement('style');
  style.id = 'modal-animations';
  style.textContent = `
    @keyframes modalSlideUp {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    @keyframes backdropFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

const AppointmentDetailDrawer = ({
  appointment,
  isOpen,
  onClose,
  onAction,
  onOpenVideoRoom,
  canObserveVideoRoom = false
}) => {
  if (!isOpen || !appointment) return null;

  const { t, language } = useLanguage();
  const locale = language === 'id' ? 'id-ID' : 'en-US';
  const statusKeyMap = {
    'check-in': 'checkin',
    'in-chair': 'inchair',
    'no-show': 'noshow',
    'reschedule-requested': 'rescheduleRequested'
  };

  const formatTime = (dateString) =>
    new Date(dateString).toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

  const getStatusColor = (status) => {
    const statusColors = {
      pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-200 border-amber-200 dark:border-amber-700/50',
      confirmed: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 border-blue-200 dark:border-blue-700/50',
      'check-in': 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700/50',
      'in-chair': 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700/50',
      completed: 'bg-slate-100 dark:bg-slate-800 text-secondary dark:text-secondary border-slate-200 dark:border-slate-600',
      cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200 border-red-200 dark:border-red-700/50',
      'no-show': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200 border-red-200 dark:border-red-700/50',
      'reschedule-requested': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-200 border-purple-200 dark:border-purple-700/50'
    };

    return statusColors[status] || 'bg-slate-100 dark:bg-slate-800 text-secondary dark:text-secondary border-primary/10 dark:border-primary/25';
  };

  const getStatusLabel = (status) =>
    t(`clinic.schedule.appointment.status.${statusKeyMap[status] || status}`) || status;

  const getChannelInfo = (channel) => {
    const channelInfo = {
      clinic: {
        icon: 'Building2',
        label: t('clinic.schedule.detail.channelClinic'),
        color: 'text-blue-600 dark:text-blue-300'
      },
      tele: {
        icon: 'Video',
        label: t('clinic.schedule.detail.channelTele'),
        color: 'text-cyan-600 dark:text-cyan-300'
      }
    };

    return channelInfo[channel] || { icon: 'Calendar', label: channel, color: 'text-secondary' };
  };

  const duration = Math.round((new Date(appointment.end) - new Date(appointment.start)) / (1000 * 60));
  const channelInfo = getChannelInfo(appointment.channel);

  return (
    <ModalPortal disableScroll={false}>
      {/* Backdrop - Fixed position, always centered in viewport */}
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
        style={{ animation: 'backdropFadeIn 0.2s ease-out' }}
      >
        {/* Modal Content - Centered in viewport, scrollable content */}
        <div
          className="relative w-full max-w-3xl max-h-[90vh] bg-surface-elevated rounded-3xl border border-primary/20 shadow-2xl overflow-y-auto flex flex-col"
          onClick={(e) => e.stopPropagation()}
          style={{ animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
        >
          {/* Header */}
          <div className="p-6 border-b border-primary/20 bg-surface rounded-t-3xl theme-transition">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-primary">{t('clinic.schedule.appointment.details')}</h2>
                <p className="text-sm text-secondary">
                  {formatDate(appointment.start)} · {formatTime(appointment.start)} - {formatTime(appointment.end)}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-secondary/70 hover:text-primary hover:bg-primary/10 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Icon name="X" size={20} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Status & Channel */}
            <div className="flex items-center justify-between">
              <span className={`px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(appointment.status)}`}>
                {getStatusLabel(appointment.status)}
              </span>
              <div className="flex items-center space-x-2 text-sm text-secondary">
                <Icon name={channelInfo.icon} size={16} className={channelInfo.color} />
                <span className="font-medium">{channelInfo.label}</span>
              </div>
            </div>

            {/* Patient Information */}
            <section className="bg-surface rounded-xl p-5 space-y-4 border border-primary/10">
              <h3 className="text-base font-semibold text-primary flex items-center space-x-2">
                <Icon name="User" size={18} className="text-accent" />
                <span>{t('clinic.schedule.appointment.patientInfo')}</span>
              </h3>

              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xl shadow-lg">
                  {appointment.patient?.name?.charAt(0) || 'P'}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-lg text-primary">{appointment.patient?.name || t('clinic.schedule.detail.nameUnavailable')}</p>
                  <p className="text-sm text-secondary flex items-center space-x-2">
                    <Icon name="Phone" size={14} />
                    <span>{appointment.patient?.contact?.wa || t('clinic.schedule.detail.contactUnavailable')}</span>
                  </p>
                </div>
              </div>

              {appointment.patient?.age && (
                <div className="flex items-center space-x-2 pt-3 border-t border-primary/10">
                  <Icon name="Calendar" size={16} className="text-secondary" />
                  <span className="text-sm text-secondary font-medium">
                    {t('clinic.schedule.detail.ageLabel', { age: appointment.patient.age, unit: t('clinic.schedule.detail.years') })}
                  </span>
                </div>
              )}
            </section>

            {/* Appointment Details */}
            <section className="bg-surface rounded-xl p-5 space-y-4 border border-primary/10">
              <h3 className="text-base font-semibold text-primary flex items-center space-x-2">
                <Icon name="ClipboardList" size={18} className="text-accent" />
                <span>{t('clinic.schedule.appointment.appointmentDetails')}</span>
              </h3>

              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Icon name="Calendar" size={16} className="text-secondary" />
                  <div>
                    <p className="text-sm font-medium text-primary">{formatDate(appointment.start)}</p>
                    <p className="text-xs text-secondary">
                      {formatTime(appointment.start)} - {formatTime(appointment.end)} ({t('clinic.schedule.detail.duration', { minutes: duration })})
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Icon name="User" size={16} className="text-secondary" />
                  <div>
                    <p className="text-sm font-medium text-primary">{appointment.provider?.name || t('clinic.schedule.detail.providerUnavailable')}</p>
                    <p className="text-xs text-secondary">{t('clinic.schedule.daily.defaultSpecialization')}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Icon name="Activity" size={16} className="text-secondary" />
                  <span className="text-sm font-medium text-primary">{appointment.type || t('clinic.schedule.detail.typeUnavailable')}</span>
                </div>

                {appointment.location && (
                  <div className="flex items-center space-x-3">
                    <Icon name="MapPin" size={16} className="text-secondary" />
                    <span className="text-sm text-secondary">{appointment.location.name}</span>
                  </div>
                )}

                {appointment.reason && (
                  <div className="flex items-start space-x-3">
                    <Icon name="FileText" size={16} className="text-secondary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-primary">{t('clinic.schedule.detail.complaint')}</p>
                      <p className="text-sm text-secondary">{appointment.reason}</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Risk Assessment */}
            {appointment.risk !== undefined && (
              <section className="bg-surface rounded-xl p-5 border border-primary/10">
                <h3 className="text-base font-semibold text-primary flex items-center space-x-2">
                  <Icon name="Shield" size={18} className="text-accent" />
                  <span>{t('clinic.schedule.appointment.riskAssessment')}</span>
                </h3>

                <div className="flex items-center justify-between mt-3">
                  <span className="text-sm text-secondary">{t('clinic.schedule.appointment.riskLevel')}</span>
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        appointment.risk >= 0.75 ? 'bg-red-500' : appointment.risk >= 0.45 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                    />
                    <span className="text-sm font-medium text-primary">
                      {appointment.risk >= 0.75
                        ? t('clinic.schedule.appointment.high')
                        : appointment.risk >= 0.45
                        ? t('clinic.schedule.appointment.medium')
                        : t('clinic.schedule.appointment.low')}
                    </span>
                    <span className="text-xs text-secondary/80">({Math.round(appointment.risk * 100)}%)</span>
                  </div>
                </div>
              </section>
            )}

            {/* Teledentistry Info */}
            {appointment.channel === 'tele' && appointment.tele?.videoRoomUrl && (
              <section className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800/40 rounded-xl p-5 theme-transition space-y-3">
                <div className="flex items-center space-x-2">
                  <Icon name="Video" size={16} className="text-cyan-600 dark:text-cyan-300" />
                  <span className="text-sm font-semibold text-cyan-800 dark:text-cyan-200">{t('clinic.schedule.appointment.teledentistry')}</span>
                </div>
                <p className="text-xs text-cyan-700 dark:text-cyan-300">
                  {t('clinic.schedule.appointment.patientWillJoin')}
                </p>
                {canObserveVideoRoom ? (
                  <button
                    onClick={() => onOpenVideoRoom?.(appointment)}
                    className="w-full px-4 py-3 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 font-medium transition-colors"
                  >
                    {t('clinic.schedule.appointment.openVideoRoom')}
                  </button>
                ) : (
                  <p className="rounded-lg bg-white/70 px-3 py-2 text-xs font-medium text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200">
                    {t('clinic.schedule.appointment.ownerOnlyVideoRoom') || 'Only clinic owners can observe live video sessions.'}
                  </p>
                )}
              </section>
            )}

            {/* Deposit Info */}
            {appointment.depositRequired && (
              <section className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-5 theme-transition">
                <div className="flex items-center space-x-2">
                  <Icon name="AlertTriangle" size={16} className="text-amber-600 dark:text-amber-300" />
                  <span className="text-sm font-medium text-amber-800 dark:text-amber-200">{t('clinic.schedule.appointment.depositRequired')}</span>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                  {t('clinic.schedule.appointment.patientNeedsDeposit')}
                </p>
              </section>
            )}

            {/* Notes */}
            {appointment.notes && (
              <section className="bg-surface rounded-xl p-5 border border-primary/10">
                <h3 className="text-base font-semibold text-primary flex items-center space-x-2">
                  <Icon name="StickyNote" size={18} className="text-accent" />
                  <span>{t('clinic.schedule.appointment.notes')}</span>
                </h3>
                <p className="text-sm text-secondary mt-3 whitespace-pre-line">{appointment.notes}</p>
              </section>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-primary/20 bg-surface rounded-b-3xl theme-transition">
            <div className="space-y-3">
              {appointment.status === 'pending' && (
                <>
                  <button
                    onClick={() => onAction?.('confirm', appointment)}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition-colors"
                  >
                    {t('clinic.schedule.appointment.confirm')}
                  </button>
                  <button
                    onClick={() => onAction?.('cancel', appointment)}
                    className="w-full px-4 py-3 border border-primary/20 text-secondary hover:text-primary rounded-xl hover:bg-primary/5 font-medium transition-colors"
                  >
                    {t('clinic.schedule.appointment.cancel')}
                  </button>
                </>
              )}

              {appointment.status === 'confirmed' && (
                <>
                  <button
                    onClick={() => onAction?.('checkin', appointment)}
                    className="w-full px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium transition-colors"
                  >
                    {t('clinic.schedule.appointment.checkin')}
                  </button>
                  <button
                    onClick={() => onAction?.('reschedule', appointment)}
                    className="w-full px-4 py-3 border border-primary/20 text-secondary hover:text-primary rounded-xl hover:bg-primary/5 font-medium transition-colors"
                  >
                    {t('clinic.schedule.appointment.reschedule')}
                  </button>
                </>
              )}

              {appointment.status === 'check-in' && (
                <>
                  <button
                    onClick={() => onAction?.('start', appointment)}
                    className="w-full px-4 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 font-medium transition-colors"
                  >
                    {t('clinic.schedule.appointment.start')}
                  </button>
                  <button
                    onClick={() => onAction?.('noshow', appointment)}
                    className="w-full px-4 py-3 border border-red-300 text-red-700 rounded-xl hover:bg-red-50 font-medium transition-colors"
                  >
                    {t('clinic.schedule.appointment.noShow')}
                  </button>
                </>
              )}

              {appointment.status === 'in-chair' && (
                <button
                  onClick={() => onAction?.('complete', appointment)}
                  className="w-full px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium transition-colors"
                >
                  {t('clinic.schedule.appointment.complete')}
                </button>
              )}

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-primary/20">
                <button
                  onClick={() => onAction?.('edit', appointment)}
                  className="px-4 py-3 border border-primary/20 text-secondary hover:text-primary rounded-xl hover:bg-primary/5 font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  <Icon name="Edit" size={16} />
                  <span>{t('clinic.schedule.appointment.edit')}</span>
                </button>
                <button
                  onClick={() => onAction?.('viewPatient', appointment)}
                  className="px-4 py-3 border border-primary/20 text-secondary hover:text-primary rounded-xl hover:bg-primary/5 font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  <Icon name="User" size={16} />
                  <span>{t('clinic.schedule.appointment.viewPatient')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default AppointmentDetailDrawer;
