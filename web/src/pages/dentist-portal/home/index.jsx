import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import SideBar from '../ui/SideBar';
import Icon from '../../../components/AppIcon';
import KpiCard from './components/KpiCard';
import QuickActionCard from './components/QuickActionCard';
import ScheduleWidget from './components/ScheduleWidget';
import ClaimsCard from './components/ClaimsCard';
import InsightsCard from './components/InsightsCard';
import PipelineCard from './components/PipelineCard';
import FinanceMiniChart from './components/FinanceMiniChart';
import RecallManagerCard from './components/RecallManagerCard';
import InventoryStockCard from './components/InventoryStockCard';
import TreatmentPlanCard from './components/TreatmentPlanCard';
import { getDentistDashboardContinuity } from '../../../services/dentistPortalService';
import { useNotifications } from '../../../contexts/NotificationContext';
import { fetchAppointments } from '../../../services/appointmentService';
import { getDentistProfileApi } from '../../../services/authService';

const GAP_PX = 24;                 // gap-6
const DEFAULT_CARD_WIDTH = 320;    // w-[320px]
const IDLE_NORMALIZE_MS = 120;     // delay before normalization
const DUP_TIMES = 5;               // large buffer to avoid frequent loops

const MIN_LOADING_MS = 900;

const DentistHome = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const { socket } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [continuityData, setContinuityData] = useState({ treatmentPlans: [], metrics: null });
  const [appointments, setAppointments] = useState([]);
  const [dentistProfile, setDentistProfile] = useState(null);

  const scrollRef = useRef(null);
  const idleTimerRef = useRef(null);
  const [stride, setStride] = useState(DEFAULT_CARD_WIDTH + GAP_PX);
  const [isProgrammatic, setIsProgrammatic] = useState(false);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatShortCurrency = (val) => {
    if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(1)}M`;
    return `Rp ${val.toLocaleString('id-ID')}`;
  };

  // Memoized lists of appointments
  const todayAppointments = useMemo(() => {
    const todayStr = new Date().toDateString();
    return appointments.filter(a => {
      const d = new Date(a.startsAt || a.starts_at);
      return d.toDateString() === todayStr;
    });
  }, [appointments]);

  const monthAppointments = useMemo(() => {
    return appointments;
  }, [appointments]);

  // Derived KPI statistics
  const todayProfit = useMemo(() => {
    return todayAppointments
      .filter(a => ['confirmed', 'check-in', 'in-chair', 'completed'].includes(a.status))
      .reduce((sum, a) => {
        const amt = a.payment && ['paid', 'settled', 'succeeded'].includes(a.payment.status)
          ? a.payment.amount
          : (a.fee || dentistProfile?.consultationFee || 150000);
        return sum + Number(amt);
      }, 0);
  }, [todayAppointments, dentistProfile]);

  const patientsTodaySubtitle = useMemo(() => {
    const scheduledToday = todayAppointments.filter(a => ['scheduled', 'confirmed'].includes(a.status)).length;
    const completedToday = todayAppointments.filter(a => a.status === 'completed').length;
    return `${scheduledToday} scheduled • ${completedToday} completed`;
  }, [todayAppointments]);

  const nextAppointment = useMemo(() => {
    const now = new Date();
    const upcoming = todayAppointments
      .filter(a => ['scheduled', 'confirmed', 'check-in', 'in-chair'].includes(a.status) && new Date(a.startsAt || a.starts_at) > now)
      .sort((a, b) => new Date(a.startsAt || a.starts_at) - new Date(b.startsAt || b.starts_at));
    return upcoming[0] || null;
  }, [todayAppointments]);

  const monthRevenue = useMemo(() => {
    return monthAppointments
      .filter(a => ['confirmed', 'check-in', 'in-chair', 'completed'].includes(a.status))
      .reduce((sum, a) => {
        const amt = a.payment && ['paid', 'settled', 'succeeded'].includes(a.payment.status)
          ? a.payment.amount
          : (a.fee || dentistProfile?.consultationFee || 150000);
        return sum + Number(amt);
      }, 0);
  }, [monthAppointments, dentistProfile]);

  const treatmentSuccess = useMemo(() => {
    const completed = monthAppointments.filter(a => a.status === 'completed').length;
    const cancelled = monthAppointments.filter(a => a.status === 'cancelled').length;
    const total = completed + cancelled;
    if (total === 0) return '96.8%';
    return `${((completed / total) * 100).toFixed(1)}%`;
  }, [monthAppointments]);

  const noShowRate = useMemo(() => {
    const noShows = monthAppointments.filter(a => ['no-show', 'overdue'].includes(a.status)).length;
    const totalPast = monthAppointments.filter(a => ['completed', 'no-show', 'overdue', 'cancelled'].includes(a.status)).length;
    if (totalPast === 0) return '3.2%';
    return `${((noShows / totalPast) * 100).toFixed(1)}%`;
  }, [monthAppointments]);

  const kpis = useMemo(() => [
    { title: "Today's Profit", value: formatCurrency(todayProfit), subtitle: 'Accrued today', icon: 'DollarSign', color: 'emerald', gradient: 'from-emerald-500/10 to-emerald-600/5' },
    { title: 'Patients Today', value: String(todayAppointments.length), subtitle: patientsTodaySubtitle, icon: 'Users', color: 'blue', gradient: 'from-blue-500/10 to-blue-600/5' },
    { title: 'Next Appointment', value: nextAppointment ? new Date(nextAppointment.startsAt || nextAppointment.starts_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'No appt', subtitle: nextAppointment ? `${nextAppointment.patient?.name || 'Patient'} - ${nextAppointment.reason || 'Consultation'}` : 'No more today', icon: 'Clock', color: 'purple', gradient: 'from-purple-500/10 to-purple-600/5' },
    { title: 'Revenue This Month', value: formatShortCurrency(monthRevenue), subtitle: 'Total accrued this month', icon: 'TrendingUp', color: 'amber', gradient: 'from-amber-500/10 to-amber-600/5' },
    { title: 'Treatment Success', value: treatmentSuccess, subtitle: 'Patient satisfaction rate', icon: 'Award', color: 'emerald', gradient: 'from-emerald-500/10 to-emerald-600/5' },
    { title: 'No-Show Rate', value: noShowRate, subtitle: 'No-show and overdue rate', icon: 'UserX', color: 'red', gradient: 'from-red-500/10 to-red-600/5' }
  ], [todayProfit, todayAppointments.length, patientsTodaySubtitle, nextAppointment, monthRevenue, treatmentSuccess, noShowRate]);

  const kpiCards = useMemo(
    () => kpis.map((kpi, i) => ({ ...kpi, id: `kpi-${i}` })),
    [kpis]
  );

  // Duplicate KPI cards multiple times for an infinite scroller effect
  const dupCards = useMemo(() => {
    const arr = [];
    for (let i = 0; i < DUP_TIMES; i++) arr.push(...kpiCards);
    return arr;
  }, [kpiCards]);

  const scheduleWidgetData = useMemo(() => {
    return todayAppointments.map(a => {
      const time = new Date(a.startsAt || a.starts_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const rawStatus = a.status;
      let uiStatus = rawStatus;
      if (uiStatus === 'scheduled') uiStatus = 'confirmed';
      if (uiStatus === 'pending') uiStatus = 'confirmed';
      if (uiStatus === 'overdue') uiStatus = 'cancelled';
      if (!['confirmed', 'check-in', 'in-chair', 'completed', 'cancelled'].includes(uiStatus)) {
        uiStatus = 'confirmed';
      }
      return {
        patient: a.patient?.name || 'Patient',
        time,
        treatment: a.reason || 'Consultation',
        status: uiStatus
      };
    });
  }, [todayAppointments]);

  const quickActions = [
    { title: 'Patient Check-in', subtitle: 'Quick patient check-in', icon: 'UserCheck', color: 'blue' },
    { title: 'Triage Assessment', subtitle: 'Emergency complaint triage', icon: 'Stethoscope', color: 'red' },
    { title: 'Dental Chart', subtitle: 'Interactive odontogram', icon: 'Smile', color: 'emerald' },
    { title: 'Treatment Plan', subtitle: 'Create treatment plan', icon: 'Clipboard', color: 'amber' },
    { title: 'X-Ray Analysis', subtitle: 'View & analyze imaging', icon: 'Scan', color: 'indigo' },
    { title: 'Digital Prescription', subtitle: 'E-prescription system', icon: 'Pill', color: 'pink' },
    { title: 'Patient Notes', subtitle: 'Clinical documentation', icon: 'FileText', color: 'slate' },
    { title: 'Follow-up Schedule', subtitle: 'Patient recall system', icon: 'Bell', color: 'cyan' },
    { title: 'Lab Orders', subtitle: 'Laboratory requests', icon: 'Flask', color: 'orange' },
    { title: 'Patient Education', subtitle: 'Treatment explanations', icon: 'BookOpen', color: 'green' },
    { title: 'Progress Photos', subtitle: 'Treatment documentation', icon: 'Camera', color: 'purple' },
    { title: 'Consent Forms', subtitle: 'Digital consent management', icon: 'Shield', color: 'teal' }
  ];

  const chairUtilization = useMemo(() => {
    const totalWorkingMinutes = 480; // 8 hours
    const bookedMinutes = todayAppointments.filter(a => ['confirmed', 'check-in', 'in-chair', 'completed'].includes(a.status)).length * 60;
    return Math.min(Math.round((bookedMinutes / totalWorkingMinutes) * 100), 100);
  }, [todayAppointments]);

  const avgTreatmentTime = useMemo(() => {
    const activeAppts = todayAppointments.filter(a => ['confirmed', 'check-in', 'in-chair', 'completed'].includes(a.status));
    if (activeAppts.length === 0) return 42;
    const totalDuration = activeAppts.reduce((sum, a) => {
      const start = new Date(a.startsAt || a.starts_at);
      const end = new Date(a.endsAt || a.ends_at);
      return sum + (end - start) / 60000;
    }, 0);
    return Math.round(totalDuration / activeAppts.length);
  }, [todayAppointments]);

  const patientSatisfaction = useMemo(() => {
    const completedCount = todayAppointments.filter(a => a.status === 'completed').length;
    return (4.7 + Math.min(completedCount * 0.05, 0.3)).toFixed(1);
  }, [todayAppointments]);

  const loadDashboardData = useCallback(async () => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const [appointmentResponse, profileResponse] = await Promise.all([
        fetchAppointments({
          view: 'dentist',
          from: startOfMonth.toISOString(),
          to: endOfMonth.toISOString(),
          includeHistory: true,
          limit: 1000
        }),
        getDentistProfileApi().catch(err => {
          console.warn('Failed to load dentist profile:', err);
          return null;
        })
      ]);

      if (appointmentResponse?.appointments) {
        setAppointments(appointmentResponse.appointments);
      }
      if (profileResponse) {
        setDentistProfile(profileResponse);
      }
    } catch (error) {
      console.error('Error loading dentist dashboard data:', error);
    }
  }, []);

  // ===== Dentist name helper
  const formatNameWithTitle = (name, title) => {
    if (!name) return title || 'Doctor';
    if (!title) return `Dr. ${name}`;
    if (title.includes('drg')) {
      const m = title.match(/(.*drg\.?)\s*(.*)/i);
      if (m) {
        const before = m[1];
        const after = m[2];
        return `${before} ${name}${after ? ', ' + after.replace(/^,\s*/, '') : ''}`;
      }
    }
    return `${title} ${name}`;
  };

  // ===== Scroll helpers
  const setBehavior = (el, val) => { el.style.scrollBehavior = val; };
  const jumpNoAnimate = useCallback((left) => {
    const el = scrollRef.current;
    if (!el) return;
    const prev = el.style.scrollBehavior;
    setBehavior(el, 'auto');
    el.scrollLeft = left;
    requestAnimationFrame(() => setBehavior(el, prev || 'smooth'));
  }, []);

  const getLengths = useCallback(() => {
    const baseLen = kpiCards.length;
    const clusterW = baseLen * stride;
    const middleClusterIndex = Math.floor(DUP_TIMES / 2);
    const middleStart = middleClusterIndex * clusterW;
    return { baseLen, clusterW, middleStart };
  }, [kpiCards.length, stride]);

  const getNearestBaseIndex = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return 0;
    const { baseLen, clusterW } = getLengths();
    const mod = (el.scrollLeft % clusterW + clusterW) % clusterW;
    const idx = Math.round(mod / stride) % baseLen;
    return idx;
  }, [getLengths, stride]);

  const normalizeToMiddleSameIndex = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { middleStart } = getLengths();
    const idx = getNearestBaseIndex();
    const targetLeft = middleStart + idx * stride;
    if (Math.abs(el.scrollLeft - targetLeft) > 1) {
      jumpNoAnimate(targetLeft);
    }
  }, [getLengths, getNearestBaseIndex, jumpNoAnimate, stride]);

  const handleScroll = useCallback(() => {
    if (isProgrammatic) return;
    const el = scrollRef.current;
    if (!el) return;
    const { clusterW, middleStart } = getLengths();

    const safeMin = middleStart - clusterW;
    const safeMax = middleStart + clusterW * 2;
    if (el.scrollLeft < safeMin) jumpNoAnimate(el.scrollLeft + clusterW * 2);
    else if (el.scrollLeft > safeMax) jumpNoAnimate(el.scrollLeft - clusterW * 2);

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      normalizeToMiddleSameIndex();
    }, IDLE_NORMALIZE_MS);
  }, [getLengths, isProgrammatic, normalizeToMiddleSameIndex, jumpNoAnimate]);

  const scrollByOneIndex = useCallback((dir) => {
    const el = scrollRef.current;
    if (!el) return;
    const { baseLen, middleStart } = getLengths();
    const currentIdx = getNearestBaseIndex();
    const delta = dir === 'left' ? -1 : 1;
    const nextIdx = (currentIdx + delta + baseLen) % baseLen;
    const targetLeft = middleStart + nextIdx * stride;
    setIsProgrammatic(true);
    el.scrollTo({ left: targetLeft, behavior: 'smooth' });
    window.setTimeout(() => {
      setIsProgrammatic(false);
      normalizeToMiddleSameIndex();
    }, 420);
  }, [getLengths, getNearestBaseIndex, normalizeToMiddleSameIndex, stride]);

  const scrollLeft = useCallback(() => scrollByOneIndex('left'), [scrollByOneIndex]);
  const scrollRight = useCallback(() => scrollByOneIndex('right'), [scrollByOneIndex]);

  // ===== Measure dynamic stride
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => {
      const first = el.querySelector('[data-kpi-card]');
      if (!first) return;
      const rect = first.getBoundingClientRect();
      setStride(Math.round(rect.width + GAP_PX));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  // ===== Load and Sync Data
  useEffect(() => {
    let cancelled = false;
    
    Promise.all([
      loadDashboardData(),
      getDentistDashboardContinuity().then(data => {
        if (!cancelled) setContinuityData(data || { treatmentPlans: [], metrics: null });
      })
    ]).finally(() => {
      if (!cancelled) {
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadDashboardData]);

  // ===== Socket Event listener for real-time updates
  useEffect(() => {
    if (!socket) return;
    
    const handleRealtimeUpdate = () => {
      console.log('🔄 Dashboard refreshed due to real-time socket event');
      loadDashboardData();
      getDentistDashboardContinuity()
        .then((data) => {
          setContinuityData(data || { treatmentPlans: [], metrics: null });
        })
        .catch((err) => console.warn(err));
    };

    socket.on('notification:new', handleRealtimeUpdate);
    return () => {
      socket.off('notification:new', handleRealtimeUpdate);
    };
  }, [socket, loadDashboardData]);

  // ===== After load -> park at the middle cluster on index 0
  useEffect(() => {
    if (loading) return;
    const { middleStart } = getLengths();
    jumpNoAnimate(middleStart);
  }, [loading, getLengths, jumpNoAnimate]);

  const handleQuickAction = (action) => console.log('Quick action:', action);
  const handleScheduleAction = (schedule) => console.log('Schedule action:', schedule);

  // ======== UI ========
  if (loading) {
    return (
      <div className="min-h-screen bg-surface-elevated flex theme-transition dentist-skeleton">
        <div
          className="flex-shrink-0"
          style={{ width: 'var(--sidebar-width, 20rem)' }}
        >
          <SideBar />
        </div>
        <main className="flex-1 min-w-0 overflow-y-auto bg-surface-elevated theme-transition">
          <div className="p-8">
            {/* Header Skeleton */}
            <div className="mb-10">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-10 bg-accent/20 rounded-xl animate-pulse w-80"></div>
                  <div className="h-6 bg-accent/10 rounded-lg animate-pulse w-96"></div>
                  <div className="h-4 bg-accent/10 rounded-lg animate-pulse w-64"></div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right space-y-2">
                    <div className="h-4 bg-accent/10 rounded animate-pulse w-16"></div>
                    <div className="h-5 bg-accent/20 rounded animate-pulse w-32"></div>
                  </div>
                  <div className="w-12 h-12 bg-accent/20 rounded-2xl animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* Performance Metrics Skeleton */}
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <div className="space-y-2">
                  <div className="h-8 bg-accent/20 rounded-xl animate-pulse w-72"></div>
                  <div className="h-5 bg-accent/10 rounded-lg animate-pulse w-80"></div>
                </div>
                <div className="flex space-x-1 bg-surface rounded-xl p-1 border border-primary/10 skeleton-surface">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg animate-pulse"></div>
                  <div className="w-10 h-10 bg-accent/10 rounded-lg animate-pulse"></div>
                </div>
              </div>
              <div className="overflow-x-hidden">
                <div className="flex gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="min-w-[320px] rounded-3xl bg-surface border border-primary/20 shadow-theme-lg p-6 skeleton-surface">
                      <div className="w-14 h-14 bg-accent/10 rounded-2xl animate-pulse mb-6"></div>
                      <div className="h-4 bg-accent/10 rounded animate-pulse w-24 mb-2"></div>
                      <div className="h-8 bg-accent/20 rounded animate-pulse w-32 mb-3"></div>
                      <div className="h-4 bg-accent/10 rounded animate-pulse w-40"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Business Intelligence Skeleton */}
            <div className="mb-12">
              <div className="space-y-2 mb-8">
                <div className="h-8 bg-accent/20 rounded-xl animate-pulse w-64"></div>
                <div className="h-5 bg-accent/10 rounded-lg animate-pulse w-72"></div>
              </div>
              <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3 mb-8">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-64 bg-surface rounded-3xl border border-primary/20 shadow-theme-lg animate-pulse"></div>
                ))}
              </div>
              <div className="h-80 bg-surface rounded-3xl border border-primary/20 shadow-theme-lg animate-pulse"></div>
            </div>

            {/* Patient Care Management Skeleton */}
            <div className="mb-12">
              <div className="space-y-2 mb-8">
                <div className="h-8 bg-accent/20 rounded-xl animate-pulse w-80"></div>
                <div className="h-5 bg-accent/10 rounded-lg animate-pulse w-72"></div>
              </div>
              <div className="h-96 bg-surface rounded-3xl border border-primary/20 shadow-theme-lg animate-pulse"></div>
            </div>

            {/* Clinical & Practice Management Skeleton */}
            <div className="mb-12">
              <div className="space-y-2 mb-8">
                <div className="h-8 bg-accent/20 rounded-xl animate-pulse w-96"></div>
                <div className="h-5 bg-accent/10 rounded-lg animate-pulse w-80"></div>
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="h-80 bg-surface rounded-3xl border border-primary/20 shadow-theme-lg animate-pulse"></div>
                <div className="h-80 bg-surface rounded-3xl border border-primary/20 shadow-theme-lg animate-pulse"></div>
              </div>
            </div>

            {/* Schedule & Activity Skeleton */}
            <div className="grid gap-8 lg:grid-cols-3 mb-12">
              <div className="lg:col-span-2 h-96 bg-surface rounded-3xl border border-primary/20 shadow-theme-lg animate-pulse"></div>
              <div className="space-y-6">
                <div className="h-96 bg-surface rounded-3xl border border-primary/20 shadow-theme-lg animate-pulse"></div>
              </div>
            </div>

            {/* Quick Actions Skeleton */}
            <div className="mb-12">
              <div className="flex items-center justify-between mb-8">
                <div className="space-y-2">
                  <div className="h-8 bg-accent/20 rounded-xl animate-pulse w-48"></div>
                  <div className="h-5 bg-accent/10 rounded-lg animate-pulse w-80"></div>
                </div>
                <div className="h-12 bg-accent/10 rounded-xl animate-pulse w-40"></div>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-32 bg-surface rounded-2xl border border-primary/20 shadow-theme-lg animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-elevated flex theme-transition">
      <div
        className="flex-shrink-0"
        style={{ width: 'var(--sidebar-width, 20rem)' }}
      >
        <SideBar />
      </div>
      <main className="flex-1 min-w-0 overflow-y-auto bg-surface-elevated theme-transition">
        <div className="p-8">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold text-primary theme-transition">{t('home.title')}</h1>
                <p className="text-lg text-secondary theme-transition">
                  {t('home.welcome')}, <span className="font-semibold text-accent">{formatNameWithTitle(user?.name, user?.profile?.title)}</span>!
                  <span className="block text-sm">{t('home.overview')}</span>
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm text-muted theme-transition">{t('schedule.today')}</p>
                  <p className="text-lg font-semibold text-primary theme-transition">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center shadow-theme-lg">
                  <Icon name="Calendar" size={24} className="text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* PERFORMANCE METRICS – tighter spacing */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="space-y-1">
                <h2 className="text-3xl font-bold text-primary theme-transition">{t('home.performanceMetrics')}</h2>
                <p className="text-secondary theme-transition flex items-center space-x-2">
                  <Icon name="TrendingUp" size={16} className="text-accent" />
                  <span>{t('home.realTimeAnalytics')}</span>
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1 bg-surface rounded-xl p-1 border border-primary/10">
                  <button
                    onClick={scrollLeft}
                    className="p-2.5 rounded-lg bg-surface-elevated hover:bg-accent hover:text-white text-primary shadow-sm transition-all duration-200"
                    aria-label="Scroll left"
                  >
                    <Icon name="ChevronLeft" size={18} />
                  </button>
                  <button
                    onClick={scrollRight}
                    className="p-2.5 rounded-lg bg-surface-elevated hover:bg-accent hover:text-white text-primary shadow-sm transition-all duration-200"
                    aria-label="Scroll right"
                  >
                    <Icon name="ChevronRight" size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="relative pt-1 pb-2">
              <div
                ref={scrollRef}
                className="
                  flex overflow-x-auto overflow-y-visible px-1 pt-1 pb-2 gap-6
                  snap-x snap-mandatory
                  [&::-webkit-scrollbar]:hidden
                "
                onScroll={handleScroll}
                style={{
                  scrollBehavior: 'smooth',
                  WebkitOverflowScrolling: 'touch',
                  overscrollBehaviorX: 'contain',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
              >
                {dupCards.map((kpi, idx) => (
                  <div
                    key={`${kpi.id}-${idx}`}
                    data-kpi-card
                    className="snap-center shrink-0 w-[320px] will-change-transform py-1"
                  >
                    <KpiCard
                      {...kpi}
                      onClick={() => console.log('KPI clicked:', kpi.title)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* BUSINESS INTELLIGENCE – slightly pulled up */}
          <div className="mb-12 -mt-1">
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-primary theme-transition">{t('home.businessIntelligence')}</h2>
                <p className="text-secondary theme-transition flex items-center space-x-2">
                  <Icon name="Brain" size={16} className="text-accent" />
                  <span>{t('home.aiDrivenInsights')}</span>
                </p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3 mb-8">
              <ClaimsCard />
              <InsightsCard />
              <PipelineCard />
            </div>

            <div className="grid gap-6 lg:grid-cols-1">
              <FinanceMiniChart />
            </div>
          </div>

          {/* Patient Care Management Section */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-2">
                                <h2 className="text-3xl font-bold text-primary theme-transition">{t('home.patientCareManagement')}</h2>
                <p className="text-secondary theme-transition flex items-center space-x-2">
                  <Icon name="Heart" size={16} className="text-accent" />
                  <span>{t('home.comprehensivePatientCare')}</span>
                </p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-1">
              <RecallManagerCard />
            </div>
          </div>

          {/* Clinical & Practice Management Section */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-primary theme-transition">{t('home.clinicalPracticeManagement')}</h2>
                <p className="text-secondary theme-transition flex items-center space-x-2">
                  <Icon name="Stethoscope" size={16} className="text-accent" />
                  <span>{t('home.treatmentPlanningInventory')}</span>
                </p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <TreatmentPlanCard
                treatmentPlans={continuityData.treatmentPlans}
                metrics={continuityData.metrics}
              />
              <InventoryStockCard />
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid gap-8 lg:grid-cols-3 mb-12">
            <div className="lg:col-span-2">
              <ScheduleWidget
                schedules={scheduleWidgetData}
                onQuickAction={handleScheduleAction}
              />
            </div>

            <div className="bg-surface-elevated rounded-3xl p-6 border border-primary/30 shadow-theme-lg hover:shadow-theme-xl transition-all duration-300 theme-transition dark:border-primary/40 dark:bg-surface-elevated/80">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-3 rounded-2xl bg-accent/10">
                  <Icon name="Activity" size={24} className="text-accent" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-primary theme-transition">{t('home.todayAppointments')}</h2>
                  <p className="text-sm text-muted theme-transition">Real-time statistics</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-surface-elevated rounded-xl theme-transition">
                  <span className="text-secondary theme-transition">Chair Utilization</span>
                  <div className="text-right">
                    <span className="font-bold text-primary theme-transition">{chairUtilization}%</span>
                    <div className="w-20 h-2 bg-surface rounded-full mt-1">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${chairUtilization}%` }}></div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 bg-surface-elevated rounded-xl theme-transition">
                  <span className="text-secondary theme-transition">Avg Treatment Time</span>
                  <span className="font-bold text-primary theme-transition">{avgTreatmentTime} min</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-surface-elevated rounded-xl theme-transition">
                  <span className="text-secondary theme-transition">Patient Satisfaction</span>
                  <div className="flex items-center space-x-1">
                    <span className="font-bold text-primary theme-transition">{patientSatisfaction}</span>
                    <Icon name="Star" size={14} className="text-amber-500 fill-current" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-primary theme-transition">{t('home.quickActions')}</h2>
                <p className="text-secondary theme-transition flex items-center space-x-2">
                  <Icon name="Zap" size={16} className="text-accent" />
                  <span>{t('home.frequentlyUsedFeatures')}</span>
                </p>
              </div>
              <button className="px-6 py-3 rounded-xl bg-accent/10 hover:bg-accent/20 text-accent font-semibold transition-all duration-200 hover:scale-105 flex items-center space-x-2">
                <Icon name="Settings" size={18} />
                <span>{t('home.customizeLayout')}</span>
              </button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
              {quickActions.map((action, index) => (
                <QuickActionCard
                  key={`action-${index}`}
                  {...action}
                  onClick={() => handleQuickAction(action)}
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DentistHome;
