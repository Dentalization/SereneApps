import React, { useState } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import Icon from '../../../../components/AppIcon';

const FilterButton = ({ active, onClick, children, icon }) => (
  <button
    onClick={onClick}
    className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
      active
        ? 'bg-primary text-white shadow-md'
        : 'bg-surface-elevated text-text-secondary hover:text-text-primary hover:bg-surface border border-border/50'
    }`}
  >
    {icon && <Icon name={icon} className="w-4 h-4 mr-2" />}
    {children}
  </button>
);

const PatientFilters = ({ 
  activeFilter, 
  onFilterChange, 
  searchQuery, 
  onSearchChange,
  onAddPatient,
  onExport
}) => {
  const { t } = useLanguage();

  const filters = [
    { key: 'all', label: t('patients.registry.filters.all'), icon: 'users' },
    { key: 'active', label: t('patients.registry.filters.active'), icon: 'user-check' },
    { key: 'inactive', label: t('patients.registry.filters.inactive'), icon: 'user-x' },
    { key: 'vip', label: t('patients.registry.filters.vip'), icon: 'star' },
    { key: 'newPatients', label: t('patients.registry.filters.newPatients'), icon: 'user-plus' }
  ];

  return (
    <div className="bg-surface-elevated rounded-xl p-6 border border-border/50 mb-6">
      {/* Search and Actions Row */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        {/* Search Bar */}
        <div className="flex-1 relative">
          <Icon name="search" className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-secondary" />
          <input
            type="text"
            placeholder={t('patients.registry.search')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-surface rounded-lg border border-border/50 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onAddPatient}
            className="flex items-center px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all duration-200 font-medium"
          >
            <Icon name="plus" className="w-4 h-4 mr-2" />
            {t('patients.registry.actions.add')}
          </button>
          
          <button
            onClick={onExport}
            className="flex items-center px-4 py-3 bg-surface border border-border/50 text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface-elevated transition-all duration-200"
          >
            <Icon name="download" className="w-4 h-4 mr-2" />
            {t('patients.registry.actions.export')}
          </button>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-3">
        {filters.map((filter) => (
          <FilterButton
            key={filter.key}
            active={activeFilter === filter.key}
            onClick={() => onFilterChange(filter.key)}
            icon={filter.icon}
          >
            {filter.label}
          </FilterButton>
        ))}
      </div>
    </div>
  );
};

export default PatientFilters;
