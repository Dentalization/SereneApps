import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import AdminSideBar from '../ui/sidebar-admin';
import AppIcon from '../../../components/AppIcon';
import RevenueOverviewCards from './components/RevenueOverviewCards';
import RevenueChart from './components/RevenueChart';
import TransactionRecent from './components/TransactionRecent';
import SubscriptionDistribution from './components/SubscriptionDistribution';
import InvoicesList from './components/InvoicesList';
import BillingSettings from './components/BillingSettings';

const RevenueBilling = () => {
  const { t } = useLanguage();
  const MIN_LOADING_MS = 900;
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Dummy stats data (Updated to IDR)
  const [stats, setStats] = useState({
    totalRevenue: 'Rp 18.679.500.000',
    mrr: 'Rp 1.267.500.000',
    activeSubscriptions: '856',
    pendingInvoices: '14'
  });

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), MIN_LOADING_MS);
    return () => clearTimeout(timer);
  }, []);

  // --- Render Tab Content ---
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <>
            {/* Overview Cards */}
            <RevenueOverviewCards stats={stats} />

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <RevenueChart />
              </div>
              <div>
                <SubscriptionDistribution />
              </div>
            </div>

            {/* Recent Transactions */}
            <TransactionRecent />
          </>
        );
      case 'transactions':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-primary">All Transactions</h2>
            <TransactionRecent />
            {/* Can add more detailed transaction table or filters here */}
          </div>
        );
      case 'invoices':
        return (
          <div className="space-y-6">
            <InvoicesList />
          </div>
        );
      case 'settings':
        return (
          <div className="space-y-6">
            <BillingSettings />
          </div>
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
          <section className="admin-page-header space-y-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-3xl p-8 border border-green-100 dark:border-green-800/30">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                  {t('admin.revenueBilling.badge') || 'Financial Overview'}
                </p>
                <h1 className="text-2xl font-bold text-primary">
                  {t('admin.nav.revenueBilling') || 'Revenue & Billing'}
                </h1>
                <p className="text-sm text-secondary max-w-2xl">
                  {t('admin.revenueBilling.subtitle') || 'Comprehensive financial insights, payment processing, and subscription management.'}
                </p>
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3">
                <div className="rounded-2xl border border-border/40 bg-surface px-4 py-2 text-sm text-secondary flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  system status: optimal
                </div>
                <div className="flex gap-2">
                  <button className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-accent/90">
                    <AppIcon name="Download" size={16} />
                    <span>Download Report</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions Tabs */}
            <div className="border-t border-border/40 pt-4 overflow-x-auto">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'overview'
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-secondary hover:text-primary hover:bg-surface'
                    }`}
                >
                  <AppIcon name="BarChart2" size={16} />
                  <span>Overview</span>
                </button>
                <button
                  onClick={() => setActiveTab('transactions')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'transactions'
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-secondary hover:text-primary hover:bg-surface'
                    }`}
                >
                  <AppIcon name="CreditCard" size={16} />
                  <span>Transactions</span>
                </button>
                <button
                  onClick={() => setActiveTab('invoices')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'invoices'
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-secondary hover:text-primary hover:bg-surface'
                    }`}
                >
                  <AppIcon name="FileText" size={16} />
                  <span>Invoices</span>
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'settings'
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-secondary hover:text-primary hover:bg-surface'
                    }`}
                >
                  <AppIcon name="Settings" size={16} />
                  <span>Settings</span>
                </button>
              </div>
            </div>
          </section>
        </div>

        <div className="flex-1 overflow-y-auto px-6 md:px-8 pt-0 pb-6 md:pb-8 bg-background theme-transition space-y-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default RevenueBilling;
