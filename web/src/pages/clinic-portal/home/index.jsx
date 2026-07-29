import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import ClinicSideBar from '../ui/SideBar-Clinic';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotifications } from '../../../contexts/NotificationContext';
import { authHttp } from '../../../utils/httpClient';
import { resolveMediaUrl } from '../../../utils/media';
import { fetchAppointments } from '../../../services/appointmentService';
import { usePortalRealtimeRefresh } from '../../../hooks/usePortalRealtimeRefresh';
import { PORTAL_REFRESH_PROFILES } from '../../../collaboration/portalCollaboration.mjs';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const ClinicDashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const { user } = useAuth();
  const { socket } = useNotifications();

  // Clock state updating every second for live countdown timers
  const [currentTime, setCurrentTime] = useState(new Date());

  // Data states
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    appointments: [],
    invoices: [],
    payments: [],
    todayStats: {
      totalToday: 0,
      completedToday: 0,
      pendingToday: 0,
      noShowToday: 0,
      cancelledToday: 0,
      todayRevenue: 0,
      pendingRevenue: 0,
      occupiedRooms: 0,
      availableRooms: 6
    },
    trendData: [],
    pieData: [],
    upcomingAppointments: [],
    recentActivities: [],
    dentistLoadData: [],
    paymentMethodData: [],
    totalMethodRevenue: 0,
    canViewFinancials: true
  });

  const [activeTrendTab, setActiveTrendTab] = useState('revenue'); // 'revenue' | 'appointments'

  // Clock ticker updating every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const loadDashboardData = useCallback(async () => {
    try {
      const from = new Date();
      from.setDate(from.getDate() - 30);
      from.setHours(0, 0, 0, 0);

      const to = new Date();
      to.setDate(to.getDate() + 30);
      to.setHours(23, 59, 59, 999);

      const [appointmentsResponse, financialsResponse] = await Promise.all([
        fetchAppointments({
          view: 'clinic',
          from: from.toISOString(),
          to: to.toISOString(),
          includeHistory: true
        }).catch((err) => {
          console.error('Failed to fetch appointments:', err);
          return { appointments: [] };
        }),
        authHttp.get('/financials/clinic/history').catch((err) => {
          console.error('Failed to fetch financials:', err);
          return { data: { invoices: [], payments: [] } };
        })
      ]);

      const appointments = appointmentsResponse?.appointments || [];
      const invoices = financialsResponse?.data?.invoices || [];
      const payments = financialsResponse?.data?.payments || [];
      const canViewFinancials = financialsResponse?.data?.canViewFinancials !== false;

      // Calculate today stats
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const todayAppointments = appointments.filter((apt) => {
        const date = new Date(apt.startsAt || apt.starts_at);
        return date >= todayStart && date <= todayEnd;
      });

      const totalToday = todayAppointments.length;
      const completedToday = todayAppointments.filter((apt) => apt.status === 'completed').length;
      const pendingToday = todayAppointments.filter((apt) =>
        ['scheduled', 'rescheduled', 'pending'].includes(apt.status)
      ).length;
      const noShowToday = todayAppointments.filter((apt) => ['no_show', 'no-show'].includes(apt.status)).length;
      const cancelledToday = todayAppointments.filter((apt) => apt.status === 'cancelled').length;

      // Today's revenue from payments
      const todayRevenue = canViewFinancials ? payments.reduce((sum, p) => {
        if (['completed', 'paid', 'settled'].includes(p.status?.toLowerCase())) {
          const date = new Date(p.receivedAt || p.created_at || p.updatedAt);
          if (date >= todayStart && date <= todayEnd) {
            return sum + Number(p.amount || 0);
          }
        }
        return sum;
      }, 0) : 0;

      // Pending revenue from unpaid/pending/overdue invoices
      const pendingRevenue = canViewFinancials ? invoices.reduce((sum, inv) => {
        if (['unpaid', 'pending', 'overdue'].includes(inv.status?.toLowerCase())) {
          return sum + Number(inv.totalAmount || inv.amount || 0);
        }
        return sum;
      }, 0) : 0;

      // Calculate active rooms (assume max 6 rooms)
      const totalRooms = 6;
      const now = new Date();
      const activeApts = todayAppointments.filter((apt) => {
        const start = new Date(apt.startsAt || apt.starts_at);
        const end = new Date(apt.endsAt || apt.ends_at);
        return now >= start && now <= end && !['cancelled', 'no_show'].includes(apt.status);
      });
      const occupiedRooms = Math.min(totalRooms, activeApts.length);
      const availableRooms = totalRooms - occupiedRooms;

      // 7-day trend data
      const trendData = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        trendData.push({
          name: d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }),
          dateKey: d.toDateString(),
          revenue: 0,
          appointmentsCount: 0
        });
      }

      payments.forEach((p) => {
        if (['completed', 'paid', 'settled'].includes(p.status?.toLowerCase())) {
          const pDate = new Date(p.receivedAt || p.created_at || p.updatedAt).toDateString();
          const match = trendData.find((item) => item.dateKey === pDate);
          if (match) {
            match.revenue += Number(p.amount || 0);
          }
        }
      });

      appointments.forEach((apt) => {
        const aptDate = new Date(apt.startsAt || apt.starts_at).toDateString();
        const match = trendData.find((item) => item.dateKey === aptDate);
        if (match) {
          match.appointmentsCount += 1;
        }
      });

      // Pie chart status distribution data
      const pieData = [
        { name: t('clinic.dashboard.status.completed') || 'Selesai', value: completedToday, color: '#10B981' },
        { name: t('clinic.dashboard.status.pending') || 'Menunggu', value: pendingToday, color: '#3B82F6' },
        { name: t('clinic.dashboard.status.noshow') || 'No-Show', value: noShowToday, color: '#F59E0B' },
        { name: t('clinic.dashboard.status.cancelled') || 'Batal', value: cancelledToday, color: '#EF4444' }
      ].filter((item) => item.value > 0);

      // Upcoming active/scheduled appointments for today or future (Real-Time filter)
      const upcomingAppointments = appointments
        .filter((apt) => {
          const date = new Date(apt.startsAt || apt.starts_at);
          const isToday = date.toDateString() === new Date().toDateString();
          const isFuture = date > new Date();
          const isNotDone = !['cancelled', 'no_show', 'completed'].includes(apt.status);
          return (isToday || isFuture) && isNotDone;
        })
        .sort((a, b) => new Date(a.startsAt || a.starts_at) - new Date(b.startsAt || b.starts_at))
        .slice(0, 5);

      // Recent activities timeline
      const recentActivities = [];

      // Add payments to activities
      payments.forEach((p) => {
        const time = new Date(p.receivedAt || p.created_at || p.updatedAt);
        recentActivities.push({
          id: `pay-${p.id || p.paymentId}`,
          type: 'payment',
          patient: p.patient?.name || 'Pasien',
          amount: p.amount,
          time,
          timeLabel: time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          dateLabel: time.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
          description: `Pembayaran ${formatCurrency(p.amount)} via ${p.method || 'online'}`
        });
      });

      // Add appointments to activities
      appointments.forEach((apt) => {
        const time = new Date(apt.startsAt || apt.starts_at);
        const isCompleted = apt.status === 'completed';
        recentActivities.push({
          id: `apt-${apt.id}`,
          type: isCompleted ? 'checkin' : 'appointment',
          patient: apt.patient?.name || 'Pasien',
          doctor: apt.provider?.name || apt.dentist?.name || 'Dokter',
          time,
          timeLabel: time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          dateLabel: time.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
          description: isCompleted
            ? `Selesai perawatan dengan ${apt.provider?.name || 'Dokter'}`
            : `Janji temu baru dengan ${apt.provider?.name || 'Dokter'}`
        });
      });

      const sortedActivities = recentActivities
        .sort((a, b) => b.time - a.time)
        .slice(0, 6);

      // Dentist load stats for today
      const dentistStats = {};
      appointments.forEach((apt) => {
        const date = new Date(apt.startsAt || apt.starts_at);
        if (date.toDateString() === new Date().toDateString() && !['cancelled', 'no_show', 'no-show'].includes(apt.status)) {
          const dentistName = apt.provider?.name || apt.dentist?.name || 'Dokter';
          dentistStats[dentistName] = (dentistStats[dentistName] || 0) + 1;
        }
      });
      const dentistLoadData = Object.entries(dentistStats)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Group payments by method for visualization
      const methodCounts = {};
      if (canViewFinancials) payments.forEach((p) => {
        if (['completed', 'paid', 'settled'].includes(p.status?.toLowerCase())) {
          const method = p.method || 'online';
          methodCounts[method] = (methodCounts[method] || 0) + Number(p.amount || 0);
        }
      });
      const colors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899'];
      const paymentMethodData = Object.entries(methodCounts).map(([name, value], idx) => ({
        name: name === 'transfer' ? 'Transfer' : name === 'qris' ? 'QRIS' : name === 'cash' ? 'Tunai' : name === 'debit' ? 'Debit' : name,
        value,
        color: colors[idx % colors.length]
      })).sort((a, b) => b.value - a.value);

      const totalMethodRevenue = paymentMethodData.reduce((sum, item) => sum + item.value, 0);

      setDashboardData({
        appointments,
        invoices,
        payments,
        todayStats: {
          totalToday,
          completedToday,
          pendingToday,
          noShowToday,
          cancelledToday,
          todayRevenue,
          pendingRevenue,
          occupiedRooms,
          availableRooms
        },
        trendData,
        pieData,
        upcomingAppointments,
        recentActivities: sortedActivities,
        dentistLoadData,
        paymentMethodData,
        totalMethodRevenue,
        canViewFinancials
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadDashboardData();
    // Refresh every 60 seconds as a fallback
    const interval = setInterval(loadDashboardData, 60000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  usePortalRealtimeRefresh({
    socket,
    events: PORTAL_REFRESH_PROFILES.DASHBOARD,
    refresh: loadDashboardData
  });

  const quickActions = [
    {
      id: 'new-appointment',
      label: t('clinic.dashboard.newAppointment') || '+ Janji Temu',
      icon: 'CalendarPlus',
      color: 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/20 dark:shadow-blue-500/10',
      onClick: () => navigate('/clinic-portal/schedule')
    },
    {
      id: 'checkin',
      label: t('clinic.dashboard.checkin') || 'Check-in',
      icon: 'UserCheck',
      color: 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20 dark:shadow-emerald-500/10',
      onClick: () => navigate('/clinic-portal/patients')
    },
    {
      id: 'invoice',
      label: t('clinic.dashboard.createInvoice') || 'Buat Invoice',
      icon: 'FileText',
      color: 'bg-gradient-to-br from-purple-500 to-pink-600 shadow-purple-500/20 dark:shadow-purple-500/10',
      onClick: () => navigate('/clinic-portal/billing')
    },
    {
      id: 'payment',
      label: t('clinic.dashboard.receivePayment') || 'Terima Pembayaran',
      icon: 'CreditCard',
      color: 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/20 dark:shadow-amber-500/10',
      onClick: () => navigate('/clinic-portal/billing')
    },
    {
      id: 'teleconsult',
      label: t('clinic.dashboard.teleconsult') || 'Telekonsultasi',
      icon: 'Video',
      color: 'bg-gradient-to-br from-pink-500 to-rose-600 shadow-pink-500/20 dark:shadow-pink-500/10',
      onClick: () => navigate('/clinic-portal/schedule')
    }
  ];

  // Helper for empty pie chart rendering
  const displayPieData = useMemo(() => {
    if (dashboardData.pieData.length > 0) {
      return dashboardData.pieData;
    }
    return [{ name: t('clinic.dashboard.status.nodata') || 'Tidak Ada Data', value: 1, color: isDark ? '#374151' : '#E5E7EB' }];
  }, [dashboardData.pieData, t, isDark]);

  // Real-Time Countdown calculator hook helper
  const getAptTimeInfo = useCallback((apt) => {
    const start = new Date(apt.startsAt || apt.starts_at);
    const end = new Date(apt.endsAt || apt.ends_at);

    if (currentTime >= start && currentTime <= end) {
      return {
        text: t('clinic.dashboard.upcoming.inProgress') || 'Sedang Berlangsung',
        badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 animate-pulse font-bold',
        dotClass: 'bg-emerald-500 animate-ping'
      };
    }

    const diffMs = start - currentTime;
    const diffMins = Math.round(diffMs / 60000);

    if (diffMs < 0) {
      return {
        text: t('clinic.dashboard.upcoming.delayed') || `Terlambat ${Math.abs(diffMins)} mnt`,
        badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-bold',
        dotClass: 'bg-rose-500'
      };
    }

    if (diffMins < 60) {
      return {
        text: t('clinic.dashboard.upcoming.startsIn') || `Mulai ${diffMins} mnt lagi`,
        badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-semibold',
        dotClass: 'bg-blue-500 animate-pulse'
      };
    }

    const diffHours = Math.round(diffMins / 60);
    if (diffHours < 24) {
      return {
        text: t('clinic.dashboard.upcoming.inHours') || `Mulai ${diffHours} jam lagi`,
        badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-medium',
        dotClass: 'bg-amber-500'
      };
    }

    return {
      text: start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      badgeClass: 'bg-slate-500/10 text-secondary border-slate-500/20 font-medium',
      dotClass: 'bg-slate-400'
    };
  }, [currentTime, t]);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background theme-transition clinic-skeleton">
        <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
          <ClinicSideBar />
        </div>
        <div className="flex-1 min-w-0">
          <div className="p-6 md:p-8 space-y-8">
            {/* Header skeleton */}
            <div className="h-44 w-full rounded-3xl bg-accent/5 animate-pulse border border-border/40 p-6 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="h-4 w-32 bg-accent/20 rounded-full" />
                <div className="h-8 w-64 bg-accent/15 rounded-lg" />
              </div>
              <div className="h-12 w-48 bg-accent/10 rounded-xl" />
            </div>

            {/* Quick Actions skeleton */}
            <div className="space-y-4">
              <div className="h-6 w-40 bg-accent/10 rounded" />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="p-5 rounded-2xl bg-surface-elevated border border-border/40 space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 mx-auto" />
                    <div className="h-4 w-20 bg-accent/10 rounded mx-auto" />
                  </div>
                ))}
              </div>
            </div>

            {/* Stats skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="p-6 rounded-2xl bg-surface-elevated border border-border/40 space-y-4">
                  <div className="flex justify-between">
                    <div className="w-10 h-10 rounded-xl bg-accent/10" />
                    <div className="w-12 h-4 bg-accent/10 rounded" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-6 w-24 bg-accent/15 rounded" />
                    <div className="h-4 w-32 bg-accent/10 rounded" />
                  </div>
                </div>
              ))}
            </div>

            {/* Charts skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-surface-elevated border border-border/40 rounded-3xl p-6 h-96" />
              <div className="bg-surface-elevated border border-border/40 rounded-3xl p-6 h-96" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active status color helper
  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400';
      case 'pending':
      case 'scheduled':
      case 'rescheduled':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400';
      case 'no_show':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400';
      case 'cancelled':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-950/30 dark:text-gray-400';
    }
  };

  const getStatusLabel = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return t('clinic.dashboard.status.completed') || 'Selesai';
      case 'pending':
      case 'scheduled':
      case 'rescheduled':
        return t('clinic.dashboard.status.pending') || 'Menunggu';
      case 'no_show': return t('clinic.dashboard.status.noshow') || 'No-Show';
      case 'cancelled': return t('clinic.dashboard.status.cancelled') || 'Batal';
      default: return status;
    }
  };

  return (
    <div className="flex min-h-screen bg-background theme-transition">
      <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
        <ClinicSideBar />
      </div>

      <div className="flex-1 min-w-0">
        <div className="p-6 md:p-8 space-y-8">

          {/* Welcome Banner Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 p-6 md:p-8 text-white shadow-xl theme-transition">
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -left-10 -bottom-10 w-48 h-48 rounded-full bg-black/10 blur-2xl" />

            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
                  <Icon name="Activity" size={12} />
                  {t('clinic.dashboard.badge') || 'Clinic Overview'}
                </span>
                <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
                  {t('clinic.dashboard.welcome', { defaultValue: 'Selamat Datang Kembali!' })}
                </h1>
                <p className="text-sm text-white/90 max-w-xl">
                  {t('clinic.dashboard.welcomeSubtitle', { defaultValue: 'Kelola jadwal pasien, transaksi billing, dan pantau performa klinik Anda secara real-time.' })}
                </p>
              </div>

              {/* Live Clock / Calendar widget */}
              <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 px-5 py-3 md:self-center shadow-inner self-start animate-fade-in">
                <div className="p-2.5 bg-white/10 rounded-xl animate-pulse">
                  <Icon name="Calendar" size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold">
                    {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <p className="text-xs text-white/80 font-mono">
                    {currentTime.toLocaleDateString('id-ID', { year: 'numeric' })} • {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions section */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-primary flex items-center gap-2">
              <Icon name="Zap" className="text-amber-500" size={20} />
              {t('clinic.dashboard.quickActions') || 'Quick Actions'}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={action.onClick}
                  className="relative p-5 rounded-2xl bg-surface-elevated border border-border/40 hover:border-accent/40 shadow-sm hover:shadow-lg transition-all duration-300 group text-center flex flex-col items-center justify-center cursor-pointer active:scale-95"
                >
                  <div className={`w-12 h-12 rounded-xl ${action.color} flex items-center justify-center mb-3 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                    <Icon name={action.icon} size={22} className="text-white" />
                  </div>
                  <p className="text-sm font-bold text-primary tracking-wide">
                    {action.label}
                  </p>
                </button>
              ))}
            </div>
          </section>

          {/* Today's Summary Stat Cards */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-primary flex items-center gap-2">
              <Icon name="BarChart3" className="text-amber-500" size={20} />
              {t('clinic.dashboard.todaySummary') || 'Ringkasan Hari Ini'}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

              {/* Card 1: Today's Appointments */}
              <div className="relative overflow-hidden p-6 rounded-3xl bg-surface-elevated border border-border/40 hover:border-accent/40 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group cursor-default">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40">
                    <Icon name="Calendar" size={22} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
                    {t('clinic.dashboard.stats.today') || 'Hari ini'}
                  </span>
                </div>
                <div>
                  <p className="text-3xl font-extrabold text-primary mb-1 tracking-tight">
                    {dashboardData.todayStats.totalToday}
                  </p>
                  <p className="text-sm font-bold text-primary mb-2">
                    {t('clinic.dashboard.appointmentsToday') || 'Janji Temu'}
                  </p>
                  <p className="text-xs text-secondary mb-3">
                    {dashboardData.todayStats.completedToday} selesai, {dashboardData.todayStats.pendingToday} menunggu
                  </p>
                  <div className="w-full bg-border/40 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${(dashboardData.todayStats.completedToday / (dashboardData.todayStats.totalToday || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Today's Revenue */}
              <div className="relative overflow-hidden p-6 rounded-3xl bg-surface-elevated border border-border/40 hover:border-accent/40 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group cursor-default">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40">
                    <Icon name="TrendingUp" size={22} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100/50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
                    {dashboardData.canViewFinancials ? `${Math.min(100, Math.round((dashboardData.todayStats.todayRevenue / 20000000) * 100))}% target` : 'Restricted'}
                  </span>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-primary mb-1 tracking-tight truncate" title={formatCurrency(dashboardData.todayStats.todayRevenue)}>
                    {dashboardData.canViewFinancials ? formatCurrency(dashboardData.todayStats.todayRevenue) : 'Tidak tersedia'}
                  </p>
                  <p className="text-sm font-bold text-primary mb-2">
                    {t('clinic.dashboard.dailyRevenue') || 'Pendapatan Hari Ini'}
                  </p>
                  <p className="text-xs text-secondary mb-3">
                    {dashboardData.canViewFinancials ? 'Target: Rp 20.000.000' : 'Akses angka finansial dibatasi untuk role ini'}
                  </p>
                  <div className="w-full bg-border/40 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: dashboardData.canViewFinancials ? `${Math.min(100, (dashboardData.todayStats.todayRevenue / 20000000) * 100)}%` : '0%' }}
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: Pending Bills / Invoices */}
              <div className="relative overflow-hidden p-6 rounded-3xl bg-surface-elevated border border-border/40 hover:border-accent/40 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group cursor-default">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40">
                    <Icon name="CreditCard" size={22} className="text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100/50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400">
                    {t('clinic.dashboard.pendingBills') || 'Billing'}
                  </span>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-primary mb-1 tracking-tight truncate" title={formatCurrency(dashboardData.todayStats.pendingRevenue)}>
                    {dashboardData.canViewFinancials ? formatCurrency(dashboardData.todayStats.pendingRevenue) : 'Tidak tersedia'}
                  </p>
                  <p className="text-sm font-bold text-primary mb-2">
                    {t('clinic.dashboard.outstandingRevenue') || 'Tagihan Outstanding'}
                  </p>
                  <p className="text-xs text-secondary mb-3">
                    {dashboardData.canViewFinancials ? 'Invoices belum dilunasi' : 'Akses angka finansial dibatasi untuk role ini'}
                  </p>
                  <div className="w-full bg-border/40 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-amber-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: dashboardData.canViewFinancials ? '100%' : '0%' }}
                    />
                  </div>
                </div>
              </div>

              {/* Card 4: Treatment Room Occupancy */}
              <div className="relative overflow-hidden p-6 rounded-3xl bg-surface-elevated border border-border/40 hover:border-accent/40 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group cursor-default">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40">
                    <Icon name="Building" size={22} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-100/50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400">
                    {t('clinic.dashboard.rooms') || 'Ruang'}
                  </span>
                </div>
                <div>
                  <p className="text-3xl font-extrabold text-primary mb-1 tracking-tight">
                    {dashboardData.todayStats.occupiedRooms}/6
                  </p>
                  <p className="text-sm font-bold text-primary mb-2">
                    {t('clinic.dashboard.roomOccupancy') || 'Keterisian Ruang'}
                  </p>
                  <p className="text-xs text-secondary mb-3">
                    {dashboardData.todayStats.availableRooms} ruangan tersedia
                  </p>
                  <div className="w-full bg-border/40 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-purple-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${(dashboardData.todayStats.occupiedRooms / 6) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

            </div>
          </section>

          {/* Data Visualizations Grid (Recharts Area & Pie) */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Chart: 7-Day Performance Trends (AreaChart) */}
            <div className="lg:col-span-2 bg-surface-elevated border border-border/40 rounded-3xl p-6 flex flex-col h-96 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                    <Icon name="LineChart" className="text-accent" size={18} />
                    {t('clinic.dashboard.trendTitle') || 'Tren Performa Klinik'}
                  </h3>
                  <p className="text-xs text-secondary">
                    {t('clinic.dashboard.trendSubtitle') || 'Analisis pendapatan dan volume janji temu selama 7 hari terakhir'}
                  </p>
                </div>

                {/* Chart Toggle tabs */}
                <div className="flex bg-surface border border-border/40 rounded-xl p-1 self-start sm:self-auto">
                  <button
                    onClick={() => setActiveTrendTab('revenue')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${activeTrendTab === 'revenue'
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-secondary hover:text-primary'}`}
                  >
                    <Icon name="DollarSign" size={14} />
                    {t('clinic.dashboard.trend.revenue') || 'Pendapatan'}
                  </button>
                  <button
                    onClick={() => setActiveTrendTab('appointments')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${activeTrendTab === 'appointments'
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-secondary hover:text-primary'}`}
                  >
                    <Icon name="Calendar" size={14} />
                    {t('clinic.dashboard.trend.appointments') || 'Janji Temu'}
                  </button>
                </div>
              </div>

              {/* Recharts Area Chart */}
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={dashboardData.trendData}
                    margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={activeTrendTab === 'revenue' ? '#A08A48' : '#3B82F6'} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={activeTrendTab === 'revenue' ? '#A08A48' : '#3B82F6'} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.2} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                      dy={8}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                      tickFormatter={(value) => activeTrendTab === 'revenue' ? `Rp${value / 1000000}jt` : value}
                      width={55}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--surface-elevated)',
                        borderColor: 'var(--border)',
                        borderRadius: '1rem',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                        padding: '12px'
                      }}
                      itemStyle={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '12px' }}
                      labelStyle={{ color: 'var(--text-secondary)', marginBottom: '6px', fontSize: '11px', fontWeight: 'bold' }}
                      formatter={(value) => [activeTrendTab === 'revenue' ? formatCurrency(value) : `${value} Janji Temu`, activeTrendTab === 'revenue' ? 'Pendapatan' : 'Janji Temu']}
                    />
                    <Area
                      type="monotone"
                      dataKey={activeTrendTab === 'revenue' ? 'revenue' : 'appointmentsCount'}
                      stroke={activeTrendTab === 'revenue' ? '#A08A48' : '#3B82F6'}
                      fillOpacity={1}
                      fill="url(#colorTrend)"
                      strokeWidth={2.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right Chart: Donut Chart (Appointment Status Distribution) */}
            <div className="bg-surface-elevated border border-border/40 rounded-3xl p-6 flex flex-col h-96 shadow-sm">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                  <Icon name="PieChart" className="text-accent" size={18} />
                  {t('clinic.dashboard.statusDistribution') || 'Distribusi Status Janji'}
                </h3>
                <p className="text-xs text-secondary">
                  {t('clinic.dashboard.statusDistributionSubtitle') || 'Status kehadiran janji temu hari ini'}
                </p>
              </div>

              {/* Donut Chart with centered label */}
              <div className="flex-1 flex flex-col items-center justify-center relative min-h-0">
                <div className="w-full h-48 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={displayPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {displayPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Centered details */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                    <span className="text-3xl font-extrabold text-primary tracking-tight">
                      {dashboardData.todayStats.totalToday}
                    </span>
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-wider">
                      {t('clinic.dashboard.totalBookings') || 'Total'}
                    </p>
                  </div>
                </div>

                {/* Legend */}
                <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 w-full px-2">
                  {displayPieData.map((item, index) => (
                    <div key={index} className="flex items-center gap-1.5 text-xs text-secondary font-medium">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span>{item.name} ({item.value})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </section>

          {/* Dynamic Clinic Load & Financial Distributions (Custom Modern Visualizations) */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Horizontal Bar Load Breakdown: Dentist Busiest list */}
            <div className="bg-surface-elevated border border-border/40 rounded-3xl p-6 flex flex-col min-h-[260px] shadow-sm">
              <div className="mb-4">
                <h3 className="text-md font-bold text-primary flex items-center gap-2">
                  <Icon name="Users" className="text-accent" size={16} />
                  {t('clinic.dashboard.dentistLoad') || 'Beban Kerja Dokter Gigi Hari Ini'}
                </h3>
                <p className="text-xs text-secondary">
                  {t('clinic.dashboard.dentistLoadSubtitle') || 'Pembagian antrean janji temu per dokter gigi aktif'}
                </p>
              </div>

              <div className="flex-1 flex flex-col justify-center">
                {dashboardData.dentistLoadData.length === 0 ? (
                  <div className="text-center py-6">
                    <Icon name="UserX" className="mx-auto text-muted/30 mb-2" size={28} />
                    <p className="text-xs text-secondary">Tidak ada aktivitas dokter gigi hari ini</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dashboardData.dentistLoadData.map((dentist, index) => {
                      const maxCount = Math.max(...dashboardData.dentistLoadData.map(d => d.count), 1);
                      const pct = (dentist.count / maxCount) * 100;
                      return (
                        <div key={index} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-bold text-primary">
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                              {dentist.name}
                            </span>
                            <span>{dentist.count} Janji</span>
                          </div>
                          <div className="w-full bg-border/40 rounded-full h-2 overflow-hidden shadow-inner">
                            <div
                              className="bg-gradient-to-r from-accent to-accent-hover h-full rounded-full transition-all duration-700"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Segmented Fin breakdown: Revenue by Payment Method */}
            <div className="lg:col-span-2 bg-surface-elevated border border-border/40 rounded-3xl p-6 flex flex-col min-h-[260px] shadow-sm justify-between">
              <div>
                <h3 className="text-md font-bold text-primary flex items-center gap-2">
                  <Icon name="CreditCard" className="text-emerald-500" size={16} />
                  {t('clinic.dashboard.revenueBreakdown') || 'Metode Pembayaran Sukses'}
                </h3>
                <p className="text-xs text-secondary">
                  {t('clinic.dashboard.revenueBreakdownSubtitle') || 'Proporsi total omzet berdasarkan instrumen pembayaran'}
                </p>
              </div>

              <div className="my-4 space-y-4">
                {/* Custom Segmented Horizontal Bar Chart */}
                <div className="w-full bg-border/40 rounded-full h-5 overflow-hidden flex shadow-inner">
                  {!dashboardData.canViewFinancials ? (
                    <div className="w-full h-full bg-border/50 text-center text-[10px] text-secondary flex items-center justify-center font-bold">
                      Akses finansial dibatasi
                    </div>
                  ) : dashboardData.paymentMethodData.length === 0 ? (
                    <div className="w-full h-full bg-border/50 text-center text-[10px] text-secondary flex items-center justify-center font-bold">
                      Belum ada transaksi sukses
                    </div>
                  ) : (
                    dashboardData.paymentMethodData.map((item, index) => {
                      const pct = dashboardData.totalMethodRevenue > 0 ? (item.value / dashboardData.totalMethodRevenue) * 100 : 0;
                      if (pct === 0) return null;
                      return (
                        <div
                          key={index}
                          className="h-full transition-all duration-300 border-r border-surface last:border-0 hover:brightness-110"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: item.color
                          }}
                          title={`${item.name}: ${formatCurrency(item.value)} (${Math.round(pct)}%)`}
                        />
                      );
                    })
                  )}
                </div>

                {/* Legend Grid with values */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {dashboardData.canViewFinancials && dashboardData.paymentMethodData.map((item, index) => {
                    const pct = dashboardData.totalMethodRevenue > 0 ? (item.value / dashboardData.totalMethodRevenue) * 100 : 0;
                    return (
                      <div key={index} className="p-2.5 rounded-xl border border-border/30 bg-surface flex flex-col justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-secondary font-bold truncate">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                          {item.name}
                        </div>
                        <div className="mt-1 text-xs font-extrabold text-primary flex items-baseline justify-between gap-1 flex-wrap">
                          <span>{formatCurrency(item.value)}</span>
                          <span className="text-[10px] font-bold text-secondary">({Math.round(pct)}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </section>

          {/* Upcoming Appointments & Recent Activities columns */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Recent Activities Feed */}
            <div className="bg-surface-elevated rounded-3xl border border-border/40 p-6 flex flex-col min-h-[400px] shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                    <Icon name="Activity" className="text-accent" size={18} />
                    {t('clinic.dashboard.recentActivities') || 'Aktivitas Terbaru'}
                  </h3>
                  <p className="text-xs text-secondary">
                    {t('clinic.dashboard.recentActivitiesSubtitle') || 'Log riwayat janji temu dan pembayaran masuk'}
                  </p>
                </div>
                <button
                  onClick={() => navigate('/clinic-portal/patients')}
                  className="text-accent hover:text-accent-hover text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {t('common.viewAll') || 'Lihat Semua'}
                  <Icon name="ChevronRight" size={14} />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                {dashboardData.recentActivities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-3">
                    <Icon name="ClipboardList" className="text-muted/40" size={40} />
                    <p className="text-sm font-semibold text-secondary">Belum ada aktivitas hari ini</p>
                  </div>
                ) : (
                  dashboardData.recentActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-4 p-3.5 rounded-2xl hover:bg-surface border border-transparent hover:border-border/30 transition-all duration-200"
                    >
                      <div className={`p-2.5 rounded-xl flex-shrink-0 ${activity.type === 'checkin' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                        : activity.type === 'payment' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                          : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                        }`}>
                        <Icon
                          name={
                            activity.type === 'checkin' ? 'UserCheck'
                              : activity.type === 'payment' ? 'CreditCard'
                                : 'Calendar'
                          }
                          size={18}
                        />
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-primary">
                            {activity.patient}
                          </p>
                          <span className="text-[10px] font-semibold text-secondary bg-border/20 px-2 py-0.5 rounded-md">
                            {activity.timeLabel}
                          </span>
                        </div>
                        <p className="text-xs text-secondary leading-relaxed">
                          {activity.description}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Upcoming Appointments List (featuring Live ticking indicators) */}
            <div className="bg-surface-elevated rounded-3xl border border-border/40 p-6 flex flex-col min-h-[400px] shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                    <Icon name="Calendar" className="text-accent" size={18} />
                    {t('clinic.dashboard.upcomingAppointments') || 'Janji Mendatang'}
                  </h3>
                  <p className="text-xs text-secondary">
                    {t('clinic.dashboard.upcomingAppointmentsSubtitle') || 'Daftar janji temu aktif/scheduled hari ini dan mendatang'}
                  </p>
                </div>
                <button
                  onClick={() => navigate('/clinic-portal/schedule')}
                  className="text-accent hover:text-accent-hover text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {t('common.viewSchedule') || 'Lihat Jadwal'}
                  <Icon name="ChevronRight" size={14} />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                {dashboardData.upcomingAppointments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-3">
                    <Icon name="Calendar" className="text-muted/40" size={40} />
                    <p className="text-sm font-semibold text-secondary">Tidak ada janji mendatang</p>
                  </div>
                ) : (
                  dashboardData.upcomingAppointments.map((appointment) => {
                    const start = new Date(appointment.startsAt || appointment.starts_at);
                    const formattedTime = start.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                    const formattedDate = start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

                    // Live dynamic countdown metrics based on currentTime ticks
                    const timeInfo = getAptTimeInfo(appointment);

                    return (
                      <div
                        key={appointment.id}
                        className="flex items-start gap-4 p-3.5 rounded-2xl hover:bg-surface border border-transparent hover:border-border/30 transition-all duration-200"
                      >
                        {/* Patient Avatar or fallback initials */}
                        {appointment.patient?.avatar ? (
                          <img
                            src={resolveMediaUrl(appointment.patient.avatar)}
                            alt={appointment.patient.name}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-accent/20 flex-shrink-0"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                              // show placeholder
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}

                        {(!appointment.patient?.avatar || appointment.patient?.avatar === null) && (
                          <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center font-bold text-sm ring-2 ring-accent/20 flex-shrink-0">
                            {appointment.patient?.name?.charAt(0) || 'P'}
                          </div>
                        )}

                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-primary">
                              {appointment.patient?.name}
                            </p>

                            {/* Live Countdown Badge */}
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] border ${timeInfo.badgeClass}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${timeInfo.dotClass}`} />
                              {timeInfo.text}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <p className="text-xs text-secondary font-medium">
                              {appointment.reason || 'Pemeriksaan Gigi'} • {appointment.dentist?.name || 'Dokter'}
                            </p>

                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold px-1.5 py-0.25 rounded-md ${getStatusBadgeClass(appointment.status)}`}>
                                {getStatusLabel(appointment.status)}
                              </span>
                              <span className="text-[10px] font-semibold text-secondary">
                                {formattedDate}, {formattedTime}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </section>
        </div>
      </div>
    </div>
  );
};

export default ClinicDashboard;
