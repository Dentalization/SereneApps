import { useState } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import AppIcon from '../../../../components/AppIcon';

const OperationalView = () => {
  const { t } = useLanguage();
  const [selectedMetric, setSelectedMetric] = useState('all');

  // Mock data
  const kpiData = {
    roomUtilization: {
      current: 75,
      target: 80,
      trend: +5,
      chartData: [65, 70, 72, 75, 78, 75, 76]
    },
    waitTime: {
      current: 18,
      target: 20,
      trend: -2,
      chartData: [22, 20, 19, 18, 17, 18, 18]
    },
    satisfaction: {
      current: 4.2,
      target: 4.0,
      trend: +0.3,
      chartData: [3.8, 3.9, 4.0, 4.1, 4.2, 4.2, 4.2]
    },
    completion: {
      current: 92,
      target: 95,
      trend: +3,
      chartData: [88, 89, 90, 91, 92, 92, 92]
    }
  };

  const appointmentStats = [
    { day: 'Senin', scheduled: 45, completed: 42, cancelled: 2, noShow: 1 },
    { day: 'Selasa', scheduled: 50, completed: 47, cancelled: 2, noShow: 1 },
    { day: 'Rabu', scheduled: 48, completed: 45, cancelled: 1, noShow: 2 },
    { day: 'Kamis', scheduled: 52, completed: 48, cancelled: 3, noShow: 1 },
    { day: 'Jumat', scheduled: 55, completed: 51, cancelled: 2, noShow: 2 },
    { day: 'Sabtu', scheduled: 40, completed: 38, cancelled: 1, noShow: 1 }
  ];

  const roomUsage = [
    { room: 'Ruang Perawatan 1', usage: 85, hours: 6.8, patients: 12 },
    { room: 'Ruang Perawatan 2', usage: 78, hours: 6.2, patients: 10 },
    { room: 'Ruang Perawatan 3', usage: 72, hours: 5.8, patients: 9 },
    { room: 'Ruang Konsultasi', usage: 65, hours: 5.2, patients: 15 }
  ];

  const staffPerformance = [
    { name: 'drg. Sarah Ahmad', appointments: 48, avgDuration: 45, satisfaction: 4.5, onTime: 92 },
    { name: 'drg. Budi Santoso', appointments: 52, avgDuration: 42, satisfaction: 4.3, onTime: 95 },
    { name: 'drg. Linda Wijaya', appointments: 45, avgDuration: 48, satisfaction: 4.4, onTime: 88 },
    { name: 'drg. Ahmad Yani', appointments: 50, avgDuration: 40, satisfaction: 4.2, onTime: 90 }
  ];

  const treatmentDistribution = [
    { name: 'Scaling & Polishing', count: 85, percentage: 28, avgDuration: 30 },
    { name: 'Filling', count: 72, percentage: 24, avgDuration: 45 },
    { name: 'Extraction', count: 45, percentage: 15, avgDuration: 25 },
    { name: 'Root Canal', count: 38, percentage: 13, avgDuration: 90 },
    { name: 'Crown/Bridge', count: 32, percentage: 11, avgDuration: 120 },
    { name: 'Lainnya', count: 28, percentage: 9, avgDuration: 40 }
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <AppIcon name="Building" size={20} className="text-blue-600" />
            <div className="flex items-center gap-1">
              <AppIcon name={kpiData.roomUtilization.trend > 0 ? "TrendingUp" : "TrendingDown"} size={14} className="text-blue-600" />
              <span className="text-xs text-blue-600">{Math.abs(kpiData.roomUtilization.trend)}%</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-blue-900 dark:text-blue-300">{kpiData.roomUtilization.current}%</span>
              <span className="text-xs text-blue-600">/ {kpiData.roomUtilization.target}%</span>
            </div>
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-400">
              {t('clinic.reports.operational.roomUtilization') || 'Keterisian Ruang'}
            </h3>
            <div className="w-full bg-blue-200 dark:bg-blue-900/40 rounded-full h-1.5">
              <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${kpiData.roomUtilization.current}%` }}></div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <AppIcon name="Clock" size={20} className="text-green-600" />
            <div className="flex items-center gap-1">
              <AppIcon name="TrendingDown" size={14} className="text-green-600" />
              <span className="text-xs text-green-600">{Math.abs(kpiData.waitTime.trend)} min</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-green-900 dark:text-green-300">{kpiData.waitTime.current}</span>
              <span className="text-xs text-green-600">min</span>
            </div>
            <h3 className="text-sm font-medium text-green-800 dark:text-green-400">
              {t('clinic.reports.operational.avgWaitTime') || 'Rata-rata Waktu Tunggu'}
            </h3>
            <p className="text-xs text-green-600">Target: &lt;{kpiData.waitTime.target} min</p>
          </div>
        </div>

        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <AppIcon name="Star" size={20} className="text-purple-600" />
            <div className="flex items-center gap-1">
              <AppIcon name="TrendingUp" size={14} className="text-purple-600" />
              <span className="text-xs text-purple-600">+{kpiData.satisfaction.trend}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-purple-900 dark:text-purple-300">{kpiData.satisfaction.current}</span>
              <span className="text-xs text-purple-600">/ 5.0</span>
            </div>
            <h3 className="text-sm font-medium text-purple-800 dark:text-purple-400">
              {t('clinic.reports.operational.satisfaction') || 'Kepuasan Pasien'}
            </h3>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <AppIcon 
                  key={star} 
                  name={star <= Math.floor(kpiData.satisfaction.current) ? "Star" : "StarOff"} 
                  size={12} 
                  className={star <= Math.floor(kpiData.satisfaction.current) ? "text-purple-600" : "text-purple-300"}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <AppIcon name="CheckCircle" size={20} className="text-orange-600" />
            <div className="flex items-center gap-1">
              <AppIcon name="TrendingUp" size={14} className="text-orange-600" />
              <span className="text-xs text-orange-600">+{kpiData.completion.trend}%</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-orange-900 dark:text-orange-300">{kpiData.completion.current}%</span>
              <span className="text-xs text-orange-600">/ {kpiData.completion.target}%</span>
            </div>
            <h3 className="text-sm font-medium text-orange-800 dark:text-orange-400">
              {t('clinic.reports.operational.completionRate') || 'Completion Rate'}
            </h3>
            <p className="text-xs text-orange-600">No-show: {100 - kpiData.completion.current}%</p>
          </div>
        </div>
      </div>

      {/* Appointment Statistics */}
      <div className="bg-surface-elevated rounded-xl border border-primary/20 overflow-hidden">
        <div className="px-6 py-4 border-b border-primary/20">
          <h3 className="text-lg font-semibold text-primary">
            {t('clinic.reports.operational.appointmentStats') || 'Statistik Appointment Mingguan'}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Hari</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Terjadwal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Selesai</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Dibatalkan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">No-Show</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Completion %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {appointmentStats.map((stat, idx) => (
                <tr key={idx} className="hover:bg-surface transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">{stat.day}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">{stat.scheduled}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">{stat.completed}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">{stat.cancelled}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{stat.noShow}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-surface rounded-full h-2 overflow-hidden max-w-[100px]">
                        <div
                          className="bg-green-600 h-full transition-all"
                          style={{ width: `${(stat.completed / stat.scheduled) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-primary">
                        {Math.round((stat.completed / stat.scheduled) * 100)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Room Usage & Treatment Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Room Usage */}
        <div className="bg-surface-elevated rounded-xl border border-primary/20 overflow-hidden">
          <div className="px-6 py-4 border-b border-primary/20">
            <h3 className="text-lg font-semibold text-primary">
              {t('clinic.reports.operational.roomUsage') || 'Penggunaan Ruang'}
            </h3>
          </div>
          <div className="p-6 space-y-4">
            {roomUsage.map((room, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-primary">{room.room}</div>
                    <div className="text-xs text-secondary">{room.hours}h • {room.patients} pasien</div>
                  </div>
                  <span className="text-lg font-bold text-accent">{room.usage}%</span>
                </div>
                <div className="w-full bg-surface rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-accent h-full transition-all"
                    style={{ width: `${room.usage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Treatment Distribution */}
        <div className="bg-surface-elevated rounded-xl border border-primary/20 overflow-hidden">
          <div className="px-6 py-4 border-b border-primary/20">
            <h3 className="text-lg font-semibold text-primary">
              {t('clinic.reports.operational.treatmentDistribution') || 'Distribusi Tindakan'}
            </h3>
          </div>
          <div className="p-6 space-y-3">
            {treatmentDistribution.map((treatment, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-primary">{treatment.name}</span>
                    <span className="text-sm font-bold text-accent">{treatment.percentage}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-surface rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-accent h-full transition-all"
                        style={{ width: `${treatment.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-secondary">{treatment.count}x</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Staff Performance */}
      <div className="bg-surface-elevated rounded-xl border border-primary/20 overflow-hidden">
        <div className="px-6 py-4 border-b border-primary/20">
          <h3 className="text-lg font-semibold text-primary">
            {t('clinic.reports.operational.staffPerformance') || 'Performa Staff'}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Dokter</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Appointments</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Avg. Durasi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Kepuasan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">On-Time %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {staffPerformance.map((staff, idx) => (
                <tr key={idx} className="hover:bg-surface transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-primary">{staff.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-accent">{staff.appointments}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-primary">{staff.avgDuration} min</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <AppIcon name="Star" size={14} className="text-yellow-500" />
                      <span className="text-sm font-medium text-primary">{staff.satisfaction}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-surface rounded-full h-2 overflow-hidden max-w-[80px]">
                        <div
                          className={`h-full transition-all ${staff.onTime >= 90 ? 'bg-green-600' : 'bg-yellow-600'}`}
                          style={{ width: `${staff.onTime}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-primary">{staff.onTime}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OperationalView;
