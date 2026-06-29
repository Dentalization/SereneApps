import React from 'react';
import AppIcon from '../../../../components/AppIcon';

const CARD_PRESETS = [
  { 
    key: 'efficiency', 
    icon: 'Zap', 
    accent: 'bg-gradient-to-br from-purple-100 to-purple-200 text-purple-700 dark:from-purple-900/30 dark:to-purple-800/30 dark:text-purple-400',
    priority: 'high'
  },
  { 
    key: 'utilization', 
    icon: 'BarChart3', 
    accent: 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 dark:from-blue-900/30 dark:to-blue-800/30 dark:text-blue-400',
    priority: 'high'
  },
  { 
    key: 'satisfaction', 
    icon: 'Heart', 
    accent: 'bg-gradient-to-br from-rose-100 to-rose-200 text-rose-700 dark:from-rose-900/30 dark:to-rose-800/30 dark:text-rose-400',
    priority: 'high'
  },
  { 
    key: 'revenue_per_staff', 
    icon: 'DollarSign', 
    accent: 'bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-700 dark:from-emerald-900/30 dark:to-emerald-800/30 dark:text-emerald-400',
    priority: 'high'
  },
  { 
    key: 'active', 
    icon: 'UserCheck', 
    accent: 'bg-gradient-to-br from-green-100 to-green-200 text-green-700 dark:from-green-900/30 dark:to-green-800/30 dark:text-green-400',
    priority: 'medium'
  },
  { 
    key: 'capacity', 
    icon: 'Gauge', 
    accent: 'bg-gradient-to-br from-amber-100 to-amber-200 text-amber-700 dark:from-amber-900/30 dark:to-amber-800/30 dark:text-amber-400',
    priority: 'medium'
  }
];

const getTrendIcon = (trend) => {
  if (trend > 0) return 'TrendingUp';
  if (trend < 0) return 'TrendingDown';
  return 'Minus';
};

const getTrendColor = (trend) => {
  if (trend > 0) return 'text-emerald-600 dark:text-emerald-400';
  if (trend < 0) return 'text-red-600 dark:text-red-400';
  return 'text-gray-500 dark:text-gray-400';
};

const formatValue = (key, value) => {
  if (key === 'revenue_per_staff') {
    return `Rp ${(value / 1000000).toFixed(1)}M`;
  }
  if (key === 'efficiency' || key === 'utilization' || key === 'satisfaction' || key === 'capacity') {
    return `${value}%`;
  }
  return value;
};

const StaffSummary = ({ stats, labels }) => {
  return (
    <div className="space-y-8">
      {/* Primary KPIs */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-primary">Key Performance Indicators</h3>
          <div className="flex items-center space-x-2 text-xs text-secondary">
            <AppIcon name="Activity" size={14} />
            <span>Real-time analytics</span>
          </div>
        </div>
        
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CARD_PRESETS.filter(card => card.priority === 'high').map(({ key, icon, accent }) => {
            const trend = stats[key + '_trend'];
            const target = stats[key + '_target'];
            const value = stats[key];
            
            return (
              <article
                key={key}
                className="group relative overflow-hidden rounded-2xl border border-border/40 bg-surface-elevated p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10"
              >
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                
                <div className="relative space-y-4">
                  <div className="flex items-start justify-between">
                    <div className={`rounded-xl p-3 ${accent} shadow-lg`}>
                      <AppIcon name={icon} size={20} className="stroke-current" />
                    </div>
                    
                    {trend !== undefined && (
                      <div className="flex items-center space-x-1">
                        <AppIcon 
                          name={getTrendIcon(trend)} 
                          size={12} 
                          className={getTrendColor(trend)}
                        />
                        <span className={`text-xs font-bold ${getTrendColor(trend)}`}>
                          {trend > 0 ? '+' : ''}{trend}%
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-secondary mb-2">{labels[key]}</p>
                    <p className="text-3xl font-bold text-primary mb-1">
                      {formatValue(key, value ?? 0)}
                    </p>
                    
                    {target && (
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ${
                              value >= target 
                                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' 
                                : 'bg-gradient-to-r from-amber-500 to-orange-500'
                            }`}
                            style={{ width: `${Math.min((value / target) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-secondary font-medium">
                          {Math.round((value / target) * 100)}%
                        </span>
                      </div>
                    )}
                    
                    {stats[key + '_subtitle'] && (
                      <p className="text-xs text-secondary mt-2 opacity-75">
                        {stats[key + '_subtitle']}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Secondary Metrics */}
      <section>
        <h3 className="text-lg font-bold text-primary mb-6">Operational Metrics</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {CARD_PRESETS.filter(card => card.priority === 'medium').map(({ key, icon, accent }) => {
            const trend = stats[key + '_trend'];
            const value = stats[key];
            
            return (
              <article
                key={key}
                className="rounded-xl border border-border/40 bg-surface-elevated p-5 transition-all duration-200 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`rounded-lg p-2.5 ${accent}`}>
                      <AppIcon name={icon} size={18} className="stroke-current" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-secondary">{labels[key]}</p>
                      <p className="text-xl font-bold text-primary">
                        {formatValue(key, value ?? 0)}
                      </p>
                    </div>
                  </div>
                  
                  {trend !== undefined && (
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                      trend > 0 
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' 
                        : trend < 0 
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
                    }`}>
                      <AppIcon name={getTrendIcon(trend)} size={10} />
                      <span>{trend > 0 ? '+' : ''}{trend}%</span>
                    </div>
                  )}
                </div>
                
                {stats[key + '_subtitle'] && (
                  <p className="text-xs text-secondary mt-3 pl-14">
                    {stats[key + '_subtitle']}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* Performance Insights */}
      <section className="rounded-2xl border border-border/40 bg-gradient-to-br from-surface-elevated to-surface p-6">
        <div className="flex items-center space-x-2 mb-4">
          <AppIcon name="Brain" size={20} className="text-accent" />
          <h3 className="text-lg font-bold text-primary">AI Insights</h3>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-primary">Performance Highlights</h4>
            <div className="space-y-2">
              {stats.top_performers && stats.top_performers.length > 0 ? (
                stats.top_performers.map((performer, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-surface rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-accent">#{idx + 1}</span>
                      </div>
                      <span className="text-sm font-medium text-primary truncate" title={performer.name}>
                        {performer.name}
                      </span>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0 pl-2">
                      <span className="text-sm text-accent font-bold">
                        {performer.score > 0 ? `${performer.score}%` : '0%'}
                      </span>
                      {performer.total !== undefined && performer.total > 0 && (
                        <span className="text-[10px] text-secondary font-medium">
                          {performer.completed}/{performer.total} janji temu
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-secondary italic p-4 bg-surface rounded-lg">No performance highlights available for this month.</p>
              )}
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-primary">Recommendations</h4>
            <div className="space-y-2">
              {stats.recommendations && stats.recommendations.length > 0 ? (
                stats.recommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-start space-x-3 p-3 bg-surface rounded-lg">
                    <AppIcon name="Lightbulb" size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-secondary">{rec}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-secondary italic p-4 bg-surface rounded-lg">No recommendations generated.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default StaffSummary;
