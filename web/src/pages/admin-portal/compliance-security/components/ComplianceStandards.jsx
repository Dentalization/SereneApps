import React from 'react';
import AppIcon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';

const ComplianceStandards = () => {
    const { t } = useLanguage();

    const standards = [
        { id: 'hipaa', name: 'HIPAA', status: 'passed', progress: 100, expiry: '2024-09-15', tier: 'gold' },
        { id: 'gdpr', name: 'GDPR', status: 'passed', progress: 100, expiry: '2024-08-20', tier: 'silver' },
        { id: 'soc2', name: 'SOC 2 Type II', status: 'pending', progress: 85, expiry: 'In Review', tier: 'bronze' },
        { id: 'iso27001', name: 'ISO 27001', status: 'passed', progress: 100, expiry: '2024-10-01', tier: 'silver' },
    ];

    const getStatusStyle = (status) => {
        switch (status) {
            case 'passed': return 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800';
            case 'failed': return 'bg-rose-50 border-rose-200 dark:bg-rose-900/10 dark:border-rose-800';
            default: return 'bg-sky-50 border-sky-200 dark:bg-sky-900/10 dark:border-sky-800';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'passed': return <AppIcon name="BadgeCheck" size={24} className="text-emerald-500" />;
            case 'failed': return <AppIcon name="XCircle" size={24} className="text-rose-500" />;
            default: return <AppIcon name="Clock" size={24} className="text-sky-500" />;
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center bg-surface border border-border/40 p-6 rounded-3xl">
                <div>
                    <h3 className="text-xl font-bold text-primary">{t('admin.complianceSecurity.standards.title')}</h3>
                    <p className="text-sm text-secondary">{t('admin.complianceSecurity.standards.subtitle')}</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary text-background rounded-full font-medium hover:opacity-90 transition-opacity">
                    <AppIcon name="Plus" size={16} /> Add Standard
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {standards.map((standard) => (
                    <div key={standard.id} className={`relative rounded-3xl p-6 border-2 transition-all hover:shadow-lg ${getStatusStyle(standard.status)}`}>
                        {/* Certificate Pattern Background */}
                        <div className="absolute inset-0 opacity-5 pointer-events-none"
                            style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '16px 16px', color: 'var(--text-primary)' }}>
                        </div>

                        <div className="flex justify-between items-start mb-6 relative z-10">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="text-2xl font-serif font-bold text-primary tracking-tight">{standard.name}</h4>
                                    {standard.tier === 'gold' && <AppIcon name="Award" size={20} className="text-yellow-500" />}
                                </div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/50 dark:bg-black/20 border border-black/5 text-xs font-semibold uppercase tracking-wide">
                                    {t(`admin.complianceSecurity.standards.status.${standard.status}`)}
                                </div>
                            </div>
                            {getStatusIcon(standard.status)}
                        </div>

                        <div className="space-y-4 relative z-10">
                            <div className="flex justify-between text-xs font-medium uppercase tracking-wide text-secondary">
                                <span>{t('admin.complianceSecurity.standards.controls')}</span>
                                <span>{standard.progress}%</span>
                            </div>
                            <div className="h-3 w-full bg-white/50 dark:bg-black/20 rounded-full overflow-hidden border border-black/5">
                                <div
                                    className={`h-full transition-all duration-1000 ${standard.status === 'passed' ? 'bg-emerald-500' : 'bg-sky-500'
                                        }`}
                                    style={{ width: `${standard.progress}%` }}
                                ></div>
                            </div>

                            <div className="flex justify-between items-end pt-2">
                                <div>
                                    <p className="text-xs text-secondary uppercase tracking-wider">{t('admin.complianceSecurity.standards.nextAudit')}</p>
                                    <p className="text-sm font-semibold text-primary">{standard.expiry}</p>
                                </div>
                                <button className="text-sm font-bold text-primary underline decoration-2 decoration-transparent hover:decoration-current transition-all flex items-center gap-1">
                                    <AppIcon name="FileText" size={16} />
                                    {t('admin.complianceSecurity.standards.evidenceLocker')}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ComplianceStandards;
