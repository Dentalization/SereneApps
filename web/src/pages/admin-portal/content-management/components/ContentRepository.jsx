import React from 'react';
import AppIcon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';

const ContentRepository = () => {
    const { t } = useLanguage();

    const articles = [
        { id: 1, title: 'Understanding Hypertension', category: 'Cardiology', author: 'Dr. Sarah', status: 'published', date: '2023-10-15', views: 1200, department: 'Cardiovascular' },
        { id: 2, title: 'Dental Hygiene 101', category: 'Dentistry', author: 'Dr. John', status: 'review', date: '2023-10-14', views: 0, department: 'Oral Health' },
        { id: 3, title: 'Mental Wellness Guide', category: 'Psychiatry', author: 'Dr. Emily', status: 'draft', date: '2023-10-13', views: 0, department: 'Psychology' },
        { id: 4, title: 'Vaccination Schedule 2024', category: 'Pediatrics', author: 'Dr. Mike', status: 'published', date: '2023-10-10', views: 3400, department: 'Pediatrics' },
        { id: 5, title: 'Nutrition for Diabetics', category: 'Endocrinology', author: 'Dr. Anna', status: 'observation', date: '2023-10-09', views: 850, department: 'Metabolic' },
    ];

    const getStatusConfig = (status) => {
        const configs = {
            published: {
                label: t('admin.contentManagement.status.published') || 'Discharged',
                icon: 'CheckCircle',
                color: 'text-emerald-600 dark:text-emerald-400',
                bg: 'bg-emerald-50 dark:bg-emerald-900/10',
                border: 'border-emerald-200 dark:border-emerald-800'
            },
            review: {
                label: t('admin.contentManagement.status.review') || 'Diagnosis',
                icon: 'Stethoscope',
                color: 'text-amber-600 dark:text-amber-400',
                bg: 'bg-amber-50 dark:bg-amber-900/10',
                border: 'border-amber-200 dark:border-amber-800'
            },
            draft: {
                label: t('admin.contentManagement.status.draft') || 'Triage',
                icon: 'FileText',
                color: 'text-slate-600 dark:text-slate-400',
                bg: 'bg-slate-50 dark:bg-slate-900/10',
                border: 'border-slate-200 dark:border-slate-800'
            },
            observation: {
                label: t('admin.contentManagement.status.observation') || 'Observation',
                icon: 'Activity',
                color: 'text-blue-600 dark:text-blue-400',
                bg: 'bg-blue-50 dark:bg-blue-900/10',
                border: 'border-blue-200 dark:border-blue-800'
            },
        };
        return configs[status];
    };

    return (
        <div className="space-y-6">
            {/* Filter Bar */}
            <div className="bg-surface-elevated border border-primary/10 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
                <div className="flex items-center gap-2 flex-1 w-full relative">
                    <AppIcon name="Search" size={18} className="absolute left-3 text-secondary" />
                    <input
                        type="text"
                        placeholder="Search medical library..."
                        className="w-full bg-surface border border-primary/15 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all font-medium placeholder:text-secondary/70"
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
                    <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-primary/15 bg-surface text-secondary hover:text-primary list-hover-scale text-sm font-medium whitespace-nowrap transition-all">
                        <AppIcon name="Filter" size={16} />
                        <span>Filter by Specialist</span>
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-primary/15 bg-surface text-secondary hover:text-primary list-hover-scale text-sm font-medium whitespace-nowrap transition-all">
                        <AppIcon name="Calendar" size={16} />
                        <span>Date Range</span>
                    </button>
                </div>
            </div>

            {/* Medical Library List */}
            <div className="grid grid-cols-1 gap-4">
                {articles.map((article) => {
                    const status = getStatusConfig(article.status);
                    return (
                        <div key={article.id} className="group bg-surface border border-primary/10 rounded-2xl p-5 hover:border-primary/20 hover:shadow-lg transition-all cursor-pointer relative overflow-hidden">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                {/* Icon & Main Info */}
                                <div className="flex gap-4 flex-1">
                                    <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-surface-elevated border border-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                        <AppIcon name="FileText" size={24} className="text-secondary group-hover:text-indigo-500 transition-colors" />
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${status.bg} ${status.color} ${status.border}`}>
                                                <AppIcon name={status.icon} size={10} />
                                                {status.label}
                                            </span>
                                            <span className="text-[10px] text-secondary/60 font-mono tracking-wider">REF-{1000 + article.id}</span>
                                        </div>

                                        <h3 className="text-lg font-bold text-primary group-hover:text-indigo-600 transition-colors">
                                            {article.title}
                                        </h3>

                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-secondary">
                                            <span className="flex items-center gap-1.5" title="Department">
                                                <AppIcon name="Layout" size={14} className="text-secondary/70" />
                                                {article.department}
                                            </span>
                                            <span className="w-1 h-1 rounded-full bg-secondary/30"></span>
                                            <span className="flex items-center gap-1.5" title="Specialist">
                                                <AppIcon name="User" size={14} className="text-secondary/70" />
                                                {article.author}
                                            </span>
                                            <span className="w-1 h-1 rounded-full bg-secondary/30"></span>
                                            <span className="flex items-center gap-1.5" title="Last Updated">
                                                <AppIcon name="Calendar" size={14} className="text-secondary/70" />
                                                {article.date}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Stats & Actions */}
                                <div className="flex items-center justify-between md:justify-end gap-6 md:w-auto min-w-[200px] border-t md:border-t-0 border-primary/5 pt-4 md:pt-0">
                                    <div className="text-right px-4 border-r border-primary/10 hidden md:block">
                                        <span className="block text-[10px] text-secondary uppercase tracking-wider font-semibold mb-0.5">Readership</span>
                                        <div className="flex items-center gap-1.5 justify-end">
                                            <AppIcon name="bar-chart-2" size={14} className="text-emerald-500" />
                                            <span className="font-mono text-base font-bold text-primary">{article.views.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button className="p-2.5 rounded-xl border border-primary/10 text-secondary hover:text-indigo-600 hover:bg-surface-elevated transition-all hover:scale-105 active:scale-95" title="Edit Record">
                                            <AppIcon name="Edit3" size={18} />
                                        </button>
                                        <button className="p-2.5 rounded-xl border border-primary/10 text-secondary hover:text-emerald-600 hover:bg-surface-elevated transition-all hover:scale-105 active:scale-95" title="View Details">
                                            <AppIcon name="ArrowRight" size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Pagination */}
            <div className="flex justify-center pt-6">
                <nav className="flex items-center gap-1 bg-surface-elevated border border-primary/10 p-1 rounded-2xl shadow-sm">
                    <button className="w-10 h-10 rounded-xl flex items-center justify-center text-secondary hover:bg-surface hover:text-primary transition-colors">
                        <AppIcon name="ChevronLeft" size={18} />
                    </button>
                    <button className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold text-sm">1</button>
                    <button className="w-10 h-10 rounded-xl flex items-center justify-center text-secondary hover:bg-surface hover:text-primary transition-colors text-sm font-medium">2</button>
                    <button className="w-10 h-10 rounded-xl flex items-center justify-center text-secondary hover:bg-surface hover:text-primary transition-colors text-sm font-medium">3</button>
                    <button className="w-10 h-10 rounded-xl flex items-center justify-center text-secondary hover:bg-surface hover:text-primary transition-colors">
                        <AppIcon name="ChevronRight" size={18} />
                    </button>
                </nav>
            </div>
        </div>
    );
};

export default ContentRepository;
