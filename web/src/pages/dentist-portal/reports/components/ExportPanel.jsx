import React, { useState } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import Icon from '../../../../components/AppIcon';
import ModalPortal from '../../../../components/ui/ModalPortal';

const ExportPanel = ({ activeTab, dateRange, filters, onClose }) => {
  const { t } = useLanguage();
  const [exportFormat, setExportFormat] = useState('pdf');
  const [exportOptions, setExportOptions] = useState({
    includeCharts: true,
    includeRawData: false,
    includeSummary: true,
    includeFilters: true
  });
  const [exporting, setExporting] = useState(false);

  const exportFormats = [
    { value: 'pdf', label: 'PDF', icon: 'FileText', description: t('reports.pdfDescription') || 'Export as a styled PDF report' },
    { value: 'excel', label: 'Excel', icon: 'File', description: t('reports.excelDescription') || 'Spreadsheet formatted data' },
    { value: 'csv', label: 'CSV', icon: 'Database', description: t('reports.csvDescription') || 'Comma separated text data' },
    { value: 'png', label: 'PNG', icon: 'Image', description: t('reports.pngDescription') || 'Snapshot image of dashboard' }
  ];

  const handleOptionChange = (key, value) => {
    setExportOptions(prev => ({ ...prev, [key]: value }));
  };

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      alert(`Report exported successfully in ${exportFormat.toUpperCase()} format!`);
      onClose();
    }, 1500);
  };

  return (
    <ModalPortal>
      <div 
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" 
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-md bg-surface border border-primary/20 rounded-2xl shadow-theme-2xl p-6 theme-transition"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6 border-b border-primary/10 pb-4">
            <div className="flex items-center space-x-2">
              <Icon name="Download" size={20} className="text-accent" />
              <h3 className="text-lg font-bold text-primary">{t('reports.exportData') || 'Export Report'}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-secondary hover:text-primary transition-colors duration-200 rounded-lg hover:bg-surface-elevated"
            >
              <Icon name="X" size={18} />
            </button>
          </div>

          <div className="space-y-6">
            {/* Format Selection */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-3">
                {t('reports.exportFormat') || 'Format'}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {exportFormats.map((format) => (
                  <button
                    key={format.value}
                    onClick={() => setExportFormat(format.value)}
                    className={`p-3 border rounded-xl text-left transition-all duration-200 ${
                      exportFormat === format.value
                        ? 'border-accent bg-accent/5 text-accent dark:bg-accent/10'
                        : 'border-primary/15 text-secondary hover:border-accent/50 hover:text-primary'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1 font-semibold text-sm">
                      <Icon name={format.icon} size={16} />
                      <span>{format.label}</span>
                    </div>
                    <p className="text-[10px] text-secondary/80 leading-relaxed">{format.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Options Checkboxes */}
            <div className="space-y-3 bg-surface-elevated p-4 rounded-xl border border-primary/10">
              <label className="block text-sm font-semibold text-primary mb-2">
                {t('reports.exportOptions') || 'Include in Export'}
              </label>
              <div className="space-y-2">
                {[
                  { key: 'includeSummary', label: t('reports.includeSummary') || 'Executive Summary' },
                  { key: 'includeCharts', label: t('reports.includeCharts') || 'Visual Charts/Diagrams' },
                  { key: 'includeRawData', label: t('reports.includeRawData') || 'Raw Data Tables' },
                  { key: 'includeFilters', label: t('reports.includeFilters') || 'Applied Filters Info' }
                ].map((opt) => (
                  <label key={opt.key} className="flex items-center space-x-3 text-sm text-primary select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportOptions[opt.key]}
                      onChange={(e) => handleOptionChange(opt.key, e.target.checked)}
                      className="rounded border-primary/20 text-accent focus:ring-accent w-4 h-4 bg-surface"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4 border-t border-primary/10">
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex-1 bg-accent text-white py-2.5 rounded-xl hover:bg-accent/90 disabled:opacity-50 transition-colors duration-200 font-semibold flex items-center justify-center space-x-2"
              >
                {exporting ? (
                  <>
                    <Icon name="RefreshCw" size={16} className="animate-spin" />
                    <span>{t('reports.exporting') || 'Exporting...'}</span>
                  </>
                ) : (
                  <>
                    <Icon name="Download" size={16} />
                    <span>{t('reports.exportNow') || 'Export Report'}</span>
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2.5 bg-surface-elevated border border-primary/20 rounded-xl text-secondary hover:text-primary transition-colors duration-200 text-sm"
              >
                {t('reports.cancel') || 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default ExportPanel;