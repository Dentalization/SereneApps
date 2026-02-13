import React from 'react';
import AppIcon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';

const RecentTickets = () => {
    const { t } = useLanguage();

    const tickets = [
        {
            id: 'TKT-1023',
            subject: 'Unable to process payment for Invoice #450',
            requester: 'Smile Dental (Dr. Sarah)',
            priority: 'high',
            status: 'open',
            time: '2 mins ago',
        },
        {
            id: 'TKT-1022',
            subject: 'Question about AI Model credits',
            requester: 'Healthy Teeth Center',
            priority: 'medium',
            status: 'inProgress',
            time: '1 hour ago',
        },
        {
            id: 'TKT-1021',
            subject: 'Feature request: Export patient data',
            requester: 'Bright Smile Studio',
            priority: 'low',
            status: 'resolved',
            time: '3 hours ago',
        },
        {
            id: 'TKT-1020',
            subject: 'Login issues for new staff member',
            requester: 'Gentle Care Dental',
            priority: 'high',
            status: 'closed',
            time: 'Yesterday',
        },
        {
            id: 'TKT-1019',
            subject: 'Billing cycle clarification',
            requester: 'Ortho Plus',
            priority: 'medium',
            status: 'resolved',
            time: 'Yesterday',
        },
    ];

    const getPriorityBadge = (priority) => {
        switch (priority) {
            case 'high':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        {t('admin.supportHelpdesk.tickets.priority.high')}
                    </span>
                );
            case 'medium':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                        {t('admin.supportHelpdesk.tickets.priority.medium')}
                    </span>
                );
            case 'low':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {t('admin.supportHelpdesk.tickets.priority.low')}
                    </span>
                );
            default:
                return null;
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'open':
                return <span className="text-orange-600 dark:text-orange-400 font-medium text-xs">{t('admin.supportHelpdesk.tickets.status.open')}</span>;
            case 'inProgress':
                return <span className="text-blue-600 dark:text-blue-400 font-medium text-xs">{t('admin.supportHelpdesk.tickets.status.inProgress')}</span>;
            case 'resolved':
                return <span className="text-green-600 dark:text-green-400 font-medium text-xs">{t('admin.supportHelpdesk.tickets.status.resolved')}</span>;
            case 'closed':
                return <span className="text-gray-600 dark:text-gray-400 font-medium text-xs">{t('admin.supportHelpdesk.tickets.status.closed')}</span>;
            default:
                return null;
        }
    };

    return (
        <div className="bg-surface border border-border/40 rounded-2xl overflow-hidden h-full">
            <div className="p-6 border-b border-border/40 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-primary">{t('admin.supportHelpdesk.tickets.title')}</h3>
                <button className="text-sm font-medium text-accent hover:text-accent/80 transition-colors">
                    {t('admin.supportHelpdesk.tickets.viewAll')}
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-surface-elevated">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{t('admin.supportHelpdesk.tickets.table.subject')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{t('admin.supportHelpdesk.tickets.table.requester')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{t('admin.supportHelpdesk.tickets.table.priority')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{t('admin.supportHelpdesk.tickets.table.status')}</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-secondary uppercase tracking-wider">{t('admin.supportHelpdesk.tickets.table.time')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 bg-surface">
                        {tickets.map((ticket) => (
                            <tr key={ticket.id} className="hover:bg-surface-elevated/50 transition-colors cursor-pointer">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-surface-elevated flex items-center justify-center border border-border/40 shrink-0">
                                            <span className="text-xs font-bold text-secondary">#{ticket.id.split('-')[1]}</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-primary line-clamp-1">{ticket.subject}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                                    {ticket.requester}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {getPriorityBadge(ticket.priority)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {getStatusBadge(ticket.status)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-xs text-secondary">
                                    {ticket.time}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default RecentTickets;
