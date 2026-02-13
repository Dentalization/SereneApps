import React from 'react';
import AppIcon from '../../../../components/AppIcon';
import AppImage from '../../../../components/AppImage';
import { useLanguage } from '../../../../contexts/LanguageContext';

const AuditLogs = () => {
    const { t } = useLanguage();

    const logs = [
        { id: 1, action: 'User Login', user: 'Adrian Halim', ip: '192.168.1.1', time: '2 mins ago', status: 'success' },
        { id: 2, action: 'Update Settings', user: 'Sarah Jenkins', ip: '192.168.1.15', time: '1 hour ago', status: 'success' },
        { id: 3, action: 'Failed Login Attempt', user: 'Unknown', ip: '203.0.113.42', time: '2 hours ago', status: 'warning' },
        { id: 4, action: 'Delete User', user: 'Admin System', ip: '127.0.0.1', time: 'Yesterday', status: 'danger' },
        { id: 5, action: 'API Key Generated', user: 'Adrian Halim', ip: '192.168.1.1', time: 'Yesterday', status: 'success' },
    ];

    const getStatusIcon = (status) => {
        switch (status) {
            case 'success': return <AppIcon name="CheckCircle" size={16} className="text-green-500" />;
            case 'warning': return <AppIcon name="AlertTriangle" size={16} className="text-yellow-500" />;
            case 'danger': return <AppIcon name="XCircle" size={16} className="text-red-500" />;
            default: return <AppIcon name="Info" size={16} className="text-blue-500" />;
        }
    };

    return (
        <div className="bg-surface border border-border/40 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-border/40 flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold text-primary">{t('admin.systemAdmin.audit.title')}</h3>
                    <p className="text-sm text-secondary">{t('admin.systemAdmin.audit.subtitle')}</p>
                </div>
                <button className="inline-flex items-center gap-2 rounded-xl border border-border/40 px-4 py-2 text-sm font-medium text-primary hover:bg-surface-elevated transition-colors">
                    <AppIcon name="Download" size={16} />
                    <span>{t('admin.systemAdmin.audit.export')}</span>
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-surface-elevated">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider w-10"></th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{t('admin.systemAdmin.audit.table.action')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{t('admin.systemAdmin.audit.table.user')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{t('admin.systemAdmin.audit.table.ipAddress')}</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-secondary uppercase tracking-wider">{t('admin.systemAdmin.audit.table.time')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 bg-surface">
                        {logs.map((log) => (
                            <tr key={log.id} className="hover:bg-surface-elevated/50 transition-colors">
                                <td className="px-6 py-4">
                                    {getStatusIcon(log.status)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                                    {log.action}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                                    {log.user}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-secondary">
                                    {log.ip}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-secondary">
                                    {log.time}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AuditLogs;
