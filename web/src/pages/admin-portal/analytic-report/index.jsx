import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../../../contexts/LanguageContext';
import AdminSideBar from '../ui/sidebar-admin';
import AppIcon from '../../../components/AppIcon';
import AnalyticsOverview from './components/AnalyticsOverview';
import PerformanceMetrics from './components/PerformanceMetrics';
import FinancialReports from './components/FinancialReports';

const AnalyticReport = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();
    const MIN_LOADING_MS = 900;
    const [loading, setLoading] = useState(true);

    // Determine active tab from URL
    const getActiveTab = () => {
        const path = location.pathname;
        if (path.includes('/performance')) return 'performance';
        if (path.includes('/financial')) return 'financial';
        return 'overview';
    };

    const activeTab = getActiveTab();

    const handleTabChange = (tabId) => {
        switch (tabId) {
            case 'performance':
                navigate('/admin/analytics-reporting/performance');
                break;
            case 'financial':
                navigate('/admin/analytics-reporting/financial');
                break;
            case 'overview':
            default:
                navigate('/admin/analytics-reporting');
                break;
        }
    };

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
                                    {Array.from({ length: 3 }).map((_, idx) => (
                                        <div key={idx} className="h-9 w-32 rounded-lg bg-accent/10 animate-pulse"></div>
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

                        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 h-80 rounded-3xl border border-primary/15 bg-surface-elevated skeleton-surface"></div>
                            <div className="h-80 rounded-3xl border border-primary/15 bg-surface-elevated skeleton-surface"></div>
                        </section>
                    </div>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'overview', icon: 'Activity', label: t('admin.nav.businessIntelligence') || 'Clinic Vitals' },
        { id: 'performance', icon: 'BarChart2', label: t('admin.nav.performanceMetrics') || 'Treatment Efficacy' },
        { id: 'financial', icon: 'PieChart', label: t('admin.nav.financialReports') || 'Hospital Economics' },
    ];

    return (
        <div className="flex min-h-screen bg-background theme-transition">
            <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
                <AdminSideBar />
            </div>

            {/* Header */}
            <div className="flex-1 overflow-hidden flex flex-col">
                <div className="p-6 md:p-8 pb-4">
                    <section className="admin-page-header space-y-6 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-3xl p-8 border border-emerald-100 dark:border-emerald-800/30">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
                                    {t('admin.nav.analytics') || 'Analytic Report'}
                                </p>
                                <h1 className="text-2xl font-bold text-primary">
                                    {t('admin.pages.analytics.title') || 'Business Intelligence & Reports'}
                                </h1>
                                <p className="text-sm text-secondary max-w-2xl">
                                    {t('admin.pages.analytics.subtitle') || 'Data-driven insights for clinic operations and growth.'}
                                </p>
                            </div>
                            <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3">
                                <div className="rounded-2xl border border-border/40 bg-surface px-4 py-2 text-sm text-secondary flex items-center gap-2">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    Live Data Stream
                                </div>
                                <div className="flex gap-2">
                                    <button className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700">
                                        <AppIcon name="Download" size={16} />
                                        <span>Export Report</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="border-t border-border/40 pt-4">
                            <div className="flex flex-wrap gap-2">
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => handleTabChange(tab.id)}
                                        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab.id
                                            ? 'bg-emerald-600 text-white shadow-sm'
                                            : 'text-secondary hover:text-primary hover:bg-surface'
                                            }`}
                                    >
                                        <AppIcon name={tab.icon} size={16} />
                                        <span>{tab.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>
                </div>

                <div className="flex-1 overflow-y-auto px-6 md:px-8 pt-4 pb-6 md:pb-8 bg-background theme-transition">
                    {activeTab === 'overview' && <AnalyticsOverview />}
                    {activeTab === 'performance' && <PerformanceMetrics />}
                    {activeTab === 'financial' && <FinancialReports />}
                </div>
            </div>
        </div>
    );
};

export default AnalyticReport;
