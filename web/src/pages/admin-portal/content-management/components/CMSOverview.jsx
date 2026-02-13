import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AppIcon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';

const CMSOverview = () => {
    const { t } = useLanguage();

    const data = [
        { name: 'Mon', views: 4000, reads: 2400 },
        { name: 'Tue', views: 3000, reads: 1398 },
        { name: 'Wed', views: 2000, reads: 9800 },
        { name: 'Thu', views: 2780, reads: 3908 },
        { name: 'Fri', views: 1890, reads: 4800 },
        { name: 'Sat', views: 2390, reads: 3800 },
        { name: 'Sun', views: 3490, reads: 4300 },
    ];

    const metrics = [
        {
            id: 'active',
            label: t('admin.contentManagement.overview.activeArticles') || 'Active Articles',
            value: '1,245',
            change: '+12%',
            trend: 'up',
            icon: 'FileText',
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10'
        },
        {
            id: 'views',
            label: t('admin.contentManagement.overview.totalViews') || 'Total Views',
            value: '45.2K',
            change: '+8.5%',
            trend: 'up',
            icon: 'Eye',
            color: 'text-blue-500',
            bg: 'bg-blue-500/10'
        },
        {
            id: 'engagement',
            label: t('admin.contentManagement.overview.avgReadTime') || 'Avg. Read Time',
            value: '4m 12s',
            change: '-2%',
            trend: 'down',
            icon: 'Clock',
            color: 'text-purple-500',
            bg: 'bg-purple-500/10'
        },
    ];

    const recentUpdates = [
        { id: 1, title: 'Summer Health Tips', action: 'Published', time: '2 hours ago', user: 'Dr. Sarah', type: 'marketing' },
        { id: 2, title: 'Cardiology Basics', action: 'Edited', time: '4 hours ago', user: 'Admin', type: 'education' },
        { id: 3, title: 'New Clinic Opening', action: 'Draft Created', time: '1 day ago', user: 'Marketing Team', type: 'announcement' },
    ];

    return (
        <div className="space-y-6">
            {/* Content Pulse Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {metrics.map((metric) => (
                    <div key={metric.id} className="bg-surface-elevated border border-primary/10 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${metric.bg} ${metric.color}`}>
                                <AppIcon name={metric.icon} size={20} />
                            </div>
                            <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg ${metric.trend === 'up' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'text-rose-600 bg-rose-50 dark:bg-rose-900/20'
                                }`}>
                                <AppIcon name={metric.trend === 'up' ? 'TrendingUp' : 'TrendingDown'} size={12} />
                                {metric.change}
                            </div>
                        </div>
                        <div>
                            <p className="text-secondary text-sm mb-1">{metric.label}</p>
                            <h3 className="text-3xl font-bold text-primary tracking-tight">{metric.value}</h3>
                        </div>
                        {/* Mini Pulse Line for effect */}
                        <div className="mt-4 h-1 w-full bg-primary/5 rounded-full overflow-hidden">
                            <div className={`h-full ${metric.bg.replace('/10', '')} w-2/3 rounded-full animate-pulse opacity-50`}></div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Engagement Vitals Chart */}
                <div className="lg:col-span-2 bg-surface-elevated border border-primary/10 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                                <AppIcon name="Activity" size={20} className="text-emerald-500" />
                                {t('admin.contentManagement.overview.engagementVitals') || 'Engagement Vitals'}
                            </h3>
                            <p className="text-sm text-secondary">Readership trends over time</p>
                        </div>
                        <select className="bg-surface border border-primary/15 rounded-xl text-sm px-3 py-1.5 outline-none focus:border-emerald-500">
                            <option>Last 7 Days</option>
                            <option>Last 30 Days</option>
                        </select>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorReads" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    itemStyle={{ color: '#1e293b' }}
                                />
                                <Area type="monotone" dataKey="views" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
                                <Area type="monotone" dataKey="reads" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorReads)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Clinical Notes (Recent Activity) */}
                <div className="bg-surface-elevated border border-primary/10 rounded-3xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-primary mb-1 flex items-center gap-2">
                        <AppIcon name="ClipboardList" size={20} className="text-blue-500" />
                        {t('admin.contentManagement.overview.clinicalNotes') || 'Clinical Notes'}
                    </h3>
                    <p className="text-sm text-secondary mb-6">Recent ecosystem updates</p>

                    <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:h-full before:w-px before:bg-primary/10">
                        {recentUpdates.map((update, idx) => (
                            <div key={update.id} className="relative pl-10">
                                <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full border-2 border-surface bg-emerald-500 z-10"></div>
                                <div className="bg-surface border border-primary/5 rounded-xl p-3 hover:bg-surface-elevated transition-colors">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-bold text-primary">{update.time}</span>
                                        <span className="text-[10px] uppercase tracking-wider text-secondary">{update.type}</span>
                                    </div>
                                    <p className="text-sm font-medium text-primary mb-1">{update.title}</p>
                                    <p className="text-xs text-secondary flex items-center gap-1">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] bg-primary/5 text-primary`}>{update.action}</span>
                                        <span>by {update.user}</span>
                                    </p>
                                </div>
                            </div>
                        ))}
                        <button className="w-full py-2 text-xs font-medium text-secondary hover:text-primary border border-dashed border-primary/20 rounded-xl hover:bg-primary/5 transition-colors">
                            View All History
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CMSOverview;
