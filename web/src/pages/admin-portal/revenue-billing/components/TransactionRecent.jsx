import React from 'react';
import AppIcon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { AdminEmptyState } from '../../ui/AdminPagePrimitives';

const formatIdr = (value) => new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
}).format(Number(value));

const TransactionRecent = ({ transactions = [] }) => {
    const { t } = useLanguage();

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
                <button disabled className="text-sm font-medium text-secondary opacity-60 cursor-not-allowed">
                    {t('admin.revenueBilling.transactions.viewAll')}
                </button>
            </div>
            {transactions.length > 0 ? (
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
                                    {typeof trx.amount === 'number' ? formatIdr(trx.amount) : trx.amount}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {getStatusBadge(trx.status)}
                                    {trx.reconciliationStatus && (
                                        <div
                                            className={`mt-1 text-[10px] ${
                                                trx.reconciliationStatus === 'failed' ? 'text-red-600' : 'text-secondary'
                                            }`}
                                            title={trx.reconciliationError || undefined}
                                        >
                                            Rekonsiliasi: {trx.reconciliationStatus}
                                            {trx.reconciliationAttempts ? ` · ${trx.reconciliationAttempts}x` : ''}
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        disabled
                                        title="Detail transaksi segera tersedia"
                                        className="cursor-not-allowed text-secondary opacity-50"
                                    >
                                        <AppIcon name="MoreHorizontal" size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            ) : (
                <div className="p-6">
                    <AdminEmptyState
                        icon="CreditCard"
                        title="Transaksi belum tersedia"
                        description="Belum ada payment intent dari backend untuk ditampilkan."
                    />
                </div>
            )}
        </div>
    );
};

export default TransactionRecent;
