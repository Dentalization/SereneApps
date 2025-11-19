import React, { useState } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import Icon from '../../../../components/AppIcon';

const RevenueChart = ({ data = [], loading = false }) => {
  const { t } = useLanguage();
  const [chartType, setChartType] = useState('line');
  const [timeframe, setTimeframe] = useState('daily');

  // Mock data for demonstration
  const mockData = data.length > 0 ? data : [85, 92, 88, 95, 102, 110, 125];
  const labels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
  
  // Calculate statistics
  const total = mockData.reduce((sum, val) => sum + val, 0);
  const average = total / mockData.length;
  const maxValue = Math.max(...mockData);
  const minValue = Math.min(...mockData);
  const trend = mockData[mockData.length - 1] > mockData[0] ? 'up' : 'down';
  const trendPercentage = ((mockData[mockData.length - 1] - mockData[0]) / mockData[0] * 100).toFixed(1);

  // Generate SVG path for line chart
  const generatePath = (data) => {
    const width = 100;
    const height = 60;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    return data
      .map((value, index) => {
        const x = (index / (data.length - 1)) * width;
        const y = height - ((value - min) / range) * height;
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  const chartTypeOptions = [
    { value: 'line', label: t('reports.lineChart'), icon: 'TrendingUp' },
    { value: 'bar', label: t('reports.barChart'), icon: 'BarChart3' },
    { value: 'area', label: t('reports.areaChart'), icon: 'Activity' }
  ];

  const timeframeOptions = [
    { value: 'daily', label: t('reports.daily') },
    { value: 'weekly', label: t('reports.weekly') },
    { value: 'monthly', label: t('reports.monthly') }
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
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
            <Icon name="TrendingUp" size={20} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-primary theme-transition">
              {t('reports.revenueAnalysis')}
            </h3>
            <p className="text-sm text-secondary theme-transition">
              {t('reports.revenueDescription')}
            </p>
          </div>
        </div>

        {/* Chart Controls */}
<div className="flex items-center space-x-2">
  <select
    value={timeframe}
    onChange={(e) => setTimeframe(e.target.value)}
    className="text-xs px-2 py-1 bg-surface-elevated border border-primary/20 rounded-lg text-primary focus:outline-none focus:ring-1 focus:ring-accent theme-transition"
  >
    {timeframeOptions.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>

  <div className="flex border border-primary/20 rounded-lg overflow-hidden">
    {chartTypeOptions.map((option) => (
      <button
        key={option.value}
        onClick={() => setChartType(option.value)}
        className={`p-2 text-xs transition-colors duration-200 ${
          chartType === option.value
            ? 'bg-accent text-white'
            : 'bg-surface-elevated text-secondary hover:text-primary'
        }`}
        title={option.label}
        style={{
          width: 48,
          height: 36,
          display: 'grid',
          placeItems: 'center',
          lineHeight: 0,
        }}
      >
        <Icon name={option.icon} size={16} />
      </button>
    ))}
  </div>
</div>

      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            Rp {(total * 1000000).toLocaleString('id-ID')}
          </div>
          <div className="text-xs text-secondary">{t('reports.totalValue')}</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
            Rp {(average * 1000000).toLocaleString('id-ID')}
          </div>
          <div className="text-xs text-secondary">{t('reports.averageValue')}</div>
        </div>
        <div className="text-center">
          <div className={`text-lg font-bold ${trend === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
            {trend === 'up' ? '+' : ''}{trendPercentage}%
          </div>
          <div className="text-xs text-secondary">{t('reports.percentageChange')}</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
            {trend === 'up' ? '↗' : '↘'}
          </div>
          <div className="text-xs text-secondary">{t('reports.trend')}</div>
        </div>
      </div>

      {/* Chart Visualization */}
      <div className="relative">
        {chartType === 'line' && (
          <div className="h-64 relative bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-900/10 dark:to-blue-900/10 rounded-xl p-4">
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 100 60"
              preserveAspectRatio="none"
              className="absolute inset-4"
            >
              {/* Grid lines */}
              <defs>
                <linearGradient id="revenueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(16, 185, 129, 0.3)" />
                  <stop offset="100%" stopColor="rgba(16, 185, 129, 0.05)" />
                </linearGradient>
              </defs>
              
              {/* Grid */}
              {[0, 20, 40, 60].map((y) => (
                <line
                  key={y}
                  x1="0"
                  y1={y}
                  x2="100"
                  y2={y}
                  stroke="currentColor"
                  strokeWidth="0.2"
                  className="text-primary/20"
                />
              ))}
              
              {/* Area fill */}
              <path
                d={`${generatePath(mockData)} L 100 60 L 0 60 Z`}
                fill="url(#revenueGradient)"
              />
              
              {/* Line */}
              <path
                d={generatePath(mockData)}
                fill="none"
                stroke="rgb(16, 185, 129)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              
              {/* Data points */}
              {mockData.map((value, index) => {
                const x = (index / (mockData.length - 1)) * 100;
                const y = 60 - ((value - minValue) / (maxValue - minValue)) * 60;
                return (
                  <circle
                    key={index}
                    cx={x}
                    cy={y}
                    r="1.5"
                    fill="rgb(16, 185, 129)"
                    className="drop-shadow-sm"
                  />
                );
              })}
            </svg>
            
            {/* X-axis labels */}
            <div className="absolute bottom-0 left-4 right-4 flex justify-between text-xs text-secondary">
              {labels.map((label, index) => (
                <span key={index}>{label}</span>
              ))}
            </div>
          </div>
        )}

        {chartType === 'bar' && (
          <div className="h-64 relative bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-900/10 dark:to-blue-900/10 rounded-xl p-4">
            <div className="h-full flex items-end justify-between space-x-2">
              {mockData.map((value, index) => {
                const height = ((value - minValue) / (maxValue - minValue)) * 100;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg transition-all duration-700 hover:from-emerald-500 hover:to-emerald-300"
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-xs text-secondary mt-2">{labels[index]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {chartType === 'area' && (
          <div className="h-64 relative bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-900/10 dark:to-blue-900/10 rounded-xl p-4">
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 100 60"
              preserveAspectRatio="none"
              className="absolute inset-4"
            >
              <defs>
                <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(16, 185, 129, 0.6)" />
                  <stop offset="50%" stopColor="rgba(16, 185, 129, 0.3)" />
                  <stop offset="100%" stopColor="rgba(16, 185, 129, 0.1)" />
                </linearGradient>
              </defs>
              
              <path
                d={`${generatePath(mockData)} L 100 60 L 0 60 Z`}
                fill="url(#areaGradient)"
                stroke="rgb(16, 185, 129)"
                strokeWidth="2"
              />
            </svg>
            
            <div className="absolute bottom-0 left-4 right-4 flex justify-between text-xs text-secondary">
              {labels.map((label, index) => (
                <span key={index}>{label}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-primary/10">
        <div className="flex items-center space-x-2 text-xs text-secondary">
          <Icon name="Info" size={12} />
          <span>{t('reports.currency')}: IDR</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button className="flex items-center space-x-1 px-3 py-1 text-xs bg-surface-elevated border border-primary/20 rounded-lg hover:border-accent/50 transition-colors duration-200">
            <Icon name="Download" size={12} />
            <span>{t('reports.export')}</span>
          </button>
          <button className="flex items-center space-x-1 px-3 py-1 text-xs bg-surface-elevated border border-primary/20 rounded-lg hover:border-accent/50 transition-colors duration-200">
            <Icon name="Share2" size={12} />
            <span>{t('reports.share')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RevenueChart;
