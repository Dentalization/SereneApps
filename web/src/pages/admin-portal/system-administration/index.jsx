import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../contexts/LanguageContext';
import AdminSideBar from '../ui/sidebar-admin';
import AppIcon from '../../../components/AppIcon';
import SystemHealth from './components/SystemHealth';
import UserManagement from './components/UserManagement';
import AuditLogs from './components/AuditLogs';
import IntegrationSettings from './components/IntegrationSettings';
import { ADMIN_TAB_PATHS, adminTabFromPath, invertPathMap } from '../ui/adminAccess';
import { AdminEmptyState } from '../ui/AdminPagePrimitives';

const SystemAdministration = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const MIN_LOADING_MS = 900;
  const [loading, setLoading] = useState(true);
  const activeTab = adminTabFromPath(location.pathname, 'health', invertPathMap(ADMIN_TAB_PATHS.system));

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), MIN_LOADING_MS);
    return () => clearTimeout(timer);
  }, []);
  const handleTabChange = (tabId) => navigate(ADMIN_TAB_PATHS.system[tabId] || ADMIN_TAB_PATHS.system.health);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background theme-transition admin-skeleton">
        <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
          <AdminSideBar />
        </div>
        <div className="flex-1 min-w-0">
          <div className="p-6 md:p-8 space-y-8">
            <section className="rounded-3xl border border-primary/15 bg-surface-elevated skeleton-surface p-6 space-y-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
          <section className="admin-page-header space-y-6 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 rounded-3xl p-8 border border-gray-100 dark:border-gray-800/30">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                  {t('admin.systemAdmin.badge') || 'System Administration'}
                </p>
                <h1 className="text-2xl font-bold text-primary">
                  {t('admin.systemAdmin.title') || 'System Administration'}
                </h1>
                <p className="text-sm text-secondary max-w-2xl">
                  {t('admin.systemAdmin.subtitle') || 'Configuration, user management, and monitoring'}
                </p>
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3">
                <div className="rounded-2xl border border-border/40 bg-surface px-4 py-2 text-sm text-secondary">
                  {t('admin.systemAdmin.systemHealth') || 'System Health: Optimal'}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleTabChange('integrations')} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-accent/90">
                    <AppIcon name="Settings2" size={16} />
                    <span>{t('admin.systemAdmin.systemConfig')}</span>
                  </button>
                  <button onClick={() => handleTabChange('audit')} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-700">
                    <AppIcon name="Shield" size={16} />
                    <span>{t('admin.systemAdmin.security')}</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="border-t border-border/40 pt-4">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleTabChange('health')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'health'
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-secondary hover:text-primary hover:bg-surface'
                    }`}
                >
                  <AppIcon name="Activity" size={16} />
                  <span>{t('admin.systemAdmin.tabs.health')}</span>
                </button>
                <button
                  onClick={() => handleTabChange('users')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'users'
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-secondary hover:text-primary hover:bg-surface'
                    }`}
                >
                  <AppIcon name="Users" size={16} />
                  <span>{t('admin.systemAdmin.tabs.users')}</span>
                </button>
                <button
                  onClick={() => handleTabChange('audit')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'audit'
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-secondary hover:text-primary hover:bg-surface'
                    }`}
                >
                  <AppIcon name="FileText" size={16} />
                  <span>{t('admin.systemAdmin.tabs.audit')}</span>
                </button>
                <button
                  onClick={() => handleTabChange('integrations')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'integrations'
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-secondary hover:text-primary hover:bg-surface'
                    }`}
                >
                  <AppIcon name="Plug" size={16} />
                  <span>{t('admin.systemAdmin.tabs.integrations')}</span>
                </button>
                <button
                  onClick={() => handleTabChange('monitoring')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'monitoring'
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-secondary hover:text-primary hover:bg-surface'
                    }`}
                >
                  <AppIcon name="Monitor" size={16} />
                  <span>Monitoring</span>
                </button>
              </div>
            </div>
          </section>
        </div>

        <div className="flex-1 overflow-y-auto px-6 md:px-8 pt-4 pb-6 md:pb-8 bg-background theme-transition">
          {activeTab === 'health' && <SystemHealth />}
          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'audit' && <AuditLogs />}
          {activeTab === 'integrations' && <IntegrationSettings />}
          {activeTab === 'monitoring' && (
            <AdminEmptyState
              icon="Monitor"
              title="System monitoring backend belum tersedia"
              description="Subroute monitoring sudah valid dan dapat direfresh, tetapi metrik produksi belum ditampilkan sampai endpoint observability admin tersedia."
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemAdministration;
