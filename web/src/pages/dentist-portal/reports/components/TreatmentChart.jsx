import React, { useState } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import Icon from '../../../../components/AppIcon';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';

const TreatmentChart = ({ data, loading = false }) => {
  const { t } = useLanguage();
  const [viewType, setViewType] = useState('popularity'); // 'popularity', 'revenue', 'trends', 'outcomes'

  // Safe data extraction
  const popularTreatments = data && data.patient && data.patient.popularTreatments 
    ? data.patient.popularTreatments 
    : [
        { name: 'Dental Cleaning', count: 456, percentage: 21.1, revenue: 18240000, duration: 1, color: '#3B82F6' },
        { name: 'Cavity Filling', count: 387, percentage: 17.9, revenue: 23220000, duration: 1, color: '#10B981' },
        { name: 'Root Canal', count: 234, percentage: 10.9, revenue: 70200000, duration: 3, color: '#8B5CF6' },
        { name: 'Crown/Bridge', count: 198, percentage: 9.2, revenue: 118800000, duration: 4, color: '#F59E0B' },
        { name: 'Orthodontics', count: 167, percentage: 7.7, revenue: 167000000, duration: 52, color: '#EF4444' },
        { name: 'Tooth Extraction', count: 145, percentage: 6.7, revenue: 10875000, duration: 1, color: '#FBBF24' },
        { name: 'Others', count: 569, percentage: 26.5, revenue: 113800000, duration: 2, color: '#6B7280' }
      ];

  const timelineData = data && data.clinical && data.clinical.treatmentTimeline 
    ? data.clinical.treatmentTimeline 
    : [
        { month: 'Jan', successful: 142, complications: 8 },
        { month: 'Feb', successful: 156, complications: 6 },
        { month: 'Mar', successful: 148, complications: 9 },
        { month: 'Apr', successful: 167, complications: 5 },
        { month: 'May', successful: 173, complications: 7 },
        { month: 'Jun', successful: 182, complications: 4 },
        { month: 'Jul', successful: 178, complications: 6 },
        { month: 'Aug', successful: 189, complications: 5 },
        { month: 'Sep', successful: 195, complications: 3 }
      ];

  // Formatting helpers
  const formatRevenue = (value) => {
    if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `Rp ${(value / 1000).toFixed(0)}K`;
    return `Rp ${value}`;
  };

  const formatTooltipRevenue = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  const viewOptions = [
    { value: 'popularity', label: t('reports.popularity') || 'Volume', icon: 'BarChart3' },
    { value: 'revenue', label: t('reports.revenue') || 'Revenue', icon: 'DollarSign' },
    { value: 'trends', label: t('reports.trends') || 'Outcomes', icon: 'Target' }
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
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
            <Icon name="Activity" size={20} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-primary theme-transition">
              {t('reports.clinicalAnalysis') || 'Clinical Analysis'}
            </h3>
            <p className="text-xs text-secondary theme-transition">
              {t('reports.clinicalDescription') || 'Treatment success, volume, and financial performance'}
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
          <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            94.8%
          </div>
          <div className="text-[10px] text-secondary uppercase tracking-wider">{t('reports.treatmentSuccess') || 'Success Rate'}</div>
        </div>
        <div>
          <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
            3.1%
          </div>
          <div className="text-[10px] text-secondary uppercase tracking-wider">{t('reports.complicationRate') || 'Complication Rate'}</div>
        </div>
        <div>
          <div className="text-sm font-semibold text-purple-600 dark:text-purple-400">
            96.8%
          </div>
          <div className="text-[10px] text-secondary uppercase tracking-wider">{t('reports.treatmentCompletion') || 'Completion Rate'}</div>
        </div>
      </div>

      {/* Chart visualization */}
      <div className="flex-1 min-h-0 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          {viewType === 'popularity' ? (
            <PieChart>
              <Pie
                data={popularTreatments}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={4}
                dataKey="count"
              >
                {popularTreatments.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value, name, props) => [`${value} sessions (${props.payload.percentage}%)`, name]}
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
                height={40} 
                iconType="circle"
                wrapperStyle={{ fontSize: '9px', lineHeight: '14px' }}
              />
            </PieChart>
          ) : viewType === 'revenue' ? (
            <BarChart data={popularTreatments} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.15)" />
              <XAxis dataKey="name" stroke="rgba(156, 163, 175, 0.6)" fontSize={9} tickLine={false} />
              <YAxis tickFormatter={formatRevenue} stroke="rgba(156, 163, 175, 0.6)" fontSize={9} tickLine={false} />
              <Tooltip 
                formatter={formatTooltipRevenue}
                contentStyle={{ 
                  backgroundColor: 'var(--color-surface, #ffffff)', 
                  border: '1px solid var(--color-border, #e5e7eb)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  color: 'var(--color-primary, #1f2937)'
                }}
              />
              <Bar dataKey="revenue" radius={[4, 4, 0, 0]} maxBarSize={30}>
                {popularTreatments.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -30, bottom: 0 }}>
              <defs>
                <linearGradient id="successGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="compGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.15)" />
              <XAxis dataKey="month" stroke="rgba(156, 163, 175, 0.6)" fontSize={10} tickLine={false} />
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
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px' }} />
              <Area type="monotone" name={t('reports.successful') || 'Successful'} dataKey="successful" stroke="#10B981" fill="url(#successGrad)" strokeWidth={2} />
              <Area type="monotone" name={t('reports.complications') || 'Complications'} dataKey="complications" stroke="#EF4444" fill="url(#compGrad)" strokeWidth={2} />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TreatmentChart;
