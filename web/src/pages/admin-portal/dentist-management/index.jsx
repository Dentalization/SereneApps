import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import AdminSideBar from '../ui/sidebar-admin';
import AppIcon from '../../../components/AppIcon';
import DentistDirectory from './components/DentistDirectory';
import VerificationQueue from './components/VerificationQueue';
import ProfessionalNetwork from './components/ProfessionalNetwork';

const DentistManagement = () => {
  const { t } = useLanguage();
  const MIN_LOADING_MS = 900;
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('directory');
  const [stats, setStats] = useState({
    totalDentists: 0,
    pendingVerification: 0,
    independentDentists: 0,
    clinicDentists: 0,
    verifiedDentists: 0,
  });

  const handleStatsUpdate = useCallback((newStats) => {
    setStats((prev) => ({ ...prev, ...newStats }));
  }, []);

  // Define before useEffect to avoid TDZ
  const fetchDentistStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth.accessToken');
      if (!token) return;
      const res = await fetch('http://localhost:4000/v1/admin/dentists?limit=1000', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const result = await res.json();
      const data = Array.isArray(result?.data) ? result.data : [];
      const verified = data.filter(d => d.isVerified).length;
      const pending  = data.filter(d => !d.isVerified && d.status !== 'rejected').length;
      const indep    = data.filter(d => d.registrationType === 'independent').length;
      const clinic   = data.filter(d => d.registrationType === 'clinic-staff').length;
      setStats({
        totalDentists: data.length,
        pendingVerification: pending,
        independentDentists: indep,
        clinicDentists: clinic,
        verifiedDentists: verified,
      });
    } catch (error) {
      console.error('Error fetching dentist stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchDentistStats();
    const timer = setTimeout(() => setLoading(false), MIN_LOADING_MS);
    return () => clearTimeout(timer);
  }, [fetchDentistStats]);

  const tabs = [
    {
      id: 'directory',
      label: t('admin.nav.dentistDirectory') || 'Dentist Directory',
      icon: 'Users',
      description: 'View all registered dentists and their profiles',
    },
    {
      id: 'verification',
      label: t('admin.nav.verificationQueue') || 'Verification Queue',
      icon: 'FileCheck',
      description: 'Review and verify dentist credentials',
      badge: stats.pendingVerification > 0 ? String(stats.pendingVerification) : null,
    },
    {
      id: 'network',
      label: t('admin.nav.professionalNetwork') || 'Professional Network',
      icon: 'Network',
      description: 'Manage professional connections and referrals',
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'directory':
        return <DentistDirectory onStatsUpdate={handleStatsUpdate} />;
      case 'verification':
        return <VerificationQueue onStatsUpdate={handleStatsUpdate} />;
      case 'network':
        return <ProfessionalNetwork onStatsUpdate={handleStatsUpdate} />;
      default:
        return <DentistDirectory onStatsUpdate={handleStatsUpdate} />;
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
      {/* Sidebar */}
      <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
        <AdminSideBar />
      </div>

      {/* Header */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="p-6 md:p-8 pb-0">
          {/* Header seperti home page */}
          <section className="admin-page-header space-y-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-3xl p-8 border border-green-100 dark:border-green-800/30">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                  {t('admin.dentistManagement.badge') || 'Dentist Management'}
                </p>
                <h1 className="text-2xl font-bold text-primary">
                  {t('admin.nav.dentistManagement') || 'Manajemen Dokter Gigi'}
                </h1>
                <p className="text-sm text-secondary max-w-2xl">
                  {t('admin.dentistManagement.subtitle') || 'Kelola verifikasi dokter gigi, kredensial profesional, dan administrasi jaringan'}
                </p>
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3">
                <div className="flex flex-wrap gap-3">
                  <div className="rounded-2xl border border-border/40 bg-surface px-4 py-2 text-sm text-secondary">
                    {stats.totalDentists} total dokter
                  </div>
                  <div className="rounded-2xl border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20 px-4 py-2 text-sm text-orange-600">
                    {stats.pendingVerification} pending
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-accent/90">
                    <AppIcon name="UserPlus" size={16} />
                    <span>Add Dentist</span>
                  </button>
                  <button className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-green-700">
                    <AppIcon name="UserCheck" size={16} />
                    <span>Verify</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="border-t border-border/40 pt-4">
              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors relative ${
                      activeTab === tab.id ? 'bg-accent text-white shadow-sm' : 'text-secondary hover:text-primary hover:bg-surface'
                    }`}
                  >
                    <AppIcon name={tab.icon} size={16} />
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span className="ml-1 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto px-6 md:px-8 pt-4 pb-6 md:pb-8 bg-background theme-transition">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default DentistManagement;
