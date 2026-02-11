import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import Icon from '../../../../components/AppIcon';

const PatientReports = ({
  patients = [],
  allAppointments = [],
  selectedDentist = 'all',
  doctors = [],
}) => {
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
    { key: 'demographic', label: t('patients.reports.types.demographic'), icon: 'PieChart' },
    { key: 'dentistPerformance', label: 'Performa Dokter', icon: 'BarChart2' },
  ];

  // ── Compute revenue state ────────────────────────────────────────────────
  const totalRevenue = useMemo(
    () => patients.reduce((sum, p) => sum + (p.totalRevenue || 0), 0),
    [patients]
  );

  const handleGenerateReport = async () => {
    setIsGenerating(true);

    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Generating report:', {
      type: selectedReportType,
      dateRange,
      filters,
      patients: patients.length,
      selectedDentist,
    });

    setIsGenerating(false);
    alert(t('patients.reports.generationSuccess'));
  };

  const ReportPreview = () => {
    switch (selectedReportType) {
      case 'patientList':
        return (
          <div className="space-y-4">
            <h4 className="font-semibold text-text-primary">{t('patients.reports.preview.patientList.title')}</h4>
            <div className="bg-surface rounded-lg p-4">
              <div className="grid grid-cols-5 gap-4 text-sm font-medium text-text-secondary mb-2">
                <div>{t('patients.registry.table.name')}</div>
                <div>{t('patients.registry.table.age')}</div>
                <div>Dokter</div>
                <div>{t('patients.registry.table.status')}</div>
                <div>{t('patients.registry.table.lastVisit')}</div>
              </div>
              {patients.slice(0, 5).map(patient => (
                <div key={patient.id} className="grid grid-cols-5 gap-4 text-sm text-text-primary py-2 border-b border-border/30 last:border-b-0">
                  <div>{patient.name}</div>
                  <div>{patient.age}</div>
                  <div className="text-text-secondary">{patient.doctorName}</div>
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                <div>
                  <div className="text-2xl font-bold text-emerald-600">
                    Rp {(totalRevenue / 1000000).toFixed(1)}M
                  </div>
                  <div className="text-text-secondary">Total Revenue</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {allAppointments.filter(a => a.status === 'overdue').length}
                  </div>
                  <div className="text-text-secondary">Overdue</div>
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
                {(() => {
                  // Build treatment distribution from actual appointment data
                  const treatmentCounts = {};
                  allAppointments.forEach(apt => {
                    treatmentCounts[apt.treatment] = (treatmentCounts[apt.treatment] || 0) + 1;
                  });
                  const total = allAppointments.length;
                  const sorted = Object.entries(treatmentCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
                  return sorted.map(([treatment, count]) => (
                    <div key={treatment} className="flex justify-between items-center">
                      <span className="text-sm text-text-primary">{treatment}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-surface-elevated rounded-full h-2">
                          <div className="bg-accent rounded-full h-2" style={{ width: `${(count / total) * 100}%` }} />
                        </div>
                        <span className="font-medium text-sm w-12 text-right">{total ? ((count / total) * 100).toFixed(0) : 0}%</span>
                      </div>
                    </div>
                  ));
                })()}
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

      // ── Dentist Performance Report ────────────────────────────────────────
      case 'dentistPerformance':
        return (
          <div className="space-y-4">
            <h4 className="font-semibold text-text-primary">Performa Dokter</h4>
            <div className="bg-surface rounded-lg p-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left py-2 text-text-secondary font-medium">Dokter</th>
                      <th className="text-left py-2 text-text-secondary font-medium">Pasien</th>
                      <th className="text-left py-2 text-text-secondary font-medium">Appointment</th>
                      <th className="text-left py-2 text-text-secondary font-medium">Revenue</th>
                      <th className="text-left py-2 text-text-secondary font-medium">Overdue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctors.map(doc => {
                      const docPatients = patients.filter(p => p.doctorId === doc.id);
                      const docApts = allAppointments.filter(a => a.doctorId === doc.id);
                      const docRevenue = docApts.filter(a => a.isPaid).reduce((s, a) => s + a.fee, 0);
                      const docOverdue = docApts.filter(a => a.status === 'overdue').length;
                      return (
                        <tr key={doc.id} className="border-b border-border/20">
                          <td className="py-2 text-text-primary font-medium">{doc.name}</td>
                          <td className="py-2 text-text-primary">{docPatients.length}</td>
                          <td className="py-2 text-text-primary">{docApts.length}</td>
                          <td className="py-2 text-emerald-600 font-medium">Rp {(docRevenue / 1000000).toFixed(1)}M</td>
                          <td className="py-2">
                            {docOverdue > 0 ? (
                              <span className="text-orange-600 font-medium">{docOverdue}</span>
                            ) : (
                              <span className="text-text-secondary">0</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
                  className={`flex items-center p-3 rounded-lg text-left transition-all duration-200 ${selectedReportType === type.key
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">
            {t('patients.reports.preview.title')}
          </h3>
          <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
            {selectedDentist === 'all' ? 'Semua Dokter' : doctors.find(d => d.id === selectedDentist)?.name}
          </span>
        </div>
        <ReportPreview />
      </div>

      {/* Recent Reports */}
      <div className="bg-surface-elevated rounded-xl p-6 border border-border/50">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          {t('patients.reports.recent.title')}
        </h3>
        <div className="space-y-3">
          {[
            { name: `Patient List - ${new Date().toLocaleDateString(locale, { month: 'long', year: 'numeric' })}`, date: new Date().toISOString().split('T')[0], type: 'PDF', size: '2.3 MB' },
            { name: `Visit Summary - ${new Date(Date.now() - 30 * 86400000).toLocaleDateString(locale, { month: 'long', year: 'numeric' })}`, date: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0], type: 'Excel', size: '1.8 MB' },
            { name: 'Dentist Performance Report - Q4', date: new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0], type: 'PDF', size: '4.2 MB' },
            { name: `Treatment Report - ${new Date(Date.now() - 90 * 86400000).toLocaleDateString(locale, { month: 'long', year: 'numeric' })}`, date: new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0], type: 'PDF', size: '3.1 MB' },
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
