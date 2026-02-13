import React from 'react';
import AppIcon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';

const InvoicesList = () => {
    const { t } = useLanguage();
    // Dummy data for invoices
    const invoices = [
        {
            id: 'INV-2024-001',
            date: '2026-02-13',
            client: 'Smile Dental Clinic',
            amount: 'Rp 2.985.000',
            status: 'paid',
            dueDate: '2026-02-13',
        },
        {
            id: 'INV-2024-002',
            date: '2026-02-12',
            client: 'Healthy Teeth Center',
            amount: 'Rp 7.485.000',
            status: 'pending',
            dueDate: '2026-02-19',
        },
        {
            id: 'INV-2024-003',
            date: '2026-02-10',
            client: 'Dr. Sarah Wilson',
            amount: 'Rp 232.500',
            status: 'paid',
            dueDate: '2026-02-10',
        },
        {
            id: 'INV-2024-004',
            date: '2026-02-08',
            client: 'Bright Smile Studio',
            amount: 'Rp 1.485.000',
            status: 'overdue',
            dueDate: '2026-02-05',
        },
        {
            id: 'INV-2024-005',
            date: '2026-02-05',
            client: 'Gentle Care Dental',
            amount: 'Rp 4.500.000',
            status: 'paid',
            dueDate: '2026-02-05',
        },
    ];

    const getStatusBadge = (status) => {
        switch (status) {
            case 'paid':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <AppIcon name="CheckCircle" size={12} />
                        {t('admin.revenueBilling.invoices.status.paid')}
                    </span>
                );
            case 'pending':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                        <AppIcon name="Clock" size={12} />
                        {t('admin.revenueBilling.invoices.status.pending')}
                    </span>
                );
            case 'overdue':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        <AppIcon name="AlertCircle" size={12} />
                        {t('admin.revenueBilling.invoices.status.overdue')}
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <div className="bg-surface border border-border/40 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-border/40 flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold text-primary">{t('admin.revenueBilling.invoices.title')}</h3>
                    <p className="text-sm text-secondary">{t('admin.revenueBilling.invoices.subtitle')}</p>
                </div>
                <button className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors">
                    <AppIcon name="Plus" size={16} />
                    <span>{t('admin.revenueBilling.invoices.createInvoice')}</span>
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-surface-elevated">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{t('admin.revenueBilling.invoices.table.id')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{t('admin.revenueBilling.invoices.table.client')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{t('admin.revenueBilling.invoices.table.date')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{t('admin.revenueBilling.invoices.table.dueDate')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{t('admin.revenueBilling.invoices.table.amount')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{t('admin.revenueBilling.invoices.table.status')}</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-secondary uppercase tracking-wider">{t('admin.revenueBilling.invoices.table.action')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 bg-surface">
                        {invoices.map((inv) => (
                            <tr key={inv.id} className="hover:bg-surface-elevated/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                                    {inv.id}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                                    {inv.client}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                                    {new Date(inv.date).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                                    {new Date(inv.dueDate).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary">
                                    {inv.amount}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {getStatusBadge(inv.status)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex items-center justify-end gap-2">
                                        <button className="p-1.5 text-secondary hover:text-primary hover:bg-surface-elevated rounded-lg transition-colors" title="Download">
                                            <AppIcon name="Download" size={16} />
                                        </button>
                                        <button className="p-1.5 text-secondary hover:text-primary hover:bg-surface-elevated rounded-lg transition-colors" title="View Details">
                                            <AppIcon name="Eye" size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="p-4 border-t border-border/40 flex justify-center">
                <button className="text-sm text-secondary hover:text-primary transition-colors">
                    {t('admin.revenueBilling.invoices.loadMore')}
                </button>
            </div>
        </div>
    );
};

export default InvoicesList;
