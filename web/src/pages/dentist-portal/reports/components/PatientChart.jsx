import React, { useState } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import Icon from '../../../../components/AppIcon';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';

const PatientChart = ({ data, loading = false }) => {
  const { t } = useLanguage();
  const [viewType, setViewType] = useState('demographics'); // 'demographics', 'growth', 'retention'

  // Safe data extraction
  const trends = data && data.trends && data.trends.labels ? data.trends : {
    labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
    patients: [2, 3, 1, 4, 3, 2, 1]
  };

  const patientMeta = data && data.patient ? data.patient : {
    ageDistribution: [
      { range: '0-17', count: 187, percentage: 15.2, color: '#3B82F6' },
      { range: '18-35', count: 445, percentage: 36.1, color: '#10B981' },
      { range: '36-50', count: 389, percentage: 31.5, color: '#8B5CF6' },
      { range: '51-65', count: 156, percentage: 12.6, color: '#F59E0B' },
      { range: '65+', count: 57, percentage: 4.6, color: '#EF4444' }
    ],
    retentionAnalysis: [
      { year: '1 Year', rate: 78, patients: 891 },
      { year: '2 Years', rate: 65, patients: 743 },
      { year: '3 Years', rate: 54, patients: 618 },
      { year: '5+ Years', rate: 42, patients: 481 }
    ]
  };

  // 1. Demographics data (Age groups)
  const demographicsData = patientMeta.ageDistribution.map(d => ({
    name: d.range,
    count: d.count,
    percentage: d.percentage,
    color: d.color
  }));

  // 2. Growth data (Acquisition trends)
  let runningSum = 1000; // Base historical count
  const growthData = trends.labels.map((label, idx) => {
    const newPatients = trends.patients[idx] || 0;
    runningSum += newPatients;
    return {
      name: label,
      'New Patients': newPatients,
      'Total Patients': runningSum
    };
  });

  // 3. Retention analysis data
  const retentionData = patientMeta.retentionAnalysis.map(r => ({
    name: r.year,
    rate: r.rate,
    patients: r.patients
  }));

  const viewOptions = [
    { value: 'demographics', label: t('reports.demographics') || 'Demographics', icon: 'Users' },
    { value: 'growth', label: t('reports.growth') || 'Growth', icon: 'TrendingUp' },
    { value: 'retention', label: t('reports.retention') || 'Retention', icon: 'Heart' }
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
          <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-900/20">
            <Icon name="Users" size={20} className="text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-primary theme-transition">
              {t('reports.patientAnalysis') || 'Patient Analysis'}
            </h3>
            <p className="text-xs text-secondary theme-transition">
              {t('reports.patientDescription') || 'Patient metrics, growth and age groups'}
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
          <div className="text-sm font-semibold text-purple-600 dark:text-purple-400">
            {data?.patient?.totalPatients || 1234}
          </div>
          <div className="text-[10px] text-secondary uppercase tracking-wider">{t('reports.totalPatients') || 'Total Patients'}</div>
        </div>
        <div>
          <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            +{data?.patient?.newPatients || 32}
          </div>
          <div className="text-[10px] text-secondary uppercase tracking-wider">{t('reports.newPatients') || 'New Patients'}</div>
        </div>
        <div>
          <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
            {data?.patient?.retentionRate || '89.1%'}
          </div>
          <div className="text-[10px] text-secondary uppercase tracking-wider">{t('reports.retentionRate') || 'Retention Rate'}</div>
        </div>
      </div>

      {/* Chart visualization */}
      <div className="flex-1 min-h-0 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          {viewType === 'demographics' ? (
            <BarChart data={demographicsData} margin={{ top: 10, right: 10, left: -30, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.15)" />
              <XAxis dataKey="name" stroke="rgba(156, 163, 175, 0.6)" fontSize={10} tickLine={false} />
              <YAxis stroke="rgba(156, 163, 175, 0.6)" fontSize={10} tickLine={false} />
              <Tooltip 
                formatter={(val, name, props) => [`${val} patients (${props.payload.percentage}%)`, 'Count']}
                contentStyle={{ 
                  backgroundColor: 'var(--color-surface, #ffffff)', 
                  border: '1px solid var(--color-border, #e5e7eb)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  color: 'var(--color-primary, #1f2937)'
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {demographicsData.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          ) : viewType === 'growth' ? (
            <AreaChart data={growthData} margin={{ top: 10, right: 10, left: -30, bottom: 0 }}>
              <defs>
                <linearGradient id="growthAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
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
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px' }} />
              <Area type="monotone" dataKey="Total Patients" stroke="#8B5CF6" fill="url(#growthAreaGradient)" strokeWidth={2.5} />
              <Bar dataKey="New Patients" fill="#10B981" maxBarSize={20} />
            </AreaChart>
          ) : (
            <LineChart data={retentionData} margin={{ top: 10, right: 10, left: -30, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.15)" />
              <XAxis dataKey="name" stroke="rgba(156, 163, 175, 0.6)" fontSize={10} tickLine={false} />
              <YAxis tickFormatter={(val) => `${val}%`} stroke="rgba(156, 163, 175, 0.6)" fontSize={10} tickLine={false} />
              <Tooltip 
                formatter={(val, name, props) => [`${val}% (${props.payload.patients} patients)`, 'Retention Rate']}
                contentStyle={{ 
                  backgroundColor: 'var(--color-surface, #ffffff)', 
                  border: '1px solid var(--color-border, #e5e7eb)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  color: 'var(--color-primary, #1f2937)'
                }}
              />
              <Line type="monotone" dataKey="rate" stroke="#EF4444" strokeWidth={2.5} dot={{ strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PatientChart;
