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

const ReportsIndex = () => {
  const { t } = useLanguage();
  const { isDark } = useTheme();

  // State
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('thisMonth');
  const [filters, setFilters] = useState({
    provider: 'all',
    location: 'all',
    service: 'all',
    patientType: 'all'
  });
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const loadStartRef = useRef(Date.now());
  const loadingTimerRef = useRef(null);
  const MIN_LOADING_MS = 900;

  // Mock data
  const [dashboardData, setDashboardData] = useState({
    kpis: {
      totalRevenue: 125000000,
      totalAppointments: 245,
      newPatients: 32,
      treatmentSuccess: 94.5,
      revenueGrowth: 12.3,
      appointmentEfficiency: 87.2,
      patientRetention: 89.1,
      chairUtilization: 78.5
    },
    trends: {
      revenue: [85, 92, 88, 95, 102, 110, 125],
      appointments: [180, 195, 210, 225, 240, 245, 250],
      patients: [25, 28, 30, 35, 32, 38, 42]
    }
  });

  // Tabs
  const tabs = [
    { id: 'overview',    label: t('reports.overview'),    icon: 'LayoutDashboard', description: t('reports.performanceDescription') },
    { id: 'financial',   label: t('reports.financial'),   icon: 'TrendingUp',      description: t('reports.revenueDescription') },
    { id: 'operational', label: t('reports.operational'), icon: 'Clock',           description: t('reports.appointmentDescription') },
    { id: 'clinical',    label: t('reports.clinical'),    icon: 'Activity',        description: t('reports.clinicalDescription') },
    { id: 'patient',     label: t('reports.patient'),     icon: 'Users',           description: t('reports.patientDescription') }
  ];

  // Date range
  const dateRangeOptions = [
    { value: 'today', label: t('reports.today') },
    { value: 'yesterday', label: t('reports.yesterday') },
    { value: 'thisWeek', label: t('reports.thisWeek') },
    { value: 'lastWeek', label: t('reports.lastWeek') },
    { value: 'thisMonth', label: t('reports.thisMonth') },
    { value: 'lastMonth', label: t('reports.lastMonth') },
    { value: 'thisQuarter', label: t('reports.thisQuarter') },
    { value: 'lastQuarter', label: t('reports.lastQuarter') },
    { value: 'thisYear', label: t('reports.thisYear') },
    { value: 'lastYear', label: t('reports.lastYear') },
    { value: 'custom', label: t('reports.custom') }
  ];

  // Refresh (mock)
  const refreshData = async () => {
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
    loadStartRef.current = Date.now();
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 1000));
      console.log('Refreshing data with filters:', { dateRange, ...filters });
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

  const handleFilterChange = (type, value) => {
    setFilters(prev => ({ ...prev, [type]: value }));
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
                {loading ? (
                  <div className="space-y-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-accent/10 animate-pulse"></div>
                        <div className="space-y-3">
                          <div className="h-6 w-48 rounded-lg bg-accent/10 animate-pulse"></div>
                          <div className="h-4 w-64 rounded bg-accent/10 animate-pulse"></div>
                        </div>
                      </div>
                      <div className="flex items-center flex-wrap gap-3">
                        <div className="h-10 w-40 rounded-xl bg-accent/10 animate-pulse"></div>
                        <div className="h-10 w-36 rounded-xl bg-accent/10 animate-pulse"></div>
                        <div className="h-10 w-36 rounded-xl bg-accent/10 animate-pulse"></div>
                        <div className="h-10 w-36 rounded-xl bg-accent/20 animate-pulse"></div>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-primary/15">
                      <div className="flex flex-wrap gap-2">
                        {Array.from({ length: 4 }).map((_, idx) => (
                          <div key={idx} className="h-8 w-32 rounded-full bg-accent/10 animate-pulse"></div>
                        ))}
                      </div>
                      <div className="h-4 w-60 rounded bg-accent/10 animate-pulse mt-3"></div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="p-3 rounded-2xl bg-accent/10">
                          <Icon name="BarChart3" size={24} className="text-accent" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Reports</p>
                          <h1 className="text-3xl font-bold text-primary">{t('reports.title')}</h1>
                          <p className="text-secondary mt-1">{t('reports.subtitle')}</p>
                        </div>
                      </div>

                      <div className="flex items-center flex-wrap gap-3">
                        <div className="relative">
                          <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                            className="appearance-none pl-4 pr-10 py-2 rounded-xl border border-primary/20 bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent theme-transition"
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
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border transition-gentle ${
                            showFilters
                              ? 'bg-accent text-white border-accent'
                              : 'bg-surface-elevated text-primary border-primary/20 hover:border-accent/50'
                          }`}
                        >
                          <Icon name="Filter" size={16} />
                          <span>{t('reports.filter')}</span>
                        </button>

                        <button
                          onClick={() => setShowExport(!showExport)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-surface-elevated text-primary border-primary/20 hover:border-accent/50 transition-gentle"
                        >
                          <Icon name="Download" size={16} />
                          <span>{t('reports.export')}</span>
                        </button>

                        <button
                          onClick={refreshData}
                          disabled={loading}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent-hover transition-gentle disabled:opacity-50"
                        >
                          <Icon name="RefreshCw" size={16} className={loading ? 'animate-spin' : ''} />
                          <span>{t('reports.refresh')}</span>
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

                      <p className="mt-3 text-secondary text-sm">
                        {tabs.find(t => t.id === activeTab)?.description}
                      </p>
                    </div>
                  </>
                )}
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
                  {Array.from({ length: 4 }).map((_, idx) => (
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
        <KPICard title={t('reports.totalRevenue')} value={`Rp ${(dashboardData.kpis.totalRevenue / 1000000).toFixed(1)}M`} change={`+${dashboardData.kpis.revenueGrowth}%`} trend="up" icon="TrendingUp" color="green" />
        <KPICard title={t('reports.totalAppointments')} value={dashboardData.kpis.totalAppointments} change={`+${dashboardData.kpis.appointmentEfficiency}%`} trend="up" icon="Calendar" color="blue" />
        <KPICard title={t('reports.newPatients')} value={dashboardData.kpis.newPatients} change={`+${dashboardData.kpis.patientRetention}%`} trend="up" icon="Users" color="purple" />
        <KPICard title={t('reports.treatmentSuccess')} value={`${dashboardData.kpis.treatmentSuccess}%`} change={`+${dashboardData.kpis.chairUtilization}%`} trend="up" icon="Activity" color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RevenueChart data={dashboardData.trends.revenue} />
        <AppointmentChart data={dashboardData.trends.appointments} />
        <PatientChart data={dashboardData.trends.patients} />
        <TreatmentChart data={dashboardData.trends.revenue} />
      </div>
    </div>
  );
};

const FinancialTab = ({ dashboardData }) => {
  const { t } = useLanguage();
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard title={t('reports.monthlyRevenue')} value="Rp 125.0M" change="+12.3%" trend="up" icon="TrendingUp" color="green" />
        <KPICard title={t('reports.averageTransactionValue')} value="Rp 850K" change="+8.5%" trend="up" icon="DollarSign" color="blue" />
        <KPICard title={t('reports.outstandingPayments')} value="Rp 12.5M" change="-5.2%" trend="down" icon="AlertCircle" color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RevenueChart data={dashboardData.trends.revenue} />
        <div className="bg-surface rounded-2xl p-6 border border-primary/20 shadow-theme-lg">
          <h3 className="text-lg font-semibold text-primary mb-6">{t('reports.revenueByTreatment')}</h3>
          <div className="space-y-4">
            {[
              { name: 'Crown/Bridge', amount: 'Rp 45.2M', percentage: 36, color: 'bg-blue-500' },
              { name: 'Root Canal', amount: 'Rp 32.1M', percentage: 26, color: 'bg-emerald-500' },
              { name: 'Orthodontics', amount: 'Rp 28.7M', percentage: 23, color: 'bg-purple-500' },
              { name: 'Implants', amount: 'Rp 18.4M', percentage: 15, color: 'bg-orange-500' }
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <span className="text-sm text-primary">{item.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-primary">{item.amount}</div>
                  <div className="text-xs text-secondary">{item.percentage}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-surface rounded-2xl p-6 border border-primary/20 shadow-theme-lg">
          <h3 className="text-lg font-semibold text-primary mb-6">{t('reports.paymentMethods')}</h3>
          <div className="space-y-4">
            {[
              { method: 'Cash', amount: 'Rp 42.5M', percentage: 34, color: 'bg-green-500' },
              { method: 'Credit Card', amount: 'Rp 38.2M', percentage: 31, color: 'bg-blue-500' },
              { method: 'Bank Transfer', amount: 'Rp 31.8M', percentage: 25, color: 'bg-purple-500' },
              { method: 'Insurance', amount: 'Rp 12.5M', percentage: 10, color: 'bg-orange-500' }
            ].map((item, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-primary">{item.method}</span>
                  <span className="text-primary font-medium">{item.amount} ({item.percentage}%)</span>
                </div>
                <div className="w-full bg-primary/10 rounded-full h-2">
                  <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${item.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-6 border border-primary/20 shadow-theme-lg">
          <h3 className="text-lg font-semibold text-primary mb-6">{t('reports.monthlyRevenue')} Trend</h3>
          <div className="h-48 flex items-end justify-between space-x-2">
            {[85, 92, 88, 95, 102, 110, 125, 118, 135, 142, 138, 145].map((value, i) => {
              const max = 145;
              const h = (value / max) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg" style={{ height: `${h}%` }} />
                  <span className="text-xs text-secondary mt-2">{['J','F','M','A','M','J','J','A','S','O','N','D'][i]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const OperationalTab = ({ dashboardData }) => {
  const { t } = useLanguage();
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KPICard title={t('reports.appointmentEfficiency')} value="87.2%" change="+5.3%" trend="up" icon="Clock" color="blue" />
        <KPICard title={t('reports.chairUtilization')} value="78.5%" change="+2.1%" trend="up" icon="Settings" color="purple" />
        <KPICard title={t('reports.averageWaitTime')} value="12 min" change="-3.5%" trend="down" icon="Timer" color="green" />
        <KPICard title={t('reports.dailyCapacity')} value="24 patients" change="+8.0%" trend="up" icon="Users" color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <AppointmentChart data={dashboardData.trends.appointments} />
        <div className="bg-surface rounded-2xl p-6 border border-primary/20 shadow-theme-lg">
          <h3 className="text-lg font-semibold text-primary mb-6">{t('reports.scheduleOptimization')}</h3>
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium text-primary mb-3">{t('reports.peakHours')}</h4>
              <div className="grid grid-cols-4 gap-2">
                {['09:00', '10:00', '14:00', '16:00'].map((h, i) => (
                  <div key={i} className="text-center p-3 bg-accent/10 rounded-lg">
                    <div className="text-sm font-semibold text-accent">{h}</div>
                    <div className="text-xs text-secondary">High</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-primary mb-3">{t('reports.appointmentTypes')}</h4>
              <div className="space-y-3">
                {[
                  { type: 'Regular Checkup', count: 156, percentage: 64 },
                  { type: 'Emergency', count: 45, percentage: 18 },
                  { type: 'Follow-up', count: 32, percentage: 13 },
                  { type: 'Consultation', count: 12, percentage: 5 }
                ].map((it, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-primary">{it.type}</span>
                      <span className="text-secondary">{it.count}</span>
                    </div>
                    <div className="w-full bg-primary/10 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${it.percentage}%` }} />
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
          <h3 className="text-lg font-semibold text-primary mb-6">{t('reports.waitTimeDistribution')}</h3>
          <div className="space-y-4">
            {[
              { range: '0-5 min', count: 89, color: 'bg-green-500' },
              { range: '5-10 min', count: 67, color: 'bg-yellow-500' },
              { range: '10-15 min', count: 34, color: 'bg-orange-500' },
              { range: '15+ min', count: 12, color: 'bg-red-500' }
            ].map((it, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${it.color}`} />
                  <span className="text-sm text-primary">{it.range}</span>
                </div>
                <span className="text-sm font-medium text-primary">{it.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-6 border border-primary/20 shadow-theme-lg">
          <h3 className="text-lg font-semibold text-primary mb-6">{t('reports.roomUtilization')}</h3>
          <div className="space-y-4">
            {[
              { room: 'Room 1', utilization: 85, status: 'Optimal' },
              { room: 'Room 2', utilization: 78, status: 'Good' },
              { room: 'Room 3', utilization: 92, status: 'High' },
              { room: 'Room 4', utilization: 65, status: 'Low' }
            ].map((it, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-primary">{it.room}</span>
                  <span className="text-secondary">{it.utilization}% • {it.status}</span>
                </div>
                <div className="w-full bg-primary/10 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      it.utilization >= 90 ? 'bg-red-500' :
                      it.utilization >= 75 ? 'bg-green-500' :
                      it.utilization >= 60 ? 'bg-yellow-500' : 'bg-orange-500'
                    }`}
                    style={{ width: `${it.utilization}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-6 border border-primary/20 shadow-theme-lg">
          <h3 className="text-lg font-semibold text-primary mb-6">{t('reports.staffEfficiency')}</h3>
          <div className="space-y-4">
            {[
              { name: 'Dr. Ahmad', efficiency: 94, appointments: 28 },
              { name: 'Dr. Sarah', efficiency: 89, appointments: 25 },
              { name: 'Dr. Budi', efficiency: 87, appointments: 22 },
              { name: 'Dr. Lisa', efficiency: 91, appointments: 26 }
            ].map((it, i) => (
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
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KPICard title={t('reports.treatmentSuccess')} value="94.5%" change="+2.8%" trend="up" icon="Activity" color="green" />
        <KPICard title={t('reports.complicationRate')} value="3.1%" change="-1.2%" trend="down" icon="AlertTriangle" color="orange" />
        <KPICard title={t('reports.treatmentCompletion')} value="96.8%" change="+1.5%" trend="up" icon="CheckCircle" color="emerald" />
        <KPICard title={t('reports.patientSatisfaction')} value="4.7/5" change="+0.3" trend="up" icon="Star" color="yellow" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <TreatmentChart data={dashboardData.trends.revenue} />
        <div className="bg-surface rounded-2xl p-6 border border-primary/20 shadow-theme-lg">
          <h3 className="text-lg font-semibold text-primary mb-6">{t('reports.treatmentOutcomes')}</h3>
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium text-primary mb-3">{t('reports.successRateByTreatment')}</h4>
              <div className="space-y-3">
                {[
                  { treatment: 'Dental Cleaning', rate: 99.2, color: 'bg-green-500' },
                  { treatment: 'Cavity Filling', rate: 97.8, color: 'bg-emerald-500' },
                  { treatment: 'Root Canal', rate: 94.5, color: 'bg-blue-500' },
                  { treatment: 'Crown/Bridge', rate: 92.1, color: 'bg-purple-500' },
                  { treatment: 'Extraction', rate: 98.5, color: 'bg-orange-500' }
                ].map((it, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-primary">{it.treatment}</span>
                      <span className="text-primary font-medium">{it.rate}%</span>
                    </div>
                    <div className="w-full bg-primary/10 rounded-full h-2">
                      <div className={`h-2 rounded-full ${it.color}`} style={{ width: `${it.rate}%` }} />
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
          <h3 className="text-lg font-semibold text-primary mb-6">{t('reports.diagnosisAccuracy')}</h3>
          <div className="text-center mb-6">
            <div className="text-3xl font-bold text-emerald-600">96.2%</div>
            <div className="text-sm text-secondary">{t('reports.accuracyRate')}</div>
          </div>
          <div className="space-y-3">
            {[
              { category: 'Caries Detection', accuracy: 98.5 },
              { category: 'Periodontal Disease', accuracy: 95.8 },
              { category: 'Orthodontic Issues', accuracy: 94.2 },
              { category: 'Oral Pathology', accuracy: 97.1 }
            ].map((it, i) => (
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
          <h3 className="text-lg font-semibold text-primary mb-6">{t('reports.treatmentDuration')}</h3>
          <div className="space-y-4">
            {[
              { treatment: 'Cleaning', duration: '30 min', target: '30 min', status: 'on-time' },
              { treatment: 'Filling', duration: '45 min', target: '40 min', status: 'over' },
              { treatment: 'Root Canal', duration: '90 min', target: '90 min', status: 'on-time' },
              { treatment: 'Crown Prep', duration: '60 min', target: '65 min', status: 'under' },
              { treatment: 'Extraction', duration: '25 min', target: '30 min', status: 'under' }
            ].map((it, i) => (
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
          <h3 className="text-lg font-semibold text-primary mb-6">{t('reports.qualityMetrics')}</h3>
          <div className="space-y-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">8.9/10</div>
              <div className="text-xs text-blue-600 dark:text-blue-400">{t('reports.painManagement')}</div>
            </div>
            <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">87%</div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400">{t('reports.followUpCompliance')}</div>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-xl font-bold text-purple-600 dark:text-purple-400">99.8%</div>
              <div className="text-xs text-purple-600 dark:text-purple-400">{t('reports.infectionControl')}</div>
            </div>
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="text-xl font-bold text-orange-600 dark:text-orange-400">92%</div>
              <div className="text-xs text-orange-600 dark:text-orange-400">{t('reports.equipmentEfficiency')}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-2xl p-6 border border-primary/20 shadow-theme-lg">
        <h3 className="text-lg font-semibold text-primary mb-6">{t('reports.treatmentTimeline')}</h3>
        <div className="h-64 flex items-end justify-between space-x-2">
          {[
            { month: 'Jan', successful: 142, complications: 8 },
            { month: 'Feb', successful: 156, complications: 6 },
            { month: 'Mar', successful: 148, complications: 9 },
            { month: 'Apr', successful: 167, complications: 5 },
            { month: 'May', successful: 173, complications: 7 },
            { month: 'Jun', successful: 182, complications: 4 },
            { month: 'Jul', successful: 178, complications: 6 },
            { month: 'Aug', successful: 189, complications: 5 },
            { month: 'Sep', successful: 195, complications: 3 }
          ].map((d, i) => {
            const max = 200;
            const h1 = (d.successful / max) * 100;
            const h2 = (d.complications / max) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div className="w-full relative">
                  <div className="w-full bg-green-500 rounded-t-lg" style={{ height: `${h1}%` }} />
                  <div className="w-full bg-red-500 rounded-t-lg" style={{ height: `${h2}%` }} />
                </div>
                <span className="text-xs text-secondary mt-2">{d.month}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-center space-x-6 mt-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span className="text-xs text-secondary">{t('reports.successful')}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <span className="text-xs text-secondary">{t('reports.complications')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const PatientTab = ({ dashboardData }) => {
  const { t } = useLanguage();
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KPICard title={t('reports.totalPatients')} value="1,234" change="+15.3%" trend="up" icon="Users" color="blue" />
        <KPICard title={t('reports.newPatients')} value="89" change="+23.5%" trend="up" icon="UserPlus" color="emerald" />
        <KPICard title={t('reports.retentionRate')} value="89.1%" change="+4.2%" trend="up" icon="Heart" color="red" />
        <KPICard title={t('reports.averageAge')} value="35.2" change="+1.8" trend="up" icon="Calendar" color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <PatientChart data={dashboardData.trends.patients} />
        <div className="bg-surface rounded-2xl p-6 border border-primary/20 shadow-theme-lg">
          <h3 className="text-lg font-semibold text-primary mb-6">{t('reports.patientSatisfaction')}</h3>
          <div className="text-center mb-6">
            <div className="text-4xl font-bold text-yellow-500">4.7</div>
            <div className="text-sm text-secondary">{t('reports.outOf5Stars')}</div>
            <div className="flex justify-center mt-2">
              {[1,2,3,4,5].map(star => (
                <Icon key={star} name="Star" size={16} className={star <= 4 ? 'text-yellow-500 fill-current' : 'text-gray-300'} />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            {[
              { category: t('reports.overallExperience'), score: 4.8, color: 'bg-green-500' },
              { category: t('reports.waitTime'), score: 4.5, color: 'bg-blue-500' },
              { category: t('reports.staffFriendliness'), score: 4.9, color: 'bg-purple-500' },
              { category: t('reports.facilityCleanliness'), score: 4.7, color: 'bg-emerald-500' },
              { category: t('reports.treatmentExplanation'), score: 4.6, color: 'bg-orange-500' }
            ].map((it, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-primary">{it.category}</span>
                  <span className="text-primary font-medium">{it.score}/5</span>
                </div>
                <div className="w-full bg-primary/10 rounded-full h-2">
                  <div className={`h-2 rounded-full ${it.color}`} style={{ width: `${(it.score/5)*100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-surface rounded-2xl p-6 border border-primary/20 shadow-theme-lg">
          <h3 className="text-lg font-semibold text-primary mb-6">{t('reports.ageDistribution')}</h3>
          <div className="space-y-4">
            {[
              { range: '0-17', count: 187, percentage: 15.2, color: 'bg-blue-500' },
              { range: '18-35', count: 445, percentage: 36.1, color: 'bg-emerald-500' },
              { range: '36-50', count: 389, percentage: 31.5, color: 'bg-purple-500' },
              { range: '51-65', count: 156, percentage: 12.6, color: 'bg-orange-500' },
              { range: '65+', count: 57, percentage: 4.6, color: 'bg-red-500' }
            ].map((it, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${it.color}`} />
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
          <h3 className="text-lg font-semibold text-primary mb-6">{t('reports.visitFrequency')}</h3>
          <div className="space-y-4">
            {[
              { frequency: t('reports.regular6Months'), count: 567, percentage: 46 },
              { frequency: t('reports.yearly'), count: 345, percentage: 28 },
              { frequency: t('reports.asNeeded'), count: 234, percentage: 19 },
              { frequency: t('reports.irregular'), count: 88, percentage: 7 }
            ].map((it, i) => (
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
          <h3 className="text-lg font-semibold text-primary mb-6">{t('reports.referralSources')}</h3>
          <div className="space-y-4">
            {[
              { source: t('reports.wordOfMouth'), count: 456, percentage: 37 },
              { source: t('reports.onlineSearch'), count: 345, percentage: 28 },
              { source: t('reports.socialMedia'), count: 234, percentage: 19 },
              { source: t('reports.insurance'), count: 123, percentage: 10 },
              { source: t('reports.others'), count: 76, percentage: 6 }
            ].map((it, i) => (
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
          <h3 className="text-lg font-semibold text-primary mb-6">{t('reports.retentionAnalysis')}</h3>
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium text-primary mb-3">{t('reports.retentionByYears')}</h4>
              <div className="space-y-3">
                {[
                  { year: '1 Year', rate: 78, patients: 891 },
                  { year: '2 Years', rate: 65, patients: 743 },
                  { year: '3 Years', rate: 54, patients: 618 },
                  { year: '5+ Years', rate: 42, patients: 481 }
                ].map((it, i) => (
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

            <div>
              <h4 className="text-sm font-medium text-primary mb-3">{t('reports.churnRisk')}</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">Low</div>
                  <div className="text-xs text-green-600 dark:text-green-400">823 patients</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">Medium</div>
                  <div className="text-xs text-yellow-600 dark:text-yellow-400">267 patients</div>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-lg font-bold text-red-600 dark:text-red-400">High</div>
                  <div className="text-xs text-red-600 dark:text-red-400">144 patients</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-6 border border-primary/20 shadow-theme-lg">
          <h3 className="text-lg font-semibold text-primary mb-6">{t('reports.patientValue')}</h3>
          <div className="space-y-6">
            <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">Rp 8.4M</div>
              <div className="text-sm text-blue-600 dark:text-blue-400">{t('reports.averageLifetimeValue')}</div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-primary mb-3">{t('reports.valueSegments')}</h4>
              <div className="space-y-3">
                {[
                  { segment: 'VIP (>Rp 15M)', count: 89, percentage: 7.2, color: 'bg-purple-500' },
                  { segment: 'High Value (Rp 8-15M)', count: 234, percentage: 19.0, color: 'bg-blue-500' },
                  { segment: 'Medium Value (Rp 3-8M)', count: 567, percentage: 46.0, color: 'bg-emerald-500' },
                  { segment: 'Low Value (<Rp 3M)', count: 344, percentage: 27.8, color: 'bg-yellow-500' }
                ].map((it, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-primary">{it.segment}</span>
                      <span className="text-secondary">{it.count} ({it.percentage}%)</span>
                    </div>
                    <div className="w-full bg-primary/10 rounded-full h-2">
                      <div className={`h-2 rounded-full ${it.color}`} style={{ width: `${it.percentage}%` }} />
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
