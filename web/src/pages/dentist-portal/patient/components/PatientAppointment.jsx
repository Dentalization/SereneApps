import React, { useState, useEffect } from 'react';
import Button from '../../../../components/ui/Button';
import ModalPortal from '../../../../components/ui/ModalPortal';
import { useLanguage } from '../../../../contexts/LanguageContext';
import axios from 'axios';

// Inject animation keyframes (Hanya dijalankan sekali)
if (typeof document !== 'undefined' && !document.getElementById('appointment-modal-animations')) {
  const style = document.createElement('style');
  style.id = 'appointment-modal-animations';
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

const PatientAppointment = ({ patient, onScheduleNew, onUpdateAppointment, onCancelAppointment }) => {
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showReschedule, setShowReschedule] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailAppointment, setDetailAppointment] = useState(null);
  const [sendingReminder, setSendingReminder] = useState(false);
  const { t } = useLanguage();

  if (!patient) {
    return (
      <div className="bg-surface border border-primary/20 rounded-2xl shadow-theme-lg p-6 theme-transition">
        <div className="text-center py-8">
          <p className="text-secondary">{t('dentistPatient.common.noPatientSelected')}</p>
        </div>
      </div>
    );
  }

  const appointments = patient.appointments || [];
  
  const filteredAppointments = appointments.filter(appointment => {
    if (filterStatus === 'all') return true;
    return appointment.status === filterStatus;
  });

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'scheduled': return 'text-brand-primary bg-brand-primary/10 border-brand-primary/30';
      case 'completed': return 'text-success bg-success/10 border-success/30';
      case 'cancelled': return 'text-error bg-error/10 border-error/30';
      case 'no-show': return 'text-warning bg-warning/10 border-warning/30';
      case 'in-progress': return 'text-warning bg-warning/10 border-warning/30';
      default: return 'text-secondary bg-muted border-primary/10';
    }
  };

  // --- 🔥 FIX: SAMA SEPERTI AppointmentDetailDrawer.jsx (PROVEN WORKING) ---
  const getNormalizedConsultationType = (appointment) => {
    if (!appointment) return 'onsite';

    // 1. Cek Metadata terlebih dahulu (Seringkali ini sumber kebenaran paling akurat dari mobile)
    if (appointment.metadata?.appointmentType === 'virtual') return 'virtual';

    // 2. Cek Consultation Type (Snake case atau Camel case)
    const type = (appointment.consultationType || appointment.consultation_type || '').toLowerCase();
    if (['virtual', 'teleconsultation', 'teledentistry', 'online'].includes(type)) return 'virtual';

    // 3. Cek Appointment Type (tetapi hati-hati dengan default 'onsite')
    const appType = (appointment.appointmentType || appointment.type || '').toLowerCase();
    if (['virtual', 'teleconsultation', 'online'].includes(appType)) return 'virtual';

    return 'onsite';
  };

  const getConsultationTypeLabel = (appointment) => {
    const type = getNormalizedConsultationType(appointment);
    return type === 'virtual' ? '💻 Teledentistry' : '🏥 In-Clinic';
  };
  // ---------------------------------------------------------------

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
      case 'consultation': return '👨‍⚕️';
      case 'checkup': case 'regular checkup': return '🔍';
      case 'cleaning': return '🦷';
      case 'root canal': return '🏥';
      case 'filling': return '🔧';
      case 'extraction': return '🔬';
      case 'emergency': return '🚨';
      default: return '📅';
    }
  };

  // Send reminder notification to patient
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
        alert('✅ Reminder berhasil dikirim ke pasien!');
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
      alert('❌ Gagal mengirim reminder: ' + (error.response?.data?.message || error.message));
    } finally {
      setSendingReminder(false);
    }
  };

  // View full appointment details
  const handleViewDetails = (appointment) => {
    setDetailAppointment(appointment);
    setShowDetailModal(true);
  };

  const upcomingAppointments = appointments.filter(apt => 
    apt.status === 'scheduled' && new Date(apt.startsAt || apt.date) >= new Date()
  );

  const pastAppointments = appointments.filter(apt => 
    apt.status === 'completed' || (apt.status !== 'scheduled' && new Date(apt.startsAt || apt.date) < new Date())
  );

  const mapStatusKey = (status) => {
    const key = (status || '').toLowerCase();
    switch (key) {
      case 'no-show':
        return 'noShow';
      case 'in-progress':
        return 'inProgress';
      default:
        return key || 'unknown';
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
    { value: 'cancelled', label: getStatusLabel('cancelled') },
    { value: 'no-show', label: getStatusLabel('no-show') }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface-elevated border border-primary/10 rounded-xl shadow-theme-md theme-transition p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-primary">{t('dentistPatient.appointments.title')}</h2>
          <Button onClick={() => onScheduleNew && onScheduleNew()}>
            {t('dentistPatient.appointments.actions.scheduleNew')}
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-surface rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-brand-primary rounded-full"></div>
              <span className="text-sm font-medium text-text-primary">{t('dentistPatient.appointments.summary.total')}</span>
            </div>
            <p className="text-2xl font-bold text-primary">{appointments.length}</p>
          </div>

          <div className="bg-surface rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-warning rounded-full"></div>
              <span className="text-sm font-medium text-text-primary">{t('dentistPatient.appointments.summary.upcoming')}</span>
            </div>
            <p className="text-2xl font-bold text-primary">{upcomingAppointments.length}</p>
          </div>

          <div className="bg-surface rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-success rounded-full"></div>
              <span className="text-sm font-medium text-text-primary">{t('dentistPatient.appointments.summary.completed')}</span>
            </div>
            <p className="text-2xl font-bold text-primary">{pastAppointments.length}</p>
          </div>

          <div className="bg-surface rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-error rounded-full"></div>
              <span className="text-sm font-medium text-text-primary">{t('dentistPatient.appointments.summary.cancelled')}</span>
            </div>
            <p className="text-2xl font-bold text-primary">
              {appointments.filter(apt => apt.status === 'cancelled').length}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface-elevated border border-primary/10 rounded-xl shadow-theme-md theme-transition p-4">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-text-primary">{t('dentistPatient.appointments.filters.label')}</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-primary/10 rounded-md bg-background text-primary focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-colors"
          >
            {filterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-surface-elevated border border-primary/10 rounded-xl shadow-theme-md theme-transition">
        <div className="p-4 border-b border-primary/10">
          <h3 className="text-lg font-semibold text-primary">
            {t('dentistPatient.appointments.history.title', { count: filteredAppointments.length })}
          </h3>
        </div>

        <div className="divide-y divide-border">
          {filteredAppointments.length > 0 ? (
            filteredAppointments.map((appointment) => (
              <div key={appointment.id} className="p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-surface rounded-lg flex items-center justify-center text-xl">
                      {getAppointmentTypeIcon(appointment.type)}
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-primary">{appointment.reason || appointment.type || 'Appointment'}</h4>
                      <div className="flex items-center space-x-4 text-sm text-secondary mt-1">
                        <span>📅 {getLocalDate(appointment)}</span>
                        <span>🕐 {getLocalTime(appointment)}</span>
                        {/* UPDATE: Use helper function */}
                        <span className="font-medium">{getConsultationTypeLabel(appointment)}</span>
                        {appointment.duration && (
                          <span>
                            ⏱️ {t('dentistPatient.appointments.labels.duration', { minutes: appointment.duration })}
                          </span>
                        )}
                      </div>
                      {appointment.notes && (
                        <p className="text-sm text-secondary mt-1 italic">
                          "{appointment.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(appointment.status)}`}>
                        {getStatusLabel(appointment.status)}
                      </span>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-1">
                      {appointment.status === 'scheduled' && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setShowReschedule(appointment.id)}
                          >
                            {t('dentistPatient.appointments.actions.reschedule')}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => onUpdateAppointment && onUpdateAppointment(appointment.id, 'in-progress')}
                          >
                            {t('dentistPatient.appointments.actions.start')}
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => onCancelAppointment && onCancelAppointment(appointment.id)}
                          >
                            {t('dentistPatient.appointments.actions.cancel')}
                          </Button>
                        </>
                      )}

                      {appointment.status === 'in-progress' && (
                        <Button 
                          variant="success" 
                          size="sm"
                          onClick={() => onUpdateAppointment && onUpdateAppointment(appointment.id, 'completed')}
                        >
                          {t('dentistPatient.appointments.actions.complete')}
                        </Button>
                      )}

                      {/* Always show View Details button */}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewDetails(appointment)}
                      >
                        {t('dentistPatient.appointments.actions.viewDetails')}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Treatment Summary for completed appointments */}
                {appointment.status === 'completed' && appointment.treatmentSummary && (
                  <div className="mt-3 p-3 bg-surface rounded-lg border border-primary/10">
                    <h5 className="font-medium text-primary mb-2">{t('dentistPatient.appointments.summary.treatment')}</h5>
                    <p className="text-sm text-secondary">{appointment.treatmentSummary}</p>
                    {appointment.followUpRequired && (
                      <div className="mt-2 flex items-center space-x-2">
                        <span className="w-2 h-2 bg-warning rounded-full"></span>
                        <span className="text-sm text-warning font-medium">{t('dentistPatient.appointments.summary.followUp')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 4h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-primary mb-2">{t('dentistPatient.appointments.empty.title')}</h3>
              <p className="text-secondary mb-4">
                {filterStatus === 'all' 
                  ? t('dentistPatient.appointments.empty.noAppointments')
                  : t('dentistPatient.appointments.empty.noFilterMatches', { status: getStatusLabel(filterStatus) })
                }
              </p>
              <Button onClick={() => onScheduleNew && onScheduleNew()}>
                {t('dentistPatient.appointments.actions.scheduleFirst')}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Next Appointment Card */}
      {upcomingAppointments.length > 0 && (
        <div className="bg-gradient-to-r from-brand-primary/10 to-brand-accent/10 border border-brand-primary/20 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-primary mb-1">{t('dentistPatient.appointments.next.title')}</h3>
              <div className="flex items-center space-x-4 text-sm text-secondary">
                <span>📅 {getLocalDate(upcomingAppointments[0])}</span>
                <span>🕐 {getLocalTime(upcomingAppointments[0])}</span>
                <span className="font-medium">{getConsultationTypeLabel(upcomingAppointments[0])}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleSendReminder(upcomingAppointments[0])}
                disabled={sendingReminder}
              >
                {sendingReminder ? '⏳ Sending...' : t('dentistPatient.appointments.actions.sendReminder')}
              </Button>
              <Button 
                size="sm"
                onClick={() => handleViewDetails(upcomingAppointments[0])}
              >
                {t('dentistPatient.appointments.actions.viewDetails')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Detail Modal */}
      {showDetailModal && detailAppointment && (
        <ModalPortal disableScroll={false}>
          {/* FIXED BACKDROP */}
          <div 
            className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm"
            onClick={() => setShowDetailModal(false)}
            style={{ animation: 'backdropFadeIn 0.2s ease-out' }}
          />

          {/* FIXED MODAL - Always centered in viewport */}
          <div 
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="relative w-full max-w-2xl bg-surface border border-primary/20 rounded-3xl shadow-2xl flex flex-col pointer-events-auto"
              style={{ maxHeight: '85vh', animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header (Sticky di dalam modal) */}
              <div className="flex-shrink-0 bg-surface border-b border-primary/10 p-6 sticky top-0 z-20 rounded-t-3xl flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-primary">Appointment Details</h2>
                  <p className="text-sm text-secondary mt-1">Booking Code: {detailAppointment.bookingCode || `SRN-${String(detailAppointment.id).padStart(6, '0')}`}</p>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
                >
                  <svg className="w-6 h-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <span className={`px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(detailAppointment.status)}`}>
                  {getStatusLabel(detailAppointment.status)}
                </span>
                {/* UPDATE: Use helper function for Detail Modal */}
                <span className="text-2xl">{getConsultationTypeLabel(detailAppointment)}</span>
              </div>

              {/* Patient Info */}
              <div className="bg-muted/30 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-primary mb-3">Patient Information</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-secondary">Name:</span>
                    <p className="text-primary font-medium">{patient.name}</p>
                  </div>
                  <div>
                    <span className="text-secondary">Email:</span>
                    <p className="text-primary font-medium">{patient.email}</p>
                  </div>
                  <div>
                    <span className="text-secondary">Phone:</span>
                    <p className="text-primary font-medium">{patient.phoneNumber || patient.phone_number || '-'}</p>
                  </div>
                  <div>
                    <span className="text-secondary">Date of Birth:</span>
                    <p className="text-primary font-medium">{patient.dateOfBirth || patient.birthDate || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Appointment Details */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-primary">Appointment Details</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-secondary">📅 Date:</span>
                    <p className="text-primary font-medium">{getLocalDate(detailAppointment)}</p>
                  </div>
                  <div>
                    <span className="text-secondary">🕐 Time:</span>
                    <p className="text-primary font-medium">{getLocalTime(detailAppointment)}</p>
                  </div>
                  <div>
                    <span className="text-secondary">Type:</span>
                    <p className="text-primary font-medium">{getNormalizedConsultationType(detailAppointment) === 'virtual' ? 'Virtual' : 'Onsite'}</p>
                  </div>
                  <div>
                    <span className="text-secondary">Mode:</span>
                    {/* UPDATE: Use helper function for Detail Modal */}
                    <p className="text-primary font-medium">{getConsultationTypeLabel(detailAppointment)}</p>
                  </div>
                </div>

                {detailAppointment.reason && (
                  <div>
                    <span className="text-secondary text-sm">Reason:</span>
                    <p className="text-primary mt-1 p-3 bg-muted/20 rounded-lg">"{detailAppointment.reason}"</p>
                  </div>
                )}

                {detailAppointment.notes && (
                  <div>
                    <span className="text-secondary text-sm">Notes:</span>
                    <p className="text-primary mt-1 p-3 bg-muted/20 rounded-lg italic">"{detailAppointment.notes}"</p>
                  </div>
                )}
              </div>

              {/* Payment Information */}
              <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-primary mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Payment Information
                </h3>
                {detailAppointment.payment ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-secondary">Amount:</span>
                      <span className="text-primary font-semibold">Rp {parseInt(detailAppointment.payment.amount || 0).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Status:</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        detailAppointment.payment.status === 'paid' || detailAppointment.payment.status === 'completed' 
                          ? 'bg-success/20 text-success border border-success/30' 
                          : detailAppointment.payment.status === 'pending' 
                          ? 'bg-warning/20 text-warning border border-warning/30'
                          : 'bg-error/20 text-error border border-error/30'
                      }`}>
                        {detailAppointment.payment.status?.toUpperCase() || 'UNKNOWN'}
                      </span>
                    </div>
                    {detailAppointment.payment.provider && (
                      <div className="flex justify-between">
                        <span className="text-secondary">Provider:</span>
                        <span className="text-primary font-medium">{detailAppointment.payment.provider}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-secondary text-sm">💳 No payment information available</p>
                    <p className="text-xs text-secondary mt-1">Payment may be processed at clinic</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-4 border-t border-primary/10">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleSendReminder(detailAppointment)}
                  disabled={sendingReminder}
                >
                  {sendingReminder ? '⏳ Sending...' : '🔔 Send Reminder'}
                </Button>
                {detailAppointment.status === 'scheduled' && (
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                      setShowDetailModal(false);
                      onCancelAppointment && onCancelAppointment(detailAppointment.id);
                    }}
                  >
                    Cancel Appointment
                  </Button>
                )}
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