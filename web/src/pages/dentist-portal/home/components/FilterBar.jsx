import React from 'react';
import Icon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';

const FilterBar = ({
  value = { dateRange: 'today', provider: 'all', location: 'all' },
  onChange,
  providers = [],
  locations = [],
}) => {
  const { t } = useLanguage();
  
  // Default providers and locations with translation keys
  const defaultProviders = [
    { value: 'all', labelKey: 'home.allProviders' },
    { value: 'drg-sample', label: 'drg. Contoh' },
  ];
  
  const defaultLocations = [
    { value: 'all', labelKey: 'home.allLocations' },
    { value: 'jakarta', label: 'Jakarta' },
    { value: 'bandung', label: 'Bandung' },
  ];
  
  const finalProviders = providers.length > 0 ? providers : defaultProviders;
  const finalLocations = locations.length > 0 ? locations : defaultLocations;
  
  const update = (key, val) => {
    onChange?.({ ...value, [key]: val });
  };

  return (
    <div className="bg-surface rounded-2xl p-4 border border-primary/20 shadow-theme-lg theme-transition">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex items-center gap-2 text-secondary">
          <Icon name="Sliders" size={16} className="text-accent" />
          <span className="font-medium text-primary">{t('home.filters')}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1">
          <div className="flex items-center gap-2">
            <Icon name="Calendar" size={16} className="text-muted" />
            <select
              value={value.dateRange}
              onChange={(e) => update('dateRange', e.target.value)}
              className="w-full md:w-auto px-3 py-2 rounded-lg bg-surface-elevated border border-primary/20 text-primary focus:outline-none focus:ring-2 focus:ring-accent theme-transition"
            >
              <option value="today">{t('home.today')}</option>
              <option value="7d">{t('home.sevenDays')}</option>
              <option value="30d">{t('home.thirtyDays')}</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Icon name="User" size={16} className="text-muted" />
            <select
              value={value.provider}
              onChange={(e) => update('provider', e.target.value)}
              className="w-full md:w-auto px-3 py-2 rounded-lg bg-surface-elevated border border-primary/20 text-primary focus:outline-none focus:ring-2 focus:ring-accent theme-transition"
            >
              {finalProviders.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.labelKey ? t(p.labelKey) : p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Icon name="MapPin" size={16} className="text-muted" />
            <select
              value={value.location}
              onChange={(e) => update('location', e.target.value)}
              className="w-full md:w-auto px-3 py-2 rounded-lg bg-surface-elevated border border-primary/20 text-primary focus:outline-none focus:ring-2 focus:ring-accent theme-transition"
            >
              {finalLocations.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.labelKey ? t(l.labelKey) : l.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterBar;

