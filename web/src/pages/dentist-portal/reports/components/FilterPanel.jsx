import React, { useState } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import Icon from '../../../../components/AppIcon';
import ModalPortal from '../../../../components/ui/ModalPortal';

const FilterPanel = ({ filters, onFiltersChange, onApply, onReset }) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const dateRanges = [
    { value: 'today', label: t('reports.today') },
    { value: 'thisWeek', label: t('reports.thisWeek') },
    { value: 'thisMonth', label: t('reports.thisMonth') },
    { value: 'lastMonth', label: t('reports.lastMonth') },
    { value: 'thisQuarter', label: t('reports.thisQuarter') },
    { value: 'thisYear', label: t('reports.thisYear') },
    { value: 'custom', label: t('reports.customRange') }
  ];

  const treatmentTypes = [
    { value: 'all', label: t('reports.allTreatments') },
    { value: 'cleaning', label: 'Dental Cleaning' },
    { value: 'filling', label: 'Cavity Filling' },
    { value: 'rootCanal', label: 'Root Canal' },
    { value: 'crown', label: 'Crown/Bridge' },
    { value: 'orthodontics', label: 'Orthodontics' },
    { value: 'extraction', label: 'Tooth Extraction' },
    { value: 'whitening', label: 'Whitening' }
  ];

  const patientTypes = [
    { value: 'all', label: t('reports.allPatients') },
    { value: 'new', label: t('reports.newPatients') },
    { value: 'returning', label: t('reports.returningPatients') },
    { value: 'vip', label: 'VIP Patients' }
  ];

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    onFiltersChange(newFilters);
  };

  return (
    <div className="relative">
      {/* Filter Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-surface border border-primary/20 rounded-lg hover:border-accent/50 transition-colors duration-200"
      >
        <Icon name="Filter" size={16} className="text-secondary" />
        <span className="text-sm font-medium text-primary">{t('reports.filters')}</span>
        <Icon 
          name={isOpen ? "ChevronUp" : "ChevronDown"} 
          size={14} 
          className="text-secondary transition-transform duration-200" 
        />
      </button>

      {/* Filter Panel - Centered Modal */}
      {isOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setIsOpen(false)}>
            <div
              className="relative w-full max-w-md max-h-[80vh] bg-surface border border-primary/20 rounded-xl shadow-2xl p-6 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-6">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-primary mb-3">
                {t('reports.dateRange')}
              </label>
              <select
                value={filters.dateRange || 'thisMonth'}
                onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                className="w-full px-3 py-2 bg-surface-elevated border border-primary/20 rounded-lg text-primary focus:outline-none focus:border-accent/50 transition-colors duration-200"
              >
                {dateRanges.map((range) => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Date Range */}
            {filters.dateRange === 'custom' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-secondary mb-2">
                    {t('reports.startDate')}
                  </label>
                  <input
                    type="date"
                    value={filters.startDate || ''}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 bg-surface-elevated border border-primary/20 rounded-lg text-primary focus:outline-none focus:border-accent/50 transition-colors duration-200"
                  />
                </div>
                <div>
                  <label className="block text-xs text-secondary mb-2">
                    {t('reports.endDate')}
                  </label>
                  <input
                    type="date"
                    value={filters.endDate || ''}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className="w-full px-3 py-2 bg-surface-elevated border border-primary/20 rounded-lg text-primary focus:outline-none focus:border-accent/50 transition-colors duration-200"
                  />
                </div>
              </div>
            )}

            {/* Treatment Type */}
            <div>
              <label className="block text-sm font-medium text-primary mb-3">
                {t('reports.treatmentType')}
              </label>
              <select
                value={filters.treatmentType || 'all'}
                onChange={(e) => handleFilterChange('treatmentType', e.target.value)}
                className="w-full px-3 py-2 bg-surface-elevated border border-primary/20 rounded-lg text-primary focus:outline-none focus:border-accent/50 transition-colors duration-200"
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
              <label className="block text-sm font-medium text-primary mb-3">
                {t('reports.patientType')}
              </label>
              <select
                value={filters.patientType || 'all'}
                onChange={(e) => handleFilterChange('patientType', e.target.value)}
                className="w-full px-3 py-2 bg-surface-elevated border border-primary/20 rounded-lg text-primary focus:outline-none focus:border-accent/50 transition-colors duration-200"
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
              <label className="block text-sm font-medium text-primary mb-3">
                {t('reports.revenueRange')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder={t('reports.minRevenue')}
                  value={filters.minRevenue || ''}
                  onChange={(e) => handleFilterChange('minRevenue', e.target.value)}
                  className="px-3 py-2 bg-surface-elevated border border-primary/20 rounded-lg text-primary focus:outline-none focus:border-accent/50 transition-colors duration-200"
                />
                <input
                  type="number"
                  placeholder={t('reports.maxRevenue')}
                  value={filters.maxRevenue || ''}
                  onChange={(e) => handleFilterChange('maxRevenue', e.target.value)}
                  className="px-3 py-2 bg-surface-elevated border border-primary/20 rounded-lg text-primary focus:outline-none focus:border-accent/50 transition-colors duration-200"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4 border-t border-primary/10">
              <button
                onClick={() => {
                  onApply?.();
                  setIsOpen(false);
                }}
                className="flex-1 bg-accent text-white px-4 py-2 rounded-lg hover:bg-accent/90 transition-colors duration-200 font-medium"
              >
                {t('reports.applyFilters')}
              </button>
              <button
                onClick={() => {
                  onReset?.();
                  setIsOpen(false);
                }}
                className="px-4 py-2 bg-surface-elevated border border-primary/20 rounded-lg text-secondary hover:text-primary hover:border-accent/50 transition-colors duration-200"
              >
                {t('reports.reset')}
              </button>
            </div>
          </div>
        </div>
      </div>
      </ModalPortal>
      )}
    </div>
  );
};

export default FilterPanel;
