import React from 'react';
import AppIcon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';

const TransactionRecent = () => {
    const { t } = useLanguage();
    // Dummy data
    const transactions = [
        {
            id: 'TRX-10234',
            date: '2026-02-13T10:30:00',
            entity: 'Smile Dental Clinic',
            type: 'Subscription',
            plan: 'Professional Plan',
            amount: 'Rp 2.985.000',
            status: 'success',
        },
        {
            id: 'TRX-10233',
            date: '2026-02-13T09:15:00',
            entity: 'Dr. Sarah Wilson',
            type: 'Consultation Fee',
            plan: 'Platform Fee (10%)',
            amount: 'Rp 232.500',
            status: 'success',
        },
        {
            id: 'TRX-10232',
            date: '2026-02-12T16:45:00',
            entity: 'Healthy Teeth Center',
            type: 'Subscription',
            plan: 'Enterprise Plan',
            amount: 'Rp 7.485.000',
            status: 'pending',
        },
        {
            id: 'TRX-10231',
            date: '2026-02-12T14:20:00',
            entity: 'Dr. James Chen',
            type: 'Verification',
            plan: 'One-time Fee',
            amount: 'Rp 750.000',
            status: 'failed',
        },
        {
            id: 'TRX-10230',
            date: '2026-02-12T11:10:00',
            entity: 'Bright Smile Studio',
            type: 'Subscription',
            plan: 'Basic Plan',
            amount: 'Rp 1.485.000',
            status: 'success',
        },
    ];

    const getStatusBadge = (status) => {
        switch (status) {
            case 'success':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <AppIcon name="CheckCircle" size={12} />
                        {t('admin.revenueBilling.transactions.status.success')}
                    </span>
                );
            case 'pending':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                        <AppIcon name="Clock" size={12} />
                        {t('admin.revenueBilling.transactions.status.pending')}
                    </span>
                );
            case 'failed':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        <AppIcon name="XCircle" size={12} />
                        {t('admin.revenueBilling.transactions.status.failed')}
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <div className="bg-surface border border-border/40 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-border/40 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-primary">{t('admin.revenueBilling.transactions.recentTitle')}</h3>
                <button className="text-sm font-medium text-accent hover:text-accent/80 transition-colors">
                    {t('admin.revenueBilling.transactions.viewAll')}
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-surface-elevated">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{t('admin.revenueBilling.transactions.table.id')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{t('admin.revenueBilling.transactions.table.entity')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{t('admin.revenueBilling.transactions.table.typePlan')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{t('admin.revenueBilling.transactions.table.amount')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{t('admin.revenueBilling.transactions.table.status')}</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-secondary uppercase tracking-wider">{t('admin.revenueBilling.transactions.table.action')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 bg-surface">
                        {transactions.map((trx) => (
                            <tr key={trx.id} className="hover:bg-surface-elevated/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                                    {trx.id}
                                    <div className="text-xs text-secondary mt-0.5">
                                        {new Date(trx.date).toLocaleDateString()} • {new Date(trx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                                            <span className="text-xs font-bold text-primary">{trx.entity.charAt(0)}</span>
                                        </div>
                                        <div className="text-sm font-medium text-primary">{trx.entity}</div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-primary">{trx.type}</div>
                                    <div className="text-xs text-secondary">{trx.plan}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary">
                                    {trx.amount}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {getStatusBadge(trx.status)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button className="text-secondary hover:text-primary transition-colors">
                                        <AppIcon name="MoreHorizontal" size={16} />
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

export default TransactionRecent;
