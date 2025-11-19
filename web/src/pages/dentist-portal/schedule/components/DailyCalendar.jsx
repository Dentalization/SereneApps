import React, { useState, useMemo, useCallback } from 'react';
import Icon from '../../../../components/AppIcon';
import ModalPortal from '../../../../components/ui/ModalPortal';
import { useLanguage } from '../../../../contexts/LanguageContext';

const DailyCalendar = ({
  selectedDate,
  appointments,
  onTimeSlotClick,
  onAppointmentClick,
  onScheduleAction
}) => {
  const { t, language } = useLanguage();
  const locale = useMemo(() => (language === 'id' ? 'id-ID' : 'en-US'), [language]);
  const [viewMode, setViewMode] = useState('day'); // (not yet surfaced in the UI)
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [blockingMode, setBlockingMode] = useState(false);
  const [doctorAvailability, setDoctorAvailability] = useState('available');
  const [showQuickBookModal, setShowQuickBookModal] = useState(false);

  const [quickBookData, setQuickBookData] = useState({
    patientName: '',
    phone: '',
    type: '',
    duration: 30,
    priority: 'routine',
    channel: 'office',
    reason: '',
    blockType: ''
  });

  // Toast notification state
  const [toast, setToast] = useState(null);

  const showToast = (type, title, message, details = null) => {
    setToast({ type, title, message, details, id: Date.now() });
    // Auto dismiss after 5 seconds for success, 8 seconds for error
    setTimeout(() => setToast(null), type === 'error' ? 8000 : 5000);
  };

  // ---------- Helpers ----------
  const pad = (n) => String(n).padStart(2, '0');

  // Produce ISO 8601 with the local offset (prevents time shift unlike toISOString)
  const toISOWithOffset = (date) => {
    const tzMin = -date.getTimezoneOffset(); // Asia/Jakarta is typically +420 minutes
    const sign = tzMin >= 0 ? '+' : '-';
    const oh = pad(Math.floor(Math.abs(tzMin) / 60));
    const om = pad(Math.abs(tzMin) % 60);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${sign}${oh}:${om}`;
  };

  const formatTime = (date) =>
    date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });

  const formatDateHeader = (date) =>
    date.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const formatDate = (date) =>
    date.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });

  const parseHHMM = (str) => {
    const [h, m] = (str || '00:00').split(':').map(Number);
    return { h, m };
  };

  const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60000);

  const getPriorityIcon = (priority) => priorities[priority]?.icon || 'Clock';
  const getChannelIcon = (channel) => channels[channel]?.icon || 'Building';

  // ---------- Config (stabilized with useMemo) ----------
  const cfg = useMemo(() => ({
    doctorId: 'DENT-001',
    locationId: 'LOC-UTAMA',
    granularity: 15,
    clinicHours: {
      monday: { start: '09:00', end: '17:00' },
      tuesday: { start: '09:00', end: '17:00' },
      wednesday: { start: '09:00', end: '17:00' },
      thursday: { start: '09:00', end: '17:00' },
      friday: { start: '09:00', end: '17:00' },
      saturday: { start: '09:00', end: '14:00' },
      sunday: null
    },
    buffers: { pre: 5, post: 5 }
  }), []);

  const appointmentTypes = useMemo(() => ({
    consultation: { duration: 30, label: t('dentistSchedule.daily.appointmentTypes.consultation'), icon: 'MessageSquare', color: 'blue' },
    scaling: { duration: 45, label: t('dentistSchedule.daily.appointmentTypes.scaling'), icon: 'Sparkles', color: 'emerald' },
    'filling-simple': { duration: 45, label: t('dentistSchedule.daily.appointmentTypes.fillingSimple'), icon: 'Tool', color: 'amber' },
    'filling-complex': { duration: 90, label: t('dentistSchedule.daily.appointmentTypes.fillingComplex'), icon: 'Settings', color: 'orange' },
    'root-canal': { duration: 90, label: t('dentistSchedule.daily.appointmentTypes.rootCanal'), icon: 'Zap', color: 'red' },
    'follow-up': { duration: 20, label: t('dentistSchedule.daily.appointmentTypes.followUp'), icon: 'CheckCircle', color: 'green' },
    emergency: { duration: 60, label: t('dentistSchedule.daily.appointmentTypes.emergency'), icon: 'AlertTriangle', color: 'red' }
  }), [t]);

  const blockTypes = useMemo(() => ({
    lunch: { label: t('dentistSchedule.daily.blockTypes.lunch'), icon: 'Coffee', color: 'slate' },
    dnd: { label: t('dentistSchedule.daily.blockTypes.dnd'), icon: 'PhoneOff', color: 'purple' },
    meeting: { label: t('dentistSchedule.daily.blockTypes.meeting'), icon: 'Users', color: 'indigo' },
    off: { label: t('dentistSchedule.daily.blockTypes.off'), icon: 'Calendar', color: 'gray' },
    maintenance: { label: t('dentistSchedule.daily.blockTypes.maintenance'), icon: 'Settings', color: 'yellow' }
  }), [t]);

  const priorities = useMemo(() => ({
    routine: { label: t('dentistSchedule.daily.priorities.routine'), icon: 'Clock', color: 'blue' },
    urgent: { label: t('dentistSchedule.daily.priorities.urgent'), icon: 'AlertCircle', color: 'orange' },
    emergency: { label: t('dentistSchedule.daily.priorities.emergency'), icon: 'AlertTriangle', color: 'red' }
  }), [t]);

  const channels = useMemo(() => ({
    office: { label: t('dentistSchedule.daily.channels.office'), icon: 'Building', color: 'blue' },
    tele: { label: t('dentistSchedule.daily.channels.tele'), icon: 'Video', color: 'emerald' },
    phone: { label: t('dentistSchedule.daily.channels.phone'), icon: 'Phone', color: 'amber' }
  }), [t]);

  // ---------- Clinic hours helpers ----------
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  const isWithinClinicHours = (slotTime) => {
    const dayName = dayNames[slotTime.getDay()];
    const clinicDay = cfg.clinicHours[dayName];
    if (!clinicDay) return false;
    const { h: sh, m: sm } = parseHHMM(clinicDay.start);
    const { h: eh, m: em } = parseHHMM(clinicDay.end);
    const open = new Date(slotTime); open.setHours(sh, sm, 0, 0);
    const close = new Date(slotTime); close.setHours(eh, em, 0, 0);
    return slotTime >= open && slotTime < close;
  };

  // ---------- Generate time slots (based on today's clinic hours) ----------
  const timeSlots = useMemo(() => {
    const base = new Date(selectedDate);
    const dayName = dayNames[base.getDay()];
    const clinicDay = cfg.clinicHours[dayName];
    const slots = [];
    if (!clinicDay) return slots; // closed that day, skip slot rendering

    const { h: sh, m: sm } = parseHHMM(clinicDay.start);
    const { h: eh, m: em } = parseHHMM(clinicDay.end);

    const start = new Date(base); start.setHours(sh, sm, 0, 0);
    const end = new Date(base); end.setHours(eh, em, 0, 0);

    for (let t = +start; t < +end; t += cfg.granularity * 60000) {
      slots.push(new Date(t));
    }
    return slots;
  }, [selectedDate, cfg.granularity, cfg.clinicHours]);

  // ---------- Status slot ----------
  const getSlotStatus = useCallback((slotTime) => {
    const slotEnd = addMinutes(slotTime, cfg.granularity);

    // Find overlapping items within this slot
    const overlapping = (appointments || []).filter(apt => {
      const aptStart = new Date(apt.start);
      const aptEnd = new Date(apt.end);
      return aptStart < slotEnd && aptEnd > slotTime;
    });

    if (overlapping.length > 0) {
      const item = overlapping[0];
      if (item.status === 'hold') {
        return {
          status: 'hold',
          color: 'bg-orange-100 border-orange-300 text-orange-800',
          item
        };
      } else if (item.type && blockTypes[item.type]) {
        return {
          status: 'blocked',
          color: 'bg-purple-100 border-purple-300 text-purple-800',
          item
        };
      } else {
        return {
          status: 'booked',
          color: 'bg-blue-100 border-blue-300 text-blue-800',
          item
        };
      }
    }

    if (!isWithinClinicHours(slotTime)) {
      return { status: 'ooh', color: 'bg-gray-100 text-gray-500' };
    }

    return { status: 'available', color: 'border-emerald-200 text-emerald-700' };
  }, [appointments, blockTypes, cfg.granularity]);

  const isCurrentTimeSlot = (slotTime) => {
    const now = new Date();
    const slotEnd = addMinutes(slotTime, cfg.granularity);
    return now >= slotTime && now < slotEnd;
  };

  // ---------- Action generator (DIDEFINISIKAN LEBIH AWAL agar aman di dependency lain) ----------
  const generateAction = useCallback((type, payload) => {
    const action = {
      actions: [{
        type,
        payload: {
          doctor_id: cfg.doctorId,
          location_id: cfg.locationId,
          ...payload
        }
      }],
      audit: {
        agent: 'scheduling-agent',
        timestamp: toISOWithOffset(new Date()),
        timezone: 'Asia/Jakarta'
      }
    };
    onScheduleAction?.(action); // kirim ke parent
    return action;
  }, [cfg.doctorId, cfg.locationId, onScheduleAction]);

  // ---------- Cek konflik untuk blocking cepat ----------
  const wouldBlockingCauseConflict = useCallback((slotTime, duration) => {
    if (!blockingMode || !duration) return false;
    const endTime = addMinutes(slotTime, duration);
    const conflictingAppointments = (appointments || []).filter(apt => {
      const aptStart = new Date(apt.start);
      const aptEnd = new Date(apt.end);
      return aptStart < endTime && aptEnd > slotTime;
    });
    return conflictingAppointments.length > 0;
  }, [appointments, blockingMode]);

  // ---------- Quick Block ----------
  const handleQuickBlock = useCallback((slot, blockType, duration = 60) => {
    const endTime = addMinutes(slot, duration);

    // validasi konflik
    const step = cfg.granularity;
    const conflicts = [];
    for (let i = 0; i < duration; i += step) {
      const checkSlot = addMinutes(slot, i);
      const st = getSlotStatus(checkSlot);
      if (st.status !== 'available' && st.status !== 'ooh') {
        const statusKey = st.status === 'booked' ? 'scheduled' : st.status === 'blocked' ? 'blocked' : 'occupied';
        conflicts.push(
          t('dentistSchedule.toast.blockConflictDetail', {
            time: formatTime(checkSlot),
            status: t(`dentistSchedule.toast.status.${statusKey}`)
          })
        );
      }
    }
    if (conflicts.length) {
      showToast(
        'error',
        t('dentistSchedule.toast.blockConflictTitle'),
        t('dentistSchedule.toast.blockConflictMessage', { count: conflicts.length }),
        conflicts
      );
      return;
    }

    const action = generateAction('create_block', {
      type: blockType,
      reason: blockType,
      start: toISOWithOffset(slot),
      end: toISOWithOffset(endTime),
      metadata: {
        visibility: 'private',
        created_by: 'doctor',
        block_type: blockType,
        duration
      }
    });

    // update UI lokal
    const newBlock = {
      id: `block-${Date.now()}`,
      type: blockType,
      start: toISOWithOffset(slot),
      end: toISOWithOffset(endTime),
      status: 'blocked',
      reason: blockType,
      metadata: { visibility: 'private', created_by: 'doctor', block_type: blockType }
    };
    onScheduleAction?.({ type: 'add_block', block: newBlock, action });

    showToast(
      'success',
      t('dentistSchedule.toast.blockSuccessTitle'),
      t('dentistSchedule.toast.blockSuccessMessage', {
        start: formatTime(slot),
        end: formatTime(endTime),
        duration
      }),
      [
        t('dentistSchedule.toast.blockSuccessType', { type: blockTypes[blockType]?.label }),
        t('dentistSchedule.toast.blockSuccessDuration', { duration })
      ]
    );
    setSelectedSlot(null);
  }, [cfg.granularity, blockTypes, getSlotStatus, generateAction]);

  // ---------- Slot click ----------
  const handleSlotClick = useCallback((slot) => {
    const slotStatus = getSlotStatus(slot);

    if (slotStatus.status === 'available') {
      if (blockingMode && quickBookData.blockType) {
        const duration = quickBookData.duration || 60;
        handleQuickBlock(slot, quickBookData.blockType, duration);
      } else {
        setSelectedSlot(slot);
        setShowQuickBookModal(true);
      }
    } else if (slotStatus.status === 'booked' && slotStatus.item) {
      onAppointmentClick?.(slotStatus.item);
    } else if (slotStatus.status === 'blocked' && slotStatus.item) {
      onAppointmentClick?.(slotStatus.item);
    } else if (blockingMode) {
      const title = t('dentistSchedule.toast.slotUnavailableTitle');
      let message = '';
      if (slotStatus.status === 'booked') {
        message = t('dentistSchedule.toast.slotUnavailableBooked');
      } else if (slotStatus.status === 'blocked') {
        message = t('dentistSchedule.toast.slotUnavailableBlocked');
      } else if (slotStatus.status === 'ooh') {
        message = t('dentistSchedule.toast.slotUnavailableOutsideHours');
      }
      showToast('warning', title, message);
    }

    onTimeSlotClick?.(slot);
  }, [getSlotStatus, onAppointmentClick, onTimeSlotClick, blockingMode, quickBookData, handleQuickBlock]);

  // ---------- Validasi form Quick Book ----------
  const isQuickBookValid = useCallback(() => {
    if (blockingMode) {
      return quickBookData.blockType && quickBookData.duration;
    }
    return quickBookData.patientName && quickBookData.phone && quickBookData.type && quickBookData.duration;
  }, [blockingMode, quickBookData]);

  // ---------- Submit Quick Book / Block ----------
  const handleQuickBook = useCallback(() => {
    if (!selectedSlot || !isQuickBookValid()) return;

    if (blockingMode) {
      const endTime = addMinutes(selectedSlot, quickBookData.duration);
      // cek konflik blocks/appointments
      const conflicts = (appointments || []).filter(apt => {
        const aptStart = new Date(apt.start);
        const aptEnd = new Date(apt.end);
        return aptStart < endTime && aptEnd > selectedSlot;
      });
      if (conflicts.length) {
        showToast(
          'error',
          t('dentistSchedule.toast.blockConflictShortTitle'),
          t('dentistSchedule.toast.blockConflictShortMessage', { count: conflicts.length }),
          [t('dentistSchedule.toast.blockConflictShortDetail')]
        );
        setShowQuickBookModal(false);
        setSelectedSlot(null);
        return;
      }

      const action = generateAction('create_block', {
        type: quickBookData.blockType,
        reason: quickBookData.blockType,
        start: toISOWithOffset(selectedSlot),
        end: toISOWithOffset(endTime),
        notes: quickBookData.reason,
        metadata: {
          visibility: 'private',
          created_by: 'doctor',
          block_type: quickBookData.blockType,
          duration: quickBookData.duration
        }
      });

      const newBlock = {
        id: `block-${Date.now()}`,
        type: quickBookData.blockType,
        start: toISOWithOffset(selectedSlot),
        end: toISOWithOffset(endTime),
        status: 'blocked',
        reason: quickBookData.blockType,
        notes: quickBookData.reason,
        metadata: { visibility: 'private', created_by: 'doctor', block_type: quickBookData.blockType }
      };
      onScheduleAction?.({ type: 'add_block', block: newBlock, action });

    } else {
      const endTime = addMinutes(selectedSlot, quickBookData.duration);

      // cek konflik appointment
      const conflicts = (appointments || []).filter(apt => {
        const aptStart = new Date(apt.start);
        const aptEnd = new Date(apt.end);
        return aptStart < endTime && aptEnd > selectedSlot;
      });
      if (conflicts.length) {
        showToast(
          'error',
          t('dentistSchedule.toast.appointmentConflictTitle'),
          t('dentistSchedule.toast.appointmentConflictMessage', { count: conflicts.length }),
          [t('dentistSchedule.toast.appointmentConflictDetail')]
        );
        setShowQuickBookModal(false);
        setSelectedSlot(null);
        return;
      }

      generateAction('hold_slot', {
        start: toISOWithOffset(selectedSlot),
        end: toISOWithOffset(endTime),
        expires_at: toISOWithOffset(new Date(Date.now() + 10 * 60000)),
        appointment_type: quickBookData.type,
        priority: quickBookData.priority,
        channel: quickBookData.channel,
        reason: quickBookData.reason,
        buffers: cfg.buffers,
        resources: ['chair-1'],
        patient_temp: {
          name: quickBookData.patientName,
          phone: quickBookData.phone,
          channel: quickBookData.channel,
          status: 'pending',
          created_at: toISOWithOffset(new Date())
        }
      });
    }

    setShowQuickBookModal(false);
    setSelectedSlot(null);
    setQuickBookData({
      patientName: '',
      phone: '',
      type: '',
      duration: 30,
      priority: 'routine',
      channel: 'office',
      reason: '',
      blockType: ''
    });
  }, [selectedSlot, blockingMode, quickBookData, isQuickBookValid, appointments, generateAction, cfg.buffers]);

  // ---------- Render ----------
  return (
    <div className="bg-surface-elevated rounded-2xl border border-primary/10 theme-transition overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-primary/10 bg-gradient-to-r from-surface to-surface-elevated">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-primary theme-transition">
              {formatDateHeader(selectedDate)}
            </h2>
            <p className="text-sm text-secondary theme-transition">
              {t('dentistSchedule.daily.header.meta', {
                count: (appointments || []).length,
                minutes: cfg.granularity
              })}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-secondary">
                {t('dentistSchedule.daily.header.statusLabel')}
              </span>
              <select
                value={doctorAvailability}
                onChange={(e) => setDoctorAvailability(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-stroke text-sm focus:border-accent"
              >
                <option value="available">
                  {t('dentistSchedule.daily.header.statusOptions.available')}
                </option>
                <option value="busy">
                  {t('dentistSchedule.daily.header.statusOptions.busy')}
                </option>
                <option value="dnd">
                  {t('dentistSchedule.daily.header.statusOptions.dnd')}
                </option>
                <option value="off">
                  {t('dentistSchedule.daily.header.statusOptions.off')}
                </option>
              </select>
            </div>

            <button
              onClick={() => setBlockingMode((s) => !s)}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                blockingMode
                  ? 'bg-purple-100 text-purple-700 border border-purple-200'
                  : 'bg-surface text-secondary hover:bg-accent hover:text-white border border-stroke'
              }`}
            >
              <Icon name="Lock" size={16} className="mr-2" />
              {blockingMode
                ? t('dentistSchedule.daily.header.blockingOn')
                : t('dentistSchedule.daily.header.blockingOff')}
            </button>
          </div>
        </div>

        {/* Quick Block Bar */}
        {blockingMode && (
          <div className="mt-8 p-6 bg-purple-50 rounded-xl border border-purple-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-purple-900">
                {t('dentistSchedule.daily.quickBlock.title')}
              </h3>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-purple-700">
                  {quickBookData.blockType
                    ? t('dentistSchedule.daily.quickBlock.typeSelected', { type: blockTypes[quickBookData.blockType]?.label })
                    : t('dentistSchedule.daily.quickBlock.typePrompt')}
                </span>
                {quickBookData.blockType && (
                  <button
                    onClick={() => setQuickBookData(prev => ({ ...prev, blockType: '' }))}
                    className="text-xs text-purple-600 hover:text-purple-800 underline"
                  >
                    {t('dentistSchedule.daily.quickBlock.reset')}
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {Object.entries(blockTypes).map(([type, info]) => (
                <button
                  key={type}
                  onClick={() => {
                    setQuickBookData(prev => ({
                      ...prev,
                      blockType: type,
                      duration: type === 'lunch' ? 60 : type === 'meeting' ? 30 : 45
                    }));
                  }}
                  className={`p-2 text-center rounded-lg border transition-all text-xs ${
                    quickBookData.blockType === type
                      ? 'bg-purple-200 border-purple-300 text-purple-800'
                      : 'border-purple-200 text-purple-700 hover:bg-purple-100'
                  }`}
                >
                  <Icon name={info.icon} size={14} className="mx-auto mb-1" />
                  <div className="font-medium">{info.label}</div>
                </button>
              ))}
            </div>

            <div className="mt-4 p-3 bg-purple-100 rounded-lg border border-purple-300">
              <div className="text-xs text-purple-800">
                <div className="font-semibold mb-2">
                  {t('dentistSchedule.daily.quickBlock.instructions.title')}
                </div>
                <div className="space-y-1">
                  <div>{t('dentistSchedule.daily.quickBlock.instructions.step1')}</div>
                  <div>{t('dentistSchedule.daily.quickBlock.instructions.step2')}</div>
                  <div>{t('dentistSchedule.daily.quickBlock.instructions.step3')}</div>
                  <div className="font-medium text-purple-900 mt-2">
                    {t('dentistSchedule.daily.quickBlock.instructions.warning')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="space-y-3 mt-4">
          <div className="flex items-center space-x-6 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-emerald-200 border-2 border-emerald-400 rounded" />
              <span>{t('dentistSchedule.daily.legend.available')}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-200 border-2 border-blue-400 rounded" />
              <span>{t('dentistSchedule.daily.legend.booked')}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-orange-200 border-2 border-orange-400 rounded" />
              <span>{t('dentistSchedule.daily.legend.hold')}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-200 border-2 border-purple-400 rounded" />
              <span>{t('dentistSchedule.daily.legend.closed')}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-200 border-2 border-gray-400 rounded" />
              <span>{t('dentistSchedule.daily.legend.outsideHours')}</span>
            </div>
          </div>
          {blockingMode && (
            <div className="text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded-lg p-2">
              <Icon name="Shield" size={14} className="inline mr-1" />
              <span className="font-semibold">{t('dentistSchedule.daily.blockingMode.title')}</span>
              <span className="ml-1">{t('dentistSchedule.daily.blockingMode.description')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Calendar */}
      <div className="p-4">
        <div className="grid grid-cols-1 gap-1 max-h-[600px] overflow-y-auto custom-scrollbar">
          {timeSlots.map((slot) => {
            const slotStatus = getSlotStatus(slot);
            const isCurrentSlot = isCurrentTimeSlot(slot);
            const wouldConflict = blockingMode && quickBookData.blockType
              ? wouldBlockingCauseConflict(slot, quickBookData.duration || 30)
              : false;

            return (
              <div
                key={slot.getTime()}
                className={`grid grid-cols-[70px_1fr] gap-3 p-2 rounded-xl transition-all cursor-pointer group ${
                  isCurrentSlot ? 'bg-accent/10 border-2 border-accent/30 shadow-sm' : 'hover:bg-surface border border-transparent'
                } ${
                  slotStatus.status === 'available' && !blockingMode ? 'hover:bg-emerald-50 hover:border-emerald-200' : ''
                } ${
                  blockingMode && slotStatus.status === 'available' && !wouldConflict ? 'hover:bg-purple-50 hover:border-purple-200' : ''
                } ${
                  blockingMode && wouldConflict ? 'opacity-60' : ''
                }`}
                onClick={() => handleSlotClick(slot)}
              >
                {/* Time */}
                <div className={`text-sm font-semibold flex items-center justify-center py-2 rounded-lg transition-all ${
                  isCurrentSlot
                    ? 'text-accent bg-accent/10 border border-accent/30'
                    : 'text-secondary group-hover:text-primary'
                }`}>
                  <div className="text-center">
                    <div>{formatTime(slot)}</div>
                    {isCurrentSlot && (
                      <div className="flex items-center justify-center mt-1">
                        <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="min-h-[48px] flex items-center">
                  {slotStatus.status === 'available' ? (
                    <div className={`w-full border-2 border-dashed rounded-xl p-3 text-center transition-all group-hover:border-solid ${
                      blockingMode
                        ? wouldConflict
                          ? 'bg-red-50 border-red-200 text-red-600'
                          : 'bg-purple-50 border-purple-200 text-purple-700 group-hover:bg-purple-100'
                        : slotStatus.color + ' group-hover:bg-emerald-100'
                    }`}>
                      <div className="flex items-center justify-center space-x-2">
                        <Icon name={blockingMode ? (wouldConflict ? 'AlertTriangle' : 'Lock') : 'Plus'} size={14} />
                        <span className="text-sm font-medium">
                          {blockingMode
                            ? (wouldConflict ? 'Conflicts with schedule' : 'Click to close this slot')
                            : 'Available Slot'}
                        </span>
                      </div>
                      {blockingMode && wouldConflict && (
                        <div className="text-xs mt-1 opacity-75">Cannot close slot</div>
                      )}
                    </div>
                  ) : slotStatus.status === 'ooh' ? (
                    <div className={`w-full rounded-xl p-3 text-center ${slotStatus.color}`}>
                      <div className="flex items-center justify-center space-x-2">
                        <Icon name="Moon" size={14} />
                        <span className="text-sm font-medium">Outside Hours</span>
                      </div>
                    </div>
                  ) : slotStatus.status === 'blocked' ? (
                    <div className={`w-full rounded-xl p-3 border-l-4 ${slotStatus.color}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Icon name={blockTypes[slotStatus.item?.type]?.icon || 'Calendar'} size={14} />
                          <span className="text-sm font-semibold">
                            {blockTypes[slotStatus.item?.type]?.label || 'Close'}
                          </span>
                        </div>
                        {slotStatus.item?.metadata?.created_by === 'doctor' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // TODO: implement unblock
                            }}
                            className="p-1 hover:bg-primary/10 rounded-lg"
                          >
                            <Icon name="X" size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ) : slotStatus.status === 'hold' ? (
                    <div className={`w-full rounded-xl p-3 border-l-4 ${slotStatus.color} relative overflow-hidden`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Icon name="Clock" size={14} />
                          <span className="text-sm font-semibold">HOLD</span>
                        </div>
                        <div className="text-xs">
                          <div>{slotStatus.item?.patient_temp?.name || 'Pending'}</div>
                          <div className="text-xs opacity-75">
                            Expires: {slotStatus.item?.expires_at
                              ? new Date(slotStatus.item.expires_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                              : 'N/A'}
                          </div>
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 h-1 bg-orange-300 animate-pulse w-full" />
                    </div>
                  ) : (
                    <div className="w-full">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          onAppointmentClick?.(slotStatus.item);
                        }}
                        className={`p-3 rounded-xl border-l-4 transition-all hover:shadow-md cursor-pointer relative ${slotStatus.color}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 min-w-0">
                            <Icon name={getPriorityIcon(slotStatus.item?.priority)} size={14} className="flex-shrink-0" />
                            <Icon name={getChannelIcon(slotStatus.item?.channel)} size={14} className="flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-sm truncate">
                                {slotStatus.item?.patient?.name || 'Patient'}
                              </div>
                              <div className="text-xs opacity-75 truncate">
                                {appointmentTypes[slotStatus.item?.type]?.label || slotStatus.item?.type}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs font-medium flex-shrink-0 text-right">
                            <div>
                              {formatTime(new Date(slotStatus.item?.start))}–{formatTime(new Date(slotStatus.item?.end))}
                            </div>
                            {slotStatus.item?.priority === 'emergency' && (
                              <div className="text-red-600 font-bold">DARURAT</div>
                            )}
                          </div>
                        </div>

                        {slotStatus.item?.reason && (
                          <div className="mt-2 text-xs opacity-75 line-clamp-1">
                            {slotStatus.item.reason}
                          </div>
                        )}

                        {slotStatus.item?.priority === 'emergency' && (
                          <div className="absolute top-1 right-1">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 border-t border-primary/10 bg-surface rounded-b-2xl">
        <div className="grid grid-cols-5 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-emerald-600">
              {(appointments || []).filter(apt => apt.status === 'confirmed').length}
            </div>
            <div className="text-xs text-secondary">
              {t('dentistSchedule.daily.statsBar.confirmed')}
            </div>
          </div>
          <div>
            <div className="text-lg font-semibold text-amber-600">
              {(appointments || []).filter(apt => apt.status === 'pending').length}
            </div>
            <div className="text-xs text-secondary">
              {t('dentistSchedule.daily.statsBar.pending')}
            </div>
          </div>
          <div>
            <div className="text-lg font-semibold text-blue-600">
              {(appointments || []).filter(apt => apt.status === 'check-in' || apt.status === 'in-chair').length}
            </div>
            <div className="text-xs text-secondary">
              {t('dentistSchedule.daily.statsBar.active')}
            </div>
          </div>
          <div>
            <div className="text-lg font-semibold text-red-600">
              {(appointments || []).filter(apt => apt.priority === 'emergency').length}
            </div>
            <div className="text-xs text-secondary">
              {t('dentistSchedule.daily.statsBar.emergency')}
            </div>
          </div>
          <div>
            <div className="text-lg font-semibold text-cyan-600">
              {(appointments || []).filter(apt => apt.channel === 'tele').length}
            </div>
            <div className="text-xs text-secondary">
              {t('dentistSchedule.daily.statsBar.tele')}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Book / Block Modal */}
      {showQuickBookModal && selectedSlot && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowQuickBookModal(false)}>
            <div
              className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-y-auto flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
            <div className={`p-6 border-b ${blockingMode ? 'bg-purple-50' : 'bg-emerald-50'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-xl font-bold ${blockingMode ? 'text-purple-900' : 'text-emerald-900'}`}>
                    {blockingMode
                      ? t('dentistSchedule.daily.quickBook.block.title')
                      : t('dentistSchedule.daily.quickBook.booking.title')}
                  </h3>
                  <p className="text-sm text-secondary mt-1">
                    {blockingMode
                      ? t('dentistSchedule.daily.quickBook.block.subtitle')
                      : t('dentistSchedule.daily.quickBook.booking.subtitle')}
                  </p>
                  <div className="mt-2 text-sm font-medium text-secondary">
                    <Icon name="Calendar" size={16} className="inline mr-2" />
                    {formatDate(selectedSlot)} • {formatTime(selectedSlot)}
                  </div>
                </div>
                <button
                  onClick={() => setShowQuickBookModal(false)}
                  className="p-2 hover:bg-primary/10 rounded-xl transition-colors"
                  aria-label={t('dentistSchedule.daily.quickBook.actions.close')}
                >
                  <Icon name="X" size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {blockingMode ? (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-primary mb-2">
                      {t('dentistSchedule.daily.quickBook.block.typeLabel')}
                    </label>
                    <select
                      value={quickBookData.blockType}
                      onChange={(e) => setQuickBookData(prev => ({ ...prev, blockType: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-stroke focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                    >
                      <option value="">
                        {t('dentistSchedule.daily.quickBook.block.typePlaceholder')}
                      </option>
                      {Object.entries(blockTypes).map(([type, info]) => (
                        <option key={type} value={type}>{info.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-primary mb-2">
                      {t('dentistSchedule.daily.quickBook.block.durationLabel')}
                    </label>
                    <select
                      value={quickBookData.duration}
                      onChange={(e) => setQuickBookData(prev => ({ ...prev, duration: parseInt(e.target.value, 10) }))}
                      className="w-full px-4 py-3 rounded-xl border border-stroke focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                    >
                      {[15,30,45,60,90,120].map(duration => (
                        <option key={duration} value={duration}>
                          {t('dentistSchedule.daily.quickBook.common.durationOption', { minutes: duration })}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-primary mb-2">
                      {t('dentistSchedule.daily.quickBook.block.notesLabel')}
                    </label>
                    <textarea
                      value={quickBookData.reason}
                      onChange={(e) => setQuickBookData(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder={t('dentistSchedule.daily.quickBook.block.notesPlaceholder')}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-stroke focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all resize-none"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-primary mb-2">
                        {t('dentistSchedule.daily.quickBook.form.patientName.label')}
                      </label>
                      <input
                        type="text"
                        value={quickBookData.patientName}
                        onChange={(e) => setQuickBookData(prev => ({ ...prev, patientName: e.target.value }))}
                        placeholder={t('dentistSchedule.daily.quickBook.form.patientName.placeholder')}
                        className="w-full px-4 py-3 rounded-xl border border-stroke focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-primary mb-2">
                        {t('dentistSchedule.daily.quickBook.form.phone.label')}
                      </label>
                      <input
                        type="tel"
                        value={quickBookData.phone}
                        onChange={(e) => setQuickBookData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder={t('dentistSchedule.daily.quickBook.form.phone.placeholder')}
                        className="w-full px-4 py-3 rounded-xl border border-stroke focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-primary mb-2">
                        {t('dentistSchedule.daily.quickBook.form.type.label')}
                      </label>
                      <select
                        value={quickBookData.type}
                        onChange={(e) => setQuickBookData(prev => ({ ...prev, type: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-stroke focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                      >
                        <option value="">
                          {t('dentistSchedule.daily.quickBook.form.type.placeholder')}
                        </option>
                        {Object.entries(appointmentTypes).map(([type, info]) => (
                          <option key={type} value={type}>{info.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-primary mb-2">
                        {t('dentistSchedule.daily.quickBook.form.duration.label')}
                      </label>
                      <select
                        value={quickBookData.duration}
                        onChange={(e) => setQuickBookData(prev => ({ ...prev, duration: parseInt(e.target.value, 10) }))}
                        className="w-full px-4 py-3 rounded-xl border border-stroke focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                      >
                        {[15,30,45,60,90,120].map(duration => (
                          <option key={duration} value={duration}>
                            {t('dentistSchedule.daily.quickBook.common.durationOption', { minutes: duration })}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-primary mb-2">
                        {t('dentistSchedule.daily.quickBook.form.priority.label')}
                      </label>
                      <select
                        value={quickBookData.priority}
                        onChange={(e) => setQuickBookData(prev => ({ ...prev, priority: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-stroke focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                      >
                        {Object.entries(priorities).map(([priority, info]) => (
                          <option key={priority} value={priority}>{info.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-primary mb-2">
                        {t('dentistSchedule.daily.quickBook.form.channel.label')}
                      </label>
                      <select
                        value={quickBookData.channel}
                        onChange={(e) => setQuickBookData(prev => ({ ...prev, channel: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-stroke focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                      >
                        {Object.entries(channels).map(([channel, info]) => (
                          <option key={channel} value={channel}>{info.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-primary mb-2">
                      {t('dentistSchedule.daily.quickBook.form.concerns.label')}
                    </label>
                    <textarea
                      value={quickBookData.reason}
                      onChange={(e) => setQuickBookData(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder={t('dentistSchedule.daily.quickBook.form.concerns.placeholder')}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-stroke focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all resize-none"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="p-6 border-t bg-surface/50">
              <div className="flex items-center justify-between space-x-4">
                <button
                  onClick={() => setShowQuickBookModal(false)}
                  className="flex-1 px-6 py-3 text-secondary hover:text-primary hover:bg-surface rounded-xl font-medium transition-all"
                >
                  {t('dentistSchedule.daily.quickBook.actions.cancel')}
                </button>
                <button
                  onClick={handleQuickBook}
                  disabled={!isQuickBookValid()}
                  className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
                    blockingMode
                      ? 'bg-purple-600 hover:bg-purple-700 text-white disabled:bg-purple-300'
                      : 'bg-accent hover:bg-accent/90 text-white disabled:bg-stroke disabled:text-secondary'
                  }`}
                >
                  {blockingMode
                    ? t('dentistSchedule.daily.quickBook.actions.block')
                    : t('dentistSchedule.daily.quickBook.actions.book')}
                </button>
              </div>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 transition-all duration-300 transform translate-x-0 animate-in slide-in-from-right">
          <div className={`max-w-md rounded-xl shadow-lg border backdrop-blur-sm ${
            toast.type === 'success' ? 'bg-emerald-50/95 border-emerald-200' :
            toast.type === 'error' ? 'bg-red-50/95 border-red-200' :
            toast.type === 'warning' ? 'bg-amber-50/95 border-amber-200' :
            'bg-blue-50/95 border-blue-200'
          }`}>
            <div className="p-4">
              <div className="flex items-start space-x-3">
                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                  toast.type === 'success' ? 'bg-emerald-100' :
                  toast.type === 'error' ? 'bg-red-100' :
                  toast.type === 'warning' ? 'bg-amber-100' :
                  'bg-blue-100'
                }`}>
                  <Icon 
                    name={
                      toast.type === 'success' ? 'CheckCircle' :
                      toast.type === 'error' ? 'AlertCircle' :
                      toast.type === 'warning' ? 'AlertTriangle' :
                      'Info'
                    } 
                    size={16} 
                    className={
                      toast.type === 'success' ? 'text-emerald-600' :
                      toast.type === 'error' ? 'text-red-600' :
                      toast.type === 'warning' ? 'text-amber-600' :
                      'text-blue-600'
                    }
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={`text-sm font-semibold ${
                    toast.type === 'success' ? 'text-emerald-900' :
                    toast.type === 'error' ? 'text-red-900' :
                    toast.type === 'warning' ? 'text-amber-900' :
                    'text-blue-900'
                  }`}>
                    {toast.title}
                  </h4>
                  <p className={`text-sm mt-1 ${
                    toast.type === 'success' ? 'text-emerald-700' :
                    toast.type === 'error' ? 'text-red-700' :
                    toast.type === 'warning' ? 'text-amber-700' :
                    'text-blue-700'
                  }`}>
                    {toast.message}
                  </p>
                  {toast.details && (
                    <div className={`mt-2 text-xs space-y-1 ${
                      toast.type === 'success' ? 'text-emerald-600' :
                      toast.type === 'error' ? 'text-red-600' :
                      toast.type === 'warning' ? 'text-amber-600' :
                      'text-blue-600'
                    }`}>
                      {Array.isArray(toast.details) ? (
                        <ul className="list-disc list-inside space-y-0.5">
                          {toast.details.map((detail, index) => (
                            <li key={index}>{detail}</li>
                          ))}
                        </ul>
                      ) : (
                        <div>{toast.details}</div>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setToast(null)}
                  className={`flex-shrink-0 p-1 rounded-lg transition-colors ${
                    toast.type === 'success' ? 'hover:bg-emerald-200 text-emerald-600' :
                    toast.type === 'error' ? 'hover:bg-red-200 text-red-600' :
                    toast.type === 'warning' ? 'hover:bg-amber-200 text-amber-600' :
                    'hover:bg-blue-200 text-blue-600'
                  }`}
                >
                  <Icon name="X" size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DailyCalendar;
