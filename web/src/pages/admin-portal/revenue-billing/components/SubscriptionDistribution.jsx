import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useLanguage } from '../../../../contexts/LanguageContext';

const SubscriptionDistribution = () => {
    const { t } = useLanguage();

    const data = [
        { name: t('admin.revenueBilling.charts.subscriptionTiers.tiers.basic'), value: 450, color: '#94A3B8' },
        { name: t('admin.revenueBilling.charts.subscriptionTiers.tiers.professional'), value: 320, color: '#A08A48' },
        { name: t('admin.revenueBilling.charts.subscriptionTiers.tiers.enterprise'), value: 110, color: '#1E293B' }, // Dark slate for Enterprise (or secondary color)
    ];

    const RADIAN = Math.PI / 180;
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12} fontWeight="bold">
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <div className="bg-surface border border-border/40 rounded-2xl p-6 h-96">
            <h3 className="text-lg font-semibold text-primary mb-1">{t('admin.revenueBilling.charts.subscriptionTiers.title')}</h3>
            <p className="text-sm text-secondary mb-4">{t('admin.revenueBilling.charts.subscriptionTiers.subtitle')}</p>

            <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={renderCustomizedLabel}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            strokeWidth={0}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--surface-elevated)',
                                borderColor: 'var(--border)',
                                borderRadius: '0.75rem',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                            }}
                            itemStyle={{ color: 'var(--text-primary)' }}
                        />
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            wrapperStyle={{ paddingTop: '20px' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default SubscriptionDistribution;
