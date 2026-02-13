import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AppIcon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';

const PartnershipOverview = () => {
    const { t } = useLanguage();

    const data = [
        { month: 'Jan', partners: 5 },
        { month: 'Feb', partners: 8 },
        { month: 'Mar', partners: 12 },
        { month: 'Apr', partners: 15 },
        { month: 'May', partners: 22 },
        { month: 'Jun', partners: 28 },
    ];

    const activities = [
        { id: 1, type: 'New Integration', partner: 'MediLab Diagnostics', time: '2 hours ago', status: 'healthy' },
        { id: 2, type: 'API Warning', partner: 'QuickCare Pharmacy', time: '5 hours ago', status: 'critical' },
        { id: 3, type: 'Contract Renewal', partner: 'City Health Clinic', time: '1 day ago', status: 'stable' },
        { id: 4, type: 'System Update', partner: 'All Partners', time: '2 days ago', status: 'healthy' },
    ];

    const StatusDot = ({ status }) => {
        const colors = {
            healthy: 'bg-emerald-500',
            critical: 'bg-rose-500',
            stable: 'bg-sky-500',
        };
        return <span className={`w-2.5 h-2.5 rounded-full ${colors[status]} inline-block shadow-sm animate-pulse`}></span>;
    };

    return (
        <div className="space-y-6">
            {/* Vitals Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-surface border border-border/40 rounded-3xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <AppIcon name="Users" size={64} className="text-indigo-500" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <StatusDot status="healthy" />
                        <span className="text-xs font-bold uppercase tracking-wider text-secondary">{t('admin.partnerships.overview.activePartners')}</span>
                    </div>
                    <div className="text-4xl font-bold text-primary mb-1">28</div>
                    <div className="text-xs text-emerald-500 flex items-center">
                        <AppIcon name="TrendingUp" size={14} className="mr-1" /> +12% this month
                    </div>
                </div>

                <div className="bg-surface border border-border/40 rounded-3xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <AppIcon name="Server" size={64} className="text-purple-500" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <StatusDot status="stable" />
                        <span className="text-xs font-bold uppercase tracking-wider text-secondary">{t('admin.partnerships.overview.apiCalls')}</span>
                    </div>
                    <div className="text-4xl font-bold text-primary mb-1">1.2M</div>
                    <div className="text-xs text-secondary">~850/min peak</div>
                </div>

                <div className="bg-surface border border-border/40 rounded-3xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <AppIcon name="DollarSign" size={64} className="text-emerald-500" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <StatusDot status="healthy" />
                        <span className="text-xs font-bold uppercase tracking-wider text-secondary">{t('admin.partnerships.overview.revenueShare')}</span>
                    </div>
                    <div className="text-4xl font-bold text-primary mb-1">$45k</div>
                    <div className="text-xs text-emerald-500 flex items-center">
                        <AppIcon name="TrendingUp" size={14} className="mr-1" /> +8% vs last month
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Growth Chart */}
                <div className="lg:col-span-2 bg-surface border border-border/40 rounded-3xl p-6">
                    <h3 className="font-bold text-primary mb-6 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                            <AppIcon name="Activity" size={18} />
                        </div>
                        {t('admin.partnerships.overview.growthVitals')}
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorPartners" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: '12px' }}
                                    itemStyle={{ color: 'var(--text-primary)' }}
                                />
                                <Area type="monotone" dataKey="partners" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorPartners)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Activity Feed - Clinical Notes Style */}
                <div className="bg-surface border border-border/40 rounded-3xl p-6 flex flex-col">
                    <h3 className="font-bold text-primary mb-6 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600">
                            <AppIcon name="Clipboard" size={18} />
                        </div>
                        {t('admin.partnerships.overview.recentActivity')}
                    </h3>
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                        {activities.map((activity) => (
                            <div key={activity.id} className="relative pl-6 pb-2 border-l-2 border-border/50 last:border-0">
                                <span className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-background ${activity.status === 'healthy' ? 'bg-emerald-500' :
                                        activity.status === 'critical' ? 'bg-rose-500' : 'bg-sky-500'
                                    }`}></span>
                                <div>
                                    <p className="text-sm font-medium text-primary">{activity.type}</p>
                                    <p className="text-xs text-secondary">{activity.partner}</p>
                                    <p className="text-[10px] text-muted-foreground mt-1 font-mono">{activity.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button className="w-full mt-4 py-2 text-sm text-indigo-600 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/10 rounded-xl transition-colors">
                        View Full History
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PartnershipOverview;
