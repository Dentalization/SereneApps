import React from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import Icon from '../../../../components/AppIcon';
import ModalPortal from '../../../../components/ui/ModalPortal';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Title,
  Tooltip,
  Legend
);

const ChartCard = ({ title, children }) => (
  <div className="bg-surface-elevated rounded-xl p-6 border border-primary/20">
    <h3 className="text-lg font-semibold text-primary mb-4">{title}</h3>
    <div className="h-64">
      {children}
    </div>
  </div>
);

const formatDateSafe = (dateString, locale, options) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '-';
  try {
    return d.toLocaleDateString(locale, options);
  } catch (e) {
    return '-';
  }
};


const PatientAnalytics = ({
  patients = [],
  allAppointments = [],
  selectedDentist = 'all',
  onDentistChange,
  doctors = [],
}) => {
  const { t, language } = useLanguage();
  const locale = language === 'id' ? 'id-ID' : 'en-US';
  const [selectedPeriod, setSelectedPeriod] = React.useState('all');
  const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = React.useState(new Date().getMonth());
  const [showPatientList, setShowPatientList] = React.useState(false);
  const [filteredPatients, setFilteredPatients] = React.useState([]);
  const [perfMetric, setPerfMetric] = React.useState('all');
  const [perfViewMode, setPerfViewMode] = React.useState('chart');
  const [onlyActiveDocs, setOnlyActiveDocs] = React.useState(true);

  const monthLabels = React.useMemo(
    () => Array.from({ length: 12 }, (_, i) => new Date(2024, i).toLocaleDateString(locale, { month: 'short' })),
    [locale]
  );

  const monthOptions = React.useMemo(
    () => Array.from({ length: 12 }, (_, i) => ({
      value: i,
      label: new Date(2024, i).toLocaleDateString(locale, { month: 'long' })
    })),
    [locale]
  );

  // ── AGE DISTRIBUTION ─────────────────────────────────────────────────────
  const ageGroups = patients.reduce((acc, patient) => {
    const age = patient.age;
    if (age < 18) acc['0-17']++;
    else if (age < 30) acc['18-29']++;
    else if (age < 45) acc['30-44']++;
    else if (age < 60) acc['45-59']++;
    else acc['60+']++;
    return acc;
  }, { '0-17': 0, '18-29': 0, '30-44': 0, '45-59': 0, '60+': 0 });

  const ageDistributionData = {
    labels: Object.keys(ageGroups),
    datasets: [{
      label: t('patients.analytics.charts.datasets.patients'),
      data: Object.values(ageGroups),
      backgroundColor: [
        'rgba(99, 102, 241, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(239, 68, 68, 0.8)',
      ],
      borderColor: [
        'rgba(99, 102, 241, 1)',
        'rgba(59, 130, 246, 1)',
        'rgba(16, 185, 129, 1)',
        'rgba(245, 158, 11, 1)',
        'rgba(239, 68, 68, 1)',
      ],
      borderWidth: 1,
    }]
  };

  // ── GENDER DISTRIBUTION ──────────────────────────────────────────────────
  const genderCounts = patients.reduce(
    (acc, patient) => {
      const key = patient.gender === 'M' ? 'male' : 'female';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    { male: 0, female: 0 }
  );

  const genderDistributionData = {
    labels: [t('patients.common.gender.male'), t('patients.common.gender.female')],
    datasets: [{
      label: t('patients.analytics.charts.datasets.patients'),
      data: [genderCounts.male, genderCounts.female],
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',
        'rgba(236, 72, 153, 0.8)',
      ],
      borderColor: [
        'rgba(59, 130, 246, 1)',
        'rgba(236, 72, 153, 1)',
      ],
      borderWidth: 2,
    }]
  };

  // ── MONTHLY REVENUE (from actual appointment data) ────────────────────────
  const monthlyRevenue = React.useMemo(() => {
    const revenue = new Array(12).fill(0);
    allAppointments.forEach(apt => {
      if (apt.isPaid && apt.date) {
        const d = new Date(apt.date);
        const m = d.getMonth();
        if (!isNaN(m) && m >= 0 && m < 12) {
          revenue[m] += (apt.fee || 0);
        }
      }
    });
    return revenue;
  }, [allAppointments]);

  const monthlyRevenueData = {
    labels: monthLabels,
    datasets: [{
      label: 'Revenue (Rp)',
      data: monthlyRevenue,
      borderColor: 'rgba(16, 185, 129, 1)',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      tension: 0.4,
      fill: true,
    }]
  };

  // ── APPOINTMENT STATUS DISTRIBUTION ──────────────────────────────────────
  const statusCounts = React.useMemo(() => {
    const counts = { scheduled: 0, completed: 0, cancelled: 0, overdue: 0, 'no-show': 0 };
    allAppointments.forEach(apt => {
      if (counts[apt.status] !== undefined) counts[apt.status]++;
    });
    return counts;
  }, [allAppointments]);

  const statusDistributionData = {
    labels: ['Scheduled', 'Completed', 'Cancelled', 'Overdue', 'No-Show'],
    datasets: [{
      label: 'Appointments',
      data: [statusCounts.scheduled, statusCounts.completed, statusCounts.cancelled, statusCounts.overdue, statusCounts['no-show']],
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(234, 179, 8, 0.8)',
      ],
      borderWidth: 2,
    }]
  };

  // ── CLINIC-ONLY: Dentist Performance Data Calculation ────────────────────
  const sortedDoctorPerformance = React.useMemo(() => {
    if (!doctors.length) return [];

    const perfMap = {};
    doctors.forEach(d => {
      perfMap[d.id] = {
        id: d.id,
        name: d.name,
        role: d.role,
        patients: 0,
        appointments: 0,
        revenue: 0
      };
    });

    patients.forEach(p => {
      if (perfMap[p.doctorId]) perfMap[p.doctorId].patients++;
    });

    allAppointments.forEach(a => {
      const docId = a.dentistId || a.doctorId;
      if (perfMap[docId]) {
        perfMap[docId].appointments++;
        if (a.isPaid) perfMap[docId].revenue += (a.fee || 0);
      }
    });

    let list = Object.values(perfMap);

    if (onlyActiveDocs) {
      list = list.filter(d => d.patients > 0 || d.appointments > 0 || d.revenue > 0);
    }

    // Sort descending by selected metric
    list.sort((a, b) => {
      if (perfMetric === 'revenue') return b.revenue - a.revenue;
      if (perfMetric === 'patients') return b.patients - a.patients;
      if (perfMetric === 'appointments') return b.appointments - a.appointments;

      // 'all': sort by appointments desc, then patients desc
      if (b.appointments !== a.appointments) {
        return b.appointments - a.appointments;
      }
      return b.patients - a.patients;
    });

    return list;
  }, [doctors, patients, allAppointments, onlyActiveDocs, perfMetric]);

  const dentistPerformanceData = React.useMemo(() => {
    if (!sortedDoctorPerformance.length) return null;

    const labels = sortedDoctorPerformance.map(d => d.name.replace('Dr. ', ''));

    const datasets = [];
    if (perfMetric === 'all' || perfMetric === 'patients') {
      datasets.push({
        label: 'Pasien',
        data: sortedDoctorPerformance.map(d => d.patients),
        backgroundColor: 'rgba(124, 58, 237, 0.85)',
        hoverBackgroundColor: 'rgba(124, 58, 237, 1)',
        borderRadius: 6,
        borderSkipped: false,
      });
    }
    if (perfMetric === 'all' || perfMetric === 'appointments') {
      datasets.push({
        label: 'Appointment',
        data: sortedDoctorPerformance.map(d => d.appointments),
        backgroundColor: 'rgba(59, 130, 246, 0.85)',
        hoverBackgroundColor: 'rgba(59, 130, 246, 1)',
        borderRadius: 6,
        borderSkipped: false,
      });
    }
    if (perfMetric === 'revenue') {
      datasets.push({
        label: 'Revenue (Rp)',
        data: sortedDoctorPerformance.map(d => d.revenue),
        backgroundColor: 'rgba(16, 185, 129, 0.85)',
        hoverBackgroundColor: 'rgba(16, 185, 129, 1)',
        borderRadius: 6,
        borderSkipped: false,
      });
    }

    return { labels, datasets };
  }, [sortedDoctorPerformance, perfMetric]);

  const horizontalChartOptions = React.useMemo(() => {
    return {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            padding: 15,
            usePointStyle: true,
            boxWidth: 8,
            font: { family: 'inherit', size: 12 }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleFont: { size: 13, weight: 'bold' },
          bodyFont: { size: 12 },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: (context) => {
              let label = context.dataset.label || '';
              if (label) label += ': ';
              if (context.dataset.label.includes('Revenue') || perfMetric === 'revenue') {
                label += new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(context.raw);
              } else {
                label += context.raw;
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(148, 163, 184, 0.1)',
            drawBorder: false,
            borderDash: [5, 5]
          },
          ticks: {
            font: { family: 'inherit', size: 11 },
            callback: (value) => {
              if (perfMetric === 'revenue') {
                if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(1)}jt`;
                return `Rp ${value.toLocaleString('id-ID')}`;
              }
              return value;
            }
          },
          beginAtZero: true
        },
        y: {
          grid: { display: false },
          ticks: {
            font: { family: 'inherit', size: 11, weight: '500' }
          }
        }
      }
    };
  }, [perfMetric]);


  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true } },
    },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: 'rgba(0, 0, 0, 0.1)' }, beginAtZero: true },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { padding: 20 } } },
  };

  // ── Total Revenue stat
  const totalRevenue = patients.reduce((sum, p) => sum + (p.totalRevenue || 0), 0);

  return (
    <div className="space-y-6">
      {/* Period Filter */}
      <div className="bg-surface-elevated rounded-xl p-6 border border-primary/20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-primary">{t('patients.analytics.filters')}</h3>

          {/* Dentist filter */}
          {onDentistChange && (
            <select
              value={selectedDentist}
              onChange={(e) => onDentistChange(e.target.value)}
              className="px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary text-sm min-w-[160px]"
            >
              <option value="all">Semua Dokter</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">{t('patients.analytics.period')}</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="all">{t('patients.analytics.periods.all')}</option>
              <option value="today">{t('patients.analytics.periods.today')}</option>
              <option value="week">{t('patients.analytics.periods.week')}</option>
              <option value="month">{t('patients.analytics.periods.month')}</option>
              <option value="year">{t('patients.analytics.periods.year')}</option>
              <option value="custom">{t('patients.analytics.periods.custom')}</option>
            </select>
          </div>

          {selectedPeriod === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">{t('patients.analytics.year')}</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">{t('patients.analytics.month')}</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  {monthOptions.map((month) => (
                    <option key={month.value} value={month.value}>{month.label}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        <button
          onClick={() => {
            let filtered = patients;
            const now = new Date();

            switch (selectedPeriod) {
              case 'today':
                filtered = patients.filter(p => {
                  if (!p.lastVisit) return false;
                  const visitDate = new Date(p.lastVisit);
                  if (isNaN(visitDate.getTime())) return false;
                  return visitDate.toDateString() === now.toDateString();
                });
                break;
              case 'week':
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                filtered = patients.filter(p => {
                  if (!p.lastVisit) return false;
                  const visitDate = new Date(p.lastVisit);
                  if (isNaN(visitDate.getTime())) return false;
                  return visitDate >= weekAgo;
                });
                break;
              case 'month':
                filtered = patients.filter(p => {
                  if (!p.lastVisit) return false;
                  const visitDate = new Date(p.lastVisit);
                  if (isNaN(visitDate.getTime())) return false;
                  return visitDate.getMonth() === now.getMonth() && visitDate.getFullYear() === now.getFullYear();
                });
                break;
              case 'year':
                filtered = patients.filter(p => {
                  if (!p.lastVisit) return false;
                  const visitDate = new Date(p.lastVisit);
                  if (isNaN(visitDate.getTime())) return false;
                  return visitDate.getFullYear() === now.getFullYear();
                });
                break;
              case 'custom':
                filtered = patients.filter(p => {
                  if (!p.lastVisit) return false;
                  const visitDate = new Date(p.lastVisit);
                  if (isNaN(visitDate.getTime())) return false;
                  return visitDate.getFullYear() === selectedYear && visitDate.getMonth() === selectedMonth;
                });
                break;
              default:
                filtered = patients;
            }

            setFilteredPatients(filtered);
            setShowPatientList(true);
          }}
          className="mt-4 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
        >
          {t('patients.analytics.viewPatients')} ({filteredPatients.length})
        </button>
      </div>

      {/* Patient List Modal */}
      {showPatientList && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowPatientList(false)}
          >
            <div
              className="relative w-full max-w-4xl max-h-[80vh] bg-surface-elevated rounded-2xl shadow-2xl p-6 overflow-y-auto flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-primary">{t('patients.analytics.modalTitle')} ({filteredPatients.length})</h2>
                <button
                  onClick={() => setShowPatientList(false)}
                  className="p-2 hover:bg-surface rounded-lg transition-colors"
                >
                  <Icon name="X" size={20} className="text-secondary" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3">
                {filteredPatients.map(patient => (
                  <div key={patient.id} className="flex items-center justify-between p-4 bg-surface rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
                        <Icon name="User" className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <div className="font-medium text-primary">{patient.name}</div>
                        <div className="text-sm text-secondary">
                          {t('patients.analytics.patientCard.meta', {
                            age: patient.age,
                            gender: patient.gender === 'M'
                              ? t('patients.common.gender.male')
                              : t('patients.common.gender.female'),
                            phone: patient.phone
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-primary">{formatDateSafe(patient.lastVisit, locale)}</div>
                      <div className={`text-xs px-2 py-1 rounded-full ${patient.status === 'active' ? 'bg-green-100 text-green-800' :
                        patient.status === 'vip' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                        {t(`patients.registry.status.${patient.status}`)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface-elevated rounded-xl p-6 border border-primary/20">
          <div className="text-3xl font-bold text-primary">{patients.length}</div>
          <div className="text-secondary">{t('patients.analytics.stats.total')}</div>
        </div>
        <div className="bg-surface-elevated rounded-xl p-6 border border-primary/20">
          <div className="text-3xl font-bold text-green-600">
            {patients.filter(p => p.status === 'active').length}
          </div>
          <div className="text-secondary">{t('patients.analytics.stats.active')}</div>
        </div>
        <div className="bg-surface-elevated rounded-xl p-6 border border-primary/20">
          <div className="text-3xl font-bold text-yellow-600">
            {patients.filter(p => p.status === 'vip').length}
          </div>
          <div className="text-secondary">{t('patients.analytics.stats.vip')}</div>
        </div>
        <div className="bg-surface-elevated rounded-xl p-6 border border-primary/20">
          <div className="text-3xl font-bold text-emerald-600">
            Rp {(totalRevenue / 1000000).toFixed(1)}M
          </div>
          <div className="text-secondary">Total Revenue</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title={t('patients.analytics.charts.ageDistribution')}>
          <Bar data={ageDistributionData} options={chartOptions} />
        </ChartCard>

        <ChartCard title={t('patients.analytics.charts.genderRatio')}>
          <Doughnut data={genderDistributionData} options={doughnutOptions} />
        </ChartCard>

        <ChartCard title="Revenue Bulanan">
          <Line data={monthlyRevenueData} options={chartOptions} />
        </ChartCard>

        <ChartCard title="Status Appointment">
          <Doughnut data={statusDistributionData} options={doughnutOptions} />
        </ChartCard>
      </div>

      {/* Dentist Performance Comparison */}
      {doctors.length > 0 && (
        <div className="bg-surface-elevated rounded-2xl p-6 border border-primary/20 space-y-6">
          {/* Panel Header with Controls */}
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 border-b border-primary/10 pb-4">
            <div>
              <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
                <Icon name="TrendingUp" className="text-accent w-5 h-5" />
                Perbandingan Performa Dokter
              </h3>
              <p className="text-xs text-secondary mt-1">
                Analisis kinerja dokter berdasarkan pasien, appointment, dan pendapatan secara real-time
              </p>
            </div>
            
            {/* Interactive Controls */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Metric Selector Tabs */}
              <div className="flex bg-surface p-1 rounded-lg border border-primary/15 text-xs">
                {[
                  { id: 'all', label: 'Semua (Pasien & Appointment)' },
                  { id: 'patients', label: 'Pasien' },
                  { id: 'appointments', label: 'Appointment' },
                  { id: 'revenue', label: 'Revenue' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setPerfMetric(tab.id)}
                    className={`px-2.5 py-1.5 rounded-md font-medium transition-all ${
                      perfMetric === tab.id
                        ? 'bg-accent text-white shadow-sm'
                        : 'text-secondary hover:text-primary'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-4">
                {/* View Mode Toggle */}
                <div className="flex bg-surface p-1 rounded-lg border border-primary/15">
                  <button
                    onClick={() => setPerfViewMode('chart')}
                    className={`p-1.5 rounded-md transition-all ${
                      perfViewMode === 'chart'
                        ? 'bg-accent/15 text-accent'
                        : 'text-secondary hover:text-primary'
                    }`}
                    title="Tampilan Grafik"
                  >
                    <Icon name="BarChart3" size={16} />
                  </button>
                  <button
                    onClick={() => setPerfViewMode('leaderboard')}
                    className={`p-1.5 rounded-md transition-all ${
                      perfViewMode === 'leaderboard'
                        ? 'bg-accent/15 text-accent'
                        : 'text-secondary hover:text-primary'
                    }`}
                    title="Tampilan Papan Peringkat"
                  >
                    <Icon name="Trophy" size={16} />
                  </button>
                </div>

                {/* Only Active Filter Checkbox */}
                <label className="flex items-center gap-2 text-xs font-medium text-secondary cursor-pointer select-none border-l border-primary/20 pl-4 py-1">
                  <input
                    type="checkbox"
                    checked={onlyActiveDocs}
                    onChange={(e) => setOnlyActiveDocs(e.target.checked)}
                    className="rounded border-primary/30 text-accent focus:ring-accent w-4 h-4 cursor-pointer"
                  />
                  <span>Dokter Aktif Saja</span>
                </label>
              </div>
            </div>
          </div>

          {/* Render Area */}
          {perfViewMode === 'chart' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 h-80 min-h-[320px]">
                {dentistPerformanceData && sortedDoctorPerformance.length > 0 ? (
                  <Bar data={dentistPerformanceData} options={horizontalChartOptions} />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-surface rounded-xl border border-primary/5">
                    <Icon name="BarChart3" size={40} className="text-secondary/40 mb-3" />
                    <p className="text-sm text-secondary font-medium">Tidak ada data performa untuk ditampilkan.</p>
                    <p className="text-xs text-muted mt-1">Coba nonaktifkan filter 'Dokter Aktif Saja' atau pilih metrik lain.</p>
                  </div>
                )}
              </div>
              
              {/* Insight panel on the right side */}
              <div className="lg:col-span-4 bg-surface rounded-xl p-5 border border-primary/10 flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Insight Performa</h4>
                  <p className="text-sm font-semibold text-primary">Analisis Singkat Distribusi Kinerja</p>
                </div>
                
                {sortedDoctorPerformance.length > 0 ? (
                  <div className="space-y-4 flex-1 flex flex-col justify-center">
                    {/* Top Performer Row */}
                    <div className="flex items-center gap-3 bg-accent/5 p-3 rounded-lg border border-accent/10">
                      <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center text-accent text-sm font-bold">
                        🏆
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] text-muted font-semibold uppercase tracking-wider">Top Performer</div>
                        <div className="text-xs font-bold text-primary truncate">{sortedDoctorPerformance[0].name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-muted">Aktivitas</div>
                        <div className="text-xs font-bold text-accent">
                          {perfMetric === 'revenue' 
                            ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(sortedDoctorPerformance[0].revenue)
                            : perfMetric === 'patients'
                              ? `${sortedDoctorPerformance[0].patients} Pasien`
                              : `${sortedDoctorPerformance[0].appointments} Appointment`}
                        </div>
                      </div>
                    </div>

                    {/* Stats Distribution Details */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-primary/5 p-2 rounded-lg text-center">
                        <div className="text-[10px] text-muted font-medium">Rata-rata Pasien</div>
                        <div className="text-sm font-bold text-primary mt-0.5">
                          {Math.round(sortedDoctorPerformance.reduce((acc, d) => acc + d.patients, 0) / sortedDoctorPerformance.length)}
                        </div>
                      </div>
                      <div className="bg-primary/5 p-2 rounded-lg text-center">
                        <div className="text-[10px] text-muted font-medium">Rata-rata Appt</div>
                        <div className="text-sm font-bold text-primary mt-0.5">
                          {Math.round(sortedDoctorPerformance.reduce((acc, d) => acc + d.appointments, 0) / sortedDoctorPerformance.length)}
                        </div>
                      </div>
                    </div>

                    {/* Revenue share explanation if revenue metric */}
                    {perfMetric === 'revenue' && (
                      <div className="text-[11px] text-secondary bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10">
                        Total kontribusi dari dokter teratas mewakili <span className="font-semibold text-emerald-600">
                          {Math.round((sortedDoctorPerformance[0].revenue / (sortedDoctorPerformance.reduce((acc, d) => acc + d.revenue, 0) || 1)) * 100)}%
                        </span> dari total pendapatan klinik.
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted">Belum ada data analitik terkumpul untuk dokter.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Podium spotlight grid for Top 3 */}
              {sortedDoctorPerformance.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {sortedDoctorPerformance.slice(0, 3).map((doc, idx) => {
                    const isFirst = idx === 0;
                    const isSecond = idx === 1;
                    const isThird = idx === 2;

                    let cardBorder = 'border-primary/10';
                    let cardBg = 'bg-surface-elevated';
                    let badgeBg = 'bg-primary/10 text-secondary';
                    let badgeText = `${idx + 1}th`;
                    let rankIcon = 'Award';
                    let avatarBg = 'from-primary/20 to-primary/30 text-secondary';

                    if (isFirst) {
                      cardBorder = 'border-yellow-400/40';
                      cardBg = 'bg-gradient-to-br from-yellow-500/5 via-amber-500/5 to-surface-elevated shadow-lg shadow-yellow-500/5';
                      badgeBg = 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20';
                      badgeText = '1st Place';
                      rankIcon = 'Trophy';
                      avatarBg = 'from-yellow-400 to-amber-500 text-white shadow-md shadow-yellow-500/20';
                    } else if (isSecond) {
                      cardBorder = 'border-slate-300/40';
                      cardBg = 'bg-gradient-to-br from-slate-400/5 via-slate-500/5 to-surface-elevated shadow-md shadow-slate-400/5';
                      badgeBg = 'bg-slate-400/10 text-slate-600 border border-slate-400/20';
                      badgeText = '2nd Place';
                      rankIcon = 'Award';
                      avatarBg = 'from-slate-300 to-slate-500 text-white shadow-md shadow-slate-500/20';
                    } else if (isThird) {
                      cardBorder = 'border-orange-400/30';
                      cardBg = 'bg-gradient-to-br from-orange-400/5 via-orange-500/5 to-surface-elevated';
                      badgeBg = 'bg-orange-500/10 text-orange-700 border border-orange-500/20';
                      badgeText = '3rd Place';
                      rankIcon = 'Medal';
                      avatarBg = 'from-orange-400 to-amber-700 text-white shadow-md shadow-orange-500/20';
                    }

                    const initials = doc.name.replace('Dr. ', '').split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2);

                    let primaryMetricText = `${doc.appointments} Appt`;
                    if (perfMetric === 'patients') {
                      primaryMetricText = `${doc.patients} Pasien`;
                    } else if (perfMetric === 'appointments') {
                      primaryMetricText = `${doc.appointments} Appt`;
                    } else if (perfMetric === 'revenue') {
                      primaryMetricText = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(doc.revenue);
                    } else {
                      primaryMetricText = `${doc.appointments} Appt • ${doc.patients} Pasien`;
                    }

                    return (
                      <div 
                        key={doc.id} 
                        className={`relative rounded-2xl border ${cardBorder} ${cardBg} p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-theme-xl`}
                      >
                        {/* Top corner rank badge */}
                        <div className="absolute top-4 right-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${badgeBg}`}>
                            <Icon name={rankIcon} size={10} />
                            {badgeText}
                          </span>
                        </div>

                        {/* Top Info */}
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full bg-gradient-to-tr ${avatarBg} flex items-center justify-center font-bold text-base`}>
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-primary text-sm truncate pr-16">{doc.name}</h4>
                            <p className="text-xs text-secondary capitalize">{doc.role || 'Dokter Gigi'}</p>
                          </div>
                        </div>

                        {/* Main Stats Display */}
                        <div className="my-6 space-y-3">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-secondary flex items-center gap-1.5"><Icon name="Users" size={13} className="text-muted" /> Pasien</span>
                            <span className="font-semibold text-primary">{doc.patients}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-secondary flex items-center gap-1.5"><Icon name="Calendar" size={13} className="text-muted" /> Appointment</span>
                            <span className="font-semibold text-primary">{doc.appointments}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-secondary flex items-center gap-1.5"><Icon name="DollarSign" size={13} className="text-muted" /> Pendapatan</span>
                            <span className="font-semibold text-primary">
                              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(doc.revenue)}
                            </span>
                          </div>
                        </div>

                        {/* Bottom Metric Highlight */}
                        <div className="pt-4 border-t border-primary/5 flex items-center justify-between">
                          <span className="text-[10px] text-muted uppercase tracking-wider font-semibold">Metrik Utama</span>
                          <span className={`text-sm font-bold ${isFirst ? 'text-accent' : 'text-primary'}`}>
                            {primaryMetricText}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* List of Remaining Doctors (Rank 4+) */}
              {sortedDoctorPerformance.length > 3 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted px-1">Dokter Lainnya</h4>
                  <div className="space-y-2">
                    {sortedDoctorPerformance.slice(3).map((doc, index) => {
                      const actualRank = index + 4;
                      const maxVal = Math.max(...sortedDoctorPerformance.map(d => {
                        if (perfMetric === 'patients') return d.patients;
                        if (perfMetric === 'appointments') return d.appointments;
                        if (perfMetric === 'revenue') return d.revenue;
                        return d.appointments;
                      })) || 1;

                      let currentVal = doc.appointments;
                      let barColor = 'bg-blue-500';
                      let metricText = `${doc.appointments} Appointment`;

                      if (perfMetric === 'patients') {
                        currentVal = doc.patients;
                        barColor = 'bg-accent';
                        metricText = `${doc.patients} Pasien`;
                      } else if (perfMetric === 'appointments') {
                        currentVal = doc.appointments;
                        barColor = 'bg-blue-500';
                        metricText = `${doc.appointments} Appointment`;
                      } else if (perfMetric === 'revenue') {
                        currentVal = doc.revenue;
                        barColor = 'bg-emerald-500';
                        metricText = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(doc.revenue);
                      } else {
                        currentVal = doc.appointments;
                        barColor = 'bg-accent';
                        metricText = `${doc.patients} Pasien • ${doc.appointments} Appointment`;
                      }

                      const percentage = Math.min(100, Math.round((currentVal / maxVal) * 100));
                      const initials = doc.name.replace('Dr. ', '').split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2);

                      return (
                        <div 
                          key={doc.id} 
                          className="flex items-center gap-4 p-3.5 rounded-xl bg-surface hover:bg-surface-hover/50 transition-all border border-primary/5 shadow-sm"
                        >
                          {/* Rank badge */}
                          <div className="flex-shrink-0 w-8 text-center text-xs font-bold text-muted">
                            #{actualRank}
                          </div>

                          {/* Avatar */}
                          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center text-secondary text-xs font-bold">
                            {initials}
                          </div>

                          {/* Information */}
                          <div className="flex-grow min-w-0 flex flex-col md:flex-row md:items-center justify-between gap-2">
                            <div className="min-w-0">
                              <span className="font-semibold text-sm text-primary block truncate">{doc.name}</span>
                              <span className="text-[10px] text-secondary capitalize">{doc.role || 'Dokter Gigi'}</span>
                            </div>
                            
                            {/* Bar & Metric val */}
                            <div className="flex items-center gap-4 md:w-2/3">
                              <div className="flex-grow h-2 bg-primary/10 rounded-full overflow-hidden hidden sm:block">
                                <div 
                                  className={`h-full ${barColor} rounded-full transition-all duration-500`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <div className="text-right whitespace-nowrap min-w-[100px]">
                                <span className="text-xs font-bold text-primary">{metricText}</span>
                                <span className="text-[10px] text-secondary ml-1.5 font-medium">({percentage}%)</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {sortedDoctorPerformance.length === 0 && (
                <div className="py-12 text-center bg-surface rounded-xl border border-primary/5">
                  <Icon name="Users" size={40} className="mx-auto text-secondary/40 mb-3" />
                  <p className="text-sm text-secondary font-medium">Tidak ada dokter yang aktif pada periode ini.</p>
                  <p className="text-xs text-muted mt-1">Gunakan toggle 'Dokter Aktif Saja' untuk menampilkan seluruh dokter.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Demographics Table */}
      <div className="bg-surface-elevated rounded-xl p-6 border border-primary/20">
        <h3 className="text-lg font-semibold text-primary mb-4">
          {t('patients.analytics.demographics')}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-primary/20">
                <th className="text-left py-3 text-primary font-medium">{t('patients.analytics.table.ageGroup')}</th>
                <th className="text-left py-3 text-primary font-medium">{t('patients.analytics.table.male')}</th>
                <th className="text-left py-3 text-primary font-medium">{t('patients.analytics.table.female')}</th>
                <th className="text-left py-3 text-primary font-medium">{t('patients.analytics.table.total')}</th>
                <th className="text-left py-3 text-primary font-medium">{t('patients.analytics.table.percentage')}</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(ageGroups).map(([ageGroup, total]) => {
                const groupPatients = patients.filter(p => {
                  const age = p.age;
                  switch (ageGroup) {
                    case '0-17': return age < 18;
                    case '18-29': return age >= 18 && age < 30;
                    case '30-44': return age >= 30 && age < 45;
                    case '45-59': return age >= 45 && age < 60;
                    case '60+': return age >= 60;
                    default: return false;
                  }
                });
                const male = groupPatients.filter(p => p.gender === 'M').length;
                const female = groupPatients.filter(p => p.gender === 'F').length;
                const percentage = patients.length ? ((total / patients.length) * 100).toFixed(1) : '0.0';

                return (
                  <tr key={ageGroup} className="border-b border-primary/10">
                    <td className="py-3 text-primary font-medium">{ageGroup}</td>
                    <td className="py-3 text-secondary">{male}</td>
                    <td className="py-3 text-secondary">{female}</td>
                    <td className="py-3 text-primary font-medium">{total}</td>
                    <td className="py-3 text-secondary">{percentage}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PatientAnalytics;
