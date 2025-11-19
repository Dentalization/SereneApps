import React, { useState } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import Icon from '../../../../components/AppIcon';

const ExportPanel = ({ data, onExport, loading = false }) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf');
  const [exportOptions, setExportOptions] = useState({
    includeCharts: true,
    includeRawData: false,
    includeSummary: true,
    includeFilters: true
  });

  const exportFormats = [
    { value: 'pdf', label: 'PDF', icon: 'FileText', description: t('reports.pdfDescription') },
    { value: 'excel', label: 'Excel', icon: 'File', description: t('reports.excelDescription') },
    { value: 'csv', label: 'CSV', icon: 'Database', description: t('reports.csvDescription') },
    { value: 'png', label: 'PNG', icon: 'Image', description: t('reports.pngDescription') }
  ];

  const handleOptionChange = (key, value) => {
    setExportOptions(prev => ({ ...prev, [key]: value }));
  };

  const handleExport = () => {
    if (onExport) {
      onExport({
        format: exportFormat,
        options: exportOptions,
        data
      });
    }
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Export Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="flex items-center space-x-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
      >
        {loading ? (
          <Icon name="Loader2" size={16} className="animate-spin" />
        ) : (
          <Icon name="Download" size={16} />
        )}
        <span className="text-sm font-medium">{t('reports.export')}</span>
        <Icon 
          name={isOpen ? "ChevronUp" : "ChevronDown"} 
          size={14} 
          className="transition-transform duration-200" 
        />
      </button>

      {/* Export Panel */}
      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-96 bg-surface border border-primary/20 rounded-xl shadow-theme-lg z-50 p-6 theme-transition">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-primary">{t('reports.exportData')}</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-secondary hover:text-primary transition-colors duration-200"
              >
                <Icon name="X" size={18} />
              </button>
            </div>

            {/* Export Format Selection */}
            <div>
              <label className="block text-sm font-medium text-primary mb-3">
                {t('reports.exportFormat')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {exportFormats.map((format) => (
                  <button
                    key={format.value}
                    onClick={() => setExportFormat(format.value)}
                    className={`p-3 border rounded-lg transition-all duration-200 ${
                      exportFormat === format.value
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-primary/20 text-secondary hover:border-accent/50 hover:text-primary'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <Icon name={format.icon} size={16} />
                      <span className="font-medium">{format.label}</span>
                    </div>
                    <p className="text-xs">{format.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Export Options */}
            <div>
              <label className="block text-sm font-medium text-primary mb-3">
                {t('reports.exportOptions')}
              </label>
              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeCharts}
                    onChange={(e) => handleOptionChange('includeCharts', e.target.checked)}
                    className="w-4 h-4 text-accent rounded border-primary/20 focus:ring-accent/20"
                  />
                  <div>
                    <span className="text-sm text-primary">{t('reports.includeCharts')}</span>
                    <p className="text-xs text-secondary">{t('reports.includeChartsDescription')}</p>
                  </div>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeRawData}
                    onChange={(e) => handleOptionChange('includeRawData', e.target.checked)}
                    className="w-4 h-4 text-accent rounded border-primary/20 focus:ring-accent/20"
                  />
                  <div>
                    <span className="text-sm text-primary">{t('reports.includeRawData')}</span>
                    <p className="text-xs text-secondary">{t('reports.includeRawDataDescription')}</p>
                  </div>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeSummary}
                    onChange={(e) => handleOptionChange('includeSummary', e.target.checked)}
                    className="w-4 h-4 text-accent rounded border-primary/20 focus:ring-accent/20"
                  />
                  <div>
                    <span className="text-sm text-primary">{t('reports.includeSummary')}</span>
                    <p className="text-xs text-secondary">{t('reports.includeSummaryDescription')}</p>
                  </div>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeFilters}
                    onChange={(e) => handleOptionChange('includeFilters', e.target.checked)}
                    className="w-4 h-4 text-accent rounded border-primary/20 focus:ring-accent/20"
                  />
                  <div>
                    <span className="text-sm text-primary">{t('reports.includeFilters')}</span>
                    <p className="text-xs text-secondary">{t('reports.includeFiltersDescription')}</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Date Range Info */}
            <div className="bg-surface-elevated rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <Icon name="Calendar" size={14} className="text-secondary" />
                <span className="text-sm font-medium text-primary">{t('reports.dateRange')}</span>
              </div>
              <p className="text-sm text-secondary">
                {data?.dateRange || t('reports.thisMonth')}
              </p>
            </div>

            {/* File Size Estimate */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                <Icon name="Info" size={14} className="text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  {t('reports.estimatedSize')}
                </span>
              </div>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                {exportFormat === 'pdf' && '2-5 MB'}
                {exportFormat === 'excel' && '1-3 MB'}
                {exportFormat === 'csv' && '200-500 KB'}
                {exportFormat === 'png' && '500 KB - 2 MB'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4 border-t border-primary/10">
              <button
                onClick={handleExport}
                disabled={loading}
                className="flex-1 bg-accent text-white px-4 py-2 rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <Icon name="Loader2" size={16} className="animate-spin" />
                    <span>{t('reports.exporting')}</span>
                  </>
                ) : (
                  <>
                    <Icon name="Download" size={16} />
                    <span>{t('reports.exportNow')}</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-surface-elevated border border-primary/20 rounded-lg text-secondary hover:text-primary hover:border-accent/50 transition-colors duration-200"
              >
                {t('reports.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportPanel;