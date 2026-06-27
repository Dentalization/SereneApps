import React, { useState } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import Icon from '../../../../components/AppIcon';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line
} from 'recharts';

const RevenueChart = ({ data, loading = false }) => {
  const { t } = useLanguage();
  const [chartType, setChartType] = useState('area');

  // Format currency helpers
  const formatYAxis = (tick) => {
    if (tick >= 1000000) return `Rp ${(tick / 1000000).toFixed(1)}M`;
    if (tick >= 1000) return `Rp ${(tick / 1000).toFixed(0)}K`;
    return `Rp ${tick}`;
  };

  const formatTooltipValue = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  // Safe data extraction
  const trends = data && data.labels ? data : {
    labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
    revenue: [85000000, 92000000, 88000000, 95000000, 102000000, 110000000, 125000000]
  };

  const chartData = trends.labels.map((label, idx) => ({
    name: label,
    revenue: trends.revenue[idx] || 0
  }));

  // Calculations
  const total = trends.revenue.reduce((sum, val) => sum + val, 0);
  const average = total / trends.revenue.length;
  const trend = trends.revenue[trends.revenue.length - 1] > trends.revenue[0] ? 'up' : 'down';
  const trendPercentage = trends.revenue[0] 
    ? ((trends.revenue[trends.revenue.length - 1] - trends.revenue[0]) / trends.revenue[0] * 100).toFixed(1)
    : '0.0';

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

  // Styles for charts
  const strokeColor = '#10B981'; // Emerald
  const fillColor = 'url(#revenueAreaGradient)';

  return (
    <div className="bg-surface rounded-2xl p-6 border border-primary/20 shadow-theme-lg hover:shadow-theme-xl transition-all duration-300 theme-transition flex flex-col h-[420px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
            <Icon name="TrendingUp" size={20} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-primary theme-transition">
              {t('reports.revenueAnalysis') || 'Revenue Analysis'}
            </h3>
            <p className="text-xs text-secondary theme-transition">
              {t('reports.revenueDescription') || 'Revenue collection trend'}
            </p>
          </div>
        </div>

        {/* Chart type controls */}
        <div className="flex border border-primary/20 rounded-lg overflow-hidden flex-shrink-0">
          {[
            { value: 'area', icon: 'Activity', label: 'Area' },
            { value: 'line', icon: 'TrendingUp', label: 'Line' },
            { value: 'bar', icon: 'BarChart3', label: 'Bar' }
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setChartType(opt.value)}
              className={`p-2 transition-colors duration-200 ${
                chartType === opt.value
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
          <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            Rp {(total / 1000000).toFixed(1)}M
          </div>
          <div className="text-[10px] text-secondary uppercase tracking-wider">{t('reports.totalValue') || 'Total'}</div>
        </div>
        <div>
          <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
            Rp {(average / 1000000).toFixed(1)}M
          </div>
          <div className="text-[10px] text-secondary uppercase tracking-wider">{t('reports.averageValue') || 'Average'}</div>
        </div>
        <div>
          <div className={`text-sm font-semibold ${trend === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
            {trend === 'up' ? '▲' : '▼'} {trendPercentage}%
          </div>
          <div className="text-[10px] text-secondary uppercase tracking-wider">{t('reports.percentageChange') || 'Growth'}</div>
        </div>
      </div>

      {/* Chart visualization */}
      <div className="flex-1 min-h-0 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'area' ? (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={strokeColor} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={strokeColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.15)" />
              <XAxis dataKey="name" stroke="rgba(156, 163, 175, 0.6)" fontSize={10} tickLine={false} />
              <YAxis tickFormatter={formatYAxis} stroke="rgba(156, 163, 175, 0.6)" fontSize={10} tickLine={false} />
              <Tooltip 
                formatter={formatTooltipValue}
                contentStyle={{ 
                  backgroundColor: 'var(--color-surface, #ffffff)', 
                  border: '1px solid var(--color-border, #e5e7eb)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  color: 'var(--color-primary, #1f2937)'
                }}
              />
              <Area type="monotone" dataKey="revenue" stroke={strokeColor} fill={fillColor} strokeWidth={2.5} />
            </AreaChart>
          ) : chartType === 'line' ? (
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.15)" />
              <XAxis dataKey="name" stroke="rgba(156, 163, 175, 0.6)" fontSize={10} tickLine={false} />
              <YAxis tickFormatter={formatYAxis} stroke="rgba(156, 163, 175, 0.6)" fontSize={10} tickLine={false} />
              <Tooltip 
                formatter={formatTooltipValue}
                contentStyle={{ 
                  backgroundColor: 'var(--color-surface, #ffffff)', 
                  border: '1px solid var(--color-border, #e5e7eb)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  color: 'var(--color-primary, #1f2937)'
                }}
              />
              <Line type="monotone" dataKey="revenue" stroke={strokeColor} strokeWidth={2.5} activeDot={{ r: 6 }} dot={{ strokeWidth: 2, r: 3 }} />
            </LineChart>
          ) : (
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.15)" />
              <XAxis dataKey="name" stroke="rgba(156, 163, 175, 0.6)" fontSize={10} tickLine={false} />
              <YAxis tickFormatter={formatYAxis} stroke="rgba(156, 163, 175, 0.6)" fontSize={10} tickLine={false} />
              <Tooltip 
                formatter={formatTooltipValue}
                contentStyle={{ 
                  backgroundColor: 'var(--color-surface, #ffffff)', 
                  border: '1px solid var(--color-border, #e5e7eb)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  color: 'var(--color-primary, #1f2937)'
                }}
              />
              <Bar dataKey="revenue" fill={strokeColor} radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RevenueChart;
