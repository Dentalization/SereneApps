import React, { useState } from 'react';
import Icon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';

const ScheduleFilters = ({ filters, onFiltersChange, providers, locations }) => {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);

  const dateRangeOptions = [
    { value: 'today', label: t('dentistSchedule.filters.dateRange.today') },
    { value: 'tomorrow', label: t('dentistSchedule.filters.dateRange.tomorrow') },
    { value: 'week', label: t('dentistSchedule.filters.dateRange.thisWeek') },
    { value: 'month', label: t('dentistSchedule.filters.dateRange.thisMonth') },
    { value: 'custom', label: t('dentistSchedule.filters.dateRange.custom') }
  ];

  const statusOptions = [
    { value: 'all', label: t('dentistSchedule.status.all') },
    { value: 'pending', label: t('dentistSchedule.status.pending') },
    { value: 'confirmed', label: t('dentistSchedule.status.confirmed') },
    { value: 'check-in', label: t('dentistSchedule.status.checkIn') },
    { value: 'in-chair', label: t('dentistSchedule.status.inChair') },
    { value: 'completed', label: t('dentistSchedule.status.completed') },
    { value: 'cancelled', label: t('dentistSchedule.status.cancelled') },
    { value: 'reschedule-requested', label: t('dentistSchedule.status.rescheduleRequested') }
  ];

  const channelOptions = [
    { value: 'all', label: t('dentistSchedule.filters.channels.all') },
    { value: 'clinic', label: t('dentistSchedule.filters.channels.clinic') },
    { value: 'tele', label: t('dentistSchedule.filters.channels.teledentistry') }
  ];

  const updateFilter = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const FilterSelect = ({ label, value, options, onChange, icon }) => (
    <div className="space-y-1">
      <label className="text-xs font-medium text-secondary">{label}</label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted">
            <Icon name={icon} size={14} />
          </div>
        )}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full ${icon ? 'pl-10' : 'pl-3'} pr-8 py-2 text-sm border border-primary/10 rounded-lg bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent theme-transition`}
        >
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  const activeFiltersCount = Object.values(filters).filter(value => 
    value !== 'all' && value !== 'today' && value !== ''
  ).length;

  return (
    <div className="bg-surface-elevated border border-primary/10 rounded-2xl theme-transition">
      {/* Header */}
      <div className="p-4 border-b border-primary/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Icon name="Filter" size={18} className="text-muted" />
            <h3 className="font-semibold text-primary">{t('dentistSchedule.filters.title')}</h3>
            {activeFiltersCount > 0 && (
              <span className="px-2 py-1 text-xs font-medium bg-accent text-white rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </div>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-muted hover:text-primary transition-colors"
          >
            <Icon name={isExpanded ? 'ChevronUp' : 'ChevronDown'} size={16} />
          </button>
        </div>
      </div>

      {/* Quick Filters - Always Visible */}
      <div className="p-4 space-y-4">
        {/* Search */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-secondary">{t('dentistSchedule.filters.searchLabel')}</label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted">
              <Icon name="Search" size={14} />
            </div>
            <input
              type="text"
              placeholder={t('dentistSchedule.filters.searchPlaceholder')}
              value={filters.q || ''}
              onChange={(e) => updateFilter('q', e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-primary/10 rounded-lg bg-surface text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent theme-transition"
            />
          </div>
        </div>

        {/* Date Range */}
        <FilterSelect
          label={t('dentistSchedule.filters.dateRange.label')}
          value={filters.dateRange || 'today'}
          options={dateRangeOptions}
          onChange={(value) => updateFilter('dateRange', value)}
          icon="Calendar"
        />
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-primary/10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <FilterSelect
              label={t('dentistSchedule.filters.status.label')}
              value={filters.status || 'all'}
              options={statusOptions}
              onChange={(value) => updateFilter('status', value)}
              icon="Circle"
            />

            {/* Channel Filter */}
            <FilterSelect
              label={t('dentistSchedule.filters.channel.label')}
              value={filters.channel || 'all'}
              options={channelOptions}
              onChange={(value) => updateFilter('channel', value)}
              icon="Zap"
            />

            {/* Provider Filter */}
            <FilterSelect
              label={t('dentistSchedule.filters.provider.label')}
              value={filters.provider || 'all'}
              options={[
                { value: 'all', label: t('dentistSchedule.filters.provider.all') },
                ...providers.map(p => ({ value: p.id, label: p.name }))
              ]}
              onChange={(value) => updateFilter('provider', value)}
              icon="UserCheck"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Location Filter */}
            <FilterSelect
              label={t('dentistSchedule.filters.location.label')}
              value={filters.location || 'all'}
              options={[
                { value: 'all', label: t('dentistSchedule.filters.location.all') },
                ...locations.map(l => ({ value: l.id, label: l.name }))
              ]}
              onChange={(value) => updateFilter('location', value)}
              icon="MapPin"
            />

            {/* Priority Filter */}
            <FilterSelect
              label={t('dentistSchedule.filters.priority.label')}
              value={filters.priority || 'all'}
              options={[
                { value: 'all', label: t('dentistSchedule.filters.priority.all') },
                { value: 'urgent', label: t('dentistSchedule.filters.priority.urgentOnly') },
                { value: 'high-risk', label: t('dentistSchedule.filters.priority.highRisk') },
                { value: 'deposit-required', label: t('dentistSchedule.filters.priority.depositRequired') }
              ]}
              onChange={(value) => updateFilter('priority', value)}
              icon="AlertTriangle"
            />
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center space-x-2 pt-2 border-t border-primary/10">
            <button
              onClick={() => onFiltersChange({
                dateRange: 'today',
                status: 'all',
                channel: 'all',
                provider: 'all',
                location: 'all',
                priority: 'all',
                q: ''
              })}
              className="px-3 py-2 text-sm font-medium text-muted hover:text-primary bg-surface hover:bg-surface-elevated border border-primary/10 rounded-lg transition-all"
            >
              {t('dentistSchedule.filters.actions.clear')}
            </button>
            
            <button
              onClick={() => updateFilter('status', 'pending')}
              className="px-3 py-2 text-sm font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition-all"
            >
              {t('dentistSchedule.filters.actions.showPending')}
            </button>
            
            <button
              onClick={() => updateFilter('channel', 'tele')}
              className="px-3 py-2 text-sm font-medium text-cyan-700 bg-cyan-100 hover:bg-cyan-200 rounded-lg transition-all"
            >
              {t('dentistSchedule.filters.actions.teleOnly')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleFilters;
