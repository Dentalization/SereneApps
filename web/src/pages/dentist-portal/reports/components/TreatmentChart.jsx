import React, { useState } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import Icon from '../../../../components/AppIcon';

const TreatmentChart = ({ data = [], loading = false }) => {
  const { t } = useLanguage();
  const [viewType, setViewType] = useState('popularity');

  // Mock treatment data
  const treatmentData = {
    totalTreatments: 2156,
    completedTreatments: 2048,
    ongoingTreatments: 89,
    plannedTreatments: 19,
    successRate: 94.8,
    avgDuration: 2.3, // weeks
    popularTreatments: [
      { name: 'Dental Cleaning', count: 456, percentage: 21.1, color: 'blue', revenue: 18240, duration: 1 },
      { name: 'Cavity Filling', count: 387, percentage: 17.9, color: 'emerald', revenue: 23220, duration: 1 },
      { name: 'Root Canal', count: 234, percentage: 10.9, color: 'purple', revenue: 70200, duration: 3 },
      { name: 'Crown/Bridge', count: 198, percentage: 9.2, color: 'orange', revenue: 118800, duration: 4 },
      { name: 'Orthodontics', count: 167, percentage: 7.7, color: 'red', revenue: 167000, duration: 52 },
      { name: 'Tooth Extraction', count: 145, percentage: 6.7, color: 'yellow', revenue: 10875, duration: 1 },
      { name: 'Whitening', count: 123, percentage: 5.7, color: 'pink', revenue: 24600, duration: 2 },
      { name: 'Others', count: 446, percentage: 20.7, color: 'gray', revenue: 89200, duration: 2 }
    ],
    monthlyTrends: [180, 195, 210, 225, 240, 245, 250, 265, 280, 295, 310, 325],
    treatmentOutcomes: {
      successful: 2048,
      complications: 67,
      referrals: 41
    }
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const colorMap = {
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    pink: 'bg-pink-500',
    gray: 'bg-gray-500'
  };

  const strokeColorMap = {
    blue: 'stroke-blue-500',
    emerald: 'stroke-emerald-500',
    purple: 'stroke-purple-500',
    orange: 'stroke-orange-500',
    red: 'stroke-red-500',
    yellow: 'stroke-yellow-500',
    pink: 'stroke-pink-500',
    gray: 'stroke-gray-500'
  };

  const viewOptions = [
    { value: 'popularity', label: t('reports.popularity'), icon: 'Star' },
    { value: 'revenue', label: t('reports.revenue'), icon: 'DollarSign' },
    { value: 'trends', label: t('reports.trends'), icon: 'TrendingUp' },
    { value: 'outcomes', label: t('reports.outcomes'), icon: 'Target' }
  ];

  // Generate donut chart for treatment distribution
  const generateDonutSegments = () => {
    let cumulativePercentage = 0;
    const radius = 45;
    const strokeWidth = 10;
    const normalizedRadius = radius - strokeWidth * 0.5;
    const circumference = normalizedRadius * 2 * Math.PI;

    return treatmentData.popularTreatments.slice(0, 6).map((treatment) => {
      const percentage = treatment.percentage;
      const strokeDasharray = `${percentage * circumference / 100} ${circumference}`;
      const strokeDashoffset = -cumulativePercentage * circumference / 100;
      cumulativePercentage += percentage;

      return {
        ...treatment,
        strokeDasharray,
        strokeDashoffset
      };
    });
  };

  const donutSegments = generateDonutSegments();

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
          <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-900/20">
            <Icon name="Activity" size={20} className="text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-primary theme-transition">
              {t('reports.treatmentAnalysis')}
            </h3>
            <p className="text-sm text-secondary theme-transition">
              {t('reports.treatmentDescription')}
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

      {/* Content based on view type */}
      {viewType === 'popularity' && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {treatmentData.totalTreatments.toLocaleString()}
              </div>
              <div className="text-xs text-secondary">{t('reports.totalTreatments')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {treatmentData.completedTreatments.toLocaleString()}
              </div>
              <div className="text-xs text-secondary">{t('reports.completed')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {treatmentData.ongoingTreatments}
              </div>
              <div className="text-xs text-secondary">{t('reports.ongoing')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {treatmentData.successRate}%
              </div>
              <div className="text-xs text-secondary">{t('reports.successRate')}</div>
            </div>
          </div>

          {/* Treatment List */}
          <div className="space-y-3">
            {treatmentData.popularTreatments.map((treatment, index) => (
              <div key={index} className="bg-surface-elevated rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className={`w-4 h-4 rounded-full ${colorMap[treatment.color]}`} />
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-primary">{treatment.name}</span>
                        <span className="text-sm text-secondary">{treatment.count} ({treatment.percentage}%)</span>
                      </div>
                      <div className="w-full bg-primary/10 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-700 ${colorMap[treatment.color]}`}
                          style={{ width: `${treatment.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {viewType === 'revenue' && (
        <div className="space-y-6">
          {/* Revenue by Treatment */}
          <div className="space-y-3">
            {treatmentData.popularTreatments
              .sort((a, b) => b.revenue - a.revenue)
              .slice(0, 6)
              .map((treatment, index) => {
                const maxRevenue = Math.max(...treatmentData.popularTreatments.map(t => t.revenue));
                const percentage = (treatment.revenue / maxRevenue) * 100;
                
                return (
                  <div key={index} className="bg-surface-elevated rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${colorMap[treatment.color]}`} />
                        <span className="text-sm font-medium text-primary">{treatment.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-primary">
                          ${treatment.revenue.toLocaleString()}
                        </div>
                        <div className="text-xs text-secondary">
                          ${Math.round(treatment.revenue / treatment.count)} {t('reports.perTreatment')}
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-primary/10 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-700 ${colorMap[treatment.color]}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Total Revenue */}
          <div className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              ${treatmentData.popularTreatments.reduce((sum, t) => sum + t.revenue, 0).toLocaleString()}
            </div>
            <div className="text-sm text-secondary mt-1">{t('reports.totalRevenue')}</div>
          </div>
        </div>
      )}

      {viewType === 'trends' && (
        <div className="space-y-6">
          {/* Monthly Trends Chart */}
          <div className="h-48 relative bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 rounded-xl p-4">
            <div className="h-full flex items-end justify-between space-x-1">
              {treatmentData.monthlyTrends.map((value, index) => {
                const maxValue = Math.max(...treatmentData.monthlyTrends);
                const height = (value / maxValue) * 100;
                const growth = index > 0 ? ((value - treatmentData.monthlyTrends[index - 1]) / treatmentData.monthlyTrends[index - 1]) * 100 : 0;
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center group">
                    <div className="relative w-full">
                      <div
                        className="w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t-lg transition-all duration-700 hover:from-purple-500 hover:to-purple-300 cursor-pointer"
                        style={{ height: `${height}%` }}
                      />
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                        {value} {t('reports.treatments')}
                        {growth > 0 && (
                          <div className="text-emerald-300">+{growth.toFixed(1)}%</div>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-secondary mt-2">{months[index]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Growth Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-surface-elevated rounded-xl p-4 text-center">
              <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                +{treatmentData.monthlyTrends[treatmentData.monthlyTrends.length - 1] - treatmentData.monthlyTrends[0]}
              </div>
              <div className="text-xs text-secondary">{t('reports.yearlyGrowth')}</div>
            </div>
            <div className="bg-surface-elevated rounded-xl p-4 text-center">
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {treatmentData.avgDuration}w
              </div>
              <div className="text-xs text-secondary">{t('reports.avgDuration')}</div>
            </div>
            <div className="bg-surface-elevated rounded-xl p-4 text-center">
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {Math.round(treatmentData.monthlyTrends.reduce((sum, val) => sum + val, 0) / treatmentData.monthlyTrends.length)}
              </div>
              <div className="text-xs text-secondary">{t('reports.avgMonthly')}</div>
            </div>
          </div>
        </div>
      )}

      {viewType === 'outcomes' && (
        <div className="space-y-6">
          {/* Outcomes Donut Chart */}
          <div className="flex items-center justify-center">
            <div className="relative">
              <svg width="220" height="220" className="transform -rotate-90">
                {donutSegments.map((segment, index) => (
                  <circle
                    key={index}
                    cx="110"
                    cy="110"
                    r="45"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="10"
                    strokeDasharray={segment.strokeDasharray}
                    strokeDashoffset={segment.strokeDashoffset}
                    className={`${strokeColorMap[segment.color]} transition-all duration-700 hover:stroke-width-12`}
                  />
                ))}
              </svg>
              
              {/* Center Content */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{treatmentData.totalTreatments}</div>
                  <div className="text-xs text-secondary">{t('reports.totalTreatments')}</div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="ml-8 space-y-2">
              {donutSegments.map((segment, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${colorMap[segment.color]}`} />
                  <div>
                    <div className="text-sm font-medium text-primary">{segment.name}</div>
                    <div className="text-xs text-secondary">{segment.count} ({segment.percentage}%)</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Outcome Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-surface-elevated rounded-xl p-4 text-center">
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {((treatmentData.treatmentOutcomes.successful / treatmentData.totalTreatments) * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-secondary">{t('reports.successful')}</div>
            </div>
            <div className="bg-surface-elevated rounded-xl p-4 text-center">
              <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                {((treatmentData.treatmentOutcomes.complications / treatmentData.totalTreatments) * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-secondary">{t('reports.complications')}</div>
            </div>
            <div className="bg-surface-elevated rounded-xl p-4 text-center">
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {((treatmentData.treatmentOutcomes.referrals / treatmentData.totalTreatments) * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-secondary">{t('reports.referrals')}</div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-primary/10">
        <div className="flex items-center space-x-2 text-xs text-secondary">
          <Icon name="Activity" size={12} />
          <span>{t('reports.lastUpdated')}: {new Date().toLocaleDateString()}</span>
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

export default TreatmentChart;
