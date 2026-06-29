import React, { useCallback, useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import ClinicSideBar from '../ui/SideBar-Clinic';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import OperationalView from './components/OperationalView';
import FinancialView from './components/FinancialView';
import ComplianceView from './components/ComplianceView';
import MarketingView from './components/MarketingView';
import httpClient from '../../../utils/httpClient';
import { compactNumber, reportQuery, reportToCsv } from './reportUtils.mjs';

const ReportsPage = () => {
  const { t } = useLanguage();
  useTheme();
  useAuth();

  const [activeTab, setActiveTab] = useState('operational');
  const [dateRange, setDateRange] = useState('last30days');
  const [branchId, setBranchId] = useState('all');
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [showVisualLoading, setShowVisualLoading] = useState(false);

  const loadReport = useCallback(async () => {
    setLoading(true);
    const timeoutId = setTimeout(() => {
      setShowVisualLoading(true);
    }, 250);
    setError(null);
    try {
      const response = await httpClient.get('/clinic/reports', { params: reportQuery(dateRange, branchId) });
      setReport(response.data);
      setLastUpdated(new Date());
    } catch (requestError) {
      setError(requestError?.response?.data?.error || requestError.message || 'Gagal memuat laporan');
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
      setShowVisualLoading(false);
    }
  }, [dateRange, branchId]);

  useEffect(() => { loadReport(); }, [loadReport]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const id = window.setInterval(() => {
      loadReport();
    }, 60000);
    return () => window.clearInterval(id);
  }, [autoRefresh, loadReport]);

  const tabs = [
    { id: 'operational', label: t('clinic.reports.tabs.operational') || 'Operasional', icon: 'Activity', count: report?.summary?.appointments },
    { id: 'financial', label: t('clinic.reports.tabs.financial') || 'Keuangan', icon: 'DollarSign', count: report?.summary?.transactions },
    { id: 'compliance', label: t('clinic.reports.tabs.compliance') || 'Kepatuhan', icon: 'Shield', count: null },
    { id: 'marketing', label: t('clinic.reports.tabs.marketing') || 'Marketing', icon: 'Target', count: null }
  ];

  const exportCsv = () => {
    const blob = new Blob([reportToCsv(report)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clinic-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'operational': return <OperationalView report={report} dateRange={dateRange} branchId={branchId} />;
      case 'financial': return <FinancialView report={report} dateRange={dateRange} branchId={branchId} />;
      case 'compliance': return <ComplianceView report={report} dateRange={dateRange} branchId={branchId} />;
      case 'marketing': return <MarketingView report={report} dateRange={dateRange} branchId={branchId} />;
      default: return <OperationalView report={report} dateRange={dateRange} branchId={branchId} />;
    }
  };

  if (loading && !report) {
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
            {showVisualLoading && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden bg-accent/10">
                <div className="h-full bg-accent animate-pulse w-1/2 mx-auto rounded-full" />
              </div>
            )}
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
                <div className="flex items-center gap-2">
                  <span className="text-xs text-secondary">
                    Diperbarui {lastUpdated ? lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </span>
                  <button
                    onClick={() => setAutoRefresh(value => !value)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${autoRefresh ? 'bg-accent/10 text-accent' : 'text-secondary hover:bg-surface hover:text-primary'
                      }`}
                  >
                    <Icon name={autoRefresh ? 'RefreshCw' : 'RefreshCcw'} size={13} className={autoRefresh ? 'animate-spin' : ''} />
                    {autoRefresh ? 'Live' : 'Refresh otomatis'}
                  </button>
                  <button onClick={loadReport} disabled={loading} className="rounded-lg p-2 text-secondary transition-colors hover:bg-surface hover:text-primary disabled:opacity-40">
                    <Icon name="RefreshCw" size={16} className={loading ? 'animate-spin' : ''} />
                  </button>
                </div>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="pl-3 pr-10 py-2 border border-border/40 rounded-lg bg-surface text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                >
                  <option value="last7days">7 Hari Terakhir</option>
                  <option value="last30days">30 Hari Terakhir</option>
                  <option value="last3months">3 Bulan Terakhir</option>
                  <option value="lastyear">Tahun Ini</option>
                </select>
                <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="pl-3 pr-10 py-2 border border-border/40 rounded-lg bg-surface text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20">
                  <option value="all">Semua Cabang</option>
                  {(report?.branches || []).map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                </select>
                <button onClick={exportCsv} disabled={!report} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-accent-hover disabled:opacity-50">
                  <Icon name="Download" size={16} />
                  Export CSV
                </button>
              </div>
            </div>
            <div className="border-t border-border/40 pt-4">
              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab.id
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-secondary hover:text-primary hover:bg-surface'
                      }`}
                  >
                    <Icon name={tab.icon} size={16} />
                    <span>{tab.label}</span>
                    {tab.count != null && (
                      <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-accent/15 text-accent'
                        }`}>
                        {compactNumber(tab.count)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <Icon name="AlertCircle" size={18} className="mt-0.5 flex-shrink-0 text-red-500" />
              <div className="flex-1 text-sm">
                <p className="font-medium text-red-600">Gagal memuat laporan</p>
                <p className="mt-0.5 text-red-500/80">{error}</p>
              </div>
              <button onClick={loadReport} className="whitespace-nowrap text-xs text-red-500 underline">Coba lagi</button>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                <Icon name="X" size={14} />
              </button>
            </div>
          )}
          <div className={`min-h-[500px] transition-all duration-300 ${showVisualLoading ? 'opacity-50 pointer-events-none filter blur-[0.5px]' : 'opacity-100'}`}>
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
