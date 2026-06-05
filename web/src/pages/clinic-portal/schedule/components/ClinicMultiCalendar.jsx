import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Icon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';

const CLINIC_TIME_ZONE = 'Asia/Jakarta';

const getClinicDateKey = (value) => {
  try {
    if (!value) return 'invalid-date';
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) {
      return 'invalid-date';
    }
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: CLINIC_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(date);
    const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${byType.year}-${byType.month}-${byType.day}`;
  } catch (err) {
    console.error('Error formatting clinic date key:', err);
    return 'invalid-date';
  }
};

const ClinicMultiCalendar = ({
  selectedDate,
  appointments,
  onDateChange,
  onAppointmentClick,
  onScheduleAction,
  onViewModeChange,
  viewMode = 'week', // 'week' or 'month'
  doctors = [], // All doctors in the clinic
  selectedDoctors = [], // Selected doctors to show
  onDoctorSelectionChange
}) => {
  const { t, language } = useLanguage();
  const locale = language === 'id' ? 'id-ID' : 'en-US';
  const [currentDate, setCurrentDate] = useState(selectedDate || new Date());
  const [showDoctorFilter, setShowDoctorFilter] = useState(false);

  // Sync currentDate with selectedDate prop
  useEffect(() => {
    if (selectedDate) {
      setCurrentDate(selectedDate);
    }
  }, [selectedDate]);

  // Helper functions
  const formatTime = (date) => {
    if (!date || isNaN(new Date(date).getTime())) return '';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDate = (date) => {
    if (!date || isNaN(new Date(date).getTime())) return '';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatDateShort = (date) => {
    if (!date || isNaN(new Date(date).getTime())) return '';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  };

  // API appointments may arrive as UTC ISO strings while mock rows use Date objects.
  // Calendar bucketing is intentionally based on the clinic timezone, not the browser timezone.
  const isSameDay = (date1, date2) => {
    const k1 = getClinicDateKey(date1);
    const k2 = getClinicDateKey(date2);
    if (k1 === 'invalid-date' || k2 === 'invalid-date') return false;
    return k1 === k2;
  };

  const isToday = (date) => isSameDay(date, new Date());
  const isSelected = (date) => isSameDay(date, currentDate);

  // Navigation functions
  const navigatePrevious = () => {
    console.log('Navigate previous clicked, current date:', currentDate, 'viewMode:', viewMode);
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() - 7);
    } else {
      newDate.setMonth(currentDate.getMonth() - 1);
    }
    console.log('New date will be:', newDate);
    setCurrentDate(newDate);
    onDateChange?.(newDate);
  };

  const navigateNext = () => {
    console.log('Navigate next clicked, current date:', currentDate, 'viewMode:', viewMode);
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + 7);
    } else {
      newDate.setMonth(currentDate.getMonth() + 1);
    }
    console.log('New date will be:', newDate);
    setCurrentDate(newDate);
    onDateChange?.(newDate);
  };

  const navigateToToday = () => {
    console.log('Navigate to today clicked');
    const today = new Date();
    console.log('Today is:', today);
    setCurrentDate(today);
    onDateChange?.(today);
  };

  // Get week dates
  const getWeekDates = useCallback((date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
    startOfWeek.setDate(diff);

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const weekDate = new Date(startOfWeek);
      weekDate.setDate(startOfWeek.getDate() + i);
      dates.push(weekDate);
    }
    return dates;
  }, []);

  // Get month dates
  const getMonthDates = useCallback((date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    const endDate = new Date(lastDay);
    
    // Start from Monday of the first week
    const startDay = startDate.getDay();
    const diff = startDate.getDate() - startDay + (startDay === 0 ? -6 : 1);
    startDate.setDate(diff);
    
    // End at Sunday of the last week
    const endDay = endDate.getDay();
    endDate.setDate(endDate.getDate() + (7 - endDay) % 7);
    
    const dates = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  }, []);

  // Get dates to display based on view mode
  const displayDates = useMemo(() => {
    return viewMode === 'week' ? getWeekDates(currentDate) : getMonthDates(currentDate);
  }, [currentDate, viewMode, getWeekDates, getMonthDates]);

  // Filter appointments by selected doctors and date
  const filteredAppointments = useMemo(() => {
    console.log('Filtering appointments:', {
      totalAppointments: appointments.length,
      displayDates: displayDates.map(d => d.toDateString()),
      viewMode,
      selectedDoctors
    });
    
    const filtered = appointments.filter(apt => {
      const aptDate = new Date(apt.start);
      console.log('Checking appointment:', {
        id: apt.id,
        aptStart: apt.start,
        aptDate: aptDate.toDateString(),
        aptDateObj: aptDate
      });
      
      const isInDateRange = displayDates.some(date => {
        const match = isSameDay(date, aptDate);
        if (match) {
          console.log('Date match found:', date.toDateString(), '===', aptDate.toDateString());
        }
        return match;
      });
      
      const isDoctorSelected = selectedDoctors.length === 0 || 
        selectedDoctors.some(doctorId => apt.provider?.id === doctorId);
      
      console.log('Appointment filter result:', {
        id: apt.id,
        isInDateRange,
        isDoctorSelected,
        included: isInDateRange && isDoctorSelected
      });
      
      return isInDateRange && isDoctorSelected;
    });
    
    console.log('Filtered appointments:', filtered.length, 'out of', appointments.length);
    return filtered;
  }, [appointments, displayDates, selectedDoctors, viewMode]);

  // Group appointments by date and doctor
  const appointmentsByDateDoctor = useMemo(() => {
    const grouped = {};
    
    filteredAppointments.forEach(apt => {
      const aptDate = new Date(apt.start);
      const dateKey = getClinicDateKey(aptDate);
      const doctorId = apt.provider?.id || 'unknown';
      
      if (!grouped[dateKey]) grouped[dateKey] = {};
      if (!grouped[dateKey][doctorId]) grouped[dateKey][doctorId] = [];
      
      grouped[dateKey][doctorId].push(apt);
    });
    
    return grouped;
  }, [filteredAppointments]);

  // Get doctor color
  const getDoctorColor = (doctorId) => {
    const colors = [
      'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700/40',
      'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-700/40',
      'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-700/40',
      'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-200 dark:border-orange-700/40',
      'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-200 dark:border-pink-700/40',
      'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-700/40',
    ];
    const index = doctors.findIndex(doc => doc.id === doctorId);
    return colors[index % colors.length] || 'bg-surface text-secondary border-primary/20';
  };

  // Handle doctor selection
  const toggleDoctorSelection = (doctorId) => {
    const newSelection = selectedDoctors.includes(doctorId)
      ? selectedDoctors.filter(id => id !== doctorId)
      : [...selectedDoctors, doctorId];
    onDoctorSelectionChange?.(newSelection);
  };

  const selectAllDoctors = () => {
    onDoctorSelectionChange?.(doctors.map(doc => doc.id));
  };

  const clearDoctorSelection = () => {
    onDoctorSelectionChange?.([]);
  };

  const selectedDoctorLabel = () => {
    if (selectedDoctors.length === 0 || selectedDoctors.length === doctors.length) {
      return t('clinic.schedule.allDoctors');
    }
    return t('clinic.schedule.multi.selectedDoctors', { count: selectedDoctors.length });
  };

  const dayNamesTranslation = t('clinic.schedule.multi.dayNamesShort');
  const weekDayLabels = Array.isArray(dayNamesTranslation)
    ? dayNamesTranslation
    : (language === 'id'
        ? ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
        : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);

  // Calendar header
  const getCalendarTitle = () => {
    if (viewMode === 'week') {
      const weekDates = getWeekDates(currentDate);
      const startDate = weekDates[0];
      const endDate = weekDates[6];
      
      if (startDate.getMonth() === endDate.getMonth()) {
        return `${startDate.toLocaleDateString(locale, { day: 'numeric' })} - ${endDate.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}`;
      } else {
        return `${startDate.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}`;
      }
    } else {
      return currentDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    }
  };

  return (
    <div className="bg-surface-elevated rounded-3xl border border-primary/20 shadow-theme-lg theme-transition overflow-hidden">
      {/* Calendar Header */}
      <div className="p-6 border-b border-primary/20 bg-surface theme-transition">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-primary theme-transition">
              {getCalendarTitle()}
            </h2>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onViewModeChange?.('daily')}
                className="px-3 py-1 text-sm bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors shadow-theme-sm"
              >
                {t('clinic.schedule.today')}
              </button>
              
              <div className="flex bg-surface-elevated/80 rounded-xl p-1 border border-primary/20 theme-transition">
                <button
                  onClick={() => onViewModeChange?.('week')}
                  className={`px-3 py-1 text-sm rounded-lg theme-transition ${
                    viewMode === 'week' 
                      ? 'bg-surface text-primary shadow-theme-sm' 
                      : 'text-secondary hover:text-primary'
                  }`}
                >
                  {t('clinic.schedule.week')}
                </button>
                <button
                  onClick={() => onViewModeChange?.('month')}
                  className={`px-3 py-1 text-sm rounded-lg theme-transition ${
                    viewMode === 'month' 
                      ? 'bg-surface text-primary shadow-theme-sm' 
                      : 'text-secondary hover:text-primary'
                  }`}
                >
                  {t('clinic.schedule.month')}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Doctor Filter */}
            <div className="relative">
              <button
                onClick={() => setShowDoctorFilter(!showDoctorFilter)}
                className="flex items-center space-x-2 px-3 py-2 text-sm border border-primary/20 text-secondary hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
              >
                <Icon name="Users" size={16} />
                <span>{selectedDoctorLabel()}</span>
                <Icon name="ChevronDown" size={16} />
              </button>

              {showDoctorFilter && (
                <div className="absolute right-0 mt-2 w-64 bg-surface-elevated border border-primary/20 rounded-2xl shadow-theme-xl z-10 overflow-hidden">
                  <div className="p-3 border-b border-primary/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-primary">{t('clinic.schedule.doctorFilter')}</span>
                      <div className="flex space-x-2">
                        <button
                          onClick={selectAllDoctors}
                          className="text-xs text-accent hover:text-accent/80"
                        >
                          {t('clinic.schedule.selectAll')}
                        </button>
                        <button
                          onClick={clearDoctorSelection}
                          className="text-xs text-secondary hover:text-primary"
                        >
                          {t('clinic.schedule.clear')}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="max-h-48 overflow-y-auto">
                    {doctors.map(doctor => (
                      <div key={doctor.id} className="flex items-center p-3 hover:bg-primary/5 transition-colors">
                        <input
                          type="checkbox"
                          id={`doctor-${doctor.id}`}
                          checked={selectedDoctors.includes(doctor.id)}
                          onChange={() => toggleDoctorSelection(doctor.id)}
                          className="h-4 w-4 text-blue-600 dark:text-blue-400 rounded border-primary/30 focus:ring-blue-500 dark:focus:ring-blue-400"
                        />
                        <label htmlFor={`doctor-${doctor.id}`} className="ml-3 flex-1 text-sm text-primary cursor-pointer">
                          <div className="font-medium text-primary">{doctor.name}</div>
                          <div className="text-secondary">{doctor.specialization || t('clinic.schedule.daily.defaultSpecialization')}</div>
                        </label>
                        <div className={`w-3 h-3 rounded-full ${getDoctorColor(doctor.id).split(' ')[0]} dark:opacity-80`}></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center space-x-2">
              <button
                onClick={navigatePrevious}
                className="p-2 text-secondary hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
              >
                <Icon name="ChevronLeft" size={16} />
              </button>
              
              <button
                onClick={navigateToToday}
                className="px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
              >
                {t('clinic.schedule.today')}
              </button>
              
              <button
                onClick={navigateNext}
                className="p-2 text-secondary hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
              >
                <Icon name="ChevronRight" size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {viewMode === 'week' ? (
          <WeekView 
            dates={displayDates}
            appointmentsByDateDoctor={appointmentsByDateDoctor}
            doctors={doctors}
            selectedDoctors={selectedDoctors}
            getDoctorColor={getDoctorColor}
            onAppointmentClick={onAppointmentClick}
            currentDate={currentDate}
            onDateChange={onDateChange}
            locale={locale}
            t={t}
            dayNames={weekDayLabels}
          />
        ) : (
          <MonthView 
            dates={displayDates}
            appointmentsByDateDoctor={appointmentsByDateDoctor}
            doctors={doctors}
            selectedDoctors={selectedDoctors}
            getDoctorColor={getDoctorColor}
            onAppointmentClick={onAppointmentClick}
            currentDate={currentDate}
            onDateChange={onDateChange}
            dayNames={weekDayLabels}
            locale={locale}
            t={t}
          />
        )}
      </div>

      {/* Click outside to close filter */}
      {showDoctorFilter && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowDoctorFilter(false)}
        />
      )}
    </div>
  );
};

// Week View Component
const WeekView = ({ 
  dates, 
  appointmentsByDateDoctor, 
  doctors, 
  selectedDoctors, 
  getDoctorColor, 
  onAppointmentClick,
  currentDate,
  onDateChange,
  locale,
  t,
  dayNames
}) => {
  return (
    <div className="grid grid-cols-7 gap-1">
      {/* Day Headers */}
      {dates.map((date, index) => (
        <div key={date.toISOString()} className="p-3 text-center border-b border-primary/20 bg-surface-elevated/20">
          <div className="text-sm font-medium text-secondary">{dayNames[index]}</div>
          <div className={`text-lg font-semibold mt-1 ${
            getClinicDateKey(date) === getClinicDateKey(new Date())
              ? 'text-accent' 
              : 'text-primary'
          }`}>
            {date.getDate()}
          </div>
        </div>
      ))}

      {/* Appointment Slots */}
      {dates.map(date => {
        const dateKey = getClinicDateKey(date);
        const dayAppointments = appointmentsByDateDoctor[dateKey] || {};
        
        return (
          <div 
            key={date.toISOString()} 
            className="min-h-32 p-2 border border-primary/20 cursor-pointer hover:bg-primary/5/60 transition-colors"
            onClick={() => onDateChange?.(date)}
          >
            <div className="space-y-1">
              {selectedDoctors.length === 0 ? (
                // Show all doctors
                Object.entries(dayAppointments).map(([doctorId, appointments]) => (
                  <div key={doctorId} className="space-y-1">
                    {appointments.slice(0, 2).map(apt => (
                      <AppointmentBlock 
                        key={apt.id}
                        appointment={apt}
                        doctorColor={getDoctorColor(doctorId)}
                        onClick={() => onAppointmentClick?.(apt)}
                        locale={locale}
                      />
                    ))}
                    {appointments.length > 2 && (
                      <div className="text-xs text-secondary text-center">
                        {t('clinic.schedule.multi.moreAppointments', { count: appointments.length - 2 })}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                // Show selected doctors only
                selectedDoctors.map(doctorId => {
                  const appointments = dayAppointments[doctorId] || [];
                  return (
                    <div key={doctorId} className="space-y-1">
                      {appointments.slice(0, 3).map(apt => (
                        <AppointmentBlock 
                          key={apt.id}
                          appointment={apt}
                          doctorColor={getDoctorColor(doctorId)}
                          onClick={() => onAppointmentClick?.(apt)}
                          locale={locale}
                        />
                      ))}
                      {appointments.length > 3 && (
                        <div className="text-xs text-secondary text-center">
                          {t('clinic.schedule.multi.moreAppointments', { count: appointments.length - 3 })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Month View Component
const MonthView = ({ 
  dates, 
  appointmentsByDateDoctor, 
  doctors, 
  selectedDoctors, 
  getDoctorColor, 
  onAppointmentClick,
  currentDate,
  onDateChange,
  dayNames,
  locale,
  t
}) => {
  const weeks = [];
  for (let i = 0; i < dates.length; i += 7) {
    weeks.push(dates.slice(i, i + 7));
  }

  return (
    <div className="space-y-1">
      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-secondary">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Weeks */}
      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="grid grid-cols-7 gap-1">
          {week.map(date => {
            const dateKey = getClinicDateKey(date);
            const dayAppointments = appointmentsByDateDoctor[dateKey] || {};
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
            const isToday = getClinicDateKey(date) === getClinicDateKey(new Date());
            
            return (
              <div 
                key={date.toISOString()} 
                className={`min-h-24 p-2 border border-primary/20 cursor-pointer transition-colors ${
                  isCurrentMonth 
                    ? 'bg-surface-elevated/60 hover:bg-primary/5/60' 
                    : 'bg-surface-elevated/30 text-secondary'
                } ${isToday ? 'ring-2 ring-accent/80' : ''}`}
                onClick={() => onDateChange?.(date)}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isToday 
                    ? 'text-accent' 
                    : isCurrentMonth 
                    ? 'text-primary' 
                    : 'text-secondary'
                }`}>
                  {date.getDate()}
                </div>
                
                <div className="space-y-1">
                  {Object.values(dayAppointments).flat().slice(0, 2).map(apt => {
                    const isCompleted = apt.status === 'completed';
                    const isCancelled = ['cancelled', 'no-show'].includes(apt.status);
                    return (
                      <div
                        key={apt.id}
                        className={`text-xs p-1 rounded truncate cursor-pointer ${getDoctorColor(apt.provider?.id || 'unknown')} ${
                          isCompleted ? 'opacity-65' : ''
                        } ${isCancelled ? 'opacity-40 line-through' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAppointmentClick?.(apt);
                        }}
                      >
                        <span className="inline-flex items-center gap-1">
                          {isCompleted && <span className="text-[10px] text-emerald-500 font-bold">✓</span>}
                          {isCancelled && <span className="text-[10px] text-red-500 font-bold">✗</span>}
                          {apt.channel === 'tele' && (
                            <Icon name="Video" size={10} className="text-cyan-500 flex-shrink-0" />
                          )}
                          <span className="truncate">
                            {new Date(apt.start).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })} {apt.patient?.name}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                  
                  {Object.values(dayAppointments).flat().length > 2 && (
                    <div className="text-xs text-secondary text-center">
                      {t('clinic.schedule.multi.moreAppointments', { count: Object.values(dayAppointments).flat().length - 2 })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// Appointment Block Component
const AppointmentBlock = ({ appointment, doctorColor, onClick, locale = 'id-ID' }) => {
  const time = new Date(appointment.start).toLocaleTimeString(locale, { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  });

  const isCompleted = appointment.status === 'completed';
  const isCancelled = ['cancelled', 'no-show'].includes(appointment.status);

  return (
    <div
      className={`text-xs p-2 rounded-lg cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-theme-sm border-l-2 ${doctorColor} bg-surface/90 backdrop-blur-sm ${
        isCompleted ? 'opacity-65' : ''
      } ${isCancelled ? 'opacity-40 line-through' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      title={`${time} - ${appointment.patient?.name} (${appointment.provider?.name}) [${appointment.status}]`}
    >
      <div className="flex items-center justify-between">
        <div className="font-semibold text-primary">{time}</div>
        <div className="flex items-center space-x-1">
          {isCompleted && <span className="text-[10px] text-emerald-500 font-bold" title="Completed">✓</span>}
          {isCancelled && <span className="text-[10px] text-red-500 font-bold" title="Cancelled/No-show">✗</span>}
          {appointment.channel === 'tele' && (
            <Icon name="Video" size={11} className="text-cyan-500 flex-shrink-0" title="Teledentistry" />
          )}
        </div>
      </div>
      <div className="truncate text-secondary">{appointment.patient?.name}</div>
    </div>
  );
};

export default ClinicMultiCalendar;
