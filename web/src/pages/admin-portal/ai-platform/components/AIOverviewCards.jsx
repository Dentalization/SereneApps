import React from 'react';
import AppIcon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';

const AIOverviewCards = () => {
    const { t } = useLanguage();

    const stats = [
        {
            title: t('admin.aiPlatform.cards.totalRequests'),
            value: '1.2M',
            change: '+15%',
            trend: 'up',
            icon: 'Activity',
            color: 'text-blue-600',
            bg: 'bg-blue-100 dark:bg-blue-900/20',
        },
        {
            title: t('admin.aiPlatform.cards.tokenUsage'),
            value: '450M',
            change: '+22%',
            trend: 'up',
            icon: 'Cpu',
            color: 'text-purple-600',
            bg: 'bg-purple-100 dark:bg-purple-900/20',
        },
        {
            title: t('admin.aiPlatform.cards.avgLatency'),
            value: '240ms',
            change: '-12%',
            trend: 'down', // Good thing
            icon: 'Zap',
            color: 'text-green-600',
            bg: 'bg-green-100 dark:bg-green-900/20',
        },
        {
            title: t('admin.aiPlatform.cards.errorRate'),
            value: '0.02%',
            change: '-0.01%',
            trend: 'down', // Good thing
            icon: 'AlertTriangle',
            color: 'text-orange-600',
            bg: 'bg-orange-100 dark:bg-orange-900/20',
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
                            // Logic to color trend badge: 
                            // For 'up' trend: standard is green. But if it's 'error rate' or 'latency', maybe 'up' is bad?
                            // Assuming simple logic for now: trend 'up' is green, 'down' is red usually.
                            // BUT for latency/error, 'down' is GOOD (green).
                            // Let's hardcode based on index for simplicity or add a 'positiveTrend' prop.
                            (index >= 2 && stat.trend === 'down') || (index < 2 && stat.trend === 'up')
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
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

export default AIOverviewCards;
