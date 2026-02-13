import React from 'react';
import AppIcon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';

const PublicationWorkflow = () => {
    const { t } = useLanguage();

    const stages = [
        {
            id: 'draft',
            label: t('admin.contentManagement.workflow.draft') || 'Triage (Draft)',
            icon: 'Edit3',
            color: 'text-slate-600 dark:text-slate-400',
            bg: 'bg-slate-50 dark:bg-slate-900/10',
            border: 'border-slate-200 dark:border-slate-800'
        },
        {
            id: 'review',
            label: t('admin.contentManagement.workflow.review') || 'Clinical Review',
            icon: 'Stethoscope',
            color: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-50 dark:bg-blue-900/10',
            border: 'border-blue-200 dark:border-blue-800'
        },
        {
            id: 'approval',
            label: t('admin.contentManagement.workflow.approval') || 'Diagnosis',
            icon: 'FileCheck',
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-50 dark:bg-amber-900/10',
            border: 'border-amber-200 dark:border-amber-800'
        },
        {
            id: 'published',
            label: t('admin.contentManagement.workflow.published') || 'Discharged',
            icon: 'Globe',
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-50 dark:bg-emerald-900/10',
            border: 'border-emerald-200 dark:border-emerald-800'
        },
    ];

    const contentItems = [
        { id: 1, title: 'Pediatric Care Guidelines', type: 'Protocol', author: 'Dr. Emily', status: 'review', priority: 'high', due: 'Tomorrow', code: 'PRO-102' },
        { id: 2, title: 'New Visitor Policy', type: 'Announcement', author: 'Admin', status: 'draft', priority: 'normal', due: 'Next Week', code: 'ANN-205' },
        { id: 3, title: 'Annual Health Report', type: 'Report', author: 'Dr. Sarah', status: 'published', priority: 'normal', due: 'Completed', code: 'REP-992' },
        { id: 4, title: 'Telehealth User Guide', type: 'Education', author: 'Support Team', status: 'approval', priority: 'urgent', due: 'Today', code: 'EDU-301' },
        { id: 5, title: 'Flu Shot Campaign', type: 'Marketing', author: 'Marketing', status: 'draft', priority: 'normal', due: 'In 3 days', code: 'MKT-112' },
    ];

    const getPriorityBadge = (priority) => {
        const styles = {
            high: 'text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800',
            urgent: 'text-white bg-rose-500 border-rose-600 shadow-sm animate-pulse',
            normal: 'text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-900/20 dark:border-slate-800',
        };
        const icons = {
            high: 'AlertTriangle',
            urgent: 'Zap',
            normal: 'Clock',
        };
        return (
            <span className={`flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-lg border ${styles[priority]}`}>
                <AppIcon name={icons[priority]} size={10} />
                {priority}
            </span>
        );
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 overflow-x-auto pb-6 min-h-[600px]">
            {stages.map((stage) => {
                const stageItems = contentItems.filter(item => item.status === stage.id);

                return (
                    <div key={stage.id} className="flex-1 min-w-[300px] flex flex-col group/column">
                        {/* Column Header */}
                        <div className="flex items-center justify-between mb-4 px-2">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${stage.bg} ${stage.color} ${stage.border}`}>
                                    <AppIcon name={stage.icon} size={16} />
                                </div>
                                <span className="font-bold text-primary text-sm">{stage.label}</span>
                            </div>
                            <span className="bg-surface border border-primary/10 px-2 py-0.5 rounded-full text-xs font-mono font-medium text-secondary">
                                {stageItems.length}
                            </span>
                        </div>

                        {/* Drop Zone / List */}
                        <div className={`space-y-4 flex-1 p-2 rounded-2xl border ${stage.border} ${stage.bg} bg-opacity-30`}>
                            {stageItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="bg-surface border border-primary/5 rounded-xl p-4 shadow-sm hover:border-indigo-500/30 hover:shadow-md transition-all cursor-move group/card relative"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-mono text-secondary/60 bg-primary/5 px-1.5 py-0.5 rounded uppercase">{item.code}</span>
                                        </div>
                                        {getPriorityBadge(item.priority)}
                                    </div>

                                    <h4 className="font-bold text-primary mb-1 group-hover/card:text-indigo-600 transition-colors line-clamp-2">
                                        {item.title}
                                    </h4>

                                    <p className="text-xs text-secondary mb-4">{item.type} • {item.author}</p>

                                    <div className="border-t border-dashed border-primary/10 pt-3 flex justify-between items-center">
                                        <div className="flex items-center gap-1.5 text-xs font-medium text-secondary group-hover/card:text-primary transition-colors">
                                            <AppIcon name="Clock" size={12} />
                                            <span>{item.due}</span>
                                        </div>
                                        <button className="opacity-0 group-hover/card:opacity-100 transition-opacity p-1.5 hover:bg-surface-elevated rounded-lg text-secondary hover:text-indigo-600">
                                            <AppIcon name="MoreHorizontal" size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* Empty State */}
                            {stageItems.length === 0 && (
                                <div className="h-32 rounded-xl flex flex-col items-center justify-center text-center border-2 border-dashed border-primary/5 bg-surface/50">
                                    <AppIcon name="Clipboard" size={20} className="text-secondary/20 mb-2" />
                                    <span className="text-xs text-secondary/40 font-medium">Empty Ward</span>
                                </div>
                            )}

                            {/* Add Button (Only for Draft) */}
                            {stage.id === 'draft' && (
                                <button className="w-full border-2 border-dashed border-primary/10 rounded-xl p-3 text-sm text-secondary hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-2 group/btn">
                                    <div className="w-6 h-6 rounded-full bg-primary/5 flex items-center justify-center group-hover/btn:bg-indigo-100 group-hover/btn:text-indigo-600 transition-colors">
                                        <AppIcon name="Plus" size={14} />
                                    </div>
                                    <span className="font-medium">New Admission</span>
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default PublicationWorkflow;
