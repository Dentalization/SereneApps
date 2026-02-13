import React from 'react';
import AppIcon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';

const SupportOverviewCards = () => {
    const { t } = useLanguage();

    const stats = [
        {
            title: t('admin.supportHelpdesk.cards.openTickets'),
            value: '23',
            change: '+5',
            trend: 'up', // Bad for open tickets usually, but context depends
            icon: 'Ticket',
            color: 'text-blue-600',
            bg: 'bg-blue-100 dark:bg-blue-900/20',
        },
        {
            title: t('admin.supportHelpdesk.cards.avgResponseTime'),
            value: '2.5h',
            change: '-15m',
            trend: 'down', // Good
            icon: 'Clock',
            color: 'text-purple-600',
            bg: 'bg-purple-100 dark:bg-purple-900/20',
        },
        {
            title: t('admin.supportHelpdesk.cards.resolutionRate'),
            value: '94%',
            change: '+2%',
            trend: 'up', // Good
            icon: 'CheckCircle',
            color: 'text-green-600',
            bg: 'bg-green-100 dark:bg-green-900/20',
        },
        {
            title: t('admin.supportHelpdesk.cards.csatScore'),
            value: '4.8/5',
            change: '+0.1',
            trend: 'up', // Good
            icon: 'Heart',
            color: 'text-pink-600',
            bg: 'bg-pink-100 dark:bg-pink-900/20',
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
                <div key={index} className="bg-surface border border-border/40 rounded-2xl p-5 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bg}`}>
                            <AppIcon name={stat.icon} size={20} className={stat.color} />
                        </div>
                        <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                            // Logic: 
                            // Open Tickets (index 0): up is 'warning' (red/orange)
                            // Response Time (index 1): down is 'good' (green)
                            // Resolution/CSAT (index 2,3): up is 'good' (green)

                            (index === 0 && stat.trend === 'up') ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                (index === 1 && stat.trend === 'down') ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                    (index > 1 && stat.trend === 'up') ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                        'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                            }`}>
                            {stat.trend === 'up' ? <AppIcon name="TrendingUp" size={12} /> : <AppIcon name="TrendingDown" size={12} />}
                            {stat.change}
                        </div>
                    </div>
                    <div>
                        <p className="text-sm text-secondary mb-1">{stat.title}</p>
                        <h3 className="text-2xl font-bold text-primary">{stat.value}</h3>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default SupportOverviewCards;
