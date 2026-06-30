import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../contexts/LanguageContext';
import AdminSideBar from '../ui/sidebar-admin';
import AppIcon from '../../../components/AppIcon';
import SecurityOverview from './components/SecurityOverview';
import AuditTrail from './components/AuditTrail';
import ComplianceStandards from './components/ComplianceStandards';
import DataPrivacy from './components/DataPrivacy';
import { ADMIN_TAB_PATHS, adminTabFromPath, invertPathMap } from '../ui/adminAccess';

const ComplianceSecurity = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const MIN_LOADING_MS = 900;
  const [loading, setLoading] = useState(true);
  const activeTab = adminTabFromPath(location.pathname, 'overview', invertPathMap(ADMIN_TAB_PATHS.compliance));

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), MIN_LOADING_MS);
    return () => clearTimeout(timer);
  }, []);
  const handleTabChange = (tabId) => navigate(ADMIN_TAB_PATHS.compliance[tabId] || ADMIN_TAB_PATHS.compliance.overview);

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
          <section className="admin-page-header space-y-6 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-3xl p-8 border border-red-100 dark:border-red-800/30">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                  {t('admin.complianceSecurity.badge') || 'Compliance & Security'}
                </p>
                <h1 className="text-2xl font-bold text-primary">
                  {t('admin.complianceSecurity.title') || 'Compliance & Security'}
                </h1>
                <p className="text-sm text-secondary max-w-2xl">
                  {t('admin.complianceSecurity.subtitle') || 'Data privacy controls, regulatory compliance, and security audit management'}
                </p>
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3">
                <div className="rounded-2xl border border-border/40 bg-surface px-4 py-2 text-sm text-secondary">
                  {t('admin.complianceSecurity.securityScore')}: <span className="font-bold text-primary">98%</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleTabChange('audit')} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-accent/90">
                    <AppIcon name="ShieldCheck" size={16} />
                    <span>{t('admin.complianceSecurity.securityAudit')}</span>
                  </button>
                  <button onClick={() => handleTabChange('overview')} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-700">
                    <AppIcon name="AlertTriangle" size={16} />
                    <span>{t('admin.complianceSecurity.alerts')}</span>
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
                  <AppIcon name="ShieldCheck" size={16} />
                  <span>{t('admin.complianceSecurity.tabs.overview')}</span>
                </button>
                <button
                  onClick={() => handleTabChange('audit')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'audit'
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-secondary hover:text-primary hover:bg-surface'
                    }`}
                >
                  <AppIcon name="Eye" size={16} />
                  <span>{t('admin.complianceSecurity.tabs.audit')}</span>
                </button>
                <button
                  onClick={() => handleTabChange('standards')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'standards'
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-secondary hover:text-primary hover:bg-surface'
                    }`}
                >
                  <AppIcon name="FileCheck" size={16} />
                  <span>{t('admin.complianceSecurity.tabs.standards')}</span>
                </button>
                <button
                  onClick={() => handleTabChange('privacy')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'privacy'
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-secondary hover:text-primary hover:bg-surface'
                    }`}
                >
                  <AppIcon name="Lock" size={16} />
                  <span>{t('admin.complianceSecurity.tabs.privacy')}</span>
                </button>
              </div>
            </div>
          </section>
        </div>

        <div className="flex-1 overflow-y-auto px-6 md:px-8 pt-4 pb-6 md:pb-8 bg-background theme-transition">
          {activeTab === 'overview' && <SecurityOverview />}
          {activeTab === 'audit' && <AuditTrail />}
          {activeTab === 'standards' && <ComplianceStandards />}
          {activeTab === 'privacy' && <DataPrivacy />}
        </div>
      </div>
    </div>
  );
};

export default ComplianceSecurity;
