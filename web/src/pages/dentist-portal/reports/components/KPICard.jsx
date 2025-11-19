import React from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import Icon from '../../../../components/AppIcon';

const KPICard = ({ 
  title, 
  value, 
  change, 
  trend = 'up', 
  icon = 'TrendingUp', 
  color = 'blue',
  description,
  loading = false 
}) => {
  const { t } = useLanguage();

  // Color mapping for different themes
  const colorMap = {
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      icon: 'text-blue-600 dark:text-blue-400',
      accent: 'text-blue-600 dark:text-blue-400',
      trend: trend === 'up' ? 'text-emerald-600' : 'text-red-600'
    },
    green: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      icon: 'text-emerald-600 dark:text-emerald-400',
      accent: 'text-emerald-600 dark:text-emerald-400',
      trend: trend === 'up' ? 'text-emerald-600' : 'text-red-600'
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      icon: 'text-purple-600 dark:text-purple-400',
      accent: 'text-purple-600 dark:text-purple-400',
      trend: trend === 'up' ? 'text-emerald-600' : 'text-red-600'
    },
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      icon: 'text-emerald-600 dark:text-emerald-400',
      accent: 'text-emerald-600 dark:text-emerald-400',
      trend: trend === 'up' ? 'text-emerald-600' : 'text-red-600'
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      icon: 'text-red-600 dark:text-red-400',
      accent: 'text-red-600 dark:text-red-400',
      trend: trend === 'up' ? 'text-emerald-600' : 'text-red-600'
    }
  };

  const colors = colorMap[color] || colorMap.blue;
  const trendIcon = trend === 'up' ? 'TrendingUp' : 'TrendingDown';

  if (loading) {
    return (
      <div className="bg-surface rounded-2xl p-6 border border-primary/20 shadow-theme-lg theme-transition skeleton-surface dentist-skeleton">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl"></div>
            <div className="w-16 h-6 bg-primary/10 rounded"></div>
          </div>
          <div className="w-20 h-8 bg-primary/10 rounded mb-2"></div>
          <div className="w-24 h-4 bg-primary/10 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-2xl p-6 border border-primary/20 shadow-theme-lg hover:shadow-theme-xl transition-all duration-300 theme-transition group">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${colors.bg} group-hover:scale-110 transition-transform duration-300`}>
          <Icon name={icon} size={24} className={colors.icon} />
        </div>
        
        {change && (
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-lg ${
            trend === 'up' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'
          }`}>
            <Icon name={trendIcon} size={14} className={colors.trend} />
            <span className={`text-xs font-medium ${colors.trend}`}>
              {change}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div>
        <div className="text-2xl font-bold text-primary theme-transition mb-1 group-hover:scale-105 transition-transform duration-300">
          {value}
        </div>
        <div className="text-sm font-medium text-secondary theme-transition">
          {title}
        </div>
        {description && (
          <div className="text-xs text-muted theme-transition mt-2">
            {description}
          </div>
        )}
      </div>

      {/* Trend Indicator */}
      <div className="mt-4 pt-4 border-t border-primary/10">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">
            {t('reports.comparison')}
          </span>
          <span className={`font-medium ${colors.trend}`}>
            {trend === 'up' ? '↗' : '↘'} {t('reports.trend')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default KPICard;
