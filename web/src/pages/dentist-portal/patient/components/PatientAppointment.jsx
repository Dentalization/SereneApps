import React, { useState } from 'react';
import Button from '../../../../components/ui/Button';
import { useLanguage } from '../../../../contexts/LanguageContext';

const PatientAppointment = ({ patient, onScheduleNew, onUpdateAppointment, onCancelAppointment }) => {
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showReschedule, setShowReschedule] = useState(false);
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

  const upcomingAppointments = appointments.filter(apt => 
    apt.status === 'scheduled' && new Date(apt.date) >= new Date()
  );

  const pastAppointments = appointments.filter(apt => 
    apt.status === 'completed' || new Date(apt.date) < new Date()
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
                      <h4 className="font-semibold text-primary">{appointment.type}</h4>
                      <div className="flex items-center space-x-4 text-sm text-secondary mt-1">
                        <span>📅 {appointment.date}</span>
                        <span>🕐 {appointment.time}</span>
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

                      {appointment.status === 'completed' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedAppointment(appointment)}
                        >
                          {t('dentistPatient.appointments.actions.viewDetails')}
                        </Button>
                      )}
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
                <span>📅 {upcomingAppointments[0].date}</span>
                <span>🕐 {upcomingAppointments[0].time}</span>
                <span>🏥 {upcomingAppointments[0].type}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                {t('dentistPatient.appointments.actions.sendReminder')}
              </Button>
              <Button size="sm">
                {t('dentistPatient.appointments.actions.viewDetails')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientAppointment;
