import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useLanguage } from '../../../../contexts/LanguageContext';

const TicketVolumeChart = () => {
    const { t } = useLanguage();

    const data = [
        { name: 'Mon', new: 12, resolved: 10 },
        { name: 'Tue', new: 19, resolved: 15 },
        { name: 'Wed', new: 15, resolved: 18 },
        { name: 'Thu', new: 22, resolved: 20 },
        { name: 'Fri', new: 18, resolved: 22 },
        { name: 'Sat', new: 8, resolved: 6 },
        { name: 'Sun', new: 5, resolved: 4 },
    ];

    return (
        <div className="bg-surface border border-border/40 rounded-2xl p-6 h-96">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-primary">{t('admin.supportHelpdesk.charts.ticketVolume.title')}</h3>
                    <p className="text-sm text-secondary">{t('admin.supportHelpdesk.charts.ticketVolume.subtitle')}</p>
                </div>
                <select className="bg-background border border-border/40 text-sm rounded-lg px-3 py-1 text-primary focus:outline-none focus:ring-2 focus:ring-accent/20">
                    <option>{t('admin.supportHelpdesk.charts.timeRanges.last7Days')}</option>
                    <option>{t('admin.supportHelpdesk.charts.timeRanges.last30Days')}</option>
                    <option>{t('admin.supportHelpdesk.charts.timeRanges.last90Days')}</option>
                </select>
            </div>

            <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{
                            top: 10,
                            right: 30,
                            left: 0,
                            bottom: 0,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                        <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip
                            cursor={{ fill: 'var(--surface-elevated)', opacity: 0.4 }}
                            contentStyle={{
                                backgroundColor: 'var(--surface-elevated)',
                                borderColor: 'var(--border)',
                                borderRadius: '0.75rem',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                            }}
                            itemStyle={{ color: 'var(--text-primary)' }}
                        />
                        <Legend verticalAlign="top" height={36} iconType="circle" />
                        <Bar
                            dataKey="new"
                            name={t('admin.supportHelpdesk.charts.legend.new')}
                            fill="#f97316" // Orange-500
                            radius={[4, 4, 0, 0]}
                            barSize={30}
                        />
                        <Bar
                            dataKey="resolved"
                            name={t('admin.supportHelpdesk.charts.legend.resolved')}
                            fill="#14b8a6" // Teal-500
                            radius={[4, 4, 0, 0]}
                            barSize={30}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default TicketVolumeChart;
