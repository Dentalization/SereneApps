import React from 'react';
import AppIcon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';

const RevenueOverviewCards = ({ stats }) => {
    const { t } = useLanguage();

    const cards = [
        {
            title: t('admin.revenueBilling.cards.totalRevenue'),
            value: stats?.totalRevenue || 'Rp 0',
            change: '+12.5%',
            trend: 'up',
            icon: 'DollarSign',
            color: 'text-green-600',
            bg: 'bg-green-100 dark:bg-green-900/20',
        },
        {
            title: t('admin.revenueBilling.cards.mrr'),
            value: stats?.mrr || 'Rp 0',
            change: '+8.2%',
            trend: 'up',
            icon: 'RefreshCw',
            color: 'text-blue-600',
            bg: 'bg-blue-100 dark:bg-blue-900/20',
        },
        {
            title: t('admin.revenueBilling.cards.activeSubscriptions'),
            value: stats?.activeSubscriptions || '0',
            change: '+24',
            trend: 'up',
            icon: 'Users',
            color: 'text-purple-600',
            bg: 'bg-purple-100 dark:bg-purple-900/20',
        },
        {
            title: t('admin.revenueBilling.cards.pendingInvoices'),
            value: stats?.pendingInvoices || '0',
            change: '-2',
            trend: 'down',
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
                        <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${card.trend === 'up'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                            {card.trend === 'up' ? <AppIcon name="TrendingUp" size={12} /> : <AppIcon name="TrendingDown" size={12} />}
                            {card.change}
                        </div>
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
