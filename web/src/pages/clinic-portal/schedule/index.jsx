import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import ClinicSideBar from '../ui/SideBar-Clinic';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { canObserveSessions, getClinicRole } from '../../../utils/clinicRoles';

// Import new components
import ClinicMultiCalendar from './components/ClinicMultiCalendar';
import ClinicDailyCalendar from './components/ClinicDailyCalendar';
import ClinicScheduleStats from './components/ClinicScheduleStats';
import AppointmentDetailDrawer from './components/AppointmentDetailDrawer';
import { fetchAppointments, updateAppointmentStatus } from '../../../services/appointmentService';
import { useNotifications } from '../../../contexts/NotificationContext';
import ClinicService from '../../../services/clinicService';

const CLINIC_SCHEDULE_REALTIME_EVENTS = [
  'notification:new',
  'appointment:updated',
  'payment:status_updated',
  'billing:invoice_updated',
  'dashboard:metrics_updated',
  'clinic:billing_updated'
];

const SchedulePage = () => {
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { socket } = useNotifications();

  const [activeTab, setActiveTab] = useState('overview');
  const [viewMode, setViewMode] = useState('week'); // 'daily', 'week', 'month'
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctors, setSelectedDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showAppointmentDrawer, setShowAppointmentDrawer] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const clinicRole = useMemo(() => getClinicRole(user), [user]);
  const canObserveVideoRoom = canObserveSessions(clinicRole);

  const MIN_LOADING_MS = 900;
  const loadStartRef = useRef(Date.now());
  const loadingTimerRef = useRef(null);
  const hasInitializedDoctorsRef = useRef(false);

  const finishLoading = useCallback(() => {
    const finalize = () => {
      setLoading(false);
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    };
    const elapsed = Date.now() - loadStartRef.current;
    const remaining = MIN_LOADING_MS - elapsed;
    if (remaining > 0) {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = setTimeout(finalize, remaining);
    } else {
      finalize();
    }
  }, []);

  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    };
  }, []);



  const normalizeStatus = useCallback((status) => {
    switch (status) {
      case 'scheduled':
      case 'rescheduled':
        return 'pending';
      default:
        return status;
    }
  }, []);

  const mapApiAppointment = useCallback((appointment) => {
    if (!appointment) return null;
    const start = new Date(appointment.startsAt || appointment.starts_at);
    const end = new Date(appointment.endsAt || appointment.ends_at);
    return {
      id: appointment.id,
      status: normalizeStatus(appointment.status),
      channel: appointment.metadata?.channel || (appointment.videoRoomRef ? 'tele' : 'clinic'),
      type: appointment.metadata?.type || appointment.reason || t('clinic.schedule.appointmentTypes.generalConsultation'),
      start,
      end,
      patient: {
        id: appointment.patientId,
        name: appointment.patient?.name || t('clinic.schedule.labels.unknownPatient', { defaultValue: 'Unknown patient' }),
        avatar: appointment.patient?.avatar || null,
        contact: {
          wa: appointment.patient?.phone || appointment.patient?.phone_number || appointment.patient?.email || null
        }
      },
      provider: {
        id: appointment.dentistId,
        name: appointment.dentist?.name || t('clinic.schedule.labels.unknownDentist', { defaultValue: 'Assigned dentist' })
      },
      location: appointment.clinicBranch
        ? {
          id: appointment.clinicBranch.id,
          name: appointment.clinicBranch.name || t('clinic.schedule.locations.default', { defaultValue: 'Clinic' })
        }
        : null,
      reason: appointment.reason,
      risk: appointment.metadata?.risk ?? 0,
      tele: appointment.videoRoomRef
        ? { videoRoomUrl: `/clinic-portal/teledentistry?appointmentId=${appointment.id}` }
        : null
    };
  }, [normalizeStatus, t]);

  const loadSchedule = useCallback(async () => {
    setRefreshing(true);
    loadStartRef.current = Date.now();
    setLoading(true);
    try {
      const from = new Date(selectedDate);
      from.setDate(from.getDate() - 45);
      from.setHours(0, 0, 0, 0);

      const to = new Date(selectedDate);
      to.setDate(to.getDate() + 45);
      to.setHours(23, 59, 59, 999);

      const [response, staffResponse] = await Promise.all([
        fetchAppointments({
          view: 'clinic',
          from: from.toISOString(),
          to: to.toISOString(),
          includeHistory: true
        }),
        ClinicService.getClinicStaffList().catch((err) => {
          console.error('Failed to fetch clinic staff:', err);
          return { staff: [] };
        })
      ]);

      const mapped = (response?.appointments || []).map(mapApiAppointment).filter(Boolean);

      const staffList = staffResponse?.staff || [];
      const clinicDentists = staffList
        .filter((s) => s.role === 'dentist')
        .map((s) => ({
          id: s.userId,
          name: s.name,
          specialization: s.position || t('clinic.schedule.specializations.generalDentist'),
          email: s.email,
          phone: s.phone
        }));

      // Fallback: if we have appointments with dentists not in the staff list, collect from appointments
      const dentistMap = new Map();
      clinicDentists.forEach((d) => dentistMap.set(d.id, d));
      mapped.forEach((apt) => {
        if (apt.provider?.id && !dentistMap.has(apt.provider.id)) {
          dentistMap.set(apt.provider.id, {
            id: apt.provider.id,
            name: apt.provider.name,
            specialization: t('clinic.schedule.specializations.generalDentist'),
            email: '',
            phone: ''
          });
        }
      });

      const finalDentists = Array.from(dentistMap.values());

      setAppointments(mapped);
      setDoctors(finalDentists);

      // Manage doctor selection state
      if (!hasInitializedDoctorsRef.current && finalDentists.length > 0) {
        setSelectedDoctors(finalDentists.map((d) => d.id));
        hasInitializedDoctorsRef.current = true;
      } else {
        setSelectedDoctors((prev) => {
          const finalIds = finalDentists.map((d) => d.id);
          return prev.filter((id) => finalIds.includes(id));
        });
      }

      setLastSyncedAt(new Date());
    } catch (error) {
      console.error('Error fetching clinic schedule:', error);
      // Keep existing states on error rather than falling back to mock data
    } finally {
      setRefreshing(false);
      finishLoading();
    }
  }, [selectedDate, finishLoading, mapApiAppointment, t]);

  useEffect(() => {
    loadSchedule();
    const interval = setInterval(() => {
      loadSchedule();
    }, 60000);
    return () => clearInterval(interval);
  }, [loadSchedule]);

  useEffect(() => {
    if (!socket) return;
    const handleRealtimeUpdate = (data) => {
      console.log('🔄 Real-time update: refreshing clinic schedule:', data);
      loadSchedule();
    };
    CLINIC_SCHEDULE_REALTIME_EVENTS.forEach((eventName) => socket.on(eventName, handleRealtimeUpdate));
    return () => {
      CLINIC_SCHEDULE_REALTIME_EVENTS.forEach((eventName) => socket.off(eventName, handleRealtimeUpdate));
    };
  }, [socket, loadSchedule]);

  // Handle appointment actions
  const handleAppointmentAction = async (action, appointment) => {
    console.log('Appointment action:', action, appointment);

    switch (action) {
      case 'confirm':
      case 'checkin':
      case 'start':
      case 'complete':
      case 'noshow':
        try {
          const { appointment: updated } = await updateAppointmentStatus(appointment.id, action);
          const mapped = mapApiAppointment(updated);
          if (mapped) {
            setAppointments(prev => prev.map(apt => (apt.id === appointment.id ? mapped : apt)));
            setSelectedAppointment(mapped);
          }
          await loadSchedule();
        } catch (error) {
          console.error('Failed to update appointment status:', error);
        }
        break;
      case 'cancel':
        console.log('Cancel action is not wired from clinic schedule drawer yet.');
        break;
      case 'viewPatient':
        if (appointment.patient?.id) {
          navigate(`/clinic-portal/patients?patientId=${appointment.patient.id.toString()}&tab=history`);
        }
        break;
      default:
        console.log('Unknown action:', action);
    }

    if (action !== 'viewPatient') {
      setShowAppointmentDrawer(false);
    }
  };

  // Handle appointment click
  const handleAppointmentClick = (appointment) => {
    console.log('Appointment clicked:', appointment);
    setSelectedAppointment(appointment);
    setShowAppointmentDrawer(true);
  };

  const handleOpenVideoRoom = useCallback((appointment) => {
    if (!appointment?.id || !canObserveVideoRoom) return;
    navigate(`/clinic-portal/teledentistry?appointmentId=${encodeURIComponent(appointment.id)}&observe=true`);
    setShowAppointmentDrawer(false);
  }, [canObserveVideoRoom, navigate]);

  // Handle view mode change
  const handleViewModeChange = (mode) => {
    console.log('View mode change requested:', mode);
    setViewMode(mode);
    if (mode === 'daily') {
      setActiveTab('calendar');
    }
  };

  // Handle date change
  const handleDateChange = (date) => {
    console.log('Date change requested:', date);
    setSelectedDate(date);
  };

  // Handle doctor selection change
  const handleDoctorSelectionChange = (selectedDoctorIds) => {
    setSelectedDoctors(selectedDoctorIds);
  };

  // Tabs configuration
  const tabs = [
    { id: 'overview', label: t('clinic.schedule.overview') || 'Ringkasan', icon: 'BarChart3' },
    { id: 'calendar', label: t('clinic.schedule.calendar') || 'Kalender', icon: 'Calendar' },
    { id: 'stats', label: t('clinic.schedule.statistics') || 'Statistik', icon: 'TrendingUp' }
  ];

  if (loading) {
    const statSkeletons = Array.from({ length: 4 });
    const insightSkeletons = Array.from({ length: 3 });

    return (
      <div className="flex min-h-screen bg-background theme-transition clinic-skeleton">
        <ClinicSideBar />
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-6 md:p-8 pb-0">
            <section className="space-y-6 rounded-3xl border border-primary/15 bg-surface-elevated skeleton-surface p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-3">
                  <div className="h-6 w-56 rounded bg-accent/10 animate-pulse"></div>
                  <div className="h-4 w-80 rounded bg-accent/10 animate-pulse"></div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="h-10 w-40 rounded-xl bg-accent/10 animate-pulse"></div>
                  <div className="h-10 w-48 rounded-xl bg-accent/20 animate-pulse"></div>
                </div>
              </div>
              <div className="border-t border-primary/15 pt-4">
                <div className="flex flex-wrap gap-2">
                  {tabs.map((tab) => (
                    <div key={tab.id} className="h-9 w-28 rounded-lg bg-accent/10 animate-pulse"></div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {statSkeletons.map((_, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-primary/15 bg-surface-elevated skeleton-surface p-5 space-y-3"
                >
                  <div className="h-4 w-24 rounded bg-accent/10 animate-pulse"></div>
                  <div className="h-6 w-20 rounded bg-accent/20 animate-pulse"></div>
                  <div className="h-3 w-32 rounded bg-accent/10 animate-pulse"></div>
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-primary/15 bg-surface-elevated skeleton-surface">
              <div className="p-6 border-b border-primary/15">
                <div className="h-4 w-48 rounded bg-accent/10 animate-pulse"></div>
              </div>
              <div className="p-6">
                <div className="h-[320px] rounded-2xl border border-dashed border-primary/20 bg-surface animate-pulse"></div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {insightSkeletons.map((_, idx) => (
                <div key={idx} className="rounded-2xl border border-primary/15 bg-surface-elevated skeleton-surface p-6 space-y-4">
                  <div className="h-4 w-36 rounded bg-accent/10 animate-pulse"></div>
                  <div className="space-y-2">
                    <div className="h-3 w-48 rounded bg-accent/10 animate-pulse"></div>
                    <div className="h-3 w-44 rounded bg-accent/10 animate-pulse"></div>
                    <div className="h-3 w-32 rounded bg-accent/10 animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background theme-transition">
      <ClinicSideBar />

      {/* Header */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="p-6 md:p-8 pb-0">
          <section className="clinic-page-header space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-primary">
                  {t('clinic.schedule.title') || 'Jadwal Klinik'}
                </h1>
                <p className="text-sm text-secondary max-w-2xl">
                  {t('clinic.schedule.subtitle') || 'Kelola jadwal semua dokter dan pantau aktivitas klinik'}
                </p>
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3">
                <div className="rounded-2xl border border-border/40 bg-surface px-4 py-2 text-sm text-secondary">
                  {appointments.filter(apt => {
                    const today = new Date();
                    const aptDate = new Date(apt.start);
                    return aptDate.toDateString() === today.toDateString();
                  }).length} {t('clinic.schedule.appointmentsToday') || 'janji temu hari ini'}
                </div>
                <div className="flex flex-col items-end gap-1 sm:mr-2">
                  <span className="text-xs text-secondary">
                    {lastSyncedAt
                      ? t('clinic.schedule.lastUpdated', {
                        defaultValue: 'Terakhir sinkron {{time}}',
                        time: new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(lastSyncedAt)
                      })
                      : t('clinic.schedule.syncing', { defaultValue: 'Sinkronisasi data…' })}
                  </span>
                  <button
                    onClick={loadSchedule}
                    disabled={refreshing}
                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${refreshing
                      ? 'border-border text-muted cursor-not-allowed'
                      : 'border-accent/40 text-accent hover:bg-accent/10'
                      }`}
                  >
                    <Icon name="RefreshCw" size={14} className={refreshing ? 'animate-spin' : ''} />
                    {refreshing
                      ? t('clinic.schedule.refreshing', { defaultValue: 'Menyegarkan…' })
                      : t('clinic.schedule.refresh', { defaultValue: 'Segarkan' })}
                  </button>
                </div>
                <button
                  onClick={() => setShowAppointmentDrawer(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-accent/90"
                >
                  <Icon name="Plus" size={16} />
                  <span>{t('clinic.schedule.createAppointment') || 'Buat Janji Temu'}</span>
                </button>
              </div>
            </div>
            <div className="border-t border-border/40 pt-4">
              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab.id
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-secondary hover:text-primary hover:bg-surface'
                      }`}
                  >
                    <Icon name={tab.icon} size={16} />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-background theme-transition">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Calendar Section Header */}
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-primary theme-transition flex items-center gap-2">
                  <Icon name="Calendar" size={18} className="text-accent" />
                  <span>{t('clinic.schedule.calendarThisWeek') || 'Kalender Minggu Ini'}</span>
                </h3>
                <button
                  onClick={() => setActiveTab('calendar')}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:text-accent/80 transition-all duration-200"
                >
                  <span>{t('clinic.schedule.viewDetails') || 'Lihat Detail'}</span>
                  <Icon name="ArrowRight" size={14} />
                </button>
              </div>

              {/* Calendar Overview */}
              <ClinicMultiCalendar
                selectedDate={selectedDate}
                appointments={appointments}
                onDateChange={handleDateChange}
                onAppointmentClick={handleAppointmentClick}
                onViewModeChange={(mode) => {
                  console.log('Overview calendar view mode change:', mode);
                  if (mode === 'daily') {
                    setActiveTab('calendar');
                    setViewMode('daily');
                  } else {
                    handleViewModeChange(mode);
                  }
                }}
                viewMode={viewMode === 'daily' ? 'week' : viewMode}
                doctors={doctors}
                selectedDoctors={selectedDoctors}
                onDoctorSelectionChange={handleDoctorSelectionChange}
              />

              {/* Quick Stats */}
              <ClinicScheduleStats
                appointments={appointments}
                doctors={doctors}
                selectedDate={selectedDate}
              />
            </div>
          )}

          {activeTab === 'calendar' && (
            <div className="space-y-6">
              {viewMode === 'daily' ? (
                <ClinicDailyCalendar
                  selectedDate={selectedDate}
                  appointments={appointments}
                  onTimeSlotClick={(date, doctorId) => console.log('Time slot clicked:', date, doctorId)}
                  onAppointmentClick={handleAppointmentClick}
                  doctors={doctors}
                  selectedDoctors={selectedDoctors}
                />
              ) : (
                <ClinicMultiCalendar
                  selectedDate={selectedDate}
                  appointments={appointments}
                  onDateChange={handleDateChange}
                  onAppointmentClick={handleAppointmentClick}
                  onViewModeChange={handleViewModeChange}
                  viewMode={viewMode}
                  doctors={doctors}
                  selectedDoctors={selectedDoctors}
                  onDoctorSelectionChange={handleDoctorSelectionChange}
                />
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-6">
              <ClinicScheduleStats
                appointments={appointments}
                doctors={doctors}
                selectedDate={selectedDate}
              />

              {/* Advanced Analytics Section */}
              <div className="bg-surface rounded-3xl border border-primary/30 shadow-theme-lg theme-transition p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-2xl flex items-center justify-center border border-purple-200/50">
                    <Icon name="TrendingUp" size={24} className="text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-primary theme-transition">
                      {t('clinic.schedule.advancedAnalytics') || 'Advanced Analytics'}
                    </h3>
                    <p className="text-sm text-secondary theme-transition">
                      {t('clinic.schedule.advancedAnalyticsSubtitle') || 'Predictive insights untuk optimisasi klinik'}
                    </p>
                  </div>
                </div>

                {/* Advanced Analytics Grid */}
                <div className="grid gap-6 lg:grid-cols-3 mb-6">
                  <div className="rounded-2xl border border-primary/15 dark:border-primary/25 bg-surface dark:bg-slate-950/60 shadow-theme-md p-6 theme-transition bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-emerald-500/15 dark:bg-emerald-500/20 rounded-xl flex items-center justify-center">
                        <Icon name="Brain" size={20} className="text-emerald-600 dark:text-emerald-200" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-primary">{t('clinic.schedule.predictiveAnalytics') || 'Predictive Analytics'}</h4>
                        <p className="text-xs text-secondary">{t('clinic.schedule.aiDrivenPredictions') || 'AI-driven predictions'}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-secondary">{t('clinic.schedule.nextWeekDemand') || 'Next week demand'}</span>
                        <span className="font-semibold text-primary">+23%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-secondary">{t('clinic.schedule.peakHoursPrediction') || 'Peak hours prediction'}</span>
                        <span className="font-semibold text-primary">10:00-12:00</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-secondary">{t('clinic.schedule.cancellationRisk') || 'Cancellation risk'}</span>
                        <span className="font-semibold text-primary">Low (8%)</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-primary/15 dark:border-primary/25 bg-surface dark:bg-slate-950/60 shadow-theme-md p-6 theme-transition bg-gradient-to-br from-blue-500/10 via-transparent to-transparent">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-blue-500/15 dark:bg-blue-500/20 rounded-xl flex items-center justify-center">
                        <Icon name="Users" size={20} className="text-blue-600 dark:text-blue-200" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-primary">{t('clinic.schedule.patientFlowOptimization') || 'Patient Flow Optimization'}</h4>
                        <p className="text-xs text-secondary">{t('clinic.schedule.streamlineOperations') || 'Streamline operations'}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-secondary">{t('clinic.schedule.averageWaitTime') || 'Average wait time'}</span>
                        <span className="font-semibold text-primary">12 min</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-secondary">{t('clinic.schedule.throughputEfficiency') || 'Throughput efficiency'}</span>
                        <span className="font-semibold text-primary">87%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-secondary">{t('clinic.schedule.bottleneckIdentified') || 'Bottleneck identified'}</span>
                        <span className="font-semibold text-primary">{t('clinic.schedule.xrayRoom') || 'X-Ray Room'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-primary/15 dark:border-primary/25 bg-surface dark:bg-slate-950/60 shadow-theme-md p-6 theme-transition bg-gradient-to-br from-amber-500/10 via-transparent to-transparent">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-amber-500/15 dark:bg-amber-500/20 rounded-xl flex items-center justify-center">
                        <Icon name="DollarSign" size={20} className="text-amber-600 dark:text-amber-200" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-primary">{t('clinic.schedule.revenueForecasting') || 'Revenue Forecasting'}</h4>
                        <p className="text-xs text-secondary">{t('clinic.schedule.financialPredictions') || 'Financial predictions'}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-secondary">{t('clinic.schedule.monthlyProjection') || 'Monthly projection'}</span>
                        <span className="font-semibold text-primary">Rp 485M</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-secondary">{t('clinic.schedule.growthRate') || 'Growth rate'}</span>
                        <span className="font-semibold text-primary">+14.2%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-secondary">{t('clinic.schedule.optimalPricing') || 'Optimal pricing'}</span>
                        <span className="font-semibold text-primary">{t('clinic.schedule.implemented') || 'Implemented'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Items */}
                <div className="rounded-2xl border border-primary/15 dark:border-primary/25 bg-surface dark:bg-slate-950/60 shadow-theme-md p-6 theme-transition">
                  <h4 className="font-semibold text-primary mb-4">{t('clinic.schedule.actionableInsights') || 'Actionable Insights'}</h4>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-indigo-500/10 dark:bg-indigo-600/20 rounded-lg flex items-center justify-center mt-0.5">
                        <Icon name="AlertTriangle" size={14} className="text-indigo-600 dark:text-indigo-200" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-primary">{t('clinic.schedule.recommendation1') || 'Add 2 more slots at 10:00-11:00'}</p>
                        <p className="text-xs text-secondary">{t('clinic.schedule.recommendation1Desc') || 'High demand period with 23% increase expected'}</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-purple-500/10 dark:bg-purple-600/20 rounded-lg flex items-center justify-center mt-0.5">
                        <Icon name="Zap" size={14} className="text-purple-600 dark:text-purple-200" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-primary">{t('clinic.schedule.recommendation2') || 'Optimize X-Ray scheduling'}</p>
                        <p className="text-xs text-secondary">{t('clinic.schedule.recommendation2Desc') || 'Reduce bottleneck by 15 minutes average'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Appointment Detail Drawer */}
      <AppointmentDetailDrawer
        appointment={selectedAppointment}
        isOpen={showAppointmentDrawer}
        onClose={() => setShowAppointmentDrawer(false)}
        onAction={handleAppointmentAction}
        onOpenVideoRoom={handleOpenVideoRoom}
        canObserveVideoRoom={canObserveVideoRoom}
      />
    </div>
  );
};

export default SchedulePage;
