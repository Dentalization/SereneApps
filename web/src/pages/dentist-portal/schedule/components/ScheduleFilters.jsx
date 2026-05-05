import React from 'react';
import Icon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';

const ScheduleFilters = ({ filters, onFiltersChange, providers, locations }) => {
  const { t } = useLanguage();

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

  const clearFilters = () =>
    onFiltersChange({
      dateRange: 'today',
      status: 'all',
      channel: 'all',
      provider: 'all',
      location: 'all',
      priority: 'all',
      q: ''
    });

  const compactInputClass =
    'h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent/35 focus:border-accent/40 theme-transition';

  const FilterSelect = ({ value, options, onChange, icon, ariaLabel, className = '' }) => (
    <div className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted pointer-events-none">
          {icon && (
            <Icon name={icon} size={14} />
          )}
        </div>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={ariaLabel}
          className={`${compactInputClass} pl-9 pr-8`}
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
    <div className="rounded-2xl border border-border/70 bg-surface/80 p-4 backdrop-blur-sm theme-transition">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 text-primary">
          <Icon name="Filter" size={16} className="text-muted" />
          <h3 className="text-sm font-semibold">{t('dentistSchedule.filters.title')}</h3>
          {activeFiltersCount > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent/15 px-1.5 text-xs font-semibold text-accent">
              {activeFiltersCount}
            </span>
          )}
        </div>
        {activeFiltersCount > 0 && (
          <button
            onClick={clearFilters}
            className="text-xs font-medium text-muted hover:text-primary transition-colors"
          >
            {t('dentistSchedule.filters.actions.clear')}
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        <div className="relative w-full">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted pointer-events-none">
            <Icon name="Search" size={14} />
          </div>
          <input
            type="text"
            placeholder={t('dentistSchedule.filters.searchPlaceholder')}
            value={filters.q || ''}
            onChange={(e) => updateFilter('q', e.target.value)}
            className={`${compactInputClass} pl-9`}
            aria-label={t('dentistSchedule.filters.searchLabel')}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
          <FilterSelect
            value={filters.dateRange || 'today'}
            options={dateRangeOptions}
            onChange={(value) => updateFilter('dateRange', value)}
            icon="Calendar"
            ariaLabel={t('dentistSchedule.filters.dateRange.label')}
          />

          <FilterSelect
            value={filters.status || 'all'}
            options={statusOptions}
            onChange={(value) => updateFilter('status', value)}
            icon="Circle"
            ariaLabel={t('dentistSchedule.filters.status.label')}
          />

          <FilterSelect
            value={filters.channel || 'all'}
            options={channelOptions}
            onChange={(value) => updateFilter('channel', value)}
            icon="Zap"
            ariaLabel={t('dentistSchedule.filters.channel.label')}
          />

          <FilterSelect
            value={filters.provider || 'all'}
            options={[
              { value: 'all', label: t('dentistSchedule.filters.provider.all') },
              ...providers.map(p => ({ value: p.id, label: p.name }))
            ]}
            onChange={(value) => updateFilter('provider', value)}
            icon="UserCheck"
            ariaLabel={t('dentistSchedule.filters.provider.label')}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <FilterSelect
            value={filters.location || 'all'}
            options={[
              { value: 'all', label: t('dentistSchedule.filters.location.all') },
              ...locations.map(l => ({ value: l.id, label: l.name }))
            ]}
            onChange={(value) => updateFilter('location', value)}
            icon="MapPin"
            ariaLabel={t('dentistSchedule.filters.location.label')}
          />

          <FilterSelect
            value={filters.priority || 'all'}
            options={[
              { value: 'all', label: t('dentistSchedule.filters.priority.all') },
              { value: 'urgent', label: t('dentistSchedule.filters.priority.urgentOnly') },
              { value: 'high-risk', label: t('dentistSchedule.filters.priority.highRisk') },
              { value: 'deposit-required', label: t('dentistSchedule.filters.priority.depositRequired') }
            ]}
            onChange={(value) => updateFilter('priority', value)}
            icon="AlertTriangle"
            ariaLabel={t('dentistSchedule.filters.priority.label')}
          />
        </div>
      </div>
    </div>
  );
};

export default ScheduleFilters;
