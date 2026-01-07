import React, { useMemo } from 'react';
import Icon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';
import ModalPortal from '../../../../components/ui/ModalPortal'; // Pastikan path import benar

// Inject animation keyframes (Hanya dijalankan sekali)
if (typeof document !== 'undefined' && !document.getElementById('modal-animations')) {
  const style = document.createElement('style');
  style.id = 'modal-animations';
  style.textContent = `
    @keyframes modalSlideUp {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes backdropFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

const AppointmentDetailDrawer = ({ appointment, isOpen, onClose, onConfirm, onReschedule, onCancel, onStartVideo }) => {
  // HAPUS semua state/ref scroll manual. Kita serahkan sepenuhnya pada CSS.
  
  if (!isOpen || !appointment) return null;

  const { t, language } = useLanguage();
  const locale = useMemo(() => (language === 'id' ? 'id-ID' : 'en-US'), [language]);

  // --- Helper Functions (Logic tetap sama) ---
  const getStatusConfig = (status) => {
    const configs = {
      pending: { label: t('dentistSchedule.detail.status.pending'), bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300' },
      confirmed: { label: t('dentistSchedule.detail.status.confirmed'), bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
      'check-in': { label: t('dentistSchedule.detail.status.checkIn'), bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300' },
      'in-chair': { label: t('dentistSchedule.detail.status.inChair'), bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300' },
      completed: { label: t('dentistSchedule.detail.status.completed'), bg: 'bg-slate-100 dark:bg-slate-800/50', text: 'text-slate-700 dark:text-slate-300' },
      cancelled: { label: t('dentistSchedule.detail.status.cancelled'), bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
      'reschedule-requested': { label: t('dentistSchedule.detail.status.rescheduleRequested'), bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' }
    };
    return configs[status] || configs.pending;
  };

  const getChannelConfig = (channel) => {
    return {
      clinic: { bg: 'bg-slate-100 dark:bg-slate-800/60', text: 'text-slate-700 dark:text-slate-300', icon: 'Building2', label: t('dentistSchedule.channels.clinic') },
      tele: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-300', icon: 'Video', label: t('dentistSchedule.channels.teledentistry') }
    }[channel] || { bg: 'bg-slate-100', text: 'text-slate-700', icon: 'HelpCircle', label: '-' };
  };

  const getRiskColor = (risk) => {
    if (risk >= 0.75) return 'bg-red-500';
    if (risk >= 0.45) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const formatTime = (d) => new Date(d).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
  const formatDate = (d) => new Date(d).toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const status = getStatusConfig(appointment.status);
  const channel = getChannelConfig(appointment.channel);

  const InfoCard = ({ icon, title, children }) => (
    <div className="p-4 rounded-xl bg-surface border border-primary/10">
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
      <button onClick={onClick} className={`px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center space-x-2 ${variants[variant]}`}>
        {icon && <Icon name={icon} size={16} />}
        <span>{children}</span>
      </button>
    );
  };

  return (
    <ModalPortal disableScroll={false}>
      {/* FIXED BACKDROP - Click to close */}
      <div 
        className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: 'backdropFadeIn 0.2s ease-out' }}
      />

      {/* FIXED MODAL - Always centered in viewport */}
      <div 
        className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="relative w-full max-w-2xl bg-surface-elevated border border-primary/20 rounded-3xl shadow-2xl flex flex-col pointer-events-auto"
          style={{ 
            maxHeight: '85vh',
            animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header (Sticky di dalam modal box) */}
          <div className="flex-shrink-0 bg-surface-elevated border-b border-primary/10 p-6 sticky top-0 z-20 rounded-t-3xl">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-secondary mb-1">{formatDate(appointment.start)}</div>
                <div className="text-sm text-secondary mb-2">{formatTime(appointment.start)} — {formatTime(appointment.end)}</div>
                <h2 className="text-xl font-bold text-primary">{appointment.patient.name}</h2>
              </div>
              <button onClick={onClose} className="p-2 text-muted hover:text-primary hover:bg-surface rounded-lg border border-primary/10 transition-all">
                <Icon name="X" size={18} />
              </button>
            </div>
            <div className="flex items-center space-x-2 mt-4">
              <span className={`px-3 py-1.5 text-sm font-medium rounded-lg ${status.bg} ${status.text}`}>{status.label}</span>
              <span className={`px-3 py-1.5 text-sm font-medium rounded-lg flex items-center space-x-1 ${channel.bg} ${channel.text}`}>
                <Icon name={channel.icon} size={14} />
                <span>{channel.label}</span>
              </span>
              <span className="px-3 py-1.5 text-sm font-medium rounded-lg bg-accent/10 text-accent">{appointment.type}</span>
            </div>
          </div>

          {/* Content Area (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary">{t('dentistSchedule.detail.sections.patientInfo.title')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoCard icon="User" title={t('dentistSchedule.detail.sections.patientInfo.details')}>
                  <div className="space-y-1">
                    <div><strong>{t('dentistSchedule.detail.fields.name')}:</strong> {appointment.patient.name}</div>
                    <div><strong>{t('dentistSchedule.detail.fields.patientId')}:</strong> {appointment.patient.id}</div>
                    {appointment.patient.contact?.wa && <div><strong>WA:</strong> {appointment.patient.contact.wa}</div>}
                  </div>
                </InfoCard>
                <InfoCard icon="FileText" title={t('dentistSchedule.detail.sections.appointmentDetails.title')}>
                  <div className="space-y-1">
                    <div><strong>Type:</strong> {appointment.type}</div>
                    <div><strong>Reason:</strong> {appointment.reason || '-'}</div>
                  </div>
                </InfoCard>
                 <InfoCard icon="MapPin" title={t('dentistSchedule.detail.sections.providerLocation.title')}>
                  <div className="space-y-1">
                    <div><strong>Prov:</strong> {appointment.provider?.name}</div>
                    <div><strong>Loc:</strong> {appointment.location?.name}</div>
                  </div>
                </InfoCard>
                <InfoCard icon="AlertTriangle" title={t('dentistSchedule.detail.sections.riskAssessment.title')}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full ${getRiskColor(appointment.risk)}`} />
                    <div><strong>{Math.round(appointment.risk * 100)}%</strong></div>
                  </div>
                </InfoCard>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-3 pt-2">
              <h3 className="text-lg font-semibold text-primary">{t('dentistSchedule.detail.quickActions.title')}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <ActionButton variant="secondary" icon="MessageSquare">Message</ActionButton>
                <ActionButton variant="secondary" icon="Camera">Photo</ActionButton>
                <ActionButton variant="secondary" icon="FileText">Instruct</ActionButton>
                <ActionButton variant="secondary" icon="Phone">Call</ActionButton>
              </div>
            </div>

            {/* Main Actions */}
            <div className="space-y-3 pt-4 border-t border-primary/10">
              <h3 className="text-lg font-semibold text-primary">{t('dentistSchedule.detail.actions.title')}</h3>
              <div className="flex flex-wrap gap-3">
                {/* Pending Actions */}
                {appointment.status === 'pending' && (
                  <>
                    <ActionButton onClick={() => onConfirm(appointment)} variant="success" icon="Check">Confirm</ActionButton>
                    <ActionButton onClick={() => onReschedule(appointment)} variant="warning" icon="Calendar">Reschedule</ActionButton>
                  </>
                )}
                {/* Confirmed Actions */}
                {appointment.status === 'confirmed' && (
                  <>
                    <ActionButton onClick={() => onReschedule(appointment)} variant="secondary" icon="Calendar">Reschedule</ActionButton>
                    {appointment.channel === 'clinic' && (
                       <ActionButton variant="success" icon="UserCheck">Check In</ActionButton>
                    )}
                  </>
                )}
                {/* Universal Cancel */}
                {!['cancelled', 'completed'].includes(appointment.status) && (
                  <ActionButton onClick={() => onCancel(appointment)} variant="danger" icon="X">Cancel</ActionButton>
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