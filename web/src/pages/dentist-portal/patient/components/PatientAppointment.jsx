import React, { useState } from 'react';
import Button from '../../../../components/ui/Button';
import ModalPortal from '../../../../components/ui/ModalPortal';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { useToast } from '../../../../contexts/ToastContext';
import axios from 'axios';
import ClinicalIcon from './ClinicalIcon';

// Inject animation keyframes
if (typeof document !== 'undefined' && !document.getElementById('appointment-modal-animations')) {
  const style = document.createElement('style');
  style.id = 'appointment-modal-animations';
  style.textContent = `
    @keyframes modalSlideUp {
      from { opacity: 0; transform: scale(0.95) translateY(10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes backdropFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

const PatientAppointment = ({ patient, onScheduleNew, onUpdateAppointment, onCancelAppointment }) => {
  const toast = useToast();
  const [filterStatus, setFilterStatus] = useState('all');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailAppointment, setDetailAppointment] = useState(null);
  const [sendingReminder, setSendingReminder] = useState(false);
  const { t } = useLanguage();

  if (!patient) {
    return (
      <div className="bg-surface border border-primary/10 rounded-3xl shadow-theme-sm p-12 animate-in fade-in">
        <div className="text-center py-8">
          <ClinicalIcon name="appointment-calendar" size="xl" className="mx-auto mb-4" />
          <p className="text-secondary font-medium">{t('dentistPatient.common.noPatientSelected')}</p>
        </div>
      </div>
    );
  }

  const rawAppointments = patient.appointments || [];

  const mappedAppointments = React.useMemo(() => {
    return rawAppointments.map(apt => {
      const startIso = apt.startsAt || apt.starts_at || apt.date;
      if (!startIso) return apt;

      const startsAtDate = new Date(startIso);
      const now = new Date();
      const isPast24h = (now - startsAtDate) > (24 * 60 * 60 * 1000);

      let status = apt.status;
      if (isPast24h && !['cancelled', 'rejected', 'no-show', 'completed'].includes(status)) {
        status = 'completed';
      }

      return {
        ...apt,
        status
      };
    });
  }, [rawAppointments]);

  const filteredAppointments = mappedAppointments.filter(appointment => {
    if (filterStatus === 'all') return true;
    return appointment.status === filterStatus;
  });

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'scheduled': return 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800/50';
      case 'completed': return 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-800/50';
      case 'cancelled': return 'text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800/50';
      case 'overdue': return 'text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-900/20 dark:border-orange-800/50';
      case 'no-show': return 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-800/50';
      case 'in-progress': return 'text-purple-700 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-900/20 dark:border-purple-800/50';
      default: return 'text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-900/20 dark:border-slate-700/50';
    }
  };

  const getNormalizedConsultationType = (appointment) => {
    if (!appointment) return 'onsite';
    if (appointment.metadata?.appointmentType === 'virtual') return 'virtual';
    const type = (appointment.consultationType || appointment.consultation_type || '').toLowerCase();
    if (['virtual', 'teleconsultation', 'teledentistry', 'online'].includes(type)) return 'virtual';
    const appType = (appointment.appointmentType || appointment.type || '').toLowerCase();
    if (['virtual', 'teleconsultation', 'online'].includes(appType)) return 'virtual';
    return 'onsite';
  };

  const getConsultationTypeLabel = (appointment) => {
    const type = getNormalizedConsultationType(appointment);
    return type === 'virtual' ? 'Teledentistry' : 'In-Clinic';
  };

  const getConsultationTypeIcon = (appointment) => (
    getNormalizedConsultationType(appointment) === 'virtual' ? 'teledentistry' : 'clinic-patient'
  );

  const getLocalDate = (appointment) => {
    const d = appointment.startsAt || appointment.starts_at || appointment.date;
    if (!d) return '';
    return new Date(d).toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const getLocalTime = (appointment) => {
    const d = appointment.startsAt || appointment.starts_at || appointment.time || appointment.date;
    if (!d) return '';
    return new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const getAppointmentTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'consultation': return 'patient-profile';
      case 'checkup': case 'regular checkup': return 'case-findings';
      case 'cleaning': return 'odontogram';
      case 'root canal': return 'procedure';
      case 'filling': return 'treatment-plan';
      case 'extraction': return 'procedure';
      case 'emergency': return 'emergency-contact';
      default: return 'appointment-calendar';
    }
  };

  const handleSendReminder = async (appointment) => {
    try {
      setSendingReminder(true);
      const token = localStorage.getItem('token');

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/v1/notifications/send-appointment-reminder`,
        {
          appointmentId: appointment.id,
          patientId: appointment.patientId || patient.id
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        toast.success('Reminder sent successfully!');
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast.error('Failed to send reminder: ' + (error.response?.data?.message || error.message));
    } finally {
      setSendingReminder(false);
    }
  };

  const handleViewDetails = (appointment) => {
    setDetailAppointment(appointment);
    setShowDetailModal(true);
  };

  const upcomingAppointments = mappedAppointments.filter(apt =>
    apt.status === 'scheduled' && new Date(apt.startsAt || apt.date) >= new Date()
  );

  const pastAppointments = mappedAppointments.filter(apt =>
    apt.status === 'completed' || apt.status === 'overdue' || (apt.status !== 'scheduled' && new Date(apt.startsAt || apt.date) < new Date())
  );

  const overdueCount = mappedAppointments.filter(apt => apt.status === 'overdue').length;

  const mapStatusKey = (status) => {
    const key = (status || '').toLowerCase();
    switch (key) {
      case 'no-show': return 'noShow';
      case 'in-progress': return 'inProgress';
      case 'overdue': return 'overdue';
      default: return key || 'unknown';
    }
  };

  const getStatusLabel = (status) => {
    const translated = t(`dentistPatient.appointments.statuses.${mapStatusKey(status)}`);
    return translated.startsWith('dentistPatient') ? status : translated;
  };

  const filterOptions = [
    { value: 'all', label: t('dentistPatient.appointments.filters.all') },
    { value: 'scheduled', label: getStatusLabel('scheduled') },
    { value: 'completed', label: getStatusLabel('completed') },
    { value: 'overdue', label: 'Overdue' },
    { value: 'cancelled', label: getStatusLabel('cancelled') },
    { value: 'no-show', label: getStatusLabel('no-show') }
  ];

  const StatCard = ({ title, value, colorClass, icon, shadowColor }) => (
    <div className="bg-gradient-to-br from-surface-elevated to-surface rounded-2xl p-5 border border-primary/10 shadow-sm relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <ClinicalIcon name={icon} size="xl" className="border-0 shadow-none" />
      </div>
      <div className="flex items-center space-x-2.5 mb-2">
        <span className={`flex h-2.5 w-2.5 rounded-full ${colorClass}`} style={{ boxShadow: `0 0 8px ${shadowColor}` }}></span>
        <span className="text-xs font-bold uppercase tracking-wider text-muted">{title}</span>
      </div>
      <p className="text-3xl font-bold text-primary">{value}</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-surface border border-primary/10 rounded-3xl shadow-theme-sm p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-primary tracking-tight">{t('dentistPatient.appointments.title')}</h2>
            <p className="text-secondary mt-1">Manage patient visits and history</p>
          </div>
          <Button onClick={() => onScheduleNew && onScheduleNew()} className="shadow-lg shadow-accent/20">
            {t('dentistPatient.appointments.actions.scheduleNew')}
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <StatCard title={t('dentistPatient.appointments.summary.total')} value={mappedAppointments.length} colorClass="bg-blue-500" shadowColor="rgba(59,130,246,0.5)" icon="appointment-calendar" />
          <StatCard title={t('dentistPatient.appointments.summary.upcoming')} value={upcomingAppointments.length} colorClass="bg-amber-500" shadowColor="rgba(245,158,11,0.5)" icon="appointment-upcoming" />
          <StatCard title={t('dentistPatient.appointments.summary.completed')} value={mappedAppointments.filter(apt => apt.status === 'completed').length} colorClass="bg-emerald-500" shadowColor="rgba(16,185,129,0.5)" icon="appointment-completed" />
          <StatCard title="Overdue" value={overdueCount} colorClass="bg-orange-500" shadowColor="rgba(249,115,22,0.5)" icon="appointment-overdue" />
          <StatCard title={t('dentistPatient.appointments.summary.cancelled')} value={mappedAppointments.filter(apt => apt.status === 'cancelled').length} colorClass="bg-red-500" shadowColor="rgba(239,68,68,0.5)" icon="appointment-cancelled" />
        </div>
      </div>

      {/* Filters & Content */}
      <div className="bg-surface border border-primary/10 rounded-3xl shadow-theme-lg">
        <div className="p-6 border-b border-primary/10">
          <div className="relative inline-block">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 border border-primary/20 rounded-xl bg-surface-elevated text-primary text-sm font-medium focus:ring-2 focus:ring-accent/20 focus:border-accent appearance-none cursor-pointer hover:border-accent/70 transition-colors"
            >
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-muted">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </div>

        {/* Appointments List */}
        <div className="divide-y divide-primary/10">
          {filteredAppointments.length > 0 ? (
            filteredAppointments.map((appointment) => (
              <div key={appointment.id} className="group p-6 hover:bg-surface-elevated transition-colors duration-200">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start lg:items-center space-x-5">
                    <ClinicalIcon name={getAppointmentTypeIcon(appointment.type || appointment.reason)} size="xl" />

                    <div>
                      <h4 className="text-lg font-bold text-primary mb-1">{appointment.reason || appointment.type || 'Appointment'}</h4>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-secondary">
                        <span className="flex items-center gap-1.5 bg-surface px-2 py-1 rounded-md border border-primary/10">
                          <ClinicalIcon name="appointment-calendar" size="xs" className="h-4 w-4 border-0 bg-transparent shadow-none" /> {getLocalDate(appointment)}
                        </span>
                        <span className="flex items-center gap-1.5 bg-surface px-2 py-1 rounded-md border border-primary/10">
                          <ClinicalIcon name="session-history" size="xs" className="h-4 w-4 border-0 bg-transparent shadow-none" /> {getLocalTime(appointment)}
                        </span>
                        <span className="inline-flex items-center gap-1.5 font-semibold text-accent bg-accent/10 px-2 py-1 rounded-md border border-accent/20">
                          <ClinicalIcon name={getConsultationTypeIcon(appointment)} size="xs" className="h-4 w-4 border-0 bg-transparent shadow-none" />
                          {getConsultationTypeLabel(appointment)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:justify-end pl-16 lg:pl-0">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${getStatusColor(appointment.status)}`}>
                      {getStatusLabel(appointment.status)}
                    </span>

                    <div className="flex items-center gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200">
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-surface hover:bg-surface-elevated border-primary/20 text-secondary"
                        onClick={() => handleViewDetails(appointment)}
                      >
                        {t('dentistPatient.appointments.actions.viewDetails')}
                      </Button>

                      {appointment.status === 'scheduled' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-500/10 dark:hover:bg-red-900/20"
                          onClick={() => onCancelAppointment && onCancelAppointment(appointment.id)}
                        >
                          {t('dentistPatient.appointments.actions.cancel')}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {appointment.status === 'overdue' && (
                  <div className="mt-4 ml-0 lg:ml-[4.75rem] p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800/50 flex items-start gap-3">
                    <ClinicalIcon name="appointment-overdue" size="sm" />
                    <div>
                      <h5 className="text-xs font-bold text-orange-700 dark:text-orange-400 uppercase tracking-wider mb-1">Overdue & Unpaid</h5>
                      <p className="text-sm text-orange-600 dark:text-orange-300 leading-relaxed">Appointment ini sudah melewati jadwal dan belum dibayar. Silakan hubungi pasien untuk follow-up.</p>
                    </div>
                  </div>
                )}

                {appointment.status === 'completed' && appointment.treatmentSummary && (
                  <div className="mt-4 ml-0 lg:ml-[4.75rem] p-4 bg-surface rounded-xl border border-primary/10">
                    <h5 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">{t('dentistPatient.appointments.summary.treatment')}</h5>
                    <p className="text-sm text-secondary leading-relaxed">{appointment.treatmentSummary}</p>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="py-20 text-center">
              <ClinicalIcon name="appointment-calendar" size="xl" className="mx-auto mb-4" />
              <h3 className="text-lg font-bold text-primary mb-2">{t('dentistPatient.appointments.empty.title')}</h3>
              <p className="text-secondary max-w-sm mx-auto mb-6">
                {t('dentistPatient.appointments.empty.noFilterMatches', { status: getStatusLabel(filterStatus) })}
              </p>
              <Button onClick={() => onScheduleNew && onScheduleNew()} className="shadow-lg shadow-accent/20">
                {t('dentistPatient.appointments.actions.scheduleFirst')}
              </Button>
            </div>
          )}
        </div>
      </div>

      {upcomingAppointments.length > 0 && (
        <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 dark:opacity-20">
            <ClinicalIcon name="appointment-upcoming" size="xl" className="border-0 shadow-none" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                <h3 className="text-sm font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">{t('dentistPatient.appointments.next.title')}</h3>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-base text-primary mt-2">
                <span className="inline-flex items-center gap-1.5 font-semibold bg-surface/60 px-2 py-1 rounded"><ClinicalIcon name="appointment-calendar" size="xs" className="h-4 w-4 border-0 bg-transparent shadow-none" /> {getLocalDate(upcomingAppointments[0])}</span>
                <span className="inline-flex items-center gap-1.5 font-semibold bg-surface/60 px-2 py-1 rounded"><ClinicalIcon name="session-history" size="xs" className="h-4 w-4 border-0 bg-transparent shadow-none" /> {getLocalTime(upcomingAppointments[0])}</span>
                <span className="inline-flex items-center gap-1.5 font-bold text-accent"><ClinicalIcon name={getConsultationTypeIcon(upcomingAppointments[0])} size="xs" className="h-4 w-4 border-0 bg-transparent shadow-none" /> {getConsultationTypeLabel(upcomingAppointments[0])}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="bg-surface/80 hover:bg-surface border-primary/20 text-secondary"
                onClick={() => handleSendReminder(upcomingAppointments[0])}
                disabled={sendingReminder}
              >
                <span className="inline-flex items-center gap-1.5">
                  <ClinicalIcon name={sendingReminder ? 'appointment-upcoming' : 'communication'} size="xs" className="h-4 w-4 border-0 bg-transparent shadow-none" />
                  {sendingReminder ? 'Sending...' : 'Send Reminder'}
                </span>
              </Button>
              <Button
                size="sm"
                className="shadow-md shadow-accent/20"
                onClick={() => handleViewDetails(upcomingAppointments[0])}
              >
                {t('dentistPatient.appointments.actions.viewDetails')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && detailAppointment && (
        <ModalPortal disableScroll={false}>
          <div
            className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDetailModal(false)}
            style={{ animation: 'backdropFadeIn 0.3s ease-out' }}
          />

          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="relative w-full max-w-2xl bg-surface rounded-3xl shadow-2xl flex flex-col pointer-events-auto overflow-hidden ring-1 ring-black/5 dark:ring-white/10"
              style={{ maxHeight: '90vh', animation: 'modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex-shrink-0 bg-surface/80 backdrop-blur border-b border-primary/10 p-6 sticky top-0 z-20 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-primary">Appointment Details</h2>
                  <p className="text-xs text-muted font-mono mt-1 bg-surface-elevated px-2 py-0.5 rounded inline-block border border-primary/10">
                    #{detailAppointment.bookingCode || String(detailAppointment.id).padStart(6, '0')}
                  </p>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="w-8 h-8 rounded-full bg-surface-elevated hover:bg-surface-elevated/80 text-muted hover:text-primary flex items-center justify-center transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <div className="flex items-center justify-between bg-surface-elevated p-4 rounded-xl border border-primary/10">
                  <span className={`px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wide border ${getStatusColor(detailAppointment.status)}`}>
                    {getStatusLabel(detailAppointment.status)}
                  </span>
                  <span className="inline-flex items-center gap-2 text-lg font-semibold text-primary">
                    <ClinicalIcon name={getConsultationTypeIcon(detailAppointment)} size="sm" />
                    {getConsultationTypeLabel(detailAppointment)}
                  </span>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-4">Patient Information</h3>
                  <div className="bg-surface border border-primary/10 rounded-2xl p-5 shadow-sm">
                    <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                      <div>
                        <span className="block text-muted text-xs mb-1">Name</span>
                        <p className="text-primary font-semibold text-base">{patient.name}</p>
                      </div>
                      <div>
                        <span className="block text-muted text-xs mb-1">Date of Birth</span>
                        <p className="text-primary font-medium">{patient.dateOfBirth || patient.birthDate || '-'}</p>
                      </div>
                      <div>
                        <span className="block text-muted text-xs mb-1">Email</span>
                        <p className="text-primary font-medium">{patient.email}</p>
                      </div>
                      <div>
                        <span className="block text-muted text-xs mb-1">Phone</span>
                        <p className="text-primary font-medium">{patient.phoneNumber || patient.phone_number || '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-4">Visit Details</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-surface-elevated p-4 rounded-xl border border-primary/10">
                        <span className="text-muted text-xs block mb-1">Date & Time</span>
                        <p className="text-primary font-bold">{getLocalDate(detailAppointment)}</p>
                        <p className="text-secondary text-sm">{getLocalTime(detailAppointment)}</p>
                      </div>
                      <div className="bg-surface-elevated p-4 rounded-xl border border-primary/10">
                        <span className="text-muted text-xs block mb-1">Consultation Mode</span>
                        <p className="text-primary font-bold">{getNormalizedConsultationType(detailAppointment) === 'virtual' ? 'Virtual Call' : 'In-Clinic Visit'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default PatientAppointment;
