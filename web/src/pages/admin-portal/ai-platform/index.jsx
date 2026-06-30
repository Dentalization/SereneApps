import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../contexts/LanguageContext';
import AdminSideBar from '../ui/sidebar-admin';
import AppIcon from '../../../components/AppIcon';
import AIOverviewCards from './components/AIOverviewCards';
import AIUsageChart from './components/AIUsageChart';
import ModelPerformance from './components/ModelPerformance';
import RecentActivity from './components/RecentActivity';
import { ADMIN_TAB_PATHS, adminTabFromPath, invertPathMap } from '../ui/adminAccess';
import { AdminEmptyState } from '../ui/AdminPagePrimitives';

const AIPlatform = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const MIN_LOADING_MS = 900;
  const [loading, setLoading] = useState(true);
  const activeTab = adminTabFromPath(location.pathname, 'overview', invertPathMap(ADMIN_TAB_PATHS.ai));

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), MIN_LOADING_MS);
    return () => clearTimeout(timer);
  }, []);
  const handleTabChange = (tabId) => navigate(ADMIN_TAB_PATHS.ai[tabId] || ADMIN_TAB_PATHS.ai.overview);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <>
            <AIOverviewCards />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <AIUsageChart />
              </div>
              <div>
                <RecentActivity />
              </div>
            </div>
            <ModelPerformance />
          </>
        );
      case 'usage':
        // Reuse components or create specific detailed views
        return (
          <div className="space-y-6">
            <AIUsageChart />
            <AIOverviewCards />
          </div>
        );
      case 'models':
        return (
          <ModelPerformance />
        );
      case 'billing':
        return (
          <AdminEmptyState
            icon="Receipt"
            title="AI billing backend belum tersedia"
            description="Route ini sengaja tersedia untuk sidebar dan refresh/back-forward, tetapi belum menampilkan angka produksi sampai backend AI billing mengirim kontrak data yang valid."
          />
        );
      default:
        return null;
    }
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
          {/* Header */}
          <section className="admin-page-header space-y-6 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-3xl p-8 border border-orange-100 dark:border-orange-800/30">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                  {t('admin.aiPlatform.badge') || 'AI Platform'}
                </p>
                <h1 className="text-2xl font-bold text-primary">
                  {t('admin.aiPlatform.title') || 'AI Platform'}
                </h1>
                <p className="text-sm text-secondary max-w-2xl">
                  {t('admin.aiPlatform.subtitle') || 'Monitoring usage, models, and ML operations'}
                </p>
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3">
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-700 dark:text-amber-300">
                  Demo/Fallback metrics — AI admin backend source belum tersedia
                </div>
                <div className="flex gap-2">
                  <button disabled title="Pengaturan AI belum tersedia" className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-accent/60 px-4 py-2 text-sm font-medium text-white opacity-70 shadow-sm">
                    <AppIcon name="Brain" size={16} />
                    <span>{t('admin.aiPlatform.settings')}</span>
                  </button>
                  <button disabled title="Deploy model belum tersedia" className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-orange-600/60 px-4 py-2 text-sm font-medium text-white opacity-70 shadow-sm">
                    <AppIcon name="Zap" size={16} />
                    <span>{t('admin.aiPlatform.deploy')}</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="border-t border-border/40 pt-4">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleTabChange('overview')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'overview'
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-secondary hover:text-primary hover:bg-surface'
                    }`}
                >
                  <AppIcon name="Brain" size={16} />
                  <span>{t('admin.aiPlatform.tabs.overview')}</span>
                </button>
                <button
                  onClick={() => handleTabChange('usage')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'usage'
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-secondary hover:text-primary hover:bg-surface'
                    }`}
                >
                  <AppIcon name="Activity" size={16} />
                  <span>{t('admin.aiPlatform.tabs.usage')}</span>
                </button>
                <button
                  onClick={() => handleTabChange('models')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'models'
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-secondary hover:text-primary hover:bg-surface'
                    }`}
                >
                  <AppIcon name="Settings" size={16} />
                  <span>{t('admin.aiPlatform.tabs.models')}</span>
                </button>
                <button
                  onClick={() => handleTabChange('billing')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'billing'
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-secondary hover:text-primary hover:bg-surface'
                    }`}
                >
                  <AppIcon name="Receipt" size={16} />
                  <span>Billing</span>
                </button>
              </div>
            </div>
          </section>
        </div>

        <div className="flex-1 overflow-y-auto px-6 md:px-8 pt-4 pb-6 md:pb-8 bg-background theme-transition">
          <div className="space-y-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIPlatform;
