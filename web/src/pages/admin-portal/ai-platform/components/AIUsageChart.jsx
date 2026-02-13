import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useLanguage } from '../../../../contexts/LanguageContext';

const AIUsageChart = () => {
    const { t } = useLanguage();

    const data = [
        { name: 'Mon', tokens: 40000, requests: 2400 },
        { name: 'Tue', tokens: 30000, requests: 1398 },
        { name: 'Wed', tokens: 20000, requests: 9800 },
        { name: 'Thu', tokens: 27800, requests: 3908 },
        { name: 'Fri', tokens: 18900, requests: 4800 },
        { name: 'Sat', tokens: 23900, requests: 3800 },
        { name: 'Sun', tokens: 34900, requests: 4300 },
    ];

    return (
        <div className="bg-surface border border-border/40 rounded-2xl p-6 h-96">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-primary">{t('admin.aiPlatform.charts.usageTrends.title')}</h3>
                    <p className="text-sm text-secondary">{t('admin.aiPlatform.charts.usageTrends.subtitle')}</p>
                </div>
                <select className="bg-background border border-border/40 text-sm rounded-lg px-3 py-1 text-primary focus:outline-none focus:ring-2 focus:ring-accent/20">
                    <option>{t('admin.aiPlatform.charts.timeRanges.last7Days')}</option>
                    <option>{t('admin.aiPlatform.charts.timeRanges.last24Hours')}</option>
                    <option>{t('admin.aiPlatform.charts.timeRanges.last30Days')}</option>
                </select>
            </div>

            <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={data}
                        margin={{
                            top: 10,
                            right: 30,
                            left: 0,
                            bottom: 0,
                        }}
                    >
                        <defs>
                            <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--surface-elevated)',
                                borderColor: 'var(--border)',
                                borderRadius: '0.75rem',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                            }}
                            itemStyle={{ color: 'var(--text-primary)' }}
                        />
                        <Legend verticalAlign="top" height={36} />
                        <Area
                            type="monotone"
                            dataKey="tokens"
                            name={t('admin.aiPlatform.charts.legend.tokens')}
                            stroke="#8884d8"
                            fillOpacity={1}
                            fill="url(#colorTokens)"
                        />
                        <Area
                            type="monotone"
                            dataKey="requests"
                            name={t('admin.aiPlatform.charts.legend.requests')}
                            stroke="#82ca9d"
                            fillOpacity={1}
                            fill="url(#colorRequests)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default AIUsageChart;
