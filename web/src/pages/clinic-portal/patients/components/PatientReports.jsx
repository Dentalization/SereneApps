import React, { useState } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import Icon from '../../../../components/AppIcon';

const PatientReports = ({ patients = [] }) => {
  const { t, language } = useLanguage();
  const locale = language === 'id' ? 'id-ID' : 'en-US';
  const [selectedReportType, setSelectedReportType] = useState('patientList');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [filters, setFilters] = useState({
    patientType: 'all',
    treatmentType: 'all'
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const reportTypes = [
    { key: 'patientList', label: t('patients.reports.types.patientList'), icon: 'Users' },
    { key: 'visitSummary', label: t('patients.reports.types.visitSummary'), icon: 'Calendar' },
    { key: 'treatmentReport', label: t('patients.reports.types.treatmentReport'), icon: 'Stethoscope' },
    { key: 'demographic', label: t('patients.reports.types.demographic'), icon: 'PieChart' }
  ];

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Here you would typically call an API to generate the report
    console.log('Generating report:', {
      type: selectedReportType,
      dateRange,
      filters,
      patients: patients.length
    });
    
    setIsGenerating(false);
    
    // Show success message or download file
    alert(t('patients.reports.generationSuccess'));
  };

  const ReportPreview = () => {
    switch (selectedReportType) {
      case 'patientList':
        return (
          <div className="space-y-4">
            <h4 className="font-semibold text-text-primary">{t('patients.reports.preview.patientList.title')}</h4>
            <div className="bg-surface rounded-lg p-4">
              <div className="grid grid-cols-4 gap-4 text-sm font-medium text-text-secondary mb-2">
                <div>{t('patients.registry.table.name')}</div>
                <div>{t('patients.registry.table.age')}</div>
                <div>{t('patients.registry.table.status')}</div>
                <div>{t('patients.registry.table.lastVisit')}</div>
              </div>
              {patients.slice(0, 5).map(patient => (
                <div key={patient.id} className="grid grid-cols-4 gap-4 text-sm text-text-primary py-2 border-b border-border/30 last:border-b-0">
                  <div>{patient.name}</div>
                  <div>{patient.age}</div>
                  <div>{t(`patients.registry.status.${patient.status}`)}</div>
                  <div>{new Date(patient.lastVisit).toLocaleDateString(locale)}</div>
                </div>
              ))}
              {patients.length > 5 && (
                <div className="text-center text-text-secondary text-sm py-2">
                  {t('patients.reports.preview.patientList.more', { count: patients.length - 5 })}
                </div>
              )}
            </div>
          </div>
        );
      
      case 'visitSummary':
        return (
          <div className="space-y-4">
            <h4 className="font-semibold text-text-primary">{t('patients.reports.preview.visitSummary.title')}</h4>
            <div className="bg-surface rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold text-text-primary">
                    {patients.reduce((sum, p) => sum + p.totalVisits, 0)}
                  </div>
                  <div className="text-text-secondary">{t('patients.reports.preview.visitSummary.totalVisits')}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-text-primary">
                    {patients.length ? Math.round(patients.reduce((sum, p) => sum + p.totalVisits, 0) / patients.length) : 0}
                  </div>
                  <div className="text-text-secondary">{t('patients.reports.preview.visitSummary.avgVisits')}</div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'treatmentReport':
        return (
          <div className="space-y-4">
            <h4 className="font-semibold text-text-primary">{t('patients.reports.preview.treatmentReport.title')}</h4>
            <div className="bg-surface rounded-lg p-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>{t('patients.analytics.treatments.cleaning')}</span>
                  <span className="font-medium">45%</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('patients.analytics.treatments.filling')}</span>
                  <span className="font-medium">25%</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('patients.analytics.treatments.rootCanal')}</span>
                  <span className="font-medium">15%</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('patients.analytics.treatments.other')}</span>
                  <span className="font-medium">15%</span>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'demographic':
        return (
          <div className="space-y-4">
            <h4 className="font-semibold text-text-primary">{t('patients.reports.preview.demographic.title')}</h4>
            <div className="bg-surface rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-text-secondary mb-2">{t('patients.reports.preview.demographic.genderDistribution')}</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>{t('patients.common.gender.male')}</span>
                      <span>{patients.filter(p => p.gender === 'M').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('patients.common.gender.female')}</span>
                      <span>{patients.filter(p => p.gender === 'F').length}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-text-secondary mb-2">{t('patients.reports.preview.demographic.averageAge')}</div>
                  <div className="text-xl font-bold text-text-primary">
                    {patients.length
                      ? t('patients.common.labels.years', {
                          count: Math.round(patients.reduce((sum, p) => sum + p.age, 0) / patients.length)
                        })
                      : t('patients.common.labels.years', { count: 0 })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Report Configuration */}
      <div className="bg-surface-elevated rounded-xl p-6 border border-border/50">
        <h3 className="text-lg font-semibold text-text-primary mb-6">
          {t('patients.reports.title')}
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Report Type Selection */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-text-primary">
              {t('patients.reports.reportType')}
            </label>
            <div className="grid grid-cols-1 gap-2">
              {reportTypes.map((type) => (
                <button
                  key={type.key}
                  onClick={() => setSelectedReportType(type.key)}
                  className={`flex items-center p-3 rounded-lg text-left transition-all duration-200 ${
                    selectedReportType === type.key
                      ? 'bg-primary text-white'
                      : 'bg-surface border border-border/50 text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
                  }`}
                >
                  <Icon name={type.icon} className="w-5 h-5 mr-3" />
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-text-primary">
              {t('patients.reports.filters.dateRange')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="px-3 py-2 bg-surface border border-border/50 rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="px-3 py-2 bg-surface border border-border/50 rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-text-primary">
                {t('patients.reports.filters.patientType')}
              </label>
              <select
                value={filters.patientType}
                onChange={(e) => setFilters({ ...filters, patientType: e.target.value })}
                className="w-full px-3 py-2 bg-surface border border-border/50 rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="all">{t('patients.reports.filters.patientTypes.all')}</option>
                <option value="active">{t('patients.reports.filters.patientTypes.active')}</option>
                <option value="inactive">{t('patients.reports.filters.patientTypes.inactive')}</option>
                <option value="vip">{t('patients.reports.filters.patientTypes.vip')}</option>
              </select>

              <label className="block text-sm font-medium text-text-primary">
                {t('patients.reports.filters.treatmentType')}
              </label>
              <select
                value={filters.treatmentType}
                onChange={(e) => setFilters({ ...filters, treatmentType: e.target.value })}
                className="w-full px-3 py-2 bg-surface border border-border/50 rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="all">{t('patients.reports.filters.treatmentTypes.all')}</option>
                <option value="cleaning">{t('patients.reports.filters.treatmentTypes.cleaning')}</option>
                <option value="filling">{t('patients.reports.filters.treatmentTypes.filling')}</option>
                <option value="root-canal">{t('patients.reports.filters.treatmentTypes.rootCanal')}</option>
                <option value="extraction">{t('patients.reports.filters.treatmentTypes.extraction')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className="mt-6 pt-6 border-t border-border/50">
          <button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="flex items-center px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                {t('patients.reports.generating')}
              </>
            ) : (
              <>
                <Icon name="Download" className="w-4 h-4 mr-2" />
                {t('patients.reports.generate')}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Report Preview */}
      <div className="bg-surface-elevated rounded-xl p-6 border border-border/50">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          {t('patients.reports.preview.title')}
        </h3>
        <ReportPreview />
      </div>

      {/* Recent Reports */}
      <div className="bg-surface-elevated rounded-xl p-6 border border-border/50">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          {t('patients.reports.recent.title')}
        </h3>
        <div className="space-y-3">
          {[
            { name: 'Patient List - October 2024', date: '2024-10-01', type: 'PDF', size: '2.3 MB' },
            { name: 'Visit Summary - September 2024', date: '2024-09-30', type: 'Excel', size: '1.8 MB' },
            { name: 'Treatment Report - Q3 2024', date: '2024-09-15', type: 'PDF', size: '3.1 MB' },
          ].map((report, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-surface rounded-lg">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                  <Icon name="FileText" className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium text-text-primary">{report.name}</div>
                  <div className="text-sm text-text-secondary">
                    {report.type} • {report.size} • {new Date(report.date).toLocaleDateString(locale)}
                  </div>
                </div>
              </div>
              <button className="flex items-center px-3 py-2 text-primary hover:bg-primary/10 rounded-lg transition-colors duration-200">
                <Icon name="Download" className="w-4 h-4 mr-1" />
                {t('common.download')}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PatientReports;
