import React, { useState } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import Icon from '../../../../components/AppIcon';

const AppointmentChart = ({ data = [], loading = false }) => {
  const { t } = useLanguage();
  const [viewType, setViewType] = useState('efficiency');

  // Mock appointment data
  const appointmentData = {
    total: 245,
    completed: 220,
    cancelled: 15,
    noShow: 10,
    efficiency: 89.8,
    avgDuration: 45,
    peakHours: ['10:00', '14:00', '16:00'],
  };

  const weeklyData = data.length > 0 ? data : [180, 195, 210, 225, 240, 245, 250];
  const labels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  // Calculate appointment distribution
  const appointmentTypes = [
    { name: t('reports.completedAppointments'), value: appointmentData.completed, color: 'emerald' },
    { name: t('reports.cancelledAppointments'), value: appointmentData.cancelled, color: 'yellow' },
    { name: 'No Show', value: appointmentData.noShow, color: 'red' },
  ];

  const total = appointmentTypes.reduce((sum, type) => sum + type.value, 0);

  const colorMap = {
    emerald: 'stroke-emerald-500 fill-emerald-500',
    yellow: 'stroke-yellow-500 fill-yellow-500',
    red: 'stroke-red-500 fill-red-500',
    blue: 'stroke-blue-500 fill-blue-500',
  };

  // Generate donut chart segments
  const generateDonutSegments = () => {
    let cumulativePercentage = 0;
    const radius = 40;
    const strokeWidth = 12;
    const normalizedRadius = radius - strokeWidth * 0.5;
    const circumference = normalizedRadius * 2 * Math.PI;

    return appointmentTypes.map((type) => {
      const percentage = (type.value / total) * 100;
      const strokeDasharray = `${(percentage * circumference) / 100} ${circumference}`;
      const strokeDashoffset = -(cumulativePercentage * circumference) / 100;
      cumulativePercentage += percentage;

      return {
        ...type,
        strokeDasharray,
        strokeDashoffset,
        percentage: percentage.toFixed(1),
      };
    });
  };

  const donutSegments = generateDonutSegments();

  const viewOptions = [
    { value: 'efficiency', label: t('reports.efficiency'), icon: 'Target' },
    { value: 'distribution', label: 'Distribution', icon: 'PieChart' },
    { value: 'trends', label: t('reports.trends'), icon: 'TrendingUp' },
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
    <div className="bg-surface rounded-2xl p-6 border border-primary/20 shadow-theme-lg hover:shadow-theme-xl transition-all duration-300 theme-transition">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20">
            <Icon name="Calendar" size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-primary theme-transition">
              {t('reports.appointmentAnalysis')}
            </h3>
            <p className="text-sm text-secondary theme-transition">
              {t('reports.appointmentDescription')}
            </p>
          </div>
        </div>

        {/* View Controls */}
        <div className="flex border border-primary/20 rounded-lg overflow-hidden">
          {viewOptions.map((option) => (
            <button
            key={option.value}
            onClick={() => setViewType(option.value)}
            className={`p-2 text-xs transition-colors duration-200 ${
                viewType === option.value
                ? 'bg-accent text-white'
                : 'bg-surface-elevated text-secondary hover:text-primary'
            }`}
            title={option.label}
            style={{
                width: 48,              // already added width
                height: 36,             // fixed height
                display: 'grid',        // center the icon perfectly
                placeItems: 'center',   // both axes
                lineHeight: 0           // avoid baseline offset
            }}
            >
            <Icon name={option.icon} size={16} />
            </button>

          ))}
        </div>
      </div>

      {/* Content based on view type */}
      {viewType === 'efficiency' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {appointmentData.total}
              </div>
              <div className="text-xs text-secondary">{t('reports.totalAppointments')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {appointmentData.efficiency}%
              </div>
              <div className="text-xs text-secondary">{t('reports.appointmentEfficiency')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {appointmentData.avgDuration}m
              </div>
              <div className="text-xs text-secondary">{t('reports.appointmentDuration')}</div>
            </div>
          </div>

          {/* Efficiency Progress Bars */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-secondary">{t('reports.completedAppointments')}</span>
                <span className="text-primary font-medium">
                  {((appointmentData.completed / appointmentData.total) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-primary/10 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-700"
                  style={{ width: `${(appointmentData.completed / appointmentData.total) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-secondary">{t('reports.cancelledAppointments')}</span>
                <span className="text-primary font-medium">
                  {((appointmentData.cancelled / appointmentData.total) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-primary/10 rounded-full h-2">
                <div
                  className="bg-yellow-500 h-2 rounded-full transition-all duration-700"
                  style={{ width: `${(appointmentData.cancelled / appointmentData.total) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-secondary">{t('reports.noShowRate')}</span>
                <span className="text-primary font-medium">
                  {((appointmentData.noShow / appointmentData.total) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-primary/10 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full transition-all duration-700"
                  style={{ width: `${(appointmentData.noShow / appointmentData.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {viewType === 'distribution' && (
        <div className="flex items-center justify-center">
          <div className="relative">
            {/* Donut Chart */}
            <svg width="200" height="200" className="transform -rotate-90">
              {donutSegments.map((segment, index) => (
                <circle
                  key={index}
                  cx="100"
                  cy="100"
                  r="40"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="12"
                  strokeDasharray={segment.strokeDasharray}
                  strokeDashoffset={segment.strokeDashoffset}
                  className={`${colorMap[segment.color]} transition-all duration-700 hover:stroke-width-16`}
                  style={{ transition: 'stroke-dasharray 0.7s ease-in-out' }}
                />
              ))}
            </svg>

            {/* Center Content */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{total}</div>
                <div className="text-xs text-secondary">{t('reports.totalAppointments')}</div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="ml-8 space-y-3">
            {donutSegments.map((segment, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    segment.color === 'emerald'
                      ? 'bg-emerald-500'
                      : segment.color === 'yellow'
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                />
                <div>
                  <div className="text-sm font-medium text-primary">{segment.name}</div>
                  <div className="text-xs text-secondary">
                    {segment.value} ({segment.percentage}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {viewType === 'trends' && (
        <div className="h-48 relative bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 rounded-xl p-4">
          <div className="h-full flex items-end justify-between space-x-2">
            {weeklyData.map((value, index) => {
              const maxValue = Math.max(...weeklyData);
              const height = (value / maxValue) * 100;
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all duration-700 hover:from-blue-500 hover:to-blue-300"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-xs text-secondary mt-2">{labels[index]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-primary/10">
        <div className="flex items-center space-x-2 text-xs text-secondary">
          <Icon name="Clock" size={12} />
          <span>Peak: {appointmentData.peakHours.join(', ')}</span>
        </div>

        <div className="flex items-center space-x-2">
          <button className="flex items-center space-x-1 px-3 py-1 text-xs bg-surface-elevated border border-primary/20 rounded-lg hover:border-accent/50 transition-colors duration-200">
            <Icon name="Download" size={12} />
            <span>{t('reports.export')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppointmentChart;
