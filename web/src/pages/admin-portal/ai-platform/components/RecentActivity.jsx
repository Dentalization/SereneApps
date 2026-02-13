import React from 'react';
import AppIcon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';

const RecentActivity = () => {
    const { t } = useLanguage();

    const activities = [
        {
            id: 1,
            user: 'Smile Clinic Admin',
            model: 'GPT-4 Turbo',
            tokens: '1,240',
            status: 'completed',
            time: '2 mins ago',
        },
        {
            id: 2,
            user: 'Dr. John Doe',
            model: 'Claude 3 Opus',
            tokens: '8,500',
            status: 'processing',
            time: '5 mins ago',
        },
        {
            id: 3,
            user: 'System Cron',
            model: 'Gemini 1.5 Pro',
            tokens: '124,000',
            status: 'completed',
            time: '12 mins ago',
        },
        {
            id: 4,
            user: 'Healthy Teeth Center',
            model: 'Llama 3 70B',
            tokens: '0',
            status: 'failed',
            time: '25 mins ago',
        },
        {
            id: 5,
            user: 'Patient Portal AI',
            model: 'GPT-3.5 Turbo',
            tokens: '450',
            status: 'completed',
            time: '1 hour ago',
        },
    ];

    const getStatusBadge = (status) => {
        switch (status) {
            case 'completed':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <AppIcon name="CheckCircle" size={12} />
                        {t('admin.aiPlatform.activity.status.completed')}
                    </span>
                );
            case 'processing':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        <AppIcon name="Loader" size={12} className="animate-spin" />
                        {t('admin.aiPlatform.activity.status.processing')}
                    </span>
                );
            case 'failed':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        <AppIcon name="XCircle" size={12} />
                        {t('admin.aiPlatform.activity.status.failed')}
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <div className="bg-surface border border-border/40 rounded-2xl overflow-hidden h-full">
            <div className="p-6 border-b border-border/40 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-primary">{t('admin.aiPlatform.activity.title')}</h3>
                <button className="text-sm font-medium text-accent hover:text-accent/80 transition-colors">
                    {t('admin.aiPlatform.activity.viewAll')}
                </button>
            </div>
            <div className="divide-y divide-border/40">
                {activities.map((activity) => (
                    <div key={activity.id} className="p-4 hover:bg-surface-elevated/50 transition-colors flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-surface-elevated flex items-center justify-center border border-border/40">
                                <AppIcon name="Terminal" size={14} className="text-secondary" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-primary">{activity.user}</p>
                                <p className="text-xs text-secondary flex items-center gap-2">
                                    <span>{activity.model}</span>
                                    <span>&bull;</span>
                                    <span>{activity.tokens} {t('admin.aiPlatform.activity.table.tokens')}</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            {getStatusBadge(activity.status)}
                            <span className="text-xs text-secondary">{activity.time}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RecentActivity;
