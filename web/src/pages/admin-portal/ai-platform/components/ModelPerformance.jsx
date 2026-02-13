import React from 'react';
import AppIcon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';

const ModelPerformance = () => {
    const { t } = useLanguage();

    const models = [
        {
            name: 'GPT-4 Turbo',
            context: '128k',
            cost: '$0.01',
            requests: '850K',
            status: 'operational',
        },
        {
            name: 'Claude 3 Opus',
            context: '200k',
            cost: '$0.015',
            requests: '620K',
            status: 'operational',
        },
        {
            name: 'Gemini 1.5 Pro',
            context: '1M',
            cost: '$0.007',
            requests: '980K',
            status: 'operational',
        },
        {
            name: 'Llama 3 70B',
            context: '8k',
            cost: '$0.002',
            requests: '1.2M',
            status: 'degraded',
        },
    ];

    const getStatusBadge = (status) => {
        switch (status) {
            case 'operational':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                        {t('admin.aiPlatform.models.status.operational')}
                    </span>
                );
            case 'degraded':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                        <AppIcon name="AlertTriangle" size={12} />
                        {t('admin.aiPlatform.models.status.degraded')}
                    </span>
                );
            case 'maintenance':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
                        <AppIcon name="Tool" size={12} />
                        {t('admin.aiPlatform.models.status.maintenance')}
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
                    <h3 className="text-lg font-semibold text-primary">{t('admin.aiPlatform.models.title')}</h3>
                    <p className="text-sm text-secondary">{t('admin.aiPlatform.models.subtitle')}</p>
                </div>
                <button className="p-2 text-secondary hover:text-primary hover:bg-surface-elevated rounded-lg transition-colors" title={t('admin.aiPlatform.models.refresh')}>
                    <AppIcon name="RefreshCw" size={18} />
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-surface-elevated">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{t('admin.aiPlatform.models.table.modelName')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{t('admin.aiPlatform.models.table.contextWindow')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{t('admin.aiPlatform.models.table.costPer1k')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{t('admin.aiPlatform.models.table.requests')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{t('admin.aiPlatform.models.table.status')}</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-secondary uppercase tracking-wider">{t('admin.aiPlatform.models.table.action')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 bg-surface">
                        {models.map((model, idx) => (
                            <tr key={idx} className="hover:bg-surface-elevated/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                                    <div className="flex items-center gap-2">
                                        <AppIcon name="Box" size={16} className="text-accent" />
                                        {model.name}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                                    {model.context}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                                    {model.cost}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                                    {model.requests}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {getStatusBadge(model.status)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button className="text-accent hover:text-accent/80 transition-colors">
                                        <AppIcon name="Settings" size={16} />
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

export default ModelPerformance;
