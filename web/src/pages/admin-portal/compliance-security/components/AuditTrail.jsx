import React, { useState } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import AppIcon from '../../../../components/AppIcon';

const AuditTrail = () => {
    const { t } = useLanguage();
    const [filter, setFilter] = useState('all');

    const auditLogs = [
        { id: 'EVT-2023-8901', event: 'Privileged Access', actor: 'admin@serene.com', resource: 'Production DB', severity: 'high', time: '2023-10-27 10:30:15', details: 'Full table scan on patients' },
        { id: 'EVT-2023-8902', event: 'Config Change', actor: 'system[auto]', resource: 'Firewall Rules', severity: 'medium', time: '2023-10-27 09:15:22', details: 'Port 443 rate limit updated' },
        { id: 'EVT-2023-8903', event: 'User Login', actor: 'sarah@clinic.com', resource: 'Portal', severity: 'low', time: '2023-10-27 08:45:01', details: 'Successful login via MFA' },
        { id: 'EVT-2023-8904', event: 'Data Export', actor: 'manager@clinic.com', resource: 'Patient Records', severity: 'medium', time: '2023-10-26 16:20:45', details: 'CSV export of 50 records' },
        { id: 'EVT-2023-8905', event: 'Failed Login', actor: 'unknown', resource: 'Portal', severity: 'high', time: '2023-10-26 14:10:33', details: '3 failed attempts from IP 1.2.3.4' },
    ];

    const filteredLogs = filter === 'all' ? auditLogs : auditLogs.filter(log => log.severity === filter);

    const getSeverityBadge = (severity) => {
        const styles = {
            high: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800',
            medium: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
            low: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
        };
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold uppercase border ${styles[severity]}`}>
                {t(`admin.complianceSecurity.overview.${severity}`)}
            </span>
        );
    };

    return (
        <div className="bg-surface border border-border/40 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[600px]">
            <div className="p-6 border-b border-border/40 bg-surface-elevated/20 flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                        <AppIcon name="FileText" size={20} className="text-secondary" />
                        {t('admin.complianceSecurity.audit.title')}
                    </h3>
                    <p className="text-sm text-secondary font-mono text-xs mt-1">LOG_ID: REF-AUDIT-2023-X</p>
                </div>
                <div className="flex gap-2">
                    {['all', 'high', 'medium', 'low'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filter === f
                                    ? 'bg-primary text-background border-primary'
                                    : 'bg-surface text-secondary border-border/40 hover:border-primary/50'
                                }`}
                        >
                            {t(`admin.complianceSecurity.audit.filters.${f}`)}
                        </button>
                    ))}
                    <button className="px-3 py-1.5 rounded-lg border border-border/40 text-secondary hover:text-primary hover:bg-surface-elevated transition-colors">
                        <AppIcon name="Filter" size={16} />
                    </button>
                    <button className="px-3 py-1.5 rounded-lg border border-border/40 text-secondary hover:text-primary hover:bg-surface-elevated transition-colors">
                        <AppIcon name="Download" size={16} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                <table className="w-full">
                    <thead className="bg-surface-elevated sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider font-mono">ID</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">{t('admin.complianceSecurity.audit.table.time')}</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">{t('admin.complianceSecurity.audit.table.event')}</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">{t('admin.complianceSecurity.audit.table.actor')}</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">{t('admin.complianceSecurity.audit.table.severity')}</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">{t('admin.complianceSecurity.audit.table.details')}</th>
                            <th className="px-6 py-3 text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 bg-surface">
                        {filteredLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-surface-elevated/50 transition-colors group">
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-secondary font-mono">
                                    {log.id}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-secondary font-mono">
                                    {log.time}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-primary">
                                    {log.event}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xs font-bold">
                                            {log.actor[0].toUpperCase()}
                                        </div>
                                        {log.actor}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {getSeverityBadge(log.severity)}
                                </td>
                                <td className="px-6 py-4 text-sm text-secondary max-w-xs truncate">
                                    {log.details}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-secondary hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                        <AppIcon name="ChevronRight" size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AuditTrail;
