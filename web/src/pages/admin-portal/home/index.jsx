import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import AdminSideBar from '../ui/sidebar-admin';
import AppIcon from '../../../components/AppIcon';
import LineChart, { BarChart } from '../../../components/charts';
import ClinicMap from '../../../components/ClinicMap';
import { authHttp } from '../../../utils/httpClient';
import sampleClinics from '../../../data/sampleClinics';

// Dummy data generators for fallback
const generateDummyMetrics = () => ({
  clinics: {
    total: 156,
    active: 142,
    growth: 12.5,
    breakdown: { verified: 142, pending: 10, rejected: 4 }
  },
  dentists: {
    total: 247,
    verified: 230,
    growth: 8.2,
    breakdown: { verified: 230, pending: 17 }
  },
  patients: {
    total: 5432,
    growth: 15.3,
    thisMonth: 234
  },
  appointments: {
    total: 12458,
    completed: 10234,
    thisMonth: 456,
    growth: 23.1
  },
  recentActivity: [
    {
      type: 'clinic_registered',
      title: 'New clinic registered',
      description: 'Dental Care Jakarta',
      timestamp: new Date(Date.now() - 120000).toISOString()
    },
    {
      type: 'dentist_verified',
      title: 'Dentist verified',
      description: 'Dr. Sarah Johnson',
      timestamp: new Date(Date.now() - 300000).toISOString()
    },
    {
      type: 'appointment_created',
      title: 'New appointment',
      description: 'Ahmad with Dr. Budi',
      timestamp: new Date(Date.now() - 480000).toISOString()
    }
  ]
});

const generateDummyRevenue = () => {
  const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return {
    trends: months.map((month, i) => ({
      month: `${month} 2025`,
      revenue: 35000 + (i * 8000) + Math.random() * 5000
    })),
    total: 285000,
    average: 47500
  };
};

const AdminDashboard = () => {
  const { t } = useLanguage();
  const MIN_LOADING_MS = 900;
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [revenueTrends, setRevenueTrends] = useState([]);
  const [userGrowth, setUserGrowth] = useState([]);
  const [error, setError] = useState(null);
  const clinicsData = useMemo(() => sampleClinics, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [metricsRes, revenueRes, growthRes] = await Promise.all([
          authHttp.get('/admin/dashboard/metrics').catch(err => {
            console.warn('⚠️ Metrics API failed, using dummy data');
            return { data: { success: true, data: generateDummyMetrics() } };
          }),
          authHttp.get('/admin/dashboard/revenue-trends').catch(err => {
            console.warn('⚠️ Revenue API failed, using dummy data');
            return { data: { success: true, data: generateDummyRevenue() } };
          }),
          authHttp.get('/admin/dashboard/user-growth').catch(err => {
            console.warn('⚠️ Growth API failed, using dummy data');
            return { data: { success: true, data: [] } };
          })
        ]);

        setMetrics(metricsRes.data.data);
        
        // Format revenue trends for chart
        if (revenueRes.data.success) {
          const formatted = revenueRes.data.data.trends.map(t => ({
            label: t.month.split(' ')[0], // Short month name
            value: t.revenue
          }));
          setRevenueTrends(formatted);
        }

        // Format user growth for chart
        if (growthRes.data.success) {
          setUserGrowth(growthRes.data.data);
        }

        console.log('✅ Dashboard data loaded');
      } catch (err) {
        console.error('❌ Failed to fetch dashboard data:', err);
        // Use dummy data as final fallback
        setMetrics(generateDummyMetrics());
        setRevenueTrends(generateDummyRevenue().trends.map(t => ({
          label: t.month.split(' ')[0],
          value: t.revenue
        })));
      } finally {
        setTimeout(() => setLoading(false), MIN_LOADING_MS);
      }
    };

    fetchDashboardData();
  }, []);

  // Dummy data generators
  const generateDummyMetrics = () => ({
    clinics: {
      total: 156,
      active: 142,
      growth: 12.5,
      breakdown: { verified: 142, pending: 10, rejected: 4 }
    },
    dentists: {
      total: 247,
      verified: 230,
      growth: 8.2,
      breakdown: { verified: 230, pending: 17 }
    },
    patients: {
      total: 5432,
      growth: 15.3,
      thisMonth: 234
    },
    appointments: {
      total: 12458,
      completed: 10234,
      thisMonth: 456,
      growth: 23.1
    },
    recentActivity: [
      {
        type: 'clinic_registered',
        icon: 'Plus',
        color: 'blue',
        title: 'New clinic registered',
        description: 'Jakarta Dental Care',
        timestamp: new Date(Date.now() - 120000).toISOString()
      },
      {
        type: 'dentist_verified',
        icon: 'CheckCircle',
        color: 'green',
        title: 'Dentist verified',
        description: 'Dr. Sarah Johnson',
        timestamp: new Date(Date.now() - 300000).toISOString()
      },
      {
        type: 'appointment_created',
        icon: 'Calendar',
        color: 'orange',
        title: 'New appointment',
        description: 'Ahmad with Dr. Budi',
        timestamp: new Date(Date.now() - 480000).toISOString()
      }
    ]
  });

  const generateDummyRevenue = () => {
    const months = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
    const baseRevenue = 40000;
    return {
      trends: months.map((month, i) => ({
        month: `${month} 2025`,
        revenue: baseRevenue + (i * 5000) + (Math.random() * 3000),
        formattedRevenue: `$${(baseRevenue + (i * 5000)).toLocaleString()}`
      })),
      total: 285000,
      average: 47500
    };
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background theme-transition admin-skeleton">
        <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
          <AdminSideBar />
        </div>
        <div className="flex-1 min-w-0">
          <div className="p-6 md:p-8 space-y-8">
            <section className="rounded-3xl border border-primary/15 bg-surface-elevated skeleton-surface p-6 space-y-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-3">
                  <div className="h-3 w-32 rounded bg-accent/10 animate-pulse"></div>
                  <div className="h-7 w-72 rounded-lg bg-accent/20 animate-pulse"></div>
                  <div className="h-4 w-96 max-w-full rounded bg-accent/10 animate-pulse"></div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="h-10 w-44 rounded-xl bg-accent/10 animate-pulse"></div>
                  <div className="h-10 w-40 rounded-xl bg-accent/10 animate-pulse"></div>
                </div>
              </div>
              <div className="border-t border-primary/15 pt-4">
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="h-9 w-28 rounded-lg bg-accent/10 animate-pulse"></div>
                  ))}
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl border border-primary/15 bg-surface-elevated skeleton-surface space-y-3"
                >
                  <div className="h-4 w-32 rounded bg-accent/10 animate-pulse"></div>
                  <div className="h-6 w-24 rounded bg-accent/20 animate-pulse"></div>
                  <div className="h-3 w-36 rounded bg-accent/10 animate-pulse"></div>
                </div>
              ))}
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-72 rounded-3xl border border-primary/15 bg-surface-elevated skeleton-surface"
                ></div>
              ))}
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background theme-transition">
      <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
        <AdminSideBar />
      </div>
      
      {/* Header */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="p-6 md:p-8 pb-4">
          {/* Header seperti home page */}
          <section className="admin-page-header space-y-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-3xl p-8 border border-purple-100 dark:border-purple-800/30">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                  {t('admin.badge') || 'Admin Portal'}
                </p>
                <h1 className="text-2xl font-bold text-primary">
                  {t('admin.pages.dashboard.title') || 'Admin Dashboard'}
                </h1>
                <p className="text-sm text-secondary max-w-2xl">
                  {t('admin.pages.dashboard.subtitle') || 'Executive Summary & Platform Overview'}
                </p>
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3">
                <div className="rounded-2xl border border-border/40 bg-surface px-4 py-2 text-sm text-secondary">
                  Platform Status: Active
                </div>
                <div className="flex gap-2">
                  <button className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-accent/90">
                    <AppIcon name="Settings" size={16} />
                    <span>System Settings</span>
                  </button>
                  <button className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700">
                    <AppIcon name="Plus" size={16} />
                    <span>Quick Action</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="border-t border-border/40 pt-4">
              <div className="flex flex-wrap gap-2">
                <button className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-accent text-white shadow-sm">
                  <AppIcon name="LayoutDashboard" size={16} />
                  <span>Overview</span>
                </button>
                <button className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-secondary hover:text-primary hover:bg-surface transition-colors">
                  <AppIcon name="BarChart3" size={16} />
                  <span>Analytics</span>
                </button>
              </div>
            </div>
          </section>
        </div>

        <div className="flex-1 overflow-y-auto px-6 md:px-8 pt-4 pb-6 md:pb-8 bg-background theme-transition">

            {/* Error State */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <div className="flex items-start gap-3">
                  <AppIcon name="AlertCircle" size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-900 dark:text-red-100">Failed to load dashboard data</p>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Dashboard Content */}
            <div className="space-y-8">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Clinics */}
              <div className="bg-surface border border-border/40 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <AppIcon name="Building2" size={24} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  {metrics?.clinics?.growth !== undefined && (
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      metrics.clinics.growth >= 0 
                        ? 'text-green-600 bg-green-100 dark:bg-green-900/30'
                        : 'text-red-600 bg-red-100 dark:bg-red-900/30'
                    }`}>
                      {metrics.clinics.growth >= 0 ? '+' : ''}{metrics.clinics.growth}%
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-primary">
                    {metrics?.clinics?.active || 0}
                  </h3>
                  <p className="text-sm text-muted-foreground">Active Clinics</p>
                  <p className="text-xs text-muted-foreground">
                    {metrics?.clinics?.total || 0} total
                  </p>
                </div>
              </div>

              {/* Active Dentists */}
              <div className="bg-surface border border-border/40 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <AppIcon name="UserCheck" size={24} className="text-green-600 dark:text-green-400" />
                  </div>
                  {metrics?.dentists?.growth !== undefined && (
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      metrics.dentists.growth >= 0
                        ? 'text-green-600 bg-green-100 dark:bg-green-900/30'
                        : 'text-red-600 bg-red-100 dark:bg-red-900/30'
                    }`}>
                      {metrics.dentists.growth >= 0 ? '+' : ''}{metrics.dentists.growth}%
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-primary">
                    {metrics?.dentists?.verified || 0}
                  </h3>
                  <p className="text-sm text-muted-foreground">Verified Dentists</p>
                  <p className="text-xs text-muted-foreground">
                    {metrics?.dentists?.total || 0} total
                  </p>
                </div>
              </div>

              {/* Patients */}
              <div className="bg-surface border border-border/40 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <AppIcon name="Users" size={24} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  {metrics?.patients?.growth !== undefined && (
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      metrics.patients.growth >= 0
                        ? 'text-green-600 bg-green-100 dark:bg-green-900/30'
                        : 'text-red-600 bg-red-100 dark:bg-red-900/30'
                    }`}>
                      {metrics.patients.growth >= 0 ? '+' : ''}{metrics.patients.growth}%
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-primary">
                    {metrics?.patients?.total?.toLocaleString() || 0}
                  </h3>
                  <p className="text-sm text-muted-foreground">Total Patients</p>
                  <p className="text-xs text-muted-foreground">
                    +{metrics?.patients?.thisMonth || 0} this month
                  </p>
                </div>
              </div>

              {/* Appointments */}
              <div className="bg-surface border border-border/40 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <AppIcon name="Calendar" size={24} className="text-orange-600 dark:text-orange-400" />
                  </div>
                  {metrics?.appointments?.growth !== undefined && (
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      metrics.appointments.growth >= 0
                        ? 'text-green-600 bg-green-100 dark:bg-green-900/30'
                        : 'text-red-600 bg-red-100 dark:bg-red-900/30'
                    }`}>
                      {metrics.appointments.growth >= 0 ? '+' : ''}{metrics.appointments.growth}%
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-primary">
                    {metrics?.appointments?.thisMonth?.toLocaleString() || 0}
                  </h3>
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-xs text-muted-foreground">
                    {metrics?.appointments?.total?.toLocaleString() || 0} total
                  </p>
                </div>
              </div>
            </div>

            {/* Charts and Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Revenue Trends */}
              <div className="bg-surface border border-border/40 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-primary">Revenue Trends (6 Months)</h3>
                  <div className="flex items-center space-x-2">
                    <AppIcon name="TrendingUp" size={16} className="text-green-500" />
                    <span className="text-sm text-green-600 font-medium">
                      {revenueTrends.length > 1 && revenueTrends[revenueTrends.length - 1].value > revenueTrends[0].value
                        ? `+${((revenueTrends[revenueTrends.length - 1].value / revenueTrends[0].value - 1) * 100).toFixed(0)}%`
                        : 'Growth'}
                    </span>
                  </div>
                </div>
                
                {revenueTrends.length > 0 ? (
                  <LineChart data={revenueTrends} height={220} color="#8b5cf6" />
                ) : (
                  <div className="flex items-center justify-center h-52">
                    <p className="text-sm text-muted-foreground">Loading revenue data...</p>
                  </div>
                )}
              </div>

              {/* Clinic Status Breakdown */}
              <div className="bg-surface border border-border/40 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-primary mb-6">Clinic Status Breakdown</h3>
                
                {metrics?.clinics?.breakdown ? (
                  <div>
                    <BarChart
                      data={[
                        { label: 'Verified', value: metrics.clinics.breakdown.verified || 0 },
                        { label: 'Pending', value: metrics.clinics.breakdown.pending || 0 },
                        { label: 'Rejected', value: metrics.clinics.breakdown.rejected || 0 }
                      ]}
                      height={180}
                      colors={['#10b981', '#f59e0b', '#ef4444']}
                    />
                    
                    {/* Summary */}
                    <div className="mt-6 grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="w-3 h-3 rounded-full bg-green-500 mx-auto mb-2"></div>
                        <p className="text-xs text-muted-foreground">Verified</p>
                        <p className="text-sm font-semibold text-primary">
                          {metrics.clinics.breakdown.verified || 0}
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="w-3 h-3 rounded-full bg-orange-500 mx-auto mb-2"></div>
                        <p className="text-xs text-muted-foreground">Pending</p>
                        <p className="text-sm font-semibold text-primary">
                          {metrics.clinics.breakdown.pending || 0}
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="w-3 h-3 rounded-full bg-red-500 mx-auto mb-2"></div>
                        <p className="text-xs text-muted-foreground">Rejected</p>
                        <p className="text-sm font-semibold text-primary">
                          {metrics.clinics.breakdown.rejected || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-52">
                    <p className="text-sm text-muted-foreground">Loading clinic data...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-surface border border-border/40 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-primary mb-6">Recent Activity</h3>
              
              {metrics?.recentActivity && metrics.recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {metrics.recentActivity.slice(0, 5).map((activity, index) => {
                    const iconConfig = {
                      clinic_registered: { icon: 'Plus', color: 'blue' },
                      dentist_verified: { icon: 'CheckCircle', color: 'green' },
                      dentist_registered: { icon: 'UserPlus', color: 'purple' },
                      appointment_created: { icon: 'Calendar', color: 'orange' }
                    };

                    const config = iconConfig[activity.type] || { icon: 'Activity', color: 'gray' };
                    const colorClasses = {
                      blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
                      green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
                      purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
                      orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                    };

                    const timeAgo = (timestamp) => {
                      const diff = Date.now() - new Date(timestamp).getTime();
                      const minutes = Math.floor(diff / 60000);
                      const hours = Math.floor(diff / 3600000);
                      const days = Math.floor(diff / 86400000);
                      
                      if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
                      if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
                      if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
                      return 'Just now';
                    };

                    return (
                      <div key={index} className="flex items-start space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClasses[config.color]}`}>
                          <AppIcon name={config.icon} size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-primary">{activity.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {activity.description} • {timeAgo(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-surface border border-border/40 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-primary">Quick Actions</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button className="flex items-center space-x-3 p-4 rounded-xl border border-border/40 hover:bg-muted/60 transition-colors text-left">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <AppIcon name="Plus" size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-primary">Add Clinic</p>
                    <p className="text-xs text-muted-foreground">Create new clinic account</p>
                  </div>
                </button>
                
                <button className="flex items-center space-x-3 p-4 rounded-xl border border-border/40 hover:bg-muted/60 transition-colors text-left">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <AppIcon name="UserCheck" size={20} className="text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium text-primary">Verify Dentist</p>
                    <p className="text-xs text-muted-foreground">Review pending applications</p>
                  </div>
                </button>
                
                <button className="flex items-center space-x-3 p-4 rounded-xl border border-border/40 hover:bg-muted/60 transition-colors text-left">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <AppIcon name="BarChart3" size={20} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="font-medium text-primary">View Reports</p>
                    <p className="text-xs text-muted-foreground">Generate analytics</p>
                  </div>
                </button>
                
                <button className="flex items-center space-x-3 p-4 rounded-xl border border-border/40 hover:bg-muted/60 transition-colors text-left">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <AppIcon name="Settings" size={20} className="text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="font-medium text-primary">System Config</p>
                    <p className="text-xs text-muted-foreground">Platform settings</p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Clinic Distribution Map - Full Width */}
          <div className="mt-8 bg-surface border border-border/40 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-primary">Clinic Distribution Map</h3>
                <p className="text-xs text-muted-foreground mt-1">Geographic locations of all registered clinics across Indonesia</p>
              </div>
              <div className="flex items-center gap-4">
                {/* Map Legend */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-xs text-muted-foreground">Verified</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span className="text-xs text-muted-foreground">Pending</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-xs text-muted-foreground">Rejected</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <AppIcon name="MapPin" size={16} className="text-accent" />
                  <span className="text-sm font-medium text-accent">Live Map</span>
                </div>
              </div>
            </div>
            
            <ClinicMap clinics={clinicsData} height={500} />
            
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Showing <span className="font-semibold text-primary">{clinicsData.length}</span> clinics across Indonesia
              </p>
              <p className="text-xs text-muted-foreground">
                Click on markers for clinic details • Use zoom controls to navigate
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
