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

const PatientAnalytics = ({ patients = [] }) => {
  const { t, language } = useLanguage();
  const locale = language === 'id' ? 'id-ID' : 'en-US';
  const [selectedPeriod, setSelectedPeriod] = React.useState('all');
  const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = React.useState(new Date().getMonth());
  const [showPatientList, setShowPatientList] = React.useState(false);
  const [filteredPatients, setFilteredPatients] = React.useState([]);

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

  // Age Distribution Data
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

  // Gender Distribution Data
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

  // Monthly Visits Data (mock data for demonstration)
  const monthlyVisitsData = {
    labels: monthLabels,
    datasets: [{
      label: t('patients.analytics.charts.datasets.visits'),
      data: [120, 150, 180, 200, 170, 190, 220, 240, 210, 190, 160, 180],
      borderColor: 'rgba(99, 102, 241, 1)',
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      tension: 0.4,
      fill: true,
    }]
  };

  // Treatment Types Data (mock data)
  const treatmentTypesData = {
    labels: ['cleaning', 'filling', 'rootCanal', 'extraction', 'crown', 'whitening'].map((key) =>
      t(`patients.analytics.treatments.${key}`)
    ),
    datasets: [{
      label: t('patients.analytics.charts.treatmentTypes'),
      data: [45, 35, 15, 10, 20, 25],
      backgroundColor: 'rgba(99, 102, 241, 0.8)',
      borderColor: 'rgba(99, 102, 241, 1)',
      borderWidth: 1,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
        }
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        beginAtZero: true,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
        }
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Period Filter */}
      <div className="bg-surface-elevated rounded-xl p-6 border border-primary/20">
        <h3 className="text-lg font-semibold text-primary mb-4">{t('patients.analytics.filters')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  {Array.from({length: 5}, (_, i) => new Date().getFullYear() - i).map(year => (
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
            // Filter patients based on selected period
            let filtered = patients;
            const now = new Date();
            
            switch(selectedPeriod) {
              case 'today':
                filtered = patients.filter(p => {
                  const visitDate = new Date(p.lastVisit);
                  return visitDate.toDateString() === now.toDateString();
                });
                break;
              case 'week':
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                filtered = patients.filter(p => new Date(p.lastVisit) >= weekAgo);
                break;
              case 'month':
                filtered = patients.filter(p => {
                  const visitDate = new Date(p.lastVisit);
                  return visitDate.getMonth() === now.getMonth() && visitDate.getFullYear() === now.getFullYear();
                });
                break;
              case 'year':
                filtered = patients.filter(p => {
                  const visitDate = new Date(p.lastVisit);
                  return visitDate.getFullYear() === now.getFullYear();
                });
                break;
              case 'custom':
                filtered = patients.filter(p => {
                  const visitDate = new Date(p.lastVisit);
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
                    <div className="text-sm font-medium text-primary">{new Date(patient.lastVisit).toLocaleDateString(locale)}</div>
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      patient.status === 'active' ? 'bg-green-100 text-green-800' :
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
          <div className="text-3xl font-bold text-blue-600">
            {patients.length ? Math.round(patients.reduce((sum, p) => sum + p.age, 0) / patients.length) : 0}
          </div>
          <div className="text-secondary">{t('patients.analytics.stats.avgAge')}</div>
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

        <ChartCard title={t('patients.analytics.charts.monthlyVisits')}>
          <Line data={monthlyVisitsData} options={chartOptions} />
        </ChartCard>

        <ChartCard title={t('patients.analytics.charts.treatmentTypes')}>
          <Bar data={treatmentTypesData} options={chartOptions} />
        </ChartCard>
      </div>

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
                  switch(ageGroup) {
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
