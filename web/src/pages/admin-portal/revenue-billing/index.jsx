import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import AdminSideBar from '../ui/sidebar-admin';
import AppIcon from '../../../components/AppIcon';

const RevenueBilling = () => {
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
          <section className="admin-page-header space-y-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-3xl p-8 border border-green-100 dark:border-green-800/30">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                  {t('admin.revenueBilling.badge') || 'Revenue & Billing'}
                </p>
                <h1 className="text-2xl font-bold text-primary">
                  {t('admin.nav.revenueBilling') || 'Pendapatan & Billing'}
                </h1>
                <p className="text-sm text-secondary max-w-2xl">
                  {t('admin.revenueBilling.subtitle') || 'Analisis keuangan, pemrosesan pembayaran, dan manajemen langganan'}
                </p>
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3">
                <div className="rounded-2xl border border-border/40 bg-surface px-4 py-2 text-sm text-secondary">
                  Monthly Revenue: $125,430
                </div>
                <div className="flex gap-2">
                  <button className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-accent/90">
                    <AppIcon name="BarChart3" size={16} />
                    <span>View Reports</span>
                  </button>
                  <button className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-green-700">
                    <AppIcon name="Download" size={16} />
                    <span>Export</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="border-t border-border/40 pt-4">
              <div className="flex flex-wrap gap-2">
                <button className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-accent text-white shadow-sm">
                  <AppIcon name="DollarSign" size={16} />
                  <span>Revenue</span>
                </button>
                <button className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-secondary hover:text-primary hover:bg-surface transition-colors">
                  <AppIcon name="CreditCard" size={16} />
                  <span>Payments</span>
                </button>
                <button className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-secondary hover:text-primary hover:bg-surface transition-colors">
                  <AppIcon name="FileText" size={16} />
                  <span>Invoices</span>
                </button>
              </div>
            </div>
          </section>
        </div>

        <div className="flex-1 overflow-y-auto px-6 md:px-8 pt-4 pb-6 md:pb-8 bg-background theme-transition">
          {/* Content Placeholder */}
          <div className="bg-surface border border-border/40 rounded-2xl p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center">
              <AppIcon name="DollarSign" size={40} className="text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-primary mb-4">Revenue & Billing</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-8">
              Comprehensive financial management with payment processing, subscription tracking, and revenue analytics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenueBilling;
