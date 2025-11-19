import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import AdminSideBar from '../ui/sidebar-admin';
import AppIcon from '../../../components/AppIcon';

const AdminDashboard = () => {
  const { t } = useLanguage();
  const MIN_LOADING_MS = 900;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), MIN_LOADING_MS);
    return () => clearTimeout(timer);
  }, []);

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
                  <div className="text-xs text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                    +12%
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-primary">156</h3>
                  <p className="text-sm text-muted-foreground">Total Clinics</p>
                </div>
              </div>

              {/* Active Dentists */}
              <div className="bg-surface border border-border/40 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <AppIcon name="UserCheck" size={24} className="text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-xs text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                    +8%
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-primary">247</h3>
                  <p className="text-sm text-muted-foreground">Active Dentists</p>
                </div>
              </div>

              {/* Monthly Revenue */}
              <div className="bg-surface border border-border/40 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <AppIcon name="DollarSign" size={24} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="text-xs text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                    +23%
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-primary">$89.2K</h3>
                  <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                </div>
              </div>

              {/* AI Usage */}
              <div className="bg-surface border border-border/40 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <AppIcon name="Brain" size={24} className="text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="text-xs text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                    +45%
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-primary">12.4K</h3>
                  <p className="text-sm text-muted-foreground">AI Requests/Day</p>
                </div>
              </div>
            </div>

            {/* Charts and Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Platform Health */}
              <div className="bg-surface border border-border/40 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-primary">Platform Health</h3>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-sm text-green-600">Healthy</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Uptime</span>
                    <span className="text-sm font-medium text-primary">99.98%</span>
                  </div>
                  <div className="w-full bg-muted/30 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '99.98%' }}></div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Response Time</span>
                    <span className="text-sm font-medium text-primary">142ms</span>
                  </div>
                  <div className="w-full bg-muted/30 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Error Rate</span>
                    <span className="text-sm font-medium text-primary">0.02%</span>
                  </div>
                  <div className="w-full bg-muted/30 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: '2%' }}></div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-surface border border-border/40 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-primary mb-6">Recent Activity</h3>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <AppIcon name="Plus" size={16} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-primary">New clinic registered</p>
                      <p className="text-xs text-muted-foreground mt-1">Jakarta Dental Care - 2 minutes ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                      <AppIcon name="CheckCircle" size={16} className="text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-primary">Dentist verified</p>
                      <p className="text-xs text-muted-foreground mt-1">Dr. Sarah Johnson - 5 minutes ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                      <AppIcon name="CreditCard" size={16} className="text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-primary">Payment processed</p>
                      <p className="text-xs text-muted-foreground mt-1">$299 from Smile Clinic - 8 minutes ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                      <AppIcon name="AlertTriangle" size={16} className="text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-primary">Support ticket created</p>
                      <p className="text-xs text-muted-foreground mt-1">High priority - API integration issue</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-surface border border-border/40 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-primary mb-6">Quick Actions</h3>
              
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
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
