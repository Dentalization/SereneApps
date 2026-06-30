import React from 'react';
import AppIcon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';

const formatIdr = (value) => {
    if (value == null) return 'N/A';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
    }).format(Number(value));
};

const formatCount = (value) => value == null ? 'N/A' : Number(value).toLocaleString('id-ID');

const SourceBadge = ({ available, label }) => (
    <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
        available
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    }`}>
        <AppIcon name={available ? 'Database' : 'CircleAlert'} size={12} />
        {label}
    </div>
);

const RevenueOverviewCards = ({ summary, availability }) => {
    const { t } = useLanguage();
    const paymentsAvailable = availability?.payments?.available;
    const invoicesAvailable = availability?.invoices?.available;
    const subscriptionsAvailable = availability?.subscriptions?.available;

    const cards = [
        {
            title: t('admin.revenueBilling.cards.totalRevenue'),
            value: formatIdr(summary?.totalRevenue),
            available: paymentsAvailable,
            badge: paymentsAvailable ? 'payment_intents' : 'no payments',
            icon: 'DollarSign',
            color: 'text-green-600',
            bg: 'bg-green-100 dark:bg-green-900/20',
        },
        {
            title: t('admin.revenueBilling.cards.mrr'),
            value: formatIdr(summary?.mrr),
            available: subscriptionsAvailable,
            badge: subscriptionsAvailable ? 'subscriptions' : 'source missing',
            icon: 'RefreshCw',
            color: 'text-blue-600',
            bg: 'bg-blue-100 dark:bg-blue-900/20',
        },
        {
            title: t('admin.revenueBilling.cards.activeSubscriptions'),
            value: formatCount(summary?.activeSubscriptions),
            available: subscriptionsAvailable,
            badge: subscriptionsAvailable ? 'subscriptions' : 'source missing',
            icon: 'Users',
            color: 'text-purple-600',
            bg: 'bg-purple-100 dark:bg-purple-900/20',
        },
        {
            title: t('admin.revenueBilling.cards.pendingInvoices'),
            value: formatCount(summary?.pendingInvoices),
            available: invoicesAvailable,
            badge: invoicesAvailable ? 'invoices' : 'no invoices',
            icon: 'FileText',
            color: 'text-orange-600',
            bg: 'bg-orange-100 dark:bg-orange-900/20',
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {cards.map((card, index) => (
                <div key={index} className="bg-surface border border-border/40 rounded-2xl p-5 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.bg}`}>
                            <AppIcon name={card.icon} size={20} className={card.color} />
                        </div>
                        <SourceBadge available={card.available} label={card.badge} />
                    </div>
                    <div>
                        <p className="text-sm text-secondary mb-1">{card.title}</p>
                        <h3 className="text-2xl font-bold text-primary">{card.value}</h3>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default RevenueOverviewCards;
