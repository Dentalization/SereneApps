import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AppIcon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';

const SecurityOverview = () => {
    const { t } = useLanguage();

    const score = 98;
    const threatsBlocked = 12450;
    const activeAlerts = 2;
    const compliantDevices = 142;
    const totalDevices = 150;

    const riskLevels = {
        low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        high: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    };

    const trendData = [
        { name: 'Mon', score: 92 },
        { name: 'Tue', score: 94 },
        { name: 'Wed', score: 93 },
        { name: 'Thu', score: 96 },
        { name: 'Fri', score: 98 },
        { name: 'Sat', score: 98 },
        { name: 'Sun', score: 98 },
    ];

    const recentThreats = [
        { type: 'SQL Injection Attempt', source: '213.45.67.89', time: '10 mins ago', risk: 'high' },
        { type: 'Brute Force Login', source: '102.33.44.55', time: '1 hour ago', risk: 'medium' },
        { type: 'Suspicious File Upload', source: 'Internal User', time: '3 hours ago', risk: 'low' },
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Score Card - Medical Vital Style */}
                <div className="bg-surface border border-border/40 rounded-3xl p-6 relative overflow-hidden group hover:shadow-lg transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <AppIcon name="Activity" size={64} className="text-emerald-500" />
                    </div>
                    <h3 className="text-sm font-medium text-secondary mb-2 uppercase tracking-wider">{t('admin.complianceSecurity.overview.scoreLabel')}</h3>
                    <div className="flex items-end gap-3">
                        <span className="text-4xl font-bold text-primary">{score}%</span>
                        <span className="text-sm font-medium text-emerald-500 mb-1.5 flex items-center">
                            <AppIcon name="TrendingUp" size={16} className="mr-1" /> +2.4%
                        </span>
                    </div>
                    <div className="mt-4 h-2 w-full bg-surface-elevated rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 w-[98%] shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                    </div>
                    <p className="mt-3 text-xs text-secondary">{t('admin.complianceSecurity.overview.riskLevel')}: <span className="font-bold text-emerald-600">{t('admin.complianceSecurity.overview.low')}</span></p>
                </div>

                {/* Threats Blocked */}
                <div className="bg-surface border border-border/40 rounded-3xl p-6 relative overflow-hidden group hover:shadow-lg transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <AppIcon name="Shield" size={64} className="text-blue-500" />
                    </div>
                    <h3 className="text-sm font-medium text-secondary mb-2 uppercase tracking-wider">{t('admin.complianceSecurity.overview.threatsBlocked')}</h3>
                    <div className="flex items-end gap-3">
                        <span className="text-4xl font-bold text-primary">{threatsBlocked.toLocaleString()}</span>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs text-secondary">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        Active Protection
                    </div>
                </div>

                {/* Device Hygiene */}
                <div className="bg-surface border border-border/40 rounded-3xl p-6 relative overflow-hidden group hover:shadow-lg transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <AppIcon name="Smartphone" size={64} className="text-purple-500" />
                    </div>
                    <h3 className="text-sm font-medium text-secondary mb-2 uppercase tracking-wider">{t('admin.complianceSecurity.overview.deviceHygiene')}</h3>
                    <div className="flex items-end gap-3">
                        <span className="text-4xl font-bold text-primary">{compliantDevices}/{totalDevices}</span>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-surface-elevated rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 w-[94%]"></div>
                        </div>
                        <span className="text-xs font-medium text-purple-600">94%</span>
                    </div>
                </div>

                {/* Active Alerts */}
                <div className="bg-surface border-l-4 border-rose-500 rounded-3xl p-6 relative overflow-hidden group hover:shadow-lg transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <AppIcon name="AlertTriangle" size={64} className="text-rose-500" />
                    </div>
                    <h3 className="text-sm font-medium text-secondary mb-2 uppercase tracking-wider">{t('admin.complianceSecurity.overview.activeAlerts')}</h3>
                    <div className="flex items-end gap-3">
                        <span className="text-4xl font-bold text-rose-600">{activeAlerts}</span>
                        <span className="text-xs text-rose-500 bg-rose-100 dark:bg-rose-900/30 px-2 py-1 rounded-full mb-1">Critical</span>
                    </div>
                    <p className="mt-4 text-xs text-secondary">Requires immediate attention</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Security Trend Chart */}
                <div className="lg:col-span-2 bg-surface border border-border/40 rounded-3xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h4 className="font-bold text-primary flex items-center gap-2">
                            <AppIcon name="Activity" size={20} className="text-emerald-500" />
                            {t('admin.complianceSecurity.overview.securityTrend')}
                        </h4>
                        <div className="flex gap-2">
                            {['1W', '1M', '3M', '1Y'].map(per => (
                                <button key={per} className={`text-xs px-2 py-1 rounded-lg ${per === '1W' ? 'bg-accent text-white' : 'text-secondary hover:bg-surface-elevated'}`}>
                                    {per}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} domain={[80, 100]} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: '12px' }}
                                    itemStyle={{ color: 'var(--text-primary)' }}
                                />
                                <Area type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Threats List */}
                <div className="bg-surface border border-border/40 rounded-3xl p-0 overflow-hidden">
                    <div className="p-6 border-b border-border/40 bg-surface-elevated/30">
                        <h4 className="font-bold text-primary flex items-center gap-2">
                            <AppIcon name="ShieldAlert" size={20} className="text-rose-500" />
                            Recent Activity
                        </h4>
                    </div>
                    <div className="divide-y divide-border/40">
                        {recentThreats.map((threat, idx) => (
                            <div key={idx} className="p-4 hover:bg-surface-elevated/50 transition-colors">
                                <div className="flex justify-between items-start mb-1">
                                    <h5 className="text-sm font-medium text-primary">{threat.type}</h5>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${riskLevels[threat.risk]}`}>
                                        {t(`admin.complianceSecurity.overview.${threat.risk}`)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs text-secondary">
                                    <span className="font-mono bg-surface-elevated px-1.5 py-0.5 rounded">{threat.source}</span>
                                    <span>{threat.time}</span>
                                </div>
                            </div>
                        ))}
                        <div className="p-4 text-center">
                            <button className="text-sm text-accent font-medium hover:underline">View All Logs</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SecurityOverview;
