import React from 'react';
import AppIcon from '../../../../components/AppIcon';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AnalyticsOverview = () => {

    // Dummy Data for Patient Flow
    const trafficData = [
        { time: '08:00', patients: 12 },
        { time: '10:00', patients: 28 },
        { time: '12:00', patients: 45 },
        { time: '14:00', patients: 38 },
        { time: '16:00', patients: 52 },
        { time: '18:00', patients: 24 },
        { time: '20:00', patients: 15 },
    ];

    const stats = [
        { label: 'Total Patients', value: '1,284', change: '+12.5%', trend: 'up', icon: 'Users', color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { label: 'Avg. Wait Time', value: '14m', change: '-2.3%', trend: 'down', icon: 'Clock', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        { label: 'Retention Rate', value: '88%', change: '+5.4%', trend: 'up', icon: 'Heart', color: 'text-rose-500', bg: 'bg-rose-500/10' },
        { label: 'Satisfaction', value: '4.8/5', change: '+0.1', trend: 'up', icon: 'Star', color: 'text-amber-500', bg: 'bg-amber-500/10' },
    ];

    return (
        <div className="space-y-6">
            {/* Vitals Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, index) => (
                    <div key={index} className="bg-surface border border-primary/10 rounded-2xl p-5 hover:border-primary/20 transition-all shadow-sm group">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                                <AppIcon name={stat.icon} size={20} />
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${stat.trend === 'up' ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'
                                } flex items-center gap-1`}>
                                <AppIcon name={stat.trend === 'up' ? 'TrendingUp' : 'TrendingDown'} size={12} />
                                {stat.change}
                            </span>
                        </div>
                        <div>
                            <span className="text-secondary text-xs uppercase tracking-wider font-semibold">{stat.label}</span>
                            <h3 className="text-2xl font-bold text-primary mt-1">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Patient Flow Chart */}
                <div className="lg:col-span-2 bg-surface border border-primary/10 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                                <AppIcon name="Activity" size={18} className="text-emerald-500" />
                                Patient Flow (Traffic)
                            </h3>
                            <p className="text-sm text-secondary">Real-time clinic visitations</p>
                        </div>
                        <button className="p-2 hover:bg-surface-elevated rounded-lg text-secondary hover:text-primary transition-colors">
                            <AppIcon name="MoreHorizontal" size={20} />
                        </button>
                    </div>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trafficData}>
                                <defs>
                                    <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '4 4' }}
                                />
                                <Area type="monotone" dataKey="patients" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorTraffic)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Demographics / Quick Stats */}
                <div className="space-y-6">
                    <div className="bg-surface border border-primary/10 rounded-3xl p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                            <AppIcon name="Map" size={18} className="text-blue-500" />
                            Demographics
                        </h3>
                        <div className="space-y-4">
                            {[
                                { label: 'Local Residents', value: 65, color: 'bg-blue-500' },
                                { label: 'Referrals', value: 25, color: 'bg-emerald-500' },
                                { label: 'International', value: 10, color: 'bg-amber-500' },
                            ].map((item, idx) => (
                                <div key={idx} className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-secondary">{item.label}</span>
                                        <span className="font-bold text-primary">{item.value}%</span>
                                    </div>
                                    <div className="w-full bg-surface-elevated rounded-full h-2 overflow-hidden">
                                        <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.value}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2 opacity-90">
                                <AppIcon name="Zap" size={16} />
                                <span className="text-xs font-bold uppercase tracking-wider">AI Insight</span>
                            </div>
                            <h3 className="text-lg font-bold mb-2">Visit Peak Predicted</h3>
                            <p className="text-sm opacity-90 mb-4">Expect 25% higher traffic tomorrow between 10 AM - 2 PM due to seasonal trends.</p>
                            <button className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold py-2 px-4 rounded-xl transition-colors backdrop-blur-sm border border-white/20">
                                View Staffing Plan
                            </button>
                        </div>
                        <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4">
                            <AppIcon name="Activity" size={120} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsOverview;
