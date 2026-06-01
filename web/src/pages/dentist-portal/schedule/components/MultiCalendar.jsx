import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Icon from '../../../../components/AppIcon';
import ModalPortal from '../../../../components/ui/ModalPortal';
import { useToast } from '../../../../contexts/ToastContext';

const MultiCalendar = ({
  selectedDate,
  appointments,
  onDateChange,
  onAppointmentClick,
  onScheduleAction,
  onViewModeChange, // New prop for switching to daily view
  viewMode = 'week', // 'week' or 'month'
  clinicWorkingHours // Clinic working hours from dentist profile
}) => {
  const toast = useToast();
  const [currentDate, setCurrentDate] = useState(selectedDate || new Date());
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [selectedBlockDate, setSelectedBlockDate] = useState(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [contextMenuDate, setContextMenuDate] = useState(null);
  const [blockData, setBlockData] = useState({
    type: '',
    reason: '',
    isFullDay: true,
    startTime: '09:00',
    endTime: '17:00'
  });

  // Double-click handling
  const [clickedDate, setClickedDate] = useState(null);
  const [clickTimeout, setClickTimeout] = useState(null);

  // Convert clinic working hours from props to day-indexed format
  const defaultClinicHours = useMemo(() => {
    if (clinicWorkingHours) {
      // Convert from named days to numeric indices (0=Sunday, 1=Monday, etc.)
      const dayNameToIndex = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6
      };
      
      const converted = {};
      Object.entries(clinicWorkingHours).forEach(([dayName, hours]) => {
        const dayIndex = dayNameToIndex[dayName.toLowerCase()];
        if (dayIndex !== undefined) {
          converted[dayIndex] = hours;
        }
      });
      
      return converted;
    }
    
    // Fallback to default schedule (updated to match clinic operating hours 08:00-20:00)
    return {
      0: null, // Sunday - closed by default
      1: { start: '08:00', end: '20:00' }, // Monday
      2: { start: '08:00', end: '20:00' }, // Tuesday
      3: { start: '08:00', end: '20:00' }, // Wednesday
      4: { start: '08:00', end: '20:00' }, // Thursday
      5: { start: '08:00', end: '20:00' }, // Friday
      6: { start: '09:00', end: '17:00' }  // Saturday - shorter hours
    };
  }, [clinicWorkingHours]);

  // Day overrides (for special openings/closures)
  const [dayOverrides, setDayOverrides] = useState(new Map());
  // Example: dayOverrides.set('2025-09-15', { type: 'open', hours: { start: '10:00', end: '16:00' } })
  // Example: dayOverrides.set('2025-09-16', { type: 'closed', reason: 'Personal leave' })

  // Sync currentDate with selectedDate prop
  useEffect(() => {
    if (selectedDate) {
      setCurrentDate(selectedDate);
    }
  }, [selectedDate]);

  // Configuration
  const blockTypes = {
    vacation: { label: 'Vacation', icon: 'Plane', color: 'blue' },
    sick: { label: 'Sick Leave', icon: 'Heart', color: 'red' },
    conference: { label: 'Conference / Seminar', icon: 'Users', color: 'purple' },
    training: { label: 'Training', icon: 'BookOpen', color: 'indigo' },
    personal: { label: 'Personal Errand', icon: 'User', color: 'gray' },
    maintenance: { label: 'Clinic Maintenance', icon: 'Tool', color: 'yellow' }
  };

  // Helper functions
  const formatTime = (date) => 
    date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  const formatDate = (date) => 
    date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const formatDateShort = (date) => 
    date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

  const isSameDay = (date1, date2) => {
    return date1.toDateString() === date2.toDateString();
  };

  const isToday = (date) => {
    return isSameDay(date, new Date());
  };

  const isSelected = (date) => {
    return selectedDate && isSameDay(date, selectedDate);
  };

  // Helper functions for day management
  const getDateKey = (date) => {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  const getDayStatus = (date) => {
    const dateKey = getDateKey(date);
    const dayOfWeek = date.getDay();
    
    // Check for day overrides first
    if (dayOverrides.has(dateKey)) {
      return dayOverrides.get(dateKey);
    }
    
    // Use default clinic hours
    const defaultHours = defaultClinicHours[dayOfWeek];
    if (defaultHours) {
      return { type: 'open', hours: defaultHours };
    } else {
      return { type: 'closed', reason: 'Closed day' };
    }
  };

  const isClinicOpen = (date) => {
    const status = getDayStatus(date);
    return status.type === 'open';
  };

  const hasAppointmentsOnDate = (date) => {
    return getAppointmentsForDate(date).some(apt => apt.status !== 'blocked');
  };

  const canCloseDay = (date) => {
    return !hasAppointmentsOnDate(date);
  };

  const generateWeekData = (date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Start from Monday
    startOfWeek.setDate(diff);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(startOfWeek);
      currentDay.setDate(startOfWeek.getDate() + i);
      days.push(currentDay);
    }

    return { days, type: 'week' };
  };

  const generateMonthData = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from Monday of the week containing the first day
    const startDate = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    const diff = firstDay.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    startDate.setDate(diff);

    const days = [];
    const weeks = [];
    let currentWeek = [];

    // Generate 6 weeks to cover the entire month view
    for (let i = 0; i < 42; i++) {
      const currentDay = new Date(startDate);
      currentDay.setDate(startDate.getDate() + i);
      
      currentWeek.push(currentDay);
      
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    return { weeks, type: 'month', currentMonth: month };
  };

  // Generate calendar data based on view mode
  const calendarData = useMemo(() => {
    try {
      if (viewMode === 'week') {
        return generateWeekData(currentDate);
      } else {
        return generateMonthData(currentDate);
      }
    } catch (error) {
      console.error('Error generating calendar data:', error);
      return { days: [], weeks: [], type: viewMode };
    }
  }, [currentDate, viewMode]);

  // Get appointments for a specific date (exclude cancelled/rejected)
  const getAppointmentsForDate = useCallback((date) => {
    return appointments.filter(apt => {
      // Skip cancelled, rejected, or no-show appointments
      if (apt.status === 'cancelled' || apt.rawStatus === 'cancelled' || 
          apt.status === 'rejected' || apt.status === 'no-show') {
        return false;
      }
      const aptDate = new Date(apt.start);
      return isSameDay(aptDate, date);
    });
  }, [appointments]);

  // Get day statistics
  const getDayStats = useCallback((date) => {
    const dayAppointments = getAppointmentsForDate(date);
    const total = dayAppointments.length;
    const blocked = dayAppointments.filter(apt => apt.status === 'blocked').length;
    const confirmed = dayAppointments.filter(apt => apt.status === 'confirmed').length;
    const pending = dayAppointments.filter(apt => apt.status === 'pending').length;

    return { total, blocked, confirmed, pending };
  }, [getAppointmentsForDate]);

  // Navigation handlers
  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() - 7);
    } else {
      newDate.setMonth(currentDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + 7);
    } else {
      newDate.setMonth(currentDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const navigateToday = () => {
    setCurrentDate(new Date());
  };

  // Day management handlers
  const handleUnlockDay = (date) => {
    const dateKey = getDateKey(date);
    const dayOfWeek = date.getDay();
    
    // Set override to open with default hours for that day of week
    const defaultHours = defaultClinicHours[dayOfWeek] || { start: '09:00', end: '17:00' };
    setDayOverrides(prev => new Map(prev.set(dateKey, { 
      type: 'open', 
      hours: defaultHours,
      reason: 'Opened specially' 
    })));
    
    // Notify parent about the change
    onScheduleAction?.({
      type: 'unlock_day',
      payload: {
        date: dateKey,
        hours: defaultHours
      }
    });
  };

  const handleCloseDay = (date, reason = 'Temporarily closed') => {
    const dateKey = getDateKey(date);
    
    if (!canCloseDay(date)) {
      toast.error('Cannot close this day because there are scheduled appointments.');
      return;
    }
    
    setDayOverrides(prev => new Map(prev.set(dateKey, { 
      type: 'closed', 
      reason: reason 
    })));
    
    // Notify parent about the change
    onScheduleAction?.({
      type: 'close_day',
      payload: {
        date: dateKey,
        reason: reason
      }
    });
  };

  const handleRemoveOverride = (date) => {
    const dateKey = getDateKey(date);
    setDayOverrides(prev => {
      const newMap = new Map(prev);
      newMap.delete(dateKey);
      return newMap;
    });
    
    onScheduleAction?.({
      type: 'remove_day_override',
      payload: {
        date: dateKey
      }
    });
  };

  // Event handlers
  const handleDateClick = (date, event) => {
    // Prevent double handling if context menu was triggered
    if (event && event.defaultPrevented) return;
    
    const dateKey = getDateKey(date);
    
    // Clear any existing timeout
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      setClickTimeout(null);
    }
    
    // Check if this is a double-click (same date clicked within timeframe)
    if (clickedDate && getDateKey(clickedDate) === dateKey) {
      // Double-click detected - navigate to daily view
      onDateChange?.(date);
      onViewModeChange?.('daily');
      setClickedDate(null);
    } else {
      // First click - just select the date
      onDateChange?.(date);
      setClickedDate(date);
      
      // Set timeout to clear clicked date after delay
      const timeout = setTimeout(() => {
        setClickedDate(null);
        setClickTimeout(null);
      }, 300); // 300ms window for double-click
      
      setClickTimeout(timeout);
    }
  };

  const handleDateRightClick = (e, date) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent normal click from firing
    setContextMenuDate(date);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleBlockSubmit = () => {
    if (!selectedBlockDate || !blockData.type || !blockData.reason.trim()) {
      return;
    }

    const startDateTime = new Date(selectedBlockDate);
    const endDateTime = new Date(selectedBlockDate);

    if (blockData.isFullDay) {
      startDateTime.setHours(9, 0, 0, 0);
      endDateTime.setHours(17, 0, 0, 0);
    } else {
      const [startHour, startMin] = blockData.startTime.split(':');
      const [endHour, endMin] = blockData.endTime.split(':');
      startDateTime.setHours(parseInt(startHour), parseInt(startMin), 0, 0);
      endDateTime.setHours(parseInt(endHour), parseInt(endMin), 0, 0);
    }

    const action = {
      type: 'create_block',
      payload: {
        type: blockData.type,
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString(),
        reason: blockData.reason,
        metadata: {
          visibility: 'private',
          created_by: 'doctor',
          block_type: blockData.type,
          full_day: blockData.isFullDay
        }
      }
    };

    onScheduleAction?.(action);

    // Reset modal
    setShowBlockModal(false);
    setSelectedBlockDate(null);
    setBlockData({
      type: '',
      reason: '',
      isFullDay: true,
      startTime: '09:00',
      endTime: '17:00'
    });
  };

  // Render individual day cell
  const renderDayCell = (date, isCurrentMonth = true) => {
    const dayStats = getDayStats(date);
    const dayStatus = getDayStatus(date);
    const isCurrentDay = isToday(date);
    const isSelectedDay = isSelected(date);
    const hasAppointments = dayStats.total > 0;
    const isOpen = dayStatus.type === 'open';
    const hasOverride = dayOverrides.has(getDateKey(date));

    return (
      <div
        key={date.toISOString()}
        className={`h-[120px] border p-3 cursor-pointer transition-all duration-200 relative group flex flex-col ${
          // Base styling
          isCurrentMonth ? 'bg-surface' : 'bg-surface-muted/50 text-muted'
        } ${
          // Today styling
          isCurrentDay ? 'bg-accent/5 border-accent/30' : 'border-stroke/30'
        } ${
          // Selected day styling - professional without scaling
          isSelectedDay ? 'bg-gradient-to-br from-accent/20 to-accent/10 border-accent border-2 shadow-lg z-10' : ''
        } ${
          // Closed day styling
          !isOpen ? 'bg-red-50/50 dark:bg-red-900/10 border-red-200/50 dark:border-red-800/30' : ''
        } ${
          // Hover effects
          'hover:shadow-md hover:border-accent/50 hover:bg-surface-elevated'
        } ${
          // Rounded corners
          'rounded-2xl'
        }`}
        style={{
          // Ensure selected date appears above others
          ...(isSelectedDay && { zIndex: 10 })
        }}
        onClick={(e) => handleDateClick(date, e)}
        onContextMenu={(e) => handleDateRightClick(e, date)}
      >
        {/* Date number */}
        <div className={`text-sm font-bold mb-2 flex items-center justify-between flex-shrink-0 ${
          isSelectedDay ? 'text-accent' : 
          isCurrentDay ? 'text-accent' : 
          !isOpen ? 'text-red-600 dark:text-red-400' : 
          'text-primary'
        }`}>
          <span className={`transition-all duration-200 ${
            isSelectedDay ? 'text-lg font-black bg-accent text-white rounded-xl w-8 h-8 flex items-center justify-center shadow-lg border border-accent/30' : 
            isCurrentDay && !isSelectedDay ? 'bg-accent text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold' : 
            ''
          }`}>
            {date.getDate()}
          </span>
          <div className="flex items-center gap-1">
            {!isOpen && (
              <Icon name="Lock" size={12} className="text-red-500" />
            )}
            {hasOverride && isOpen && (
              <Icon name="Unlock" size={12} className="text-green-500" />
            )}
          </div>
        </div>

        {/* Content area with fixed height */}
        <div className="flex-1 flex flex-col justify-between min-h-0">
          {/* Status information */}
          <div className="space-y-1.5">
            {/* Clinic status */}
            {!isOpen && (
              <div className={`text-xs truncate font-medium px-2 py-1 rounded-lg transition-all duration-200 ${
                isSelectedDay ? 'text-red-700 dark:text-red-300 bg-red-200/70 dark:bg-red-900/30 border border-red-300/50' : 'text-red-600 dark:text-red-400 bg-red-100/50 dark:bg-red-900/20'
              }`}>
                {dayStatus.reason || 'Closed'}
              </div>
            )}
            
            {/* Clinic hours for open days */}
            {isOpen && dayStatus.hours && (
              <div className={`text-xs px-2 py-1 rounded-lg transition-all duration-200 ${
                isSelectedDay ? 'text-accent bg-accent/15 border border-accent/30 font-semibold' : 'text-secondary bg-surface-muted/50'
              }`}>
                {dayStatus.hours.start} - {dayStatus.hours.end}
              </div>
            )}
          </div>

          {/* Appointments indicator - always reserve space */}
          <div className="mt-auto space-y-1.5">
            {hasAppointments && isOpen ? (
              <>
                <div className="space-y-1">
                  {dayStats.confirmed > 0 && (
                    <div className={`w-full h-2 bg-blue-400 rounded-full shadow-sm transition-all duration-200 ${
                      isSelectedDay ? 'shadow-md bg-blue-500 h-2.5' : ''
                    }`}></div>
                  )}
                  {dayStats.pending > 0 && (
                    <div className={`w-full h-2 bg-amber-400 rounded-full shadow-sm transition-all duration-200 ${
                      isSelectedDay ? 'shadow-md bg-amber-500 h-2.5' : ''
                    }`}></div>
                  )}
                  {dayStats.blocked > 0 && (
                    <div className={`w-full h-2 bg-purple-400 rounded-full shadow-sm transition-all duration-200 ${
                      isSelectedDay ? 'shadow-md bg-purple-500 h-2.5' : ''
                    }`}></div>
                  )}
                </div>
                
                {/* Appointment count */}
                <div className={`text-xs font-semibold px-2 py-1.5 rounded-lg text-center transition-all duration-200 ${
                  isSelectedDay ? 'bg-accent text-white shadow-sm border border-accent/30' : 'bg-surface-muted/50 text-secondary'
                }`}>
                  {dayStats.total} appointment(s)
                </div>
              </>
            ) : isOpen ? (
              /* Reserve space for consistent height */
              <div className="h-6"></div>
            ) : null}
          </div>
        </div>

        {/* Today indicator */}
        {isCurrentDay && !isSelectedDay && (
          <div className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full animate-pulse shadow-sm"></div>
        )}

        {/* Selected date visual enhancement */}
        {isSelectedDay && (
          <>
            {/* Subtle inner glow */}
            <div className="absolute inset-1 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 pointer-events-none"></div>
            {/* Corner accent */}
            <div className="absolute top-2 right-2 w-3 h-3 bg-accent rounded-full shadow-sm animate-pulse"></div>
          </>
        )}

        {/* Hover effect */}
        <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none"></div>
      </div>
    );
  };

  // Render week view
  const renderWeekView = () => {
    const { days } = calendarData || {};
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    if (!days || days.length === 0) {
      return <div className="text-center py-8">Loading week view...</div>;
    }

    return (
      <div className="bg-surface-elevated rounded-xl border border-stroke overflow-hidden">
        {/* Week header */}
        <div className="grid grid-cols-7 border-b border-stroke">
          {weekDays.map((day, index) => (
            <div key={day} className="p-3 bg-surface-muted text-center font-semibold text-sm text-secondary border-r border-stroke last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Week days */}
        <div className="grid grid-cols-7 relative">
          {days.map((date) => renderDayCell(date))}
        </div>
      </div>
    );
  };

  // Render month view
  const renderMonthView = () => {
    const { weeks, currentMonth } = calendarData || {};
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    if (!weeks || weeks.length === 0) {
      return <div className="text-center py-8">Loading month view...</div>;
    }

    return (
      <div className="bg-surface-elevated rounded-xl border border-stroke overflow-hidden">
        {/* Month header */}
        <div className="grid grid-cols-7 border-b border-stroke">
          {weekDays.map((day) => (
            <div key={day} className="p-3 bg-surface-muted text-center font-semibold text-sm text-secondary border-r border-stroke last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Month weeks */}
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 border-b border-stroke last:border-b-0 relative">
            {week.map((date) => renderDayCell(date, date.getMonth() === currentMonth))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold text-primary">
            {viewMode === 'week' 
              ? `Week ${calendarData?.days?.[0] ? formatDateShort(calendarData.days[0]) : ''} - ${calendarData?.days?.[6] ? formatDateShort(calendarData.days[6]) : ''}`
              : currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            }
          </h2>
          <button
            onClick={navigateToday}
            className="px-3 py-1 text-sm bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
          >
            Today
          </button>
        </div>

        {/* Navigation */}
        <div className="flex items-center space-x-2">
          <button
            onClick={navigatePrevious}
            className="p-2 hover:bg-surface rounded-lg transition-colors"
          >
            <Icon name="ChevronLeft" size={20} />
          </button>
          <button
            onClick={navigateNext}
            className="p-2 hover:bg-surface rounded-lg transition-colors"
          >
            <Icon name="ChevronRight" size={20} />
          </button>
        </div>
      </div>

      {/* Calendar */}
      {viewMode === 'week' ? renderWeekView() : renderMonthView()}

      {/* Legend */}
      <div className="flex items-center justify-center space-x-6 text-xs text-secondary flex-wrap gap-2">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-1 bg-blue-400 rounded-full"></div>
          <span>Confirmed</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-1 bg-amber-400 rounded-full"></div>
          <span>Pending</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-1 bg-purple-400 rounded-full"></div>
          <span>Closed Slots</span>
        </div>
        <div className="flex items-center space-x-1">
          <Icon name="Lock" size={12} className="text-red-500" />
          <span>Closed Day</span>
        </div>
        <div className="flex items-center space-x-1">
          <Icon name="Unlock" size={12} className="text-green-500" />
          <span>Special Opening</span>
        </div>
        <div className="text-muted">
          <span>Double-click a date to view details • Right-click to manage the day or slots</span>
        </div>
      </div>

      {/* Block Modal */}
      {showBlockModal && selectedBlockDate && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="relative w-full max-w-lg max-h-[90vh] bg-surface-elevated rounded-3xl border border-stroke/20 shadow-2xl overflow-y-auto animate-in slide-in-from-bottom-4 duration-300">
              {/* Modal Header */}
              <div className="relative px-8 py-6 border-b border-stroke/30">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                    <Icon name="Clock" size={20} className="text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-primary">
                      Close Clinic Hours
                    </h3>
                    <p className="text-sm text-secondary mt-1">
                      {formatDate(selectedBlockDate)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBlockModal(false)}
                  className="p-2 hover:bg-surface-elevated rounded-xl transition-all duration-200"
                >
                  <Icon name="X" size={20} className="text-secondary" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="px-8 py-6 space-y-6">
              {/* Block Type */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-primary">
                  Block Type <span className="text-red-500">*</span>
                </label>
                <select 
                  value={blockData.type}
                  onChange={(e) => setBlockData(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-4 py-3.5 rounded-2xl border border-stroke/50 bg-surface focus:border-accent focus:ring-4 focus:ring-accent/10 transition-all duration-200 text-primary"
                >
                  <option value="">Select a block type...</option>
                  {Object.entries(blockTypes).map(([type, info]) => (
                    <option key={type} value={type}>{info.label}</option>
                  ))}
                </select>
              </div>

              {/* Full Day Toggle */}
              <div className="flex items-start space-x-3 p-4 bg-surface rounded-2xl border border-stroke/30">
                <input
                  type="checkbox"
                  id="fullDay"
                  checked={blockData.isFullDay}
                  onChange={(e) => setBlockData(prev => ({ ...prev, isFullDay: e.target.checked }))}
                  className="w-5 h-5 text-accent bg-surface border-stroke/50 rounded-lg focus:ring-accent focus:ring-2 mt-0.5"
                />
                <div>
                  <label htmlFor="fullDay" className="text-sm font-semibold text-primary block">
                    Close the entire day
                  </label>
                  <p className="text-xs text-secondary mt-1">
                    Block all clinic hours for this day
                  </p>
                </div>
              </div>

              {/* Time Range (if not full day) */}
              {!blockData.isFullDay && (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-primary">Time Range</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-secondary">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={blockData.startTime}
                        onChange={(e) => setBlockData(prev => ({ ...prev, startTime: e.target.value }))}
                        className="w-full px-4 py-3 rounded-2xl border border-stroke/50 bg-surface focus:border-accent focus:ring-4 focus:ring-accent/10 transition-all duration-200 text-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-secondary">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={blockData.endTime}
                        onChange={(e) => setBlockData(prev => ({ ...prev, endTime: e.target.value }))}
                        className="w-full px-4 py-3 rounded-2xl border border-stroke/50 bg-surface focus:border-accent focus:ring-4 focus:ring-accent/10 transition-all duration-200 text-primary"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Reason - Now Required */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-primary">
                  Closing Reason <span className="text-red-500">*</span>
                </label>
                <textarea 
                  value={blockData.reason}
                  onChange={(e) => setBlockData(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Explain why clinic hours are being closed..."
                  rows={3}
                  className="w-full px-4 py-3.5 rounded-2xl border border-stroke/50 bg-surface focus:border-accent focus:ring-4 focus:ring-accent/10 transition-all duration-200 resize-none text-primary placeholder:text-muted"
                />
                <p className="text-xs text-secondary">
                  Patients attempting to book this slot will see this reason.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-6 border-t border-stroke/30 bg-surface/30">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowBlockModal(false)}
                  className="flex-1 px-6 py-3.5 text-secondary hover:text-primary hover:bg-surface rounded-2xl font-semibold transition-all duration-200 border border-stroke/30"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBlockSubmit}
                  disabled={!blockData.type || !blockData.reason.trim()}
                  className="flex-1 px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white disabled:bg-surface disabled:text-muted disabled:cursor-not-allowed rounded-2xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none"
                >
                  Close Clinic Hours
                </button>
              </div>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Context Menu */}
      {showContextMenu && contextMenuDate && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowContextMenu(false)}
          />
          {/* Menu */}
          <div 
            className="fixed z-50 bg-surface-elevated border border-stroke/30 rounded-2xl shadow-2xl py-2 min-w-52 backdrop-blur-sm"
            style={{ 
              left: `${contextMenuPosition.x}px`, 
              top: `${contextMenuPosition.y}px`,
              transform: 'translate(-50%, -20px)'
            }}
          >
            {/* Block Time - Always available */}
            <button
              onClick={() => {
                setSelectedBlockDate(contextMenuDate);
                setShowBlockModal(true);
                setShowContextMenu(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-surface-muted transition-all duration-200 text-left"
            >
              <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                <Icon name="Clock" size={14} className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <div className="font-semibold text-primary">Close Specific Slot</div>
                <div className="text-xs text-secondary">Block a specific time range</div>
              </div>
            </button>

            {/* Day Management */}
            {(() => {
              const dayStatus = getDayStatus(contextMenuDate);
              const hasAppts = hasAppointmentsOnDate(contextMenuDate);
              const dateKey = getDateKey(contextMenuDate);
              
              return (
                <>
                  {dayStatus.type === 'closed' ? (
                    <button
                      onClick={() => {
                        handleUnlockDay(contextMenuDate);
                        setShowContextMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-surface-muted transition-all duration-200 text-left"
                    >
                      <div className="w-8 h-8 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
                        <Icon name="Unlock" size={14} className="text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <div className="font-semibold text-primary">Open This Day</div>
                        <div className="text-xs text-secondary">Reactivate clinic hours</div>
                      </div>
                    </button>
                  ) : (
                    !hasAppts && (
                      <button
                        onClick={() => {
                          const reason = prompt('Reason for closing the day:') || 'Temporarily closed';
                          if (reason.trim()) {
                            handleCloseDay(contextMenuDate, reason);
                          }
                          setShowContextMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-surface-muted transition-all duration-200 text-left"
                      >
                        <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                          <Icon name="Lock" size={14} className="text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <div className="font-semibold text-primary">Close This Day</div>
                          <div className="text-xs text-secondary">Disable clinic hours for the day</div>
                        </div>
                      </button>
                    )
                  )}

                  {/* Reset to default if override exists */}
                  {dayOverrides.has(dateKey) && (
                    <button
                      onClick={() => {
                        handleRemoveOverride(contextMenuDate);
                        setShowContextMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-surface-muted transition-all duration-200 text-left border-t border-stroke/20"
                    >
                      <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <Icon name="RotateCcw" size={14} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <div className="font-semibold text-primary">Reset to Default</div>
                        <div className="text-xs text-secondary">Restore the regular schedule</div>
                      </div>
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
};

export default MultiCalendar;
