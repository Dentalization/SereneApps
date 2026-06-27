import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import Icon from '../../../components/AppIcon';
import SideBar from '../ui/SideBar';
import RevenueChart from './components/RevenueChart';
import AppointmentChart from './components/AppointmentChart';
import PatientChart from './components/PatientChart';
import TreatmentChart from './components/TreatmentChart';
import KPICard from './components/KPICard';
import FilterPanel from './components/FilterPanel';
import ExportPanel from './components/ExportPanel';
import { getDentistReportsData } from '../../../services/dentistPortalService';

const ReportsIndex = () => {
  const { t } = useLanguage();
  const { isDark } = useTheme();

  // State
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('thisMonth');
  const [filters, setFilters] = useState({
    treatmentType: 'all',
    patientType: 'all',
    minRevenue: '',
    maxRevenue: '',
    startDate: '',
    endDate: ''
  });
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const loadStartRef = useRef(Date.now());
  const loadingTimerRef = useRef(null);
  const MIN_LOADING_MS = 600;

  // Real report data loaded from backend
  const [dashboardData, setDashboardData] = useState({
    kpis: {
      totalRevenue: 0,
      totalAppointments: 0,
      newPatients: 0,
      treatmentSuccess: 0,
      revenueGrowth: 0,
      appointmentEfficiency: 0,
      patientRetention: 0,
      chairUtilization: 0
    },
    trends: {
      labels: [],
      revenue: [],
      appointments: [],
      patients: []
    }
  });

  // Tabs
  const tabs = [
    { id: 'overview',    label: t('reports.overview') || 'Overview',    icon: 'LayoutDashboard', description: t('reports.performanceDescription') || 'General practice performance' },
    { id: 'financial',   label: t('reports.financial') || 'Financial',   icon: 'TrendingUp',      description: t('reports.revenueDescription') || 'Revenue and invoicing metrics' },
    { id: 'operational', label: t('reports.operational') || 'Operational', icon: 'Clock',           description: t('reports.appointmentDescription') || 'Scheduling and wait time insights' },
    { id: 'clinical',    label: t('reports.clinical') || 'Clinical',    icon: 'Activity',        description: t('reports.clinicalDescription') || 'Treatment success and complication rates' },
    { id: 'patient',     label: t('reports.patient') || 'Patients',     icon: 'Users',           description: t('reports.patientDescription') || 'Patient demographics and satisfaction feedback' }
  ];

  // Date ranges
  const dateRangeOptions = [
    { value: 'today', label: t('reports.today') || 'Today' },
    { value: 'yesterday', label: t('reports.yesterday') || 'Yesterday' },
    { value: 'thisWeek', label: t('reports.thisWeek') || 'This Week' },
    { value: 'lastWeek', label: t('reports.lastWeek') || 'Last Week' },
    { value: 'thisMonth', label: t('reports.thisMonth') || 'This Month' },
    { value: 'lastMonth', label: t('reports.lastMonth') || 'Last Month' },
    { value: 'thisQuarter', label: t('reports.thisQuarter') || 'This Quarter' },
    { value: 'thisYear', label: t('reports.thisYear') || 'This Year' },
    { value: 'lastYear', label: t('reports.lastYear') || 'Last Year' },
    { value: 'custom', label: t('reports.custom') || 'Custom Range' }
  ];

  // Load report data from backend
  const refreshData = async () => {
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
    loadStartRef.current = Date.now();
    setLoading(true);
    try {
      const response = await getDentistReportsData({
        dateRange,
        startDate: filters.startDate,
        endDate: filters.endDate,
        treatmentType: filters.treatmentType,
        patientType: filters.patientType,
        minRevenue: filters.minRevenue,
        maxRevenue: filters.maxRevenue
      });
      setDashboardData(response);
    } catch (error) {
      console.error('Error fetching dentist reports data:', error);
    } finally {
      const finalize = () => {
        setLoading(false);
        loadingTimerRef.current = null;
      };
      const elapsed = Date.now() - loadStartRef.current;
      const remaining = MIN_LOADING_MS - elapsed;
      if (remaining > 0) {
        loadingTimerRef.current = setTimeout(finalize, remaining);
      } else {
        finalize();
      }
    }
  };

  useEffect(() => {
    refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    };
  }, []);

  const shellClasses = ['flex min-h-screen bg-background theme-transition'];
  if (loading) shellClasses.push('dentist-skeleton');

  return (
    <div className={shellClasses.join(' ')}>
      <div
        className="flex-shrink-0"
        style={{ width: 'var(--sidebar-width, 20rem)' }}
      >
        <SideBar />
      </div>

      <main className="flex-1 min-w-0 overflow-y-auto bg-background theme-transition">
        <div className="p-6 md:p-8 space-y-8">

          {/* ===== Header ===== */}
          <section className="clinic-page-header space-y-6 rounded-3xl border border-border/40 bg-surface-elevated p-6 shadow-theme-sm theme-transition">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-2xl bg-accent/10">
                  <Icon name="BarChart3" size={24} className="text-accent" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent">Reports</p>
                  <h1 className="text-3xl font-bold text-primary">{t('reports.title') || 'Practice Insights'}</h1>
                  <p className="text-secondary mt-1">{t('reports.subtitle') || 'Monitor your clinical and financial metrics'}</p>
                </div>
              </div>

              <div className="flex items-center flex-wrap gap-3">
                <div className="relative">
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="appearance-none pl-4 pr-10 py-2 rounded-xl border border-primary/20 bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent theme-transition text-sm"
                  >
                    {dateRangeOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <Icon
                    name="Calendar"
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
                  />
                </div>

                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border transition-gentle text-sm ${
                    showFilters
                      ? 'bg-accent text-white border-accent'
                      : 'bg-surface-elevated text-primary border-primary/20 hover:border-accent/50'
                  }`}
                >
                  <Icon name="Filter" size={16} />
                  <span>{t('reports.filter') || 'Filters'}</span>
                </button>

                <button
                  onClick={() => setShowExport(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-surface-elevated text-primary border-primary/20 hover:border-accent/50 transition-gentle text-sm"
                >
                  <Icon name="Download" size={16} />
                  <span>{t('reports.export') || 'Export'}</span>
                </button>

                <button
                  onClick={refreshData}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent-hover transition-gentle disabled:opacity-50 text-sm"
                >
                  <Icon name="RefreshCw" size={16} className={loading ? 'animate-spin' : ''} />
                  <span>{t('reports.refresh') || 'Refresh'}</span>
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-border/40">
              <div className="flex flex-wrap gap-2">
                {tabs.map(tab => {
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={[
                        'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'bg-accent text-white shadow-sm'
                          : 'text-secondary hover:text-primary hover:bg-surface'
                      ].join(' ')}
                    >
                      <Icon
                        name={tab.icon}
                        size={16}
                        className={active ? 'text-white' : 'text-muted'}
                      />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <p className="mt-3 text-secondary text-xs">
                {tabs.find(t => t.id === activeTab)?.description}
              </p>
            </div>
          </section>

          {/* Panels */}
          {showFilters && (
            <FilterPanel
              filters={filters}
              onFilterChange={handleFilterChange}
              onClose={() => setShowFilters(false)}
            />
          )}
          {showExport && (
            <ExportPanel
              activeTab={activeTab}
              dateRange={dateRange}
              filters={filters}
              onClose={() => setShowExport(false)}
            />
          )}

          {/* Content */}
          <div className="py-2">
            {loading ? (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="p-6 rounded-2xl border border-primary/20 bg-surface skeleton-surface">
                      <div className="w-12 h-12 rounded-2xl bg-accent/10 animate-pulse mb-4"></div>
                      <div className="h-4 w-24 rounded bg-accent/10 animate-pulse mb-2"></div>
                      <div className="h-8 w-32 rounded bg-accent/20 animate-pulse mb-3"></div>
                      <div className="h-4 w-40 rounded bg-accent/10 animate-pulse"></div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {Array.from({ length: 2 }).map((_, idx) => (
                    <div key={idx} className="h-80 rounded-3xl border border-primary/20 bg-surface skeleton-surface">
                      <div className="h-full w-full rounded-3xl bg-accent/10 animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {activeTab === 'overview'    && <OverviewTab dashboardData={dashboardData} />}
                {activeTab === 'financial'   && <FinancialTab dashboardData={dashboardData} />}
                {activeTab === 'operational' && <OperationalTab dashboardData={dashboardData} />}
                {activeTab === 'clinical'    && <ClinicalTab dashboardData={dashboardData} />}
                {activeTab === 'patient'     && <PatientTab dashboardData={dashboardData} />}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

/* ===== Tabs ===== */

const OverviewTab = ({ dashboardData }) => {
  const { t } = useLanguage();
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title={t('reports.totalRevenue') || 'Total Revenue'} value={`Rp ${(dashboardData.kpis.totalRevenue / 1000000).toFixed(1)}M`} change={`+${dashboardData.kpis.revenueGrowth}%`} trend="up" icon="TrendingUp" color="green" />
        <KPICard title={t('reports.totalAppointments') || 'Total Appointments'} value={dashboardData.kpis.totalAppointments} change={`+${dashboardData.kpis.appointmentEfficiency}%`} trend="up" icon="Calendar" color="blue" />
        <KPICard title={t('reports.newPatients') || 'New Patients'} value={dashboardData.kpis.newPatients} change={`+${dashboardData.kpis.patientRetention}%`} trend="up" icon="Users" color="purple" />
        <KPICard title={t('reports.treatmentSuccess') || 'Treatment Success'} value={`${dashboardData.kpis.treatmentSuccess}%`} change={`+${dashboardData.kpis.chairUtilization}%`} trend="up" icon="Activity" color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RevenueChart data={dashboardData.trends} />
        <AppointmentChart data={dashboardData.trends} />
        <PatientChart data={dashboardData} />
        <TreatmentChart data={dashboardData} />
      </div>
    </div>
  );
};

const FinancialTab = ({ dashboardData }) => {
  const { t } = useLanguage();
  const financial = dashboardData.financial || {
    revenueByTreatment: [],
    paymentMethods: [],
    outstandingPayments: 0
  };

  const formatCurrency = (val) => {
    if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(1)}M`;
    return `Rp ${val.toLocaleString('id-ID')}`;
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard title={t('reports.monthlyRevenue') || 'Revenue'} value={formatCurrency(dashboardData.kpis.totalRevenue)} change={`+${dashboardData.kpis.revenueGrowth}%`} trend="up" icon="TrendingUp" color="green" />
        <KPICard title={t('reports.averageTransactionValue') || 'Avg Transaction'} value="Rp 850K" change="+8.5%" trend="up" icon="DollarSign" color="blue" />
        <KPICard title={t('reports.outstandingPayments') || 'Outstanding'} value={formatCurrency(financial.outstandingPayments)} change="-5.2%" trend="down" icon="AlertCircle" color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RevenueChart data={dashboardData.trends} />
        <div className="bg-surface rounded-2xl p-6 border border-primary/20 shadow-theme-lg">
          <h3 className="text-lg font-semibold text-primary mb-6">{t('reports.revenueByTreatment') || 'Revenue by Treatment'}</h3>
          <div className="space-y-4">
            {financial.revenueByTreatment.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-primary">{item.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-primary">{formatCurrency(item.amount)}</div>
                  <div className="text-xs text-secondary">{item.percentage}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-surface rounded-2xl p-6 border border-primary/20 shadow-theme-lg">
          <h3 className="text-lg font-semibold text-primary mb-6">{t('reports.paymentMethods') || 'Payment Methods'}</h3>
          <div className="space-y-4">
            {financial.paymentMethods.map((item, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-primary">{item.method}</span>
                  <span className="text-primary font-medium">{formatCurrency(item.amount)} ({item.percentage}%)</span>
                </div>
                <div className="w-full bg-primary/10 rounded-full h-2">
                  <div className="h-2 rounded-full" style={{ width: `${item.percentage}%`, backgroundColor: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-6 border border-primary/20 shadow-theme-lg flex flex-col justify-between">
          <h3 className="text-lg font-semibold text-primary mb-4">{t('reports.monthlyRevenue') || 'Revenue'} Trend</h3>
          <div className="flex-1 min-h-[220px]">
            <RevenueChart data={dashboardData.trends} />
          </div>
        </div>
      </div>
    </div>
  );
};

const OperationalTab = ({ dashboardData }) => {
  const { t } = useLanguage();
  const operational = dashboardData.operational || {
    appointmentEfficiency: 87.2,
    chairUtilization: 78.5,
    averageWaitTime: 12,
    dailyCapacity: 24,
    peakHours: [],
    waitTimeDistribution: [],
    roomUtilization: [],
    staffEfficiency: []
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KPICard title={t('reports.appointmentEfficiency') || 'Show Rate'} value={`${operational.appointmentEfficiency}%`} change="+5.3%" trend="up" icon="Clock" color="blue" />
        <KPICard title={t('reports.chairUtilization') || 'Chair Utilization'} value={`${operational.chairUtilization}%`} change="+2.1%" trend="up" icon="Settings" color="purple" />
        <KPICard title={t('reports.averageWaitTime') || 'Avg Wait Time'} value={`${operational.averageWaitTime} min`} change="-3.5%" trend="down" icon="Timer" color="green" />
        <KPICard title={t('reports.dailyCapacity') || 'Daily Capacity'} value={`${operational.dailyCapacity} patients`} change="+8.0%" trend="up" icon="Users" color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <AppointmentChart data={dashboardData.trends} />
        <div className="bg-surface rounded-2xl p-6 border border-primary/20 shadow-theme-lg">
          <h3 className="text-lg font-semibold text-primary mb-6">{t('reports.scheduleOptimization') || 'Schedule Optimization'}</h3>
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium text-primary mb-3">{t('reports.peakHours') || 'Peak Appointment Hours'}</h4>
              <div className="grid grid-cols-4 gap-2">
                {operational.peakHours.map((h, i) => (
                  <div key={i} className="text-center p-3 bg-accent/10 rounded-lg">
                    <div className="text-sm font-semibold text-accent">{h}</div>
                    <div className="text-xs text-secondary">High</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-surface rounded-2xl p-6 border border-primary/20 shadow-theme-lg">
          <h3 className="text-lg font-semibold text-primary mb-6">{t('reports.waitTimeDistribution') || 'Wait Time Distribution'}</h3>
          <div className="space-y-4">
            {operational.waitTimeDistribution.map((it, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: it.color }} />
                  <span className="text-sm text-primary">{it.range}</span>
                </div>
                <span className="text-sm font-medium text-primary">{it.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-6 border border-primary/20 shadow-theme-lg">
          <h3 className="text-lg font-semibold text-primary mb-6">{t('reports.roomUtilization') || 'Room Utilization'}</h3>
          <div className="space-y-4">
            {operational.roomUtilization.map((it, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-primary">{it.room}</span>
                  <span className="text-secondary">{it.utilization}% • {it.status}</span>
                </div>
                <div className="w-full bg-primary/10 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{ 
                      width: `${it.utilization}%`,
                      backgroundColor: it.utilization >= 90 ? '#EF4444' : it.utilization >= 75 ? '#10B981' : '#F59E0B'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-6 border border-primary/20 shadow-theme-lg">
          <h3 className="text-lg font-semibold text-primary mb-6">{t('reports.staffEfficiency') || 'Staff Efficiency'}</h3>
          <div className="space-y-4">
            {operational.staffEfficiency.map((it, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-primary">{it.name}</span>
                  <span className="text-secondary">{it.efficiency}% • {it.appointments} apt</span>
                </div>
                <div className="w-full bg-primary/10 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${it.efficiency}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ClinicalTab = ({ dashboardData }) => {
  const { t } = useLanguage();
  const clinical = dashboardData.clinical || {
    complicationRate: 3.1,
    treatmentCompletion: 96.8,
    patientSatisfaction: 4.7,
    successRateByTreatment: [],
    diagnosisAccuracy: { overall: 96.2, categories: [] },
    treatmentDuration: [],
    qualityMetrics: { painManagement: 8.9, followUpCompliance: 87, infectionControl: 99.8, equipmentEfficiency: 92 },
    treatmentTimeline: []
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KPICard title={t('reports.treatmentSuccess') || 'Treatment Success'} value={`${dashboardData.kpis.treatmentSuccess}%`} change={`+2.8%`} trend="up" icon="Activity" color="green" />
        <KPICard title={t('reports.complicationRate') || 'Complication Rate'} value={`${clinical.complicationRate}%`} change={`-1.2%`} trend="down" icon="AlertTriangle" color="orange" />
        <KPICard title={t('reports.treatmentCompletion') || 'Completion Rate'} value={`${clinical.treatmentCompletion}%`} change={`+1.5%`} trend="up" icon="CheckCircle" color="emerald" />
        <KPICard title={t('reports.patientSatisfaction') || 'Satisfaction'} value={`${clinical.patientSatisfaction}/5`} change={`+0.3`} trend="up" icon="Star" color="yellow" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <TreatmentChart data={dashboardData} />
        <div className="bg-surface rounded-2xl p-6 border border-primary/20 shadow-theme-lg">
          <h3 className="text-lg font-semibold text-primary mb-6">{t('reports.treatmentOutcomes') || 'Treatment Outcomes'}</h3>
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium text-primary mb-3">{t('reports.successRateByTreatment') || 'Success Rate by Treatment'}</h4>
              <div className="space-y-3">
                {clinical.successRateByTreatment.map((it, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-primary">{it.treatment}</span>
                      <span className="text-primary font-medium">{it.rate}%</span>
                    </div>
                    <div className="w-full bg-primary/10 rounded-full h-2">
                      <div className="h-2 rounded-full" style={{ width: `${it.rate}%`, backgroundColor: it.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-surface rounded-2xl p-6 border border-primary/20 shadow-theme-lg">
          <h3 className="text-lg font-semibold text-primary mb-6">{t('reports.diagnosisAccuracy') || 'Diagnosis Accuracy'}</h3>
          <div className="text-center mb-6">
            <div className="text-3xl font-bold text-emerald-600">{clinical.diagnosisAccuracy.overall}%</div>
            <div className="text-sm text-secondary">{t('reports.accuracyRate') || 'Accuracy Rate'}</div>
          </div>
          <div className="space-y-3">
            {clinical.diagnosisAccuracy.categories.map((it, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-secondary">{it.category}</span>
                  <span className="text-primary">{it.accuracy}%</span>
                </div>
                <div className="w-full bg-primary/10 rounded-full h-1">
                  <div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${it.accuracy}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-6 border border-primary/20 shadow-theme-lg">
          <h3 className="text-lg font-semibold text-primary mb-6">{t('reports.treatmentDuration') || 'Treatment Duration'}</h3>
          <div className="space-y-4">
            {clinical.treatmentDuration.map((it, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-surface-elevated rounded-lg">
                <div>
                  <div className="text-sm font-medium text-primary">{it.treatment}</div>
                  <div className="text-xs text-secondary">Target: {it.target}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-primary">{it.duration}</div>
                  <div className={`text-xs ${it.status === 'on-time' ? 'text-green-500' : it.status === 'under' ? 'text-blue-500' : 'text-orange-500'}`}>
                    {it.status === 'on-time' ? 'On Time' : it.status === 'under' ? 'Under' : 'Over'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-6 border border-primary/20 shadow-theme-lg">
          <h3 className="text-lg font-semibold text-primary mb-6">{t('reports.qualityMetrics') || 'Quality Metrics'}</h3>
          <div className="space-y-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{clinical.qualityMetrics.painManagement}/10</div>
              <div className="text-xs text-blue-600 dark:text-blue-400">{t('reports.painManagement') || 'Pain Management'}</div>
            </div>
            <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{clinical.qualityMetrics.followUpCompliance}%</div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400">{t('reports.followUpCompliance') || 'Compliance'}</div>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-xl font-bold text-purple-600 dark:text-purple-400">{clinical.qualityMetrics.infectionControl}%</div>
              <div className="text-xs text-purple-600 dark:text-purple-400">{t('reports.infectionControl') || 'Infection Control'}</div>
            </div>
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="text-xl font-bold text-orange-600 dark:text-orange-400">{clinical.qualityMetrics.equipmentEfficiency}%</div>
              <div className="text-xs text-orange-600 dark:text-orange-400">{t('reports.equipmentEfficiency') || 'Equipment'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PatientTab = ({ dashboardData }) => {
  const { t } = useLanguage();
  const patient = dashboardData.patient || {
    totalPatients: 1234,
    retentionRate: 89.1,
    averageAge: 35.2,
    patientSatisfaction: { score: 4.7, categories: [] },
    ageDistribution: [],
    visitFrequency: [],
    referralSources: [],
    retentionAnalysis: [],
    lifetimeValue: 8400000,
    valueSegments: []
  };

  const formatCurrency = (val) => {
    if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(1)}M`;
    return `Rp ${val.toLocaleString('id-ID')}`;
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KPICard title={t('reports.totalPatients') || 'Total Patients'} value={patient.totalPatients} change={`+15.3%`} trend="up" icon="Users" color="blue" />
        <KPICard title={t('reports.newPatients') || 'New Patients'} value={dashboardData.kpis.newPatients} change={`+23.5%`} trend="up" icon="UserPlus" color="emerald" />
        <KPICard title={t('reports.retentionRate') || 'Retention Rate'} value={`${patient.retentionRate}%`} change={`+4.2%`} trend="up" icon="Heart" color="red" />
        <KPICard title={t('reports.averageAge') || 'Avg Age'} value={patient.averageAge} change={`+1.8`} trend="up" icon="Calendar" color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <PatientChart data={dashboardData} />
        <div className="bg-surface rounded-2xl p-6 border border-primary/20 shadow-theme-lg">
          <h3 className="text-lg font-semibold text-primary mb-6">{t('reports.patientSatisfaction') || 'Patient Satisfaction'}</h3>
          <div className="text-center mb-6">
            <div className="text-4xl font-bold text-yellow-500">{patient.patientSatisfaction.score}</div>
            <div className="text-sm text-secondary">{t('reports.outOf5Stars') || 'out of 5 stars'}</div>
            <div className="flex justify-center mt-2">
              {[1, 2, 3, 4, 5].map(star => (
                <Icon key={star} name="Star" size={16} className={star <= Math.round(patient.patientSatisfaction.score) ? 'text-yellow-500 fill-current' : 'text-gray-300'} />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            {patient.patientSatisfaction.categories.map((it, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-primary">{it.category}</span>
                  <span className="text-primary font-medium">{it.score}/5</span>
                </div>
                <div className="w-full bg-primary/10 rounded-full h-2">
                  <div className="h-2 rounded-full" style={{ width: `${(it.score / 5) * 100}%`, backgroundColor: it.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-surface rounded-2xl p-6 border border-primary/20 shadow-theme-lg">
          <h3 className="text-lg font-semibold text-primary mb-6">{t('reports.ageDistribution') || 'Age Distribution'}</h3>
          <div className="space-y-4">
            {patient.ageDistribution.map((it, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: it.color }} />
                  <span className="text-sm text-primary">{it.range}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-primary">{it.count}</div>
                  <div className="text-xs text-secondary">{it.percentage}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-6 border border-primary/20 shadow-theme-lg">
          <h3 className="text-lg font-semibold text-primary mb-6">{t('reports.visitFrequency') || 'Visit Frequency'}</h3>
          <div className="space-y-4">
            {patient.visitFrequency.map((it, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-primary">{it.frequency}</span>
                  <span className="text-secondary">{it.count} ({it.percentage}%)</span>
                </div>
                <div className="w-full bg-primary/10 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${it.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-6 border border-primary/20 shadow-theme-lg">
          <h3 className="text-lg font-semibold text-primary mb-6">{t('reports.referralSources') || 'Referral Sources'}</h3>
          <div className="space-y-4">
            {patient.referralSources.map((it, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-surface-elevated rounded-lg">
                <div>
                  <div className="text-sm font-medium text-primary">{it.source}</div>
                  <div className="text-xs text-secondary">{it.percentage}% of new patients</div>
                </div>
                <div className="text-sm font-semibold text-primary">{it.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-surface rounded-2xl p-6 border border-primary/20 shadow-theme-lg">
          <h3 className="text-lg font-semibold text-primary mb-6">{t('reports.retentionAnalysis') || 'Retention Analysis'}</h3>
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium text-primary mb-3">{t('reports.retentionByYears') || 'Retention by Duration'}</h4>
              <div className="space-y-3">
                {patient.retentionAnalysis.map((it, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-primary">{it.year}</span>
                      <span className="text-secondary">{it.rate}% ({it.patients} patients)</span>
                    </div>
                    <div className="w-full bg-primary/10 rounded-full h-2">
                      <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${it.rate}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-6 border border-primary/20 shadow-theme-lg">
          <h3 className="text-lg font-semibold text-primary mb-6">{t('reports.patientValue') || 'Patient Lifetime Value'}</h3>
          <div className="space-y-6">
            <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(patient.lifetimeValue)}</div>
              <div className="text-sm text-blue-600 dark:text-blue-400">{t('reports.averageLifetimeValue') || 'Average Lifetime Value'}</div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-primary mb-3">{t('reports.valueSegments') || 'Value Segments'}</h4>
              <div className="space-y-3">
                {patient.valueSegments.map((it, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-primary">{it.segment}</span>
                      <span className="text-secondary">{it.count} ({it.percentage}%)</span>
                    </div>
                    <div className="w-full bg-primary/10 rounded-full h-2">
                      <div className="h-2 rounded-full" style={{ width: `${it.percentage}%`, backgroundColor: it.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsIndex;
