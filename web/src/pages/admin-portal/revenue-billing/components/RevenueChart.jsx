import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { AdminEmptyState } from '../../ui/AdminPagePrimitives';

const RevenueChart = ({ data = [], availability }) => {
    const { t } = useLanguage();
    const hasRevenue = data.some((item) => item.revenue != null && Number(item.revenue) > 0);
    const hasExpenses = availability?.expenses?.available && data.some((item) => item.expenses != null);

    const formatCurrency = (value) => {
        if (value >= 1000000000) {
            return `Rp${(value / 1000000000).toFixed(1)}M`;
        }
        return `Rp${(value / 1000000).toFixed(0)}jt`;
    };

    return (
        <div className="bg-surface border border-border/40 rounded-2xl p-6 h-96">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-primary">{t('admin.revenueBilling.charts.revenueGrowth.title')}</h3>
                    <p className="text-sm text-secondary">{t('admin.revenueBilling.charts.revenueGrowth.subtitle')}</p>
                </div>
                <select className="bg-background border border-border/40 text-sm rounded-lg px-3 py-1 text-primary focus:outline-none focus:ring-2 focus:ring-accent/20">
                    <option>{t('admin.revenueBilling.charts.timeRanges.last12Months')}</option>
                    <option>{t('admin.revenueBilling.charts.timeRanges.last6Months')}</option>
                    <option>{t('admin.revenueBilling.charts.timeRanges.last30Days')}</option>
                </select>
            </div>

            <div className="h-72 w-full">
                {hasRevenue ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={data}
                            margin={{
                                top: 10,
                                right: 10,
                                left: 0,
                                bottom: 0,
                            }}
                        >
                        <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#A08A48" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#A08A48" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                            tickFormatter={formatCurrency}
                            width={80}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--surface-elevated)',
                                borderColor: 'var(--border)',
                                borderRadius: '0.75rem',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                            }}
                            itemStyle={{ color: 'var(--text-primary)' }}
                            labelStyle={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}
                            formatter={(value) => [`Rp ${(value).toLocaleString('id-ID')}`, undefined]}
                        />
                        <Area
                            type="monotone"
                            dataKey="revenue"
                            name={t('admin.revenueBilling.charts.legend.revenue')}
                            stroke="#A08A48"
                            fillOpacity={1}
                            fill="url(#colorRevenue)"
                            strokeWidth={2}
                        />
                        {hasExpenses && (
                            <Area
                                type="monotone"
                                dataKey="expenses"
                                name={t('admin.revenueBilling.charts.legend.expenses')}
                                stroke="#EF4444"
                                fillOpacity={1}
                                fill="url(#colorExpenses)"
                                strokeWidth={2}
                            />
                        )}
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <AdminEmptyState
                        icon="LineChart"
                        title="Revenue trend belum tersedia"
                        description={availability?.payments?.notes?.[0] || 'Belum ada payment intent settled/paid untuk ditampilkan.'}
                    />
                )}
            </div>
        </div>
    );
};

export default RevenueChart;
