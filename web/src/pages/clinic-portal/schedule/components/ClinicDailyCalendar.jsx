import React, { useState, useMemo } from 'react';
import Icon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';

const ClinicDailyCalendar = ({
  selectedDate,
  appointments,
  onTimeSlotClick,
  onAppointmentClick,
  doctors = [],
  selectedDoctors = []
}) => {
  const [viewMode, setViewMode] = useState('timeline'); // 'timeline' or 'grid'
  const { t, language } = useLanguage();
  const locale = language === 'id' ? 'id-ID' : 'en-US';

  const statusKeyMap = {
    'check-in': 'checkin',
    'in-chair': 'inchair',
    'no-show': 'noshow',
    'reschedule-requested': 'rescheduleRequested'
  };

  const getStatusLabel = (status) => 
    t(`clinic.schedule.appointment.status.${statusKeyMap[status] || status}`);

  // Helper functions
  const formatTime = (date) =>
    date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });

  const formatDateHeader = (date) =>
    date.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const parseHHMM = (str) => {
    const [h, m] = (str || '00:00').split(':').map(Number);
    return { h, m };
  };

  // Configuration
  const cfg = useMemo(() => ({
    granularity: 15,
    clinicHours: {
      start: '08:00',
      end: '18:00'
    }
  }), []);

  // Generate time slots
  const timeSlots = useMemo(() => {
    const slots = [];
    const { h: startH, m: startM } = parseHHMM(cfg.clinicHours.start);
    const { h: endH, m: endM } = parseHHMM(cfg.clinicHours.end);
    
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    for (let minutes = startMinutes; minutes < endMinutes; minutes += cfg.granularity) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      
      const slotDate = new Date(selectedDate);
      slotDate.setHours(h, m, 0, 0);
      
      slots.push({
        time: timeStr,
        date: slotDate,
        minutes: minutes
      });
    }
    
    return slots;
  }, [selectedDate, cfg]);

  // Filter and organize appointments by doctor
  const appointmentsByDoctor = useMemo(() => {
    const organized = {};
    
    // Initialize with selected doctors or all doctors
    const doctorsToShow = selectedDoctors.length > 0 ? selectedDoctors : doctors.map(d => d.id);
    
    doctorsToShow.forEach(doctorId => {
      organized[doctorId] = [];
    });
    
    // Filter appointments for selected date
    appointments.forEach(apt => {
      const aptDate = new Date(apt.start);
      const isToday = aptDate.toDateString() === selectedDate.toDateString();
      const doctorId = apt.provider?.id;
      
      if (isToday && doctorId && organized.hasOwnProperty(doctorId)) {
        organized[doctorId].push({
          ...apt,
          startMinutes: aptDate.getHours() * 60 + aptDate.getMinutes(),
          endMinutes: new Date(apt.end).getHours() * 60 + new Date(apt.end).getMinutes()
        });
      }
    });
    
    // Sort appointments by start time
    Object.keys(organized).forEach(doctorId => {
      organized[doctorId].sort((a, b) => a.startMinutes - b.startMinutes);
    });
    
    return organized;
  }, [appointments, selectedDate, doctors, selectedDoctors]);

  // Get doctor info
  const getDoctorInfo = (doctorId) => {
    return doctors.find(doc => doc.id === doctorId) || { id: doctorId, name: t('clinic.schedule.daily.unknownDoctor') };
  };

  // Get doctor color
  const getDoctorColor = (doctorId) => {
    const colors = [
      { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-700/40', text: 'text-blue-700 dark:text-blue-300' },
      { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-700/40', text: 'text-green-700 dark:text-green-300' },
      { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-700/40', text: 'text-purple-700 dark:text-purple-300' },
      { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-700/40', text: 'text-orange-700 dark:text-orange-300' },
      { bg: 'bg-pink-50 dark:bg-pink-900/20', border: 'border-pink-200 dark:border-pink-700/40', text: 'text-pink-700 dark:text-pink-300' },
      { bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-700/40', text: 'text-indigo-700 dark:text-indigo-300' },
    ];
    const index = doctors.findIndex(doc => doc.id === doctorId);
    return colors[index % colors.length] || colors[0];
  };

  // Check if time slot has appointment
  const getSlotAppointment = (doctorId, slotMinutes) => {
    const appointments = appointmentsByDoctor[doctorId] || [];
    return appointments.find(apt => 
      slotMinutes >= apt.startMinutes && slotMinutes < apt.endMinutes
    );
  };

  const totalAppointmentsCount = Object.values(appointmentsByDoctor).reduce((total, apps) => total + apps.length, 0);
  const activeDoctorsCount = Object.keys(appointmentsByDoctor).length;

  // Timeline View Component
  const TimelineView = () => (
    <div className="flex">
      {/* Time column */}
      <div className="w-16 flex-shrink-0 border-r border-primary/20 bg-surface">
        <div className="h-12"></div> {/* Header spacer */}
        {timeSlots.filter((_, index) => index % 4 === 0).map(slot => (
          <div
            key={slot.time}
            className="h-16 flex items-center justify-center text-sm text-secondary theme-transition border-b border-primary/20"
          >
            {slot.time}
          </div>
        ))}
      </div>

      {/* Doctor columns */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex min-w-max">
          {Object.entries(appointmentsByDoctor).map(([doctorId, appointments]) => {
            const doctor = getDoctorInfo(doctorId);
            const colors = getDoctorColor(doctorId);
            
            return (
              <div key={doctorId} className="w-52 border-r border-primary/20 bg-surface">
                {/* Doctor header */}
                <div className={`h-14 p-3 border-b border-primary/20 ${colors.bg} theme-transition`}>
                  <div className={`font-medium text-sm ${colors.text}`}>{doctor.name}</div>
                  <div className="text-xs text-secondary/80 dark:text-secondary/70 theme-transition">
                    {t('clinic.schedule.daily.appointmentsForDoctor', { count: appointments.length })}
                  </div>
                </div>

                {/* Time slots */}
                <div className="relative">
                  {timeSlots.map(slot => {
                    const appointment = getSlotAppointment(doctorId, slot.minutes);
                    const isSlotStart = slot.minutes % 60 === 0;
                    
                    return (
                      <div
                        key={slot.time}
                        className={`h-4 border-b border-primary/20 cursor-pointer transition-colors ${
                          isSlotStart ? 'border-primary/20 dark:border-primary/30' : ''
                        } hover:bg-primary/5`}
                        onClick={() => {
                          onTimeSlotClick?.(slot.date, doctorId);
                        }}
                      >
                        {appointment && (
                          <AppointmentBar 
                            appointment={appointment}
                            onClick={() => onAppointmentClick?.(appointment)}
                            locale={locale}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Grid View Component  
  const GridView = () => (
    <div className="space-y-6">
      {Object.entries(appointmentsByDoctor).map(([doctorId, appointments]) => {
        const doctor = getDoctorInfo(doctorId);
        const colors = getDoctorColor(doctorId);
        
        return (
          <div key={doctorId} className="bg-surface-elevated rounded-3xl border border-primary/20 shadow-theme-lg theme-transition">
            {/* Doctor header */}
            <div className={`p-4 border-b border-primary/15 dark:border-primary/25 ${colors.bg} rounded-t-3xl theme-transition`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`font-semibold ${colors.text}`}>{doctor.name}</h3>
                  <p className="text-sm text-secondary mt-1 theme-transition">{t('clinic.schedule.daily.appointmentsTodayCount', { count: appointments.length })}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${colors.bg} ${colors.text} border ${colors.border} shadow-inner theme-transition`}>
                  {doctor.specialization || t('clinic.schedule.daily.defaultSpecialization')}
                </div>
              </div>
            </div>

            {/* Appointments list */}
            <div className="p-4">
              {appointments.length > 0 ? (
                <div className="space-y-3">
                  {appointments.map(apt => (
                    <AppointmentCard 
                      key={apt.id}
                      appointment={apt}
                      doctorColor={colors}
                      onClick={() => onAppointmentClick?.(apt)}
                      locale={locale}
                      statusLabel={getStatusLabel(apt.status)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Icon name="Calendar" size={48} className="text-secondary/30 dark:text-secondary/20 mx-auto mb-3" />
                  <p className="text-secondary theme-transition">{t('clinic.schedule.daily.noAppointmentsToday')}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="bg-surface-elevated rounded-3xl border border-primary/20 shadow-theme-lg theme-transition">
      {/* Header */}
      <div className="p-6 border-b border-primary/15 dark:border-primary/25 bg-surface dark:bg-slate-900/40 rounded-t-3xl theme-transition">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-primary theme-transition">
              {`${t('clinic.schedule.daily.headerTitle')} - ${formatDateHeader(selectedDate)}`}
            </h2>
            <p className="text-sm text-secondary mt-1 theme-transition">
              {t('clinic.schedule.daily.scheduledLabel', { count: totalAppointmentsCount })}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {/* View mode toggle */}
            <div className="flex bg-surface-elevated/80 dark:bg-slate-800/60 rounded-xl p-1 border border-primary/15 dark:border-primary/25 theme-transition">
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1 text-sm rounded-lg flex items-center space-x-2 theme-transition ${
                  viewMode === 'timeline' 
                    ? 'bg-surface text-primary shadow-theme-sm' 
                    : 'text-secondary hover:text-primary'
                }`}
              >
                <Icon name="Clock" size={14} />
                <span>{t('clinic.schedule.daily.viewTimeline')}</span>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 text-sm rounded-lg flex items-center space-x-2 theme-transition ${
                  viewMode === 'grid' 
                    ? 'bg-surface text-primary shadow-theme-sm' 
                    : 'text-secondary hover:text-primary'
                }`}
              >
                <Icon name="Grid" size={14} />
                <span>{t('clinic.schedule.daily.viewGrid')}</span>
              </button>
            </div>

            {/* Stats */}
            <div className="text-sm text-secondary theme-transition">
              {t('clinic.schedule.daily.activeDoctors', { count: activeDoctorsCount })}
            </div>
          </div>
        </div>
      </div>

      {/* Calendar content */}
      <div className="overflow-hidden">
        {viewMode === 'timeline' ? <TimelineView /> : <GridView />}
      </div>
    </div>
  );
};

// Appointment Bar Component (for timeline)
const AppointmentBar = ({ appointment, onClick, locale = 'id-ID' }) => {
  const duration = (appointment.endMinutes - appointment.startMinutes) / 15; // in 15-min blocks
  const statusColor = getStatusColor(appointment.status);
  const startLabel = new Date(appointment.start).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
  const endLabel = new Date(appointment.end).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
  
  return (
    <div
      className={`absolute inset-x-1 rounded text-xs p-1 cursor-pointer border ${statusColor}`}
      style={{ 
        height: `${duration * 16 - 2}px`,
        zIndex: 10 
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      title={`${startLabel} - ${endLabel} • ${appointment.patient?.name}`}
    >
      <div className="font-medium truncate">{appointment.patient?.name}</div>
      <div className="truncate">{appointment.type}</div>
    </div>
  );
};

// Appointment Card Component (for grid)
const AppointmentCard = ({ appointment, doctorColor, onClick, locale = 'id-ID', statusLabel }) => {
  const startTime = new Date(appointment.start).toLocaleTimeString(locale, { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  });
  const endTime = new Date(appointment.end).toLocaleTimeString(locale, { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  });
  
  const statusColor = getStatusColor(appointment.status);

  return (
    <div
      className={`p-4 rounded-2xl border-2 cursor-pointer hover:shadow-theme-md transition-all ${doctorColor.border} ${doctorColor.bg}`}
      onClick={() => onClick?.()}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <div className="flex items-center space-x-2">
              <Icon name="Clock" size={16} className="text-secondary" />
              <span className="font-medium text-primary">{startTime} - {endTime}</span>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColor}`}>
              {statusLabel || appointment.status}
            </span>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Icon name="User" size={16} className="text-secondary" />
              <span className="font-semibold text-primary">{appointment.patient?.name}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Icon name="Activity" size={16} className="text-secondary" />
              <span className="text-secondary">{appointment.type}</span>
            </div>
            
            {appointment.reason && (
              <div className="flex items-center space-x-2">
                <Icon name="FileText" size={16} className="text-secondary" />
                <span className="text-secondary text-sm">{appointment.reason}</span>
              </div>
            )}
          </div>
        </div>

        <div className="ml-4">
          <button className="p-2 text-secondary/70 hover:text-primary hover:bg-primary/10 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <Icon name="MoreVertical" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper function for status colors (moved outside component to avoid re-creation)
const getStatusColor = (status) => {
  const statusColors = {
    pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-200 border-amber-200 dark:border-amber-700/50',
    confirmed: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 border-blue-200 dark:border-blue-700/50',
    'check-in': 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700/50',
    'in-chair': 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700/50',
    completed: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600',
    cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200 border-red-200 dark:border-red-700/50',
    'no-show': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200 border-red-200 dark:border-red-700/50',
    'reschedule-requested': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-200 border-purple-200 dark:border-purple-700/50'
  };
  return statusColors[status] || 'bg-slate-100 dark:bg-slate-800 text-secondary dark:text-secondary border-slate-200 dark:border-slate-600';
};

export default ClinicDailyCalendar;
