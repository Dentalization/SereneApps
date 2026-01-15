import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import SideBar from '../ui/SideBar';
import Icon from '../../../components/AppIcon';
import { getDentistProfileApi } from '../../../services/authService';
import { fetchAppointments } from '../../../services/appointmentService';
import { fetchDentistScheduleEntries, persistDentistScheduleEntry } from '../../../services/dentistPortalService';

// Import components
import DailyCalendar from './components/DailyCalendar';
import MultiCalendar from './components/MultiCalendar';
import AppointmentCard from './components/AppointmentCard';
import ScheduleFilters from './components/ScheduleFilters';
import AppointmentDetailDrawer from './components/AppointmentDetailDrawer';
import ScheduleStats from './components/ScheduleStats';
import ScheduleSkeleton from './components/ScheduleSkeleton';

const channelPill = {
  clinic: { bg: 'bg-slate-100 dark:bg-slate-800/60', text: 'text-slate-700 dark:text-slate-300', icon: 'Building2' },
  tele: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-300', icon: 'Video' },
};

const dotByRisk = (risk) => {
  if (risk >= 0.75) return 'bg-red-500';
  if (risk >= 0.45) return 'bg-amber-500';
  return 'bg-emerald-500';
};

const formatTime = (iso, locale) => new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
const formatDateLong = (date, locale) =>
  (date || new Date()).toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

const DEFAULT_CLINIC_WORKING_HOURS = {
  monday: { start: '09:00', end: '17:00' },
  tuesday: { start: '09:00', end: '17:00' },
  wednesday: { start: '09:00', end: '17:00' },
  thursday: { start: '09:00', end: '17:00' },
  friday: { start: '09:00', end: '17:00' },
  saturday: null,
  sunday: null
};

// Helper components will be imported from modular files

const MIN_INITIAL_LOADING_MS = 900;

const DentistSchedule = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { t, language } = useLanguage();
  const locale = useMemo(() => (language === 'id' ? 'id-ID' : 'en-US'), [language]);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const initialLoadRef = useRef(true);
  const loadStartRef = useRef(Date.now());
  const loadingTimerRef = useRef(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('daily'); // 'daily', 'week', 'month'
  const [filters, setFilters] = useState({ 
    dateRange: 'today', 
    provider: 'all', 
    location: 'all', 
    channel: 'all', 
    status: 'all',
    priority: 'all',
    q: '' 
  });
  const [data, setData] = useState([]);
  const [dentistProfile, setDentistProfile] = useState(null);
  const [summary, setSummary] = useState({ total: 0, byStatus: {} });
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Status map with translations
  const statusMap = {
    pending: { label: t('dentistSchedule.status.pending'), badgeBg: 'bg-amber-100 dark:bg-amber-900/30', badgeText: 'text-amber-700 dark:text-amber-300' },
    confirmed: { label: t('dentistSchedule.status.confirmed'), badgeBg: 'bg-blue-100 dark:bg-blue-900/30', badgeText: 'text-blue-700 dark:text-blue-300' },
    'check-in': { label: t('dentistSchedule.status.checkIn'), badgeBg: 'bg-emerald-100 dark:bg-emerald-900/30', badgeText: 'text-emerald-700 dark:text-emerald-300' },
    'in-chair': { label: t('dentistSchedule.status.inChair'), badgeBg: 'bg-emerald-100 dark:bg-emerald-900/30', badgeText: 'text-emerald-700 dark:text-emerald-300' },
    completed: { label: t('dentistSchedule.status.completed'), badgeBg: 'bg-slate-100 dark:bg-slate-800/50', badgeText: 'text-slate-700 dark:text-slate-300' },
    cancelled: { label: t('dentistSchedule.status.cancelled'), badgeBg: 'bg-red-100 dark:bg-red-900/30', badgeText: 'text-red-700 dark:text-red-300' },
    'no-show': { label: t('dentistSchedule.status.noShow'), badgeBg: 'bg-red-100 dark:bg-red-900/30', badgeText: 'text-red-700 dark:text-red-300' },
    'reschedule-requested': { label: t('dentistSchedule.status.rescheduleRequested'), badgeBg: 'bg-purple-100 dark:bg-purple-900/30', badgeText: 'text-purple-700 dark:text-purple-300' },
  };

  const mapStatusToDisplay = useCallback((status) => {
    switch (status) {
      case 'scheduled':
      case 'rescheduled':
        return 'pending';
      case 'confirmed':
        return 'confirmed';
      case 'cancelled':
        return 'cancelled';
      case 'completed':
        return 'completed';
      default:
        return status;
    }
  }, []);

  const mapAppointment = useCallback((appointment) => {
    if (!appointment) return null;
    const rawChannel = appointment.consultationType || appointment.metadata?.channel || (appointment.videoRoomRef ? 'virtual' : 'onsite');
    const channel = rawChannel === 'virtual' || rawChannel === 'tele' ? 'tele' : 'clinic';
    const startIso = appointment.startsAt || appointment.starts_at;
    const endIso = appointment.endsAt || appointment.ends_at;
    return {
      id: appointment.id,
      status: mapStatusToDisplay(appointment.status),
      rawStatus: appointment.status,
      channel,
      type: appointment.metadata?.type || appointment.reason || 'consultation',
      start: startIso,
      end: endIso,
      patient: {
        id: appointment.patientId,
        name: appointment.patient?.name || t('dentistSchedule.labels.unknownPatient'),
        contact: {
          wa: appointment.patient?.phone || appointment.patient?.phone_number || appointment.patient?.email || null
        }
      },
      provider: {
        id: appointment.dentistId,
        name: appointment.dentist?.name || user?.name || t('dentistSchedule.labels.unknownDentist')
      },
      location: appointment.clinicBranch
        ? {
            id: appointment.clinicBranch.id,
            name: appointment.clinicBranch.name,
            city: appointment.clinicBranch.city
          }
        : null,
      reason: appointment.reason,
      risk: appointment.metadata?.risk ?? 0,
      depositRequired: appointment.metadata?.depositRequired ?? false,
      metadata: appointment.metadata || {},
      tele: appointment.videoRoomRef
        ? { videoRoomUrl: `/dentist-portal/teledentistry?appointmentId=${appointment.id}` }
        : null
    };
  }, [mapStatusToDisplay, t, user?.name]);

const mapScheduleEntry = useCallback((entry) => {
  if (!entry) return null;
  const providerName = user?.name || t('dentistSchedule.labels.unknownDentist');
  const locationMeta = entry.metadata?.location;
  return {
    id: `schedule-${entry.id}`,
    status: entry.status === 'hold' ? 'hold' : 'blocked',
    rawStatus: entry.status,
    channel: entry.metadata?.channel || 'clinic',
    type: entry.metadata?.type || entry.type,
    start: entry.startAt,
    end: entry.endAt,
    patient: entry.patientName
      ? {
          id: null,
          name: entry.patientName,
          contact: { wa: entry.patientPhone || null }
        }
      : null,
    provider: {
      id: user?.id,
      name: providerName
    },
    location: locationMeta
      ? {
          id: locationMeta.id,
          name: locationMeta.name,
          city: locationMeta.city
        }
      : null,
    reason: entry.notes,
    metadata: entry.metadata || {},
    risk: entry.metadata?.risk ?? 0,
    depositRequired: entry.metadata?.depositRequired ?? false,
    tele: null
  };
}, [t, user]);

  const finishInitialLoading = useCallback(() => {
    if (!initialLoadRef.current) {
      setLoading(false);
      return;
    }
    const elapsed = Date.now() - loadStartRef.current;
    const remaining = MIN_INITIAL_LOADING_MS - elapsed;
    const finalize = () => {
      setLoading(false);
      initialLoadRef.current = false;
      loadingTimerRef.current = null;
    };
    if (remaining > 0) {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = setTimeout(finalize, remaining);
    } else {
      finalize();
    }
  }, []);

  const loadAppointments = useCallback(async () => {
    setRefreshing(true);
    try {
      const now = new Date();
      // Start from today
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      from.setHours(0, 0, 0, 0);
      // End 30 days from now (ensures full day inclusion)
      const to = new Date(from);
      to.setDate(to.getDate() + 30);
      to.setHours(23, 59, 59, 999);
      const [appointmentResponse, scheduleResponse] = await Promise.all([
        fetchAppointments({
          view: 'dentist',
          from: from.toISOString(),
          to: to.toISOString(),
          includeHistory: false
        }),
        fetchDentistScheduleEntries({ from: from.toISOString(), to: to.toISOString() })
      ]);
      const mapped = (appointmentResponse?.appointments || []).map(mapAppointment).filter(Boolean);
      const scheduleEntries = (scheduleResponse || []).map(mapScheduleEntry).filter(Boolean);
      const combined = [...mapped, ...scheduleEntries].sort((a, b) => new Date(a.start) - new Date(b.start));
      setData(combined);
      setSummary(appointmentResponse?.summary || { total: mapped.length, byStatus: {} });
      setLastSyncedAt(new Date());
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setRefreshing(false);
      finishInitialLoading();
    }
  }, [finishInitialLoading, mapAppointment, mapScheduleEntry]);

  const summaryCounts = useMemo(() => ({
    total: summary?.total || 0,
    pending: (summary?.byStatus?.scheduled || 0) + (summary?.byStatus?.rescheduled || 0),
    confirmed: summary?.byStatus?.confirmed || 0,
    cancelled: summary?.byStatus?.cancelled || 0
  }), [summary]);
  
  // Derive providers and locations from data for filters
  const providers = useMemo(() => {
    const map = new Map();
    for (const a of data) {
      if (a?.provider?.id && !map.has(a.provider.id)) map.set(a.provider.id, a.provider);
    }
    return Array.from(map.values());
  }, [data]);
  const locations = useMemo(() => {
    const map = new Map();
    for (const a of data) {
      if (a?.location?.id && !map.has(a.location.id)) map.set(a.location.id, a.location);
    }
    return Array.from(map.values());
  }, [data]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      try {
        const profile = await getDentistProfileApi();
        if (active) {
          setDentistProfile(profile);
        }
      } catch (error) {
        console.error('Error loading dentist profile:', error);
        if (active) {
          setDentistProfile({
            clinicWorkingHours: DEFAULT_CLINIC_WORKING_HOURS
          });
        }
      }
    };
    loadProfile();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    loadStartRef.current = Date.now();
    loadAppointments();
    const interval = setInterval(() => {
      loadAppointments();
    }, 60000);
    return () => clearInterval(interval);
  }, [loadAppointments, persistDentistScheduleEntry]);

  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    };
  }, []);

  const filtered = useMemo(() => {
    return data.filter((a) => {
      // Explicitly exclude cancelled and rejected appointments from calendar views
      if (a.status === 'cancelled' || a.rawStatus === 'cancelled' || a.status === 'rejected') return false;
      if (filters.provider !== 'all' && a.provider?.id !== filters.provider) return false;
      if (filters.location !== 'all' && a.location?.id !== filters.location) return false;
      if (filters.channel !== 'all' && a.channel !== filters.channel) return false;
      if (filters.status !== 'all' && a.status !== filters.status) return false;
      if (filters.priority !== 'all') {
        if (filters.priority === 'urgent' && !['urgent', 'emergency'].includes(a.metadata?.priority)) return false;
        if (filters.priority === 'high-risk' && (a.risk || 0) < 0.5) return false;
        if (filters.priority === 'deposit-required' && !a.depositRequired) return false;
      }
      if (filters.q) {
        const q = filters.q.toLowerCase();
        if (!(`${a.patient?.name} ${a.type} ${a.reason}`.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [data, filters]);

  // Event handlers
  const handleAppointmentSelect = (appointment) => {
    setSelectedAppointment(appointment);
    setIsDetailDrawerOpen(true);
  };

  const handleConfirm = (appointment) => {
    setData((prev) => prev.map((x) => (x.id === appointment.id ? { ...x, status: 'confirmed' } : x)));
  };

  const handleReschedule = (appointment) => {
    setData((prev) => prev.map((x) => (x.id === appointment.id ? { ...x, status: 'pending' } : x)));
  };

  const handleStartVideo = (appointment) => {
    if (appointment?.tele?.videoRoomUrl) {
      navigate(appointment.tele.videoRoomUrl);
    }
  };

  const handleRequestPhotos = (appointment) => {
    console.log('Request remote photos for', appointment.id);
  };

  const handleStatusChange = (appointment, newStatus) => {
    setData((prev) => prev.map((x) => (x.id === appointment.id ? { ...x, status: newStatus } : x)));
  };

  // Handle appointment cancellation with refresh
  const handleCancelAppointment = useCallback(async (appointment) => {
    try {
      // Update local state immediately
      setData((prev) => prev.map((x) => (x.id === appointment.id ? { ...x, status: 'cancelled', rawStatus: 'cancelled' } : x)));
      // Close the drawer
      setIsDetailDrawerOpen(false);
      setSelectedAppointment(null);
      // Refresh from backend after a short delay to ensure DB is updated
      setTimeout(() => loadAppointments(), 500);
    } catch (error) {
      console.error('Error cancelling appointment:', error);
    }
  }, [loadAppointments]);

  // Handle schedule actions from DailyCalendar
  const handleScheduleAction = useCallback(async (action) => {
    console.log('Schedule action received:', action);

    if (!action) return;

    let persisted = false;
    if (action.actions && action.actions.length > 0) {
      for (const actionPayload of action.actions) {
        const payload = actionPayload.payload || {};
        if (!payload.start || !payload.end) continue;

        const metadata = {
          ...(payload.metadata || {})
        };
        if (actionPayload.type === 'hold_slot') {
          metadata.appointment_type = payload.appointment_type;
          metadata.priority = payload.priority;
          metadata.channel = payload.channel;
          metadata.buffers = payload.buffers;
        }

        const entryPayload = {
          type: payload.type || actionPayload.type || 'blocked',
          status: payload.status || (actionPayload.type === 'hold_slot' ? 'hold' : 'blocked'),
          start: payload.start,
          end: payload.end,
          notes: payload.notes || payload.reason,
          metadata,
          patientName: payload.patient_temp?.name || payload.patientName,
          patientPhone: payload.patient_temp?.phone || payload.patientPhone
        };

        try {
          await persistDentistScheduleEntry(entryPayload);
          persisted = true;
        } catch (error) {
          console.error('Failed to persist schedule entry', error);
        }
      }
    }

    if (persisted || action.type === 'add_block') {
      await loadAppointments();
    }
  }, [loadAppointments]);

  // Calculate stats
  const stats = useMemo(() => {
    const today = filtered.filter(a => {
      const apptDate = new Date(a.start);
      const today = new Date();
      return apptDate.toDateString() === today.toDateString();
    });

    return {
      total: today.length,
      pending: today.filter(a => a.status === 'pending').length,
      confirmed: today.filter(a => a.status === 'confirmed').length,
      completed: today.filter(a => a.status === 'completed').length,
      cancelled: today.filter(a => a.status === 'cancelled').length,
      teleDentistry: today.filter(a => a.channel === 'tele').length,
      inClinic: today.filter(a => a.channel === 'clinic').length,
    };
  }, [filtered]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-elevated flex theme-transition dentist-skeleton">
        <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
          <SideBar />
        </div>
        <main className="flex-1 min-w-0 overflow-y-auto bg-surface-elevated theme-transition">
          <ScheduleSkeleton />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-elevated flex theme-transition">
      <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
        <SideBar />
      </div>
      <main className="flex-1 min-w-0 overflow-y-auto bg-surface-elevated theme-transition">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
            <div className="space-y-1">
              <h1 className="text-4xl font-bold text-primary theme-transition">{t('dentistSchedule.header.title')}</h1>
              <p className="text-secondary theme-transition">
                {formatDateLong(selectedDate, locale)} •{' '}
                {user?.name
                  ? t('dentistSchedule.header.greeting', { name: user.name })
                  : t('dentistSchedule.header.fallbackName')}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end text-right gap-1">
                <span className="text-xs text-muted">
                  {lastSyncedAt
                    ? t('dentistSchedule.header.lastUpdated', {
                        time: new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(lastSyncedAt)
                      })
                    : t('dentistSchedule.header.fetching')}
                </span>
                <button
                  onClick={loadAppointments}
                  disabled={refreshing}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm ${
                    refreshing
                      ? 'border-border text-muted cursor-not-allowed'
                      : 'border-primary/20 text-primary hover:bg-accent/10'
                  }`}
                >
                  <Icon name="RefreshCw" size={14} className={refreshing ? 'animate-spin' : ''} />
                  {refreshing
                    ? t('dentistSchedule.header.refreshing')
                    : t('dentistSchedule.header.refresh')}
                </button>
              </div>
              {/* View Mode Selector */}
              <div className="flex items-center bg-surface rounded-xl p-1 border border-border">
                {[
                  { key: 'daily', label: t('dentistSchedule.header.viewModes.daily'), icon: 'Calendar' },
                  { key: 'week', label: t('dentistSchedule.header.viewModes.week'), icon: 'CalendarDays' },
                  { key: 'month', label: t('dentistSchedule.header.viewModes.month'), icon: 'Grid3X3' }
                ].map((mode) => (
                  <button
                    key={mode.key}
                    onClick={() => setViewMode(mode.key)}
                    className={`px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                      viewMode === mode.key 
                        ? 'bg-accent text-white shadow-sm' 
                        : 'text-secondary hover:text-primary hover:bg-surface-elevated'
                    }`}
                  >
                    <Icon name={mode.icon} size={14} />
                    <span className="text-sm">{mode.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-4 text-sm text-muted mb-4">
              <span>
                {t('dentistSchedule.summary.total')}: <strong>{summaryCounts.total}</strong>
              </span>
              <span>
                {t('dentistSchedule.summary.pending')}: <strong>{summaryCounts.pending}</strong>
              </span>
              <span>
                {t('dentistSchedule.summary.confirmed')}: <strong>{summaryCounts.confirmed}</strong>
              </span>
              <span>
                {t('dentistSchedule.summary.cancelled')}: <strong>{summaryCounts.cancelled}</strong>
              </span>
            </div>
            <ScheduleFilters 
              filters={filters} 
              onFiltersChange={setFilters}
              providers={providers}
              locations={locations}
            />
          </div>

          {/* Content */}
          <div className="mb-8">
            {viewMode === 'daily' ? (
              <DailyCalendar
                appointments={filtered}
                selectedDate={selectedDate}
                onTimeSlotClick={(slot) => console.log('Slot clicked', slot)}
                onAppointmentClick={handleAppointmentSelect}
                onScheduleAction={handleScheduleAction}
              />
            ) : (
              <MultiCalendar
                appointments={filtered}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                viewMode={viewMode}
                onScheduleAction={handleScheduleAction}
                onAppointmentClick={handleAppointmentSelect}
                onViewModeChange={setViewMode}
                clinicWorkingHours={dentistProfile?.clinicWorkingHours}
              />
            )}
          </div>

          {/* Stats */}
          <div className="mb-8">
            <ScheduleStats appointments={filtered} selectedDate={selectedDate} />
          </div>

          
        </div>
      </main>

      {/* Detail Drawer */}
      <AppointmentDetailDrawer
        appointment={selectedAppointment}
        isOpen={isDetailDrawerOpen}
        onClose={() => {
          setIsDetailDrawerOpen(false);
          setSelectedAppointment(null);
        }}
        onConfirm={handleConfirm}
        onReschedule={handleReschedule}
        onCancel={handleCancelAppointment}
        onStartVideo={handleStartVideo}
      />
    </div>
  );
};

export default DentistSchedule;
