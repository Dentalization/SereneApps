import React from 'react';
import AppIcon from '../../../../components/AppIcon';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const PerformanceMetrics = () => {

    // Dummy Data for Treatment Efficacy
    const efficacyData = [
        { treatment: 'Consultations', success: 92, active: true },
        { treatment: 'Procedures', success: 88, active: false },
        { treatment: 'Follow-ups', success: 95, active: false },
        { treatment: 'Emergency', success: 85, active: false },
    ];

    const systemVitals = [
        { label: 'Server Uptime', value: '99.99%', status: 'healthy' },
        { label: 'API Latency', value: '45ms', status: 'healthy' },
        { label: 'Error Rate', value: '0.02%', status: 'healthy' },
        { label: 'Database Load', value: '34%', status: 'stable' },
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Treatment Efficacy Chart */}
                <div className="lg:col-span-2 bg-surface border border-primary/10 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                                <AppIcon name="BarChart2" size={18} className="text-indigo-500" />
                                Treatment Efficacy
                            </h3>
                            <p className="text-sm text-secondary">Success rates across service types</p>
                        </div>
                    </div>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={efficacyData} layout="vertical" barSize={24}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} domain={[0, 100]} />
                                <YAxis dataKey="treatment" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} width={100} />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Bar dataKey="success" radius={[0, 4, 4, 0]}>
                                    {efficacyData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.active ? '#6366f1' : '#cbd5e1'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* System Vitals Panel */}
                <div className="bg-surface border border-primary/10 rounded-3xl p-6 shadow-sm flex flex-col">
                    <h3 className="text-lg font-bold text-primary mb-6 flex items-center gap-2">
                        <AppIcon name="Server" size={18} className="text-emerald-500" />
                        System Vitals
                    </h3>

                    <div className="space-y-6 flex-1">
                        {systemVitals.map((vital, idx) => (
                            <div key={idx} className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${vital.status === 'healthy' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                                            vital.status === 'stable' ? 'bg-blue-500' : 'bg-amber-500'
                                        }`}></div>
                                    <span className="text-sm text-secondary group-hover:text-primary transition-colors">{vital.label}</span>
                                </div>
                                <span className="font-mono font-bold text-primary">{vital.value}</span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 pt-6 border-t border-primary/5">
                        <div className="flex items-center gap-4 bg-surface-elevated p-4 rounded-xl border border-primary/5">
                            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-600">
                                <AppIcon name="CheckCircle" size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide">All Systems Operational</p>
                                <p className="text-xs text-secondary">Last checked: Just now</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { label: 'Patient Satisfaction', value: '98%', desc: 'Post-visit surveys', icon: 'Smile', color: 'text-emerald-500' },
                    { label: 'Staff Efficiency', value: '94%', desc: 'Task completion rate', icon: 'Zap', color: 'text-amber-500' },
                    { label: 'Appointment Fill Rate', value: '89%', desc: 'Occupancy vs Capacity', icon: 'Calendar', color: 'text-blue-500' },
                ].map((kpi, idx) => (
                    <div key={idx} className="bg-surface border border-primary/10 rounded-2xl p-5 flex items-center gap-4">
                        <div className={`p-3 rounded-full bg-surface-elevated border border-primary/5 ${kpi.color}`}>
                            <AppIcon name={kpi.icon} size={24} />
                        </div>
                        <div>
                            <span className="block text-2xl font-bold text-primary">{kpi.value}</span>
                            <span className="text-xs text-secondary font-medium">{kpi.label}</span>
                            <span className="block text-[10px] text-secondary/60 mt-0.5">{kpi.desc}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PerformanceMetrics;
