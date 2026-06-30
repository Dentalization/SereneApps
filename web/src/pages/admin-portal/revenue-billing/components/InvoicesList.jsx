import React from 'react';
import AppIcon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { AdminEmptyState } from '../../ui/AdminPagePrimitives';

const formatIdr = (value) => new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
}).format(Number(value));

const InvoicesList = ({ invoices = [], availability }) => {
    const { t } = useLanguage();

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
                <button disabled title="Create invoice admin flow belum tersedia" className="flex cursor-not-allowed items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-primary/60 text-white opacity-70">
                    <AppIcon name="Plus" size={16} />
                    <span>{t('admin.revenueBilling.invoices.createInvoice')}</span>
                </button>
            </div>
            {invoices.length > 0 ? (
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
                                    {typeof inv.amount === 'number' ? formatIdr(inv.amount) : inv.amount}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {getStatusBadge(inv.status)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex items-center justify-end gap-2">
                                        <button disabled className="p-1.5 text-secondary opacity-50 cursor-not-allowed rounded-lg" title="Download belum tersedia">
                                            <AppIcon name="Download" size={16} />
                                        </button>
                                        <button disabled className="p-1.5 text-secondary opacity-50 cursor-not-allowed rounded-lg" title="Detail invoice admin belum tersedia">
                                            <AppIcon name="Eye" size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            ) : (
                <div className="p-6">
                    <AdminEmptyState
                        icon="FileText"
                        title="Invoice belum tersedia"
                        description={availability?.invoices?.notes?.[0] || 'Belum ada invoice dari backend untuk ditampilkan.'}
                    />
                </div>
            )}
            {invoices.length > 0 && (
                <div className="p-4 border-t border-border/40 flex justify-center">
                <button disabled className="text-sm text-secondary opacity-60 cursor-not-allowed">
                    {t('admin.revenueBilling.invoices.loadMore')}
                </button>
                </div>
            )}
        </div>
    );
};

export default InvoicesList;
