import React from 'react';
import AppImage from '../../../../components/AppImage';
import { useLanguage } from '../../../../contexts/LanguageContext';

const TeamPerformance = () => {
    const { t } = useLanguage();

    const agents = [
        {
            name: 'Sarah Jenkins',
            role: 'Senior Support',
            resolved: 45,
            avgTime: '15m',
            rating: 4.9,
            avatar: 'https://i.pravatar.cc/150?u=sarah',
        },
        {
            name: 'Michael Chen',
            role: 'Technical Support',
            resolved: 38,
            avgTime: '22m',
            rating: 4.8,
            avatar: 'https://i.pravatar.cc/150?u=michael',
        },
        {
            name: 'Emma Wilson',
            role: 'Customer Success',
            resolved: 52,
            avgTime: '12m',
            rating: 4.7,
            avatar: 'https://i.pravatar.cc/150?u=emma',
        },
        {
            name: 'David Kim',
            role: 'Billing Support',
            resolved: 30,
            avgTime: '28m',
            rating: 4.6,
            avatar: 'https://i.pravatar.cc/150?u=david',
        },
    ];

    return (
        <div className="bg-surface border border-border/40 rounded-2xl overflow-hidden h-full">
            <div className="p-6 border-b border-border/40">
                <h3 className="text-lg font-semibold text-primary">{t('admin.supportHelpdesk.team.title')}</h3>
                <p className="text-sm text-secondary">{t('admin.supportHelpdesk.team.subtitle')}</p>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-surface-elevated">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{t('admin.supportHelpdesk.team.table.agent')}</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-secondary uppercase tracking-wider">{t('admin.supportHelpdesk.team.table.resolved')}</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-secondary uppercase tracking-wider">{t('admin.supportHelpdesk.team.table.avgTime')}</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-secondary uppercase tracking-wider">{t('admin.supportHelpdesk.team.table.rating')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 bg-surface">
                        {agents.map((agent, idx) => (
                            <tr key={idx} className="hover:bg-surface-elevated/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                        <AppImage src={agent.avatar} alt={agent.name} className="w-8 h-8 rounded-full" />
                                        <div>
                                            <div className="text-sm font-medium text-primary">{agent.name}</div>
                                            <div className="text-xs text-secondary">{agent.role}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-primary">
                                    {agent.resolved}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-secondary">
                                    {agent.avgTime}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-primary">
                                    <span className="inline-flex items-center gap-1 text-yellow-500">
                                        ★ {agent.rating}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TeamPerformance;
