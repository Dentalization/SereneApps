import React, { useState } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import Icon from '../../../../components/AppIcon';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar
} from 'recharts';

const AppointmentChart = ({ data, loading = false }) => {
  const { t } = useLanguage();
  const [viewType, setViewType] = useState('trends'); // 'trends', 'distribution', 'efficiency'

  // Safe data extraction
  const trends = data && data.labels ? data : {
    labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
    appointments: [18, 22, 20, 24, 26, 12, 5]
  };

  const chartData = trends.labels.map((label, idx) => ({
    name: label,
    appointments: trends.appointments[idx] || 0
  }));

  // Mock appointment status distribution
  const distributionData = [
    { name: t('reports.completed') || 'Completed', value: 218, color: '#10B981' },
    { name: t('reports.cancelled') || 'Cancelled', value: 18, color: '#F59E0B' },
    { name: t('reports.noShow') || 'No Show', value: 9, color: '#EF4444' }
  ];

  // Efficiency metrics data
  const efficiencyData = trends.labels.map((label, idx) => {
    const total = trends.appointments[idx] || 0;
    const completed = Math.round(total * 0.88);
    const missed = total - completed;
    return {
      name: label,
      [t('reports.completed') || 'Completed']: completed,
      [t('reports.missed') || 'Missed']: missed
    };
  });

  const totalAppointments = trends.appointments.reduce((sum, val) => sum + val, 0);

  const viewOptions = [
    { value: 'trends', label: t('reports.trends') || 'Trends', icon: 'TrendingUp' },
    { value: 'distribution', label: t('reports.distribution') || 'Distribution', icon: 'PieChart' },
    { value: 'efficiency', label: t('reports.efficiency') || 'Efficiency', icon: 'Target' }
  ];

  if (loading) {
    return (
      <div className="bg-surface rounded-2xl p-6 border border-primary/20 shadow-theme-lg theme-transition skeleton-surface dentist-skeleton">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-6">
            <div className="w-32 h-6 bg-primary/10 rounded"></div>
            <div className="w-20 h-8 bg-primary/10 rounded"></div>
          </div>
          <div className="w-full h-64 bg-primary/10 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-2xl p-6 border border-primary/20 shadow-theme-lg hover:shadow-theme-xl transition-all duration-300 theme-transition flex flex-col h-[420px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20">
            <Icon name="Calendar" size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-primary theme-transition">
              {t('reports.appointmentAnalysis') || 'Appointment Analysis'}
            </h3>
            <p className="text-xs text-secondary theme-transition">
              {t('reports.appointmentDescription') || 'Appointments throughput and scheduling metrics'}
            </p>
          </div>
        </div>

        {/* View Controls */}
        <div className="flex border border-primary/20 rounded-lg overflow-hidden flex-shrink-0">
          {viewOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setViewType(opt.value)}
              className={`p-2 transition-colors duration-200 ${
                viewType === opt.value
                  ? 'bg-accent text-white'
                  : 'bg-surface-elevated text-secondary hover:text-primary'
              }`}
              title={opt.label}
              style={{ width: 36, height: 32, display: 'grid', placeItems: 'center' }}
            >
              <Icon name={opt.icon} size={14} />
            </button>
          ))}
        </div>
      </div>

      {/* Mini KPIs */}
      <div className="grid grid-cols-3 gap-2 mb-6 flex-shrink-0 border-b border-primary/10 pb-4 text-center">
        <div>
          <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
            {totalAppointments}
          </div>
          <div className="text-[10px] text-secondary uppercase tracking-wider">{t('reports.totalAppointments') || 'Total Bookings'}</div>
        </div>
        <div>
          <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            87.2%
          </div>
          <div className="text-[10px] text-secondary uppercase tracking-wider">{t('reports.efficiency') || 'Show Rate'}</div>
        </div>
        <div>
          <div className="text-sm font-semibold text-purple-600 dark:text-purple-400">
            12 min
          </div>
          <div className="text-[10px] text-secondary uppercase tracking-wider">{t('reports.waitTime') || 'Avg Wait Time'}</div>
        </div>
      </div>

      {/* Chart visualization */}
      <div className="flex-1 min-h-0 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          {viewType === 'trends' ? (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -30, bottom: 0 }}>
              <defs>
                <linearGradient id="apptAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.15)" />
              <XAxis dataKey="name" stroke="rgba(156, 163, 175, 0.6)" fontSize={10} tickLine={false} />
              <YAxis stroke="rgba(156, 163, 175, 0.6)" fontSize={10} tickLine={false} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--color-surface, #ffffff)', 
                  border: '1px solid var(--color-border, #e5e7eb)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  color: 'var(--color-primary, #1f2937)'
                }}
              />
              <Area type="monotone" dataKey="appointments" stroke="#3B82F6" fill="url(#apptAreaGradient)" strokeWidth={2.5} />
            </AreaChart>
          ) : viewType === 'distribution' ? (
            <PieChart>
              <Pie
                data={distributionData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {distributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--color-surface, #ffffff)', 
                  border: '1px solid var(--color-border, #e5e7eb)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  color: 'var(--color-primary, #1f2937)'
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36} 
                iconType="circle"
                wrapperStyle={{ fontSize: '10px' }}
              />
            </PieChart>
          ) : (
            <BarChart data={efficiencyData} margin={{ top: 10, right: 10, left: -30, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.15)" />
              <XAxis dataKey="name" stroke="rgba(156, 163, 175, 0.6)" fontSize={10} tickLine={false} />
              <YAxis stroke="rgba(156, 163, 175, 0.6)" fontSize={10} tickLine={false} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--color-surface, #ffffff)', 
                  border: '1px solid var(--color-border, #e5e7eb)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  color: 'var(--color-primary, #1f2937)'
                }}
              />
              <Legend 
                verticalAlign="top" 
                height={36} 
                iconType="circle"
                wrapperStyle={{ fontSize: '10px' }}
              />
              <Bar dataKey={t('reports.completed') || 'Completed'} stackId="a" fill="#10B981" />
              <Bar dataKey={t('reports.missed') || 'Missed'} stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AppointmentChart;
