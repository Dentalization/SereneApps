import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import AdminSideBar from '../ui/sidebar-admin';
import AppIcon from '../../../components/AppIcon';
import ClinicDirectoryContent from './ClinicDirectoryContent';

const ClinicManagement = () => {
  const { t } = useLanguage();
  const MIN_LOADING_MS = 900;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    verified: 0,
    rejected: 0
  });
  const [activeStatus, setActiveStatus] = useState('all');
  const navigate = useNavigate();

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
          <section className="admin-page-header space-y-6 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-3xl p-8 border border-blue-100 dark:border-blue-800/30">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                  {t('admin.clinicManagement.header.badge')}
                </p>
                <h1 className="text-2xl font-bold text-primary">
                  {t('admin.clinicManagement.header.title')}
                </h1>
                <p className="text-sm text-secondary max-w-2xl">
                  {t('admin.clinicManagement.header.subtitle')}
                </p>
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3">
                <div className="rounded-2xl border border-border/40 bg-surface px-4 py-2 text-sm text-secondary">
                  {t('admin.clinicManagement.header.totalLabel')}: <span className="font-semibold text-primary">{stats.total}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => navigate('/admin/clinic-management/create')} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-accent/90">
                    <AppIcon name="Plus" size={16} />
                    <span>{t('admin.clinicManagement.directory.actions.addClinic')}</span>
                  </button>
                  <button
                    onClick={() => setActiveStatus('pending')}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
                  >
                    <AppIcon name="Building2" size={16} />
                    <span>{t('admin.clinicManagement.header.actions.reviewPending')}</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="border-t border-border/40 pt-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveStatus('all')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeStatus === 'all' ? 'bg-accent text-white shadow-sm' : 'text-secondary hover:text-primary hover:bg-surface'}`}
                >
                  <AppIcon name="Building2" size={16} />
                  <span>{t('admin.clinicManagement.header.statusTabs.all')}</span>
                </button>
                <button
                  onClick={() => setActiveStatus('pending')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeStatus === 'pending' ? 'bg-amber-500 text-white shadow-sm' : 'text-secondary hover:text-primary hover:bg-surface'}`}
                >
                  <AppIcon name="Clock" size={16} />
                  <span>{t('admin.clinicManagement.header.statusTabs.pending')}</span>
                </button>
                <button
                  onClick={() => setActiveStatus('verified')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeStatus === 'verified' ? 'bg-emerald-500 text-white shadow-sm' : 'text-secondary hover:text-primary hover:bg-surface'}`}
                >
                  <AppIcon name="ShieldCheck" size={16} />
                  <span>{t('admin.clinicManagement.header.statusTabs.verified')}</span>
                </button>
                <button
                  onClick={() => setActiveStatus('rejected')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeStatus === 'rejected' ? 'bg-rose-500 text-white shadow-sm' : 'text-secondary hover:text-primary hover:bg-surface'}`}
                >
                  <AppIcon name="CircleX" size={16} />
                  <span>{t('admin.clinicManagement.header.statusTabs.rejected')}</span>
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-border/40 bg-surface p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-secondary">
                    {t('admin.clinicManagement.header.cards.total.title')}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-primary">{stats.total}</p>
                  <p className="text-xs text-secondary mt-1">
                    {t('admin.clinicManagement.header.cards.total.description')}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/40 bg-surface p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-secondary">
                    {t('admin.clinicManagement.header.cards.pending.title')}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-amber-600">{stats.pending}</p>
                  <p className="text-xs text-secondary mt-1">
                    {t('admin.clinicManagement.header.cards.pending.description')}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/40 bg-surface p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-secondary">
                    {t('admin.clinicManagement.header.cards.verified.title')}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-emerald-600">{stats.verified}</p>
                  <p className="text-xs text-secondary mt-1">
                    {t('admin.clinicManagement.header.cards.verified.description')}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/40 bg-surface p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-secondary">
                    {t('admin.clinicManagement.header.cards.rejected.title')}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-rose-600">{stats.rejected}</p>
                  <p className="text-xs text-secondary mt-1">
                    {t('admin.clinicManagement.header.cards.rejected.description')}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="flex-1 overflow-y-auto px-6 md:px-8 pt-4 pb-6 md:pb-8 bg-background theme-transition">
          {/* Directory content (delegated to ClinicDirectoryContent) */}
          <div className="bg-surface border border-border/40 rounded-2xl p-6">
            <ClinicDirectoryContent
              onView={(clinic) => navigate(`/admin/clinic-management/${clinic.id}`, { state: { clinic } })}
              onCreate={() => navigate('/admin/clinic-management/create')}
              activeStatus={activeStatus}
              onStatusChange={setActiveStatus}
              onStatsChange={setStats}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClinicManagement;
