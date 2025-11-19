import React, { useState } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import Icon from '../../../../components/AppIcon';

const PatientChart = ({ data = [], loading = false }) => {
  const { t } = useLanguage();
  const [viewType, setViewType] = useState('demographics');

  // Mock patient data
  const patientData = {
    totalPatients: 1234,
    newPatients: 89,
    activePatients: 1156,
    retentionRate: 93.6,
    avgAge: 35.2,
    genderDistribution: {
      male: 523,
      female: 711
    },
    ageGroups: [
      { range: '0-17', count: 187, color: 'blue' },
      { range: '18-35', count: 445, color: 'emerald' },
      { range: '36-50', count: 389, color: 'purple' },
      { range: '51-65', count: 156, color: 'orange' },
      { range: '65+', count: 57, color: 'red' }
    ],
    monthlyGrowth: [98, 105, 112, 118, 125, 134, 142, 151, 159, 168, 176, 185]
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const colorMap = {
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500'
  };

  const viewOptions = [
    { value: 'demographics', label: t('reports.demographics'), icon: 'Users' },
    { value: 'growth', label: t('reports.growth'), icon: 'TrendingUp' },
    { value: 'retention', label: t('reports.retention'), icon: 'Heart' }
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
            <Icon name="Users" size={20} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-primary theme-transition">
              {t('reports.patientAnalysis')}
            </h3>
            <p className="text-sm text-secondary theme-transition">
              {t('reports.patientDescription')}
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
      {viewType === 'demographics' && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {patientData.totalPatients.toLocaleString()}
              </div>
              <div className="text-xs text-secondary">{t('reports.totalPatients')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {patientData.newPatients}
              </div>
              <div className="text-xs text-secondary">{t('reports.newPatients')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {patientData.avgAge}
              </div>
              <div className="text-xs text-secondary">{t('reports.averageAge')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {patientData.retentionRate}%
              </div>
              <div className="text-xs text-secondary">{t('reports.retentionRate')}</div>
            </div>
          </div>

          {/* Gender Distribution */}
          <div className="bg-surface-elevated rounded-xl p-4">
            <h4 className="text-sm font-medium text-primary mb-4">{t('reports.genderDistribution')}</h4>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-secondary">{t('reports.female')}</span>
                  <span className="text-primary font-medium">
                    {((patientData.genderDistribution.female / patientData.totalPatients) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-primary/10 rounded-full h-3">
                  <div 
                    className="bg-pink-500 h-3 rounded-full transition-all duration-700"
                    style={{ width: `${(patientData.genderDistribution.female / patientData.totalPatients) * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-secondary">{t('reports.male')}</span>
                  <span className="text-primary font-medium">
                    {((patientData.genderDistribution.male / patientData.totalPatients) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-primary/10 rounded-full h-3">
                  <div 
                    className="bg-blue-500 h-3 rounded-full transition-all duration-700"
                    style={{ width: `${(patientData.genderDistribution.male / patientData.totalPatients) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Age Groups */}
          <div className="bg-surface-elevated rounded-xl p-4">
            <h4 className="text-sm font-medium text-primary mb-4">{t('reports.ageGroups')}</h4>
            <div className="space-y-3">
              {patientData.ageGroups.map((group, index) => {
                const percentage = (group.count / patientData.totalPatients) * 100;
                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className={`w-3 h-3 rounded-full ${colorMap[group.color]}`} />
                      <span className="text-sm text-secondary min-w-[3rem]">{group.range}</span>
                      <div className="flex-1">
                        <div className="w-full bg-primary/10 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-700 ${colorMap[group.color]}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-primary font-medium ml-4">
                      {group.count} ({percentage.toFixed(1)}%)
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {viewType === 'growth' && (
        <div className="space-y-6">
          {/* Growth Chart */}
          <div className="h-48 relative bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-900/10 dark:to-blue-900/10 rounded-xl p-4">
            <div className="h-full flex items-end justify-between space-x-1">
              {patientData.monthlyGrowth.map((value, index) => {
                const maxValue = Math.max(...patientData.monthlyGrowth);
                const height = (value / maxValue) * 100;
                const growth = index > 0 ? ((value - patientData.monthlyGrowth[index - 1]) / patientData.monthlyGrowth[index - 1]) * 100 : 0;
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center group">
                    <div className="relative w-full">
                      <div
                        className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg transition-all duration-700 hover:from-emerald-500 hover:to-emerald-300 cursor-pointer"
                        style={{ height: `${height}%` }}
                      />
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                        {value} {t('reports.patients')}
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
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                +{patientData.monthlyGrowth[patientData.monthlyGrowth.length - 1] - patientData.monthlyGrowth[0]}
              </div>
              <div className="text-xs text-secondary">{t('reports.yearlyGrowth')}</div>
            </div>
            <div className="bg-surface-elevated rounded-xl p-4 text-center">
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                +{((patientData.monthlyGrowth.reduce((sum, val, idx) => {
                  if (idx === 0) return 0;
                  return sum + ((val - patientData.monthlyGrowth[idx - 1]) / patientData.monthlyGrowth[idx - 1]);
                }, 0) / (patientData.monthlyGrowth.length - 1)) * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-secondary">{t('reports.avgMonthlyGrowth')}</div>
            </div>
            <div className="bg-surface-elevated rounded-xl p-4 text-center">
              <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                {Math.round(patientData.monthlyGrowth.reduce((sum, val, idx) => {
                  if (idx === 0) return 0;
                  return sum + (val - patientData.monthlyGrowth[idx - 1]);
                }, 0) / (patientData.monthlyGrowth.length - 1))}
              </div>
              <div className="text-xs text-secondary">{t('reports.avgNewPatients')}</div>
            </div>
          </div>
        </div>
      )}

      {viewType === 'retention' && (
        <div className="space-y-6">
          {/* Retention Score */}
          <div className="text-center">
            <div className="relative inline-block">
              <svg width="120" height="120" className="transform -rotate-90">
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-primary/10"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={`${(patientData.retentionRate / 100) * 314} 314`}
                  className="text-emerald-500 transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {patientData.retentionRate}%
                  </div>
                  <div className="text-xs text-secondary">{t('reports.retentionRate')}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Retention Factors */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-elevated rounded-xl p-4">
              <div className="flex items-center space-x-3 mb-3">
                <Icon name="Star" size={16} className="text-yellow-500" />
                <span className="text-sm font-medium text-primary">{t('reports.satisfaction')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-primary/10 rounded-full h-2">
                  <div className="bg-yellow-500 h-2 rounded-full transition-all duration-700" style={{ width: '92%' }} />
                </div>
                <span className="text-sm text-primary font-medium">92%</span>
              </div>
            </div>

            <div className="bg-surface-elevated rounded-xl p-4">
              <div className="flex items-center space-x-3 mb-3">
                <Icon name="Calendar" size={16} className="text-blue-500" />
                <span className="text-sm font-medium text-primary">{t('reports.appointmentFrequency')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-primary/10 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full transition-all duration-700" style={{ width: '87%' }} />
                </div>
                <span className="text-sm text-primary font-medium">87%</span>
              </div>
            </div>

            <div className="bg-surface-elevated rounded-xl p-4">
              <div className="flex items-center space-x-3 mb-3">
                <Icon name="Clock" size={16} className="text-purple-500" />
                <span className="text-sm font-medium text-primary">{t('reports.treatmentCompletion')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-primary/10 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full transition-all duration-700" style={{ width: '94%' }} />
                </div>
                <span className="text-sm text-primary font-medium">94%</span>
              </div>
            </div>

            <div className="bg-surface-elevated rounded-xl p-4">
              <div className="flex items-center space-x-3 mb-3">
                <Icon name="MessageCircle" size={16} className="text-emerald-500" />
                <span className="text-sm font-medium text-primary">{t('reports.communication')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-primary/10 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full transition-all duration-700" style={{ width: '96%' }} />
                </div>
                <span className="text-sm text-primary font-medium">96%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-primary/10">
        <div className="flex items-center space-x-2 text-xs text-secondary">
          <Icon name="TrendingUp" size={12} />
          <span>{t('reports.dataUpdated')}: {new Date().toLocaleDateString()}</span>
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

export default PatientChart;
