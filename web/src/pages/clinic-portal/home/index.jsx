import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import ClinicSideBar from '../ui/SideBar-Clinic';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';

const ClinicDashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const { user } = useAuth();
  
  const [dashboardData, setDashboardData] = useState({
    todayStats: {
      appointments: { total: 24, completed: 18, pending: 4, cancelled: 2 },
      rooms: { total: 8, occupied: 5, available: 3 },
      noShow: 3,
      revenue: 15750000,
      stockAlerts: 5,
      teamTasks: 12
    },
    recentActivities: [],
    upcomingAppointments: []
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Mock API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // In real implementation, this would be an API call
        setDashboardData(prev => ({
          ...prev,
          recentActivities: [
            { id: 1, type: 'checkin', patient: 'Ahmad Sutrisno', time: '09:15', room: 'R1' },
            { id: 2, type: 'payment', patient: 'Siti Nurhaliza', amount: 750000, time: '09:00' },
            { id: 3, type: 'appointment', patient: 'Budi Santoso', doctor: 'Dr. Sarah', time: '10:00' }
          ],
          upcomingAppointments: [
            { id: 1, patient: 'Maria Santos', doctor: 'Dr. Ahmad', time: '10:30', type: 'Konsultasi' },
            { id: 2, patient: 'John Doe', doctor: 'Dr. Sarah', time: '11:00', type: 'Scaling' },
            { id: 3, patient: 'Lisa Wong', doctor: 'Dr. Budi', time: '11:30', type: 'Filling' }
          ]
        }));
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const quickActions = [
    {
      id: 'new-appointment',
      label: t('clinic.dashboard.newAppointment') || '+ Janji Temu',
      icon: 'CalendarPlus',
      color: 'bg-blue-500',
      onClick: () => navigate('/clinic-portal/schedule')
    },
    {
      id: 'checkin',
      label: t('clinic.dashboard.checkin') || 'Check-in',
      icon: 'UserCheck',
      color: 'bg-green-500',
      onClick: () => navigate('/clinic-portal/patients')
    },
    {
      id: 'invoice',
      label: t('clinic.dashboard.createInvoice') || 'Buat Invoice',
      icon: 'FileText',
      color: 'bg-purple-500',
      onClick: () => navigate('/clinic-portal/billing')
    },
    {
      id: 'payment',
      label: t('clinic.dashboard.receivePayment') || 'Terima Pembayaran',
      icon: 'CreditCard',
      color: 'bg-orange-500',
      onClick: () => navigate('/clinic-portal/billing')
    },
    {
      id: 'teleconsult',
      label: t('clinic.dashboard.teleconsult') || 'Telekonsultasi',
      icon: 'Video',
      color: 'bg-pink-500',
      onClick: () => navigate('/clinic-portal/schedule')
    }
  ];

  const summaryCards = [
    {
      title: t('clinic.dashboard.appointmentsToday') || 'Janji Hari Ini',
      value: dashboardData.todayStats.appointments.total,
      subtitle: `${dashboardData.todayStats.appointments.completed} selesai, ${dashboardData.todayStats.appointments.pending} menunggu`,
      icon: 'Calendar',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      change: '+12%',
      changeType: 'positive'
    },
    {
      title: t('clinic.dashboard.roomOccupancy') || 'Keterisian Ruang',
      value: `${dashboardData.todayStats.rooms.occupied}/${dashboardData.todayStats.rooms.total}`,
      subtitle: `${dashboardData.todayStats.rooms.available} ruang tersedia`,
      icon: 'Building',
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      change: '62.5%',
      changeType: 'neutral'
    },
    {
      title: t('clinic.dashboard.noShow') || 'No-Show',
      value: dashboardData.todayStats.noShow,
      subtitle: 'Pasien tidak hadir',
      icon: 'UserX',
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      change: '-5%',
      changeType: 'positive'
    },
    {
      title: t('clinic.dashboard.dailyRevenue') || 'Pendapatan Hari Ini',
      value: formatCurrency(dashboardData.todayStats.revenue),
      subtitle: 'Target: Rp 20.000.000',
      icon: 'TrendingUp',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      change: '+8%',
      changeType: 'positive'
    },
    {
      title: t('clinic.dashboard.stockAlerts') || 'Alert Stok',
      value: dashboardData.todayStats.stockAlerts,
      subtitle: 'Item perlu restok',
      icon: 'AlertTriangle',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      change: '',
      changeType: 'warning'
    },
    {
      title: t('clinic.dashboard.teamTasks') || 'Tugas Tim',
      value: dashboardData.todayStats.teamTasks,
      subtitle: '8 selesai, 4 pending',
      icon: 'Users',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
      change: '67%',
      changeType: 'neutral'
    }
  ];

  const getChangeIcon = (type) => {
    switch (type) {
      case 'positive': return 'TrendingUp';
      case 'negative': return 'TrendingDown';
      case 'warning': return 'AlertCircle';
      default: return 'Minus';
    }
  };

  const getChangeColor = (type) => {
    switch (type) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      case 'warning': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    const quickActionSkeletons = Array.from({ length: 5 });
    const summarySkeletons = Array.from({ length: 6 });
    const activitySkeletons = Array.from({ length: 3 });
    const upcomingSkeletons = Array.from({ length: 3 });

    return (
      <div className="flex min-h-screen bg-background theme-transition clinic-skeleton">
        <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
          <ClinicSideBar />
        </div>
        <div className="flex-1 min-w-0">
          <div className="p-6 md:p-8 space-y-8">
            <section className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between skeleton-surface rounded-3xl border border-primary/15 p-6">
              <div className="space-y-3">
                <div className="h-3 w-32 rounded bg-accent/10 animate-pulse"></div>
                <div className="h-7 w-64 rounded-lg bg-accent/20 animate-pulse"></div>
                <div className="h-4 w-80 rounded bg-accent/10 animate-pulse"></div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="rounded-2xl border border-primary/15 bg-surface px-4 py-3 min-w-[160px] space-y-2">
                  <div className="h-4 w-44 rounded bg-accent/10 animate-pulse"></div>
                  <div className="h-3 w-24 rounded bg-accent/10 animate-pulse"></div>
                </div>
                <div className="h-10 w-36 rounded-xl bg-accent/10 animate-pulse"></div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="h-5 w-40 rounded bg-accent/10 animate-pulse"></div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {quickActionSkeletons.map((_, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-primary/15 bg-surface-elevated skeleton-surface space-y-3"
                  >
                    <div className="w-12 h-12 rounded-xl bg-accent/10 animate-pulse mx-auto"></div>
                    <div className="h-3 w-24 rounded bg-accent/10 animate-pulse mx-auto"></div>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <div className="h-5 w-48 rounded bg-accent/10 animate-pulse"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {summarySkeletons.map((_, idx) => (
                  <div
                    key={idx}
                    className="p-6 rounded-2xl border border-primary/15 bg-surface-elevated skeleton-surface space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-accent/10 animate-pulse"></div>
                      <div className="w-16 h-4 rounded bg-accent/10 animate-pulse"></div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-6 w-32 rounded bg-accent/10 animate-pulse"></div>
                      <div className="h-4 w-40 rounded bg-accent/10 animate-pulse"></div>
                      <div className="h-3 w-48 rounded bg-accent/10 animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-surface-elevated rounded-2xl border border-primary/15 p-6 skeleton-surface space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-5 w-48 rounded bg-accent/10 animate-pulse"></div>
                  <div className="h-4 w-20 rounded bg-accent/10 animate-pulse"></div>
                </div>
                <div className="space-y-3">
                  {activitySkeletons.map((_, idx) => (
                    <div key={idx} className="flex items-center space-x-3 p-3 rounded-xl border border-primary/10 bg-surface animate-pulse">
                      <div className="w-10 h-10 rounded-xl bg-accent/10"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-44 rounded bg-accent/10"></div>
                        <div className="h-3 w-24 rounded bg-accent/10"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-surface-elevated rounded-2xl border border-primary/15 p-6 skeleton-surface space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-5 w-56 rounded bg-accent/10 animate-pulse"></div>
                  <div className="h-4 w-20 rounded bg-accent/10 animate-pulse"></div>
                </div>
                <div className="space-y-3">
                  {upcomingSkeletons.map((_, idx) => (
                    <div key={idx} className="flex items-center space-x-3 p-3 rounded-xl border border-primary/10 bg-surface animate-pulse">
                      <div className="w-10 h-10 rounded-xl bg-accent/10"></div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="h-3 w-32 rounded bg-accent/10"></div>
                          <div className="h-3 w-16 rounded bg-accent/10"></div>
                        </div>
                        <div className="h-3 w-40 rounded bg-accent/10"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background theme-transition">
      <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
        <ClinicSideBar />
      </div>

      <div className="flex-1 min-w-0">
        <div className="p-6 md:p-8 space-y-8">
          <section className="clinic-page-header flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                {t('clinic.dashboard.badge') || 'Clinic Overview'}
              </p>
              <h1 className="text-3xl font-bold text-primary">
                {t('clinic.dashboard.title') || 'Dashboard Klinik'}
              </h1>
              <p className="text-sm text-secondary max-w-xl">
                {t('clinic.dashboard.subtitle') || 'Ringkasan aktivitas dan performa klinik hari ini'}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="rounded-2xl border border-border/40 bg-surface px-4 py-3 text-right min-w-[160px]">
                <p className="text-sm font-medium text-primary">
                  {new Date().toLocaleDateString('id-ID', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                <p className="text-xs text-secondary">
                  {new Date().toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-primary">
              {t('clinic.dashboard.quickActions') || 'Quick Actions'}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={action.onClick}
                  className="p-4 rounded-2xl bg-surface-elevated border border-border/40 hover:border-accent/50 hover:shadow-lg transition-all duration-300 group"
                >
                  <div className={`w-12 h-12 rounded-xl ${action.color} flex items-center justify-center mb-3 mx-auto group-hover:scale-110 transition-transform duration-200`}>
                    <Icon name={action.icon} size={24} className="text-white" />
                  </div>
                  <p className="text-sm font-medium text-primary text-center">
                    {action.label}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-primary">
              {t('clinic.dashboard.todaySummary') || 'Ringkasan Hari Ini'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {summaryCards.map((card, index) => (
                <div
                  key={index}
                  className="p-6 rounded-2xl bg-surface-elevated border border-border/40 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl ${card.bgColor}`}>
                      <Icon name={card.icon} size={24} className={card.color} />
                    </div>
                    {card.change && (
                      <div className={`flex items-center space-x-1 ${getChangeColor(card.changeType)}`}>
                        <Icon name={getChangeIcon(card.changeType)} size={16} />
                        <span className="text-sm font-medium">{card.change}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary mb-1">{card.value}</p>
                    <p className="text-sm font-medium text-primary mb-2">{card.title}</p>
                    <p className="text-xs text-secondary">{card.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-surface-elevated rounded-2xl border border-border/40 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-primary">
                  {t('clinic.dashboard.recentActivities') || 'Aktivitas Terbaru'}
                </h3>
                <button className="text-accent hover:text-accent-hover text-sm font-medium">
                  {t('common.viewAll') || 'Lihat Semua'}
                </button>
              </div>
              <div className="space-y-4">
                {dashboardData.recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-3 p-3 rounded-xl hover:bg-surface transition-colors duration-200">
                    <div className="p-2 rounded-lg bg-accent/10">
                      <Icon
                        name={
                          activity.type === 'checkin' ? 'UserCheck'
                            : activity.type === 'payment' ? 'CreditCard'
                            : 'Calendar'
                        }
                        size={16}
                        className="text-accent"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-primary">
                        {activity.patient}
                        {activity.type === 'checkin' && ` check-in di ${activity.room}`}
                        {activity.type === 'payment' && ` pembayaran ${formatCurrency(activity.amount)}`}
                        {activity.type === 'appointment' && ` janji dengan ${activity.doctor}`}
                      </p>
                      <p className="text-xs text-secondary">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-surface-elevated rounded-2xl border border-border/40 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-primary">
                  {t('clinic.dashboard.upcomingAppointments') || 'Janji Mendatang'}
                </h3>
                <button className="text-accent hover:text-accent-hover text-sm font-medium">
                  {t('common.viewSchedule') || 'Lihat Jadwal'}
                </button>
              </div>
              <div className="space-y-4">
                {dashboardData.upcomingAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex items-center space-x-3 p-3 rounded-xl hover:bg-surface transition-colors duration-200">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <Icon name="Clock" size={16} className="text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-primary">
                          {appointment.patient}
                        </p>
                        <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded-full">
                          {appointment.type}
                        </span>
                      </div>
                      <p className="text-xs text-secondary">
                        {appointment.time} • {appointment.doctor}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ClinicDashboard;
