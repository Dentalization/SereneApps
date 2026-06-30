import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../contexts/LanguageContext';
import AdminSideBar from '../ui/sidebar-admin';
import AppIcon from '../../../components/AppIcon';
import { ADMIN_TAB_PATHS, adminTabFromPath, invertPathMap } from '../ui/adminAccess';
import { AdminEmptyState } from '../ui/AdminPagePrimitives';

const SupportHelpdesk = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const MIN_LOADING_MS = 900;
  const [loading, setLoading] = useState(true);
  const activeTab = adminTabFromPath(location.pathname, 'tickets', invertPathMap(ADMIN_TAB_PATHS.support));

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), MIN_LOADING_MS);
    return () => clearTimeout(timer);
  }, []);
  const handleTabChange = (tabId) => navigate(ADMIN_TAB_PATHS.support[tabId] || ADMIN_TAB_PATHS.support.tickets);

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
          <section className="admin-page-header space-y-6 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-3xl p-8 border border-teal-100 dark:border-teal-800/30">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                  {t('admin.supportHelpdesk.badge') || 'Support & Helpdesk'}
                </p>
                <h1 className="text-2xl font-bold text-primary">
                  {t('admin.nav.supportHelpdesk') || 'Support & Helpdesk'}
                </h1>
                <p className="text-sm text-secondary max-w-2xl">
                  {t('admin.supportHelpdesk.subtitle') || 'Customer support management, ticketing system, and knowledge base administration'}
                </p>
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3">
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-700 dark:text-amber-300">
                  Demo/Fallback metrics — helpdesk backend source belum tersedia
                </div>
                <div className="flex gap-2">
                  <button disabled title="Pembuatan tiket admin belum tersedia" className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-accent/60 px-4 py-2 text-sm font-medium text-white opacity-70 shadow-sm">
                    <AppIcon name="Plus" size={16} />
                    <span>{t('admin.supportHelpdesk.newTicket')}</span>
                  </button>
                  <button onClick={() => handleTabChange('knowledgeBase')} className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700">
                    <AppIcon name="BookOpen" size={16} />
                    <span>{t('admin.supportHelpdesk.knowledgeBase')}</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="border-t border-border/40 pt-4">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleTabChange('tickets')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'tickets'
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-secondary hover:text-primary hover:bg-surface'
                    }`}
                >
                  <AppIcon name="HeadphonesIcon" size={16} />
                  <span>{t('admin.supportHelpdesk.tabs.tickets')}</span>
                </button>
                <button
                  onClick={() => handleTabChange('liveChat')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'liveChat'
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-secondary hover:text-primary hover:bg-surface'
                    }`}
                >
                  <AppIcon name="MessageCircle" size={16} />
                  <span>{t('admin.supportHelpdesk.tabs.liveChat')}</span>
                </button>
                <button
                  onClick={() => handleTabChange('knowledgeBase')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'knowledgeBase'
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-secondary hover:text-primary hover:bg-surface'
                    }`}
                >
                  <AppIcon name="BookOpen" size={16} />
                  <span>{t('admin.supportHelpdesk.tabs.knowledgeBase')}</span>
                </button>
              </div>
            </div>
          </section>
        </div>

        <div className="flex-1 overflow-y-auto px-6 md:px-8 pt-4 pb-6 md:pb-8 bg-background theme-transition">
          {activeTab === 'tickets' && (
            <AdminEmptyState
              icon="HeadphonesIcon"
              title="Helpdesk tickets belum tersedia"
              description="Backend helpdesk belum mengirim daftar ticket, volume, dan performa team. Tidak ada ticket dummy yang ditampilkan sebagai data produksi."
            />
          )}

          {activeTab === 'liveChat' && (
            <AdminEmptyState
              icon="MessageCircle"
              title="Live chat backend belum tersedia"
              description="Percakapan live chat tidak ditampilkan sampai sumber data support realtime tersedia."
            />
          )}

          {activeTab === 'knowledgeBase' && (
            <AdminEmptyState
              icon="BookOpen"
              title="Knowledge base backend belum tersedia"
              description="Artikel dan kategori knowledge base belum dimuat dari backend. Tab ini aktif untuk navigasi, refresh, dan back-forward tanpa data dummy."
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SupportHelpdesk;
