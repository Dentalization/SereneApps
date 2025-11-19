import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import ClinicSideBar from '../ui/SideBar-Clinic';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import OperationalView from './components/OperationalView';
import FinancialView from './components/FinancialView';
import ComplianceView from './components/ComplianceView';
import MarketingView from './components/MarketingView';

const ReportsPage = () => {
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('operational');
  const [dateRange, setDateRange] = useState('last30days');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // No loading needed since we're using dummy data in components
  }, [dateRange]);

  const tabs = [
    { id: 'operational', label: t('clinic.reports.tabs.operational') || 'Operasional', icon: 'Activity' },
    { id: 'financial', label: t('clinic.reports.tabs.financial') || 'Keuangan', icon: 'DollarSign' },
    { id: 'compliance', label: t('clinic.reports.tabs.compliance') || 'Kepatuhan', icon: 'Shield' },
    { id: 'marketing', label: t('clinic.reports.tabs.marketing') || 'Marketing', icon: 'Target' }
  ];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const renderOperationalView = () => <OperationalView />;

  const renderFinancialView = () => <FinancialView />;

  const renderComplianceView = () => <ComplianceView />;

  const renderMarketingView = () => <MarketingView />;

  const renderContent = () => {
    switch (activeTab) {
      case 'operational': return renderOperationalView();
      case 'financial': return renderFinancialView();
      case 'compliance': return renderComplianceView();
      case 'marketing': return renderMarketingView();
      default: return renderOperationalView();
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background theme-transition clinic-skeleton">
        <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
          <ClinicSideBar />
        </div>

        <div className="flex-1 min-w-0">
          <div className="p-6 md:p-8 space-y-8">
            <section className="space-y-6 rounded-3xl border border-primary/15 bg-surface-elevated skeleton-surface p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-3">
                  <div className="h-6 w-72 rounded bg-accent/10 animate-pulse"></div>
                  <div className="h-4 w-80 rounded bg-accent/10 animate-pulse"></div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="h-10 w-44 rounded-lg bg-accent/10 animate-pulse"></div>
                  <div className="h-10 w-40 rounded-lg bg-accent/20 animate-pulse"></div>
                </div>
              </div>
              <div className="border-t border-primary/15 pt-4 flex flex-wrap gap-2">
                {tabs.map((tab) => (
                  <div key={tab.id} className="h-9 w-32 rounded-lg bg-accent/10 animate-pulse"></div>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="p-6 rounded-2xl border border-primary/15 bg-surface-elevated skeleton-surface space-y-3">
                  <div className="h-4 w-28 rounded bg-accent/10 animate-pulse"></div>
                  <div className="h-6 w-20 rounded bg-accent/20 animate-pulse"></div>
                  <div className="h-3 w-32 rounded bg-accent/10 animate-pulse"></div>
                </div>
              ))}
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Array.from({ length: 2 }).map((_, idx) => (
                <div key={idx} className="p-6 rounded-2xl border border-primary/15 bg-surface-elevated skeleton-surface space-y-4">
                  <div className="h-5 w-48 rounded bg-accent/10 animate-pulse"></div>
                  <div className="h-64 rounded-2xl border border-dashed border-primary/20 bg-surface animate-pulse"></div>
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
        <ClinicSideBar />
      </div>

      <div className="flex-1 min-w-0">
        <div className="p-6 md:p-8 space-y-8">
          <section className="clinic-page-header space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-primary">
                  {t('clinic.reports.title') || 'Laporan & KPI'}
                </h1>
                <p className="text-sm text-secondary max-w-2xl">
                  {t('clinic.reports.subtitle') || 'Analytics, performa, dan business intelligence'}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="px-3 py-2 border border-border/40 rounded-lg bg-surface text-primary"
                >
                  <option value="last7days">7 Hari Terakhir</option>
                  <option value="last30days">30 Hari Terakhir</option>
                  <option value="last3months">3 Bulan Terakhir</option>
                  <option value="lastyear">Tahun Ini</option>
                </select>
                <button className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-accent-hover">
                  <Icon name="Download" size={16} />
                  Export PDF
                </button>
              </div>
            </div>
            <div className="border-t border-border/40 pt-4">
              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-accent text-white shadow-sm'
                        : 'text-secondary hover:text-primary hover:bg-surface'
                    }`}
                  >
                    <Icon name={tab.icon} size={16} />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <div className="min-h-[500px]">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
