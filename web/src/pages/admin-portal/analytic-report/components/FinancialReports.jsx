import React from 'react';
import AppIcon from '../../../../components/AppIcon';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const FinancialReports = () => {
    // Dummy Data
    const revenueDistribution = [
        { name: 'Consultations', value: 45, color: '#6366f1' },
        { name: 'Procedures', value: 30, color: '#10b981' },
        { name: 'Medications', value: 15, color: '#f59e0b' },
        { name: 'Diagnostics', value: 10, color: '#ec4899' },
    ];

    const reports = [
        { id: 1, title: 'Annual Fiscal Report 2023', type: 'PDF', date: 'Jan 15, 2024', size: '2.4 MB' },
        { id: 2, title: 'Q1 Revenue Analysis', type: 'CSV', date: 'Apr 02, 2024', size: '856 KB' },
        { id: 3, title: 'Insurance Claim Summary', type: 'PDF', date: 'May 10, 2024', size: '1.2 MB' },
        { id: 4, title: 'Operational Expenses breakdown', type: 'XLSX', date: 'Jun 28, 2024', size: '1.8 MB' },
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Revenue Breakdown */}
                <div className="bg-surface border border-primary/10 rounded-3xl p-6 shadow-sm flex flex-col">
                    <h3 className="text-lg font-bold text-primary mb-2 flex items-center gap-2">
                        <AppIcon name="PieChart" size={18} className="text-indigo-500" />
                        Revenue Breakdown
                    </h3>
                    <p className="text-sm text-secondary mb-6">Distribution by service type</p>

                    <div className="h-64 w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={revenueDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {revenueDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Text Overlay */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[60%] text-center pointer-events-none">
                            <span className="block text-2xl font-bold text-primary">100%</span>
                            <span className="text-[10px] text-secondary uppercase tracking-wider">Total</span>
                        </div>
                    </div>
                </div>

                {/* Export Center */}
                <div className="bg-surface border border-primary/10 rounded-3xl p-6 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                                <AppIcon name="FileText" size={18} className="text-emerald-500" />
                                Medical Records (Exports)
                            </h3>
                            <p className="text-sm text-secondary">Downloadable financial statements</p>
                        </div>
                        <button className="text-sm text-indigo-600 font-medium hover:underline">View All</button>
                    </div>

                    <div className="space-y-3 flex-1">
                        {reports.map((report) => (
                            <div key={report.id} className="group p-3 rounded-xl border border-primary/10 hover:border-indigo-500/30 hover:bg-surface-elevated transition-all flex items-center justify-between cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-surface border border-primary/5 flex items-center justify-center text-secondary group-hover:text-indigo-600 transition-colors">
                                        <AppIcon name="File" size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-primary group-hover:text-indigo-600 transition-colors">{report.title}</h4>
                                        <p className="text-xs text-secondary">{report.date} • {report.size}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-secondary/50 bg-primary/5 px-1.5 py-0.5 rounded">{report.type}</span>
                                    <button className="p-1.5 hover:bg-surface rounded-lg text-secondary hover:text-primary transition-colors">
                                        <AppIcon name="Download" size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button className="w-full mt-6 py-3 rounded-xl border border-dashed border-primary/20 text-sm font-medium text-secondary hover:text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2">
                        <AppIcon name="Plus" size={16} />
                        <span>Generate Custom Report</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FinancialReports;
