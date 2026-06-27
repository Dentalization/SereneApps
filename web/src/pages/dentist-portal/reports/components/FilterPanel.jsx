import React from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import Icon from '../../../../components/AppIcon';
import ModalPortal from '../../../../components/ui/ModalPortal';

const FilterPanel = ({ filters, onFilterChange, onClose }) => {
  const { t } = useLanguage();

  const dateRanges = [
    { value: 'today', label: t('reports.today') },
    { value: 'thisWeek', label: t('reports.thisWeek') },
    { value: 'thisMonth', label: t('reports.thisMonth') },
    { value: 'lastMonth', label: t('reports.lastMonth') },
    { value: 'thisQuarter', label: t('reports.thisQuarter') },
    { value: 'thisYear', label: t('reports.thisYear') },
    { value: 'custom', label: t('reports.custom') }
  ];

  const treatmentTypes = [
    { value: 'all', label: t('reports.allTreatments') || 'All Treatments' },
    { value: 'cleaning', label: 'Dental Cleaning' },
    { value: 'filling', label: 'Cavity Filling' },
    { value: 'rootCanal', label: 'Root Canal' },
    { value: 'crown', label: 'Crown/Bridge' },
    { value: 'orthodontics', label: 'Orthodontics' },
    { value: 'extraction', label: 'Tooth Extraction' },
    { value: 'whitening', label: 'Whitening' }
  ];

  const patientTypes = [
    { value: 'all', label: t('reports.allPatients') || 'All Patients' },
    { value: 'new', label: t('reports.newPatients') },
    { value: 'returning', label: t('reports.returningPatients') || 'Returning Patients' },
    { value: 'vip', label: 'VIP Patients' }
  ];

  const handleFilterChange = (key, value) => {
    onFilterChange(key, value);
  };

  const resetFilters = () => {
    onFilterChange('provider', 'all');
    onFilterChange('location', 'all');
    onFilterChange('service', 'all');
    onFilterChange('patientType', 'all');
    onFilterChange('treatmentType', 'all');
    onFilterChange('minRevenue', '');
    onFilterChange('maxRevenue', '');
    onFilterChange('startDate', '');
    onFilterChange('endDate', '');
  };

  return (
    <ModalPortal>
      <div 
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" 
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-md bg-surface border border-primary/20 rounded-2xl shadow-theme-2xl p-6 overflow-y-auto max-h-[90vh] theme-transition"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6 border-b border-primary/10 pb-4">
            <div className="flex items-center space-x-2">
              <Icon name="Filter" size={20} className="text-accent" />
              <h3 className="text-lg font-bold text-primary">{t('reports.filter') || 'Filters'}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-secondary hover:text-primary transition-colors duration-200 rounded-lg hover:bg-surface-elevated"
            >
              <Icon name="X" size={18} />
            </button>
          </div>

          <div className="space-y-6">
            {/* Treatment Type */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                {t('reports.treatmentType') || 'Treatment Type'}
              </label>
              <select
                value={filters.treatmentType || 'all'}
                onChange={(e) => handleFilterChange('treatmentType', e.target.value)}
                className="w-full px-3 py-2 bg-surface-elevated border border-primary/20 rounded-xl text-primary focus:outline-none focus:ring-2 focus:ring-accent theme-transition"
              >
                {treatmentTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Patient Type */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                {t('reports.patientType')}
              </label>
              <select
                value={filters.patientType || 'all'}
                onChange={(e) => handleFilterChange('patientType', e.target.value)}
                className="w-full px-3 py-2 bg-surface-elevated border border-primary/20 rounded-xl text-primary focus:outline-none focus:ring-2 focus:ring-accent theme-transition"
              >
                {patientTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Revenue Range */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                {t('reports.revenueRange') || 'Revenue Range'}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder={t('reports.minRevenue') || 'Min (Rp)'}
                  value={filters.minRevenue || ''}
                  onChange={(e) => handleFilterChange('minRevenue', e.target.value)}
                  className="px-3 py-2 bg-surface-elevated border border-primary/20 rounded-xl text-primary focus:outline-none focus:ring-2 focus:ring-accent theme-transition text-sm"
                />
                <input
                  type="number"
                  placeholder={t('reports.maxRevenue') || 'Max (Rp)'}
                  value={filters.maxRevenue || ''}
                  onChange={(e) => handleFilterChange('maxRevenue', e.target.value)}
                  className="px-3 py-2 bg-surface-elevated border border-primary/20 rounded-xl text-primary focus:outline-none focus:ring-2 focus:ring-accent theme-transition text-sm"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-6 border-t border-primary/10">
              <button
                onClick={onClose}
                className="flex-1 bg-accent text-white px-4 py-2.5 rounded-xl hover:bg-accent/90 transition-colors duration-200 font-semibold"
              >
                {t('reports.applyFilters') || 'Apply Filters'}
              </button>
              <button
                onClick={resetFilters}
                className="px-4 py-2.5 bg-surface-elevated border border-primary/20 rounded-xl text-secondary hover:text-primary hover:border-accent/50 transition-colors duration-200"
              >
                {t('reports.reset')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default FilterPanel;
