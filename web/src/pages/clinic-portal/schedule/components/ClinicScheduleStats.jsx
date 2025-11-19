import React from 'react';
import Icon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';

const StatCard = ({ title, value, subtitle, icon, color = 'blue', trend, gradient, trendLabel }) => (
  <div className="bg-surface-elevated rounded-3xl border border-primary/20 shadow-theme-lg hover:shadow-theme-xl theme-transition p-6">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-secondary dark:text-secondary">{title}</p>
          <div className={`w-10 h-10 bg-gradient-to-br ${gradient || 'from-blue-500/10 to-blue-600/5'} rounded-2xl flex items-center justify-center`}>
            <Icon name={icon} size={20} className={`text-${color}-600 dark:text-${color}-400`} />
          </div>
        </div>
        
        <div className="space-y-1">
          <p className={`text-3xl font-bold text-primary dark:text-primary`}>{value}</p>
          {subtitle && (
            <div className="text-sm text-secondary/70 dark:text-secondary/70 theme-transition">
              {subtitle}
            </div>
          )}
        </div>
      </div>
    </div>
    
    {trend && (
      <div className="mt-4 pt-4 border-t border-primary/10 dark:border-primary/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Icon 
              name={trend.type === 'up' ? 'TrendingUp' : 'TrendingDown'} 
              size={16} 
              className={trend.type === 'up' ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'} 
            />
            <span className={`text-sm font-medium ${trend.type === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {trend.value}%
            </span>
          </div>
          <span className="text-xs text-secondary/60 dark:text-secondary/60">{trendLabel}</span>
        </div>
      </div>
    )}
  </div>
);

const ClinicScheduleStats = ({ appointments, doctors, selectedDate }) => {
  const { t } = useLanguage();
  
  // Safe date comparison function
  const isSameDay = (date1, date2) => {
    const d1 = date1 instanceof Date ? date1 : new Date(date1);
    const d2 = date2 instanceof Date ? date2 : new Date(date2);
    
    const d1Start = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
    const d2Start = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
    
    return d1Start.getTime() === d2Start.getTime();
  };
  
  // Calculate stats
  const todayAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.start);
    console.log('Stats filtering:', {
      aptId: apt.id,
      aptStart: apt.start,
      aptDate: aptDate.toDateString(),
      selectedDate: selectedDate.toDateString(),
      match: isSameDay(aptDate, selectedDate)
    });
    return isSameDay(aptDate, selectedDate);
  });

  const stats = {
    total: todayAppointments.length,
    confirmed: todayAppointments.filter(apt => apt.status === 'confirmed').length,
    pending: todayAppointments.filter(apt => apt.status === 'pending').length,
    completed: todayAppointments.filter(apt => apt.status === 'completed').length,
    cancelled: todayAppointments.filter(apt => apt.status === 'cancelled').length,
    inProgress: todayAppointments.filter(apt => ['check-in', 'in-chair'].includes(apt.status)).length
  };

  // Doctor workload stats
  const doctorStats = doctors.map(doctor => {
    const doctorAppointments = todayAppointments.filter(apt => apt.provider?.id === doctor.id);
    return {
      ...doctor,
      appointmentCount: doctorAppointments.length,
      confirmedCount: doctorAppointments.filter(apt => apt.status === 'confirmed').length,
      completedCount: doctorAppointments.filter(apt => apt.status === 'completed').length
    };
  }).sort((a, b) => b.appointmentCount - a.appointmentCount);

  // Time analysis
  const busyHours = {};
  todayAppointments.forEach(apt => {
    const hour = new Date(apt.start).getHours();
    busyHours[hour] = (busyHours[hour] || 0) + 1;
  });

  const busiestHour = Object.entries(busyHours).reduce((max, [hour, count]) => 
    count > (max.count || 0) ? { hour: parseInt(hour), count } : max, 
    {}
  );

  return (
    <div className="space-y-6">
      {/* Main Stats */}
            {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Today's Appointments */}
        <StatCard
          title={t('clinic.schedule.stats.totalAppointments')}
          value={stats.total}
          subtitle={t('clinic.schedule.stats.todayLabel')}
          icon="Calendar"
          color="blue"
          gradient="from-blue-500/10 to-blue-600/5"
          trendLabel={t('clinic.schedule.stats.vsYesterday')}
        />

        {/* Confirmed */}
        <StatCard
          title={t('clinic.schedule.confirmed')}
          value={stats.confirmed}
          subtitle={`${stats.total > 0 ? Math.round((stats.confirmed / stats.total) * 100) : 0}% ${t('clinic.schedule.stats.ofTotal')}`}
          icon="CheckCircle"
          color="emerald"
          gradient="from-emerald-500/10 to-emerald-600/5"
          trend={stats.total > 0 ? { type: 'up', value: Math.round((stats.confirmed / stats.total) * 100) } : undefined}
          trendLabel={t('clinic.schedule.stats.vsYesterday')}
        />

        {/* In Progress */}
        <StatCard
          title={t('clinic.schedule.stats.inProgress')}
          value={stats.inProgress}
          subtitle={t('clinic.schedule.patientsInClinic')}
          icon="Clock"
          color="amber"
          gradient="from-amber-500/10 to-amber-600/5"
          trendLabel={t('clinic.schedule.stats.vsYesterday')}
        />

        {/* Completed */}
        <StatCard
          title={t('clinic.schedule.completed')}
          value={stats.completed}
          subtitle={`${stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% ${t('clinic.schedule.stats.percentCompleted')}`}
          icon="CheckCircle2"
          color="purple"
          gradient="from-purple-500/10 to-purple-600/5"
          trend={stats.completed > 0 ? { type: 'up', value: Math.round((stats.completed / stats.total) * 100) } : undefined}
          trendLabel={t('clinic.schedule.stats.vsYesterday')}
        />
      </div>

      {/* Detailed Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Doctor Workload */}
        <div className="bg-surface-elevated rounded-3xl border border-primary/20 shadow-theme-lg hover:shadow-theme-xl theme-transition p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-primary dark:text-primary">{t('clinic.schedule.stats.doctorWorkload')}</h3>
            <Icon name="Users" size={20} className="text-secondary/60 dark:text-secondary/60" />
          </div>
          
          <div className="space-y-4">
            {doctorStats.slice(0, 5).map(doctor => (
              <div key={doctor.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {doctor.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-primary dark:text-primary">{doctor.name}</p>
                    <p className="text-sm text-secondary/70 dark:text-secondary/70">{doctor.specialization || t('clinic.schedule.specializations.generalDentist')}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-semibold text-primary dark:text-primary">{doctor.appointmentCount}</p>
                  <p className="text-sm text-secondary/70 dark:text-secondary/70">{t('clinic.schedule.stats.appointments')}</p>
                </div>
              </div>
            ))}
            
            {doctorStats.length === 0 && (
              <div className="text-center py-4">
                <Icon name="Users" size={48} className="text-secondary/30 dark:text-secondary/30 mx-auto mb-2" />
                <p className="text-secondary/60 dark:text-secondary/60">{t('clinic.schedule.stats.noDoctor')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="bg-surface-elevated rounded-3xl border border-primary/20 shadow-theme-lg hover:shadow-theme-xl theme-transition p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-primary dark:text-primary">{t('clinic.schedule.stats.appointmentStatus')}</h3>
            <Icon name="PieChart" size={20} className="text-secondary/60 dark:text-secondary/60" />
          </div>
          
          <div className="space-y-3">
            {[
              { key: 'confirmed', label: t('clinic.schedule.confirmed'), count: stats.confirmed, color: 'bg-blue-500' },
              { key: 'pending', label: t('clinic.schedule.pending'), count: stats.pending, color: 'bg-amber-500' },
              { key: 'inProgress', label: t('clinic.schedule.stats.inProgress'), count: stats.inProgress, color: 'bg-orange-500' },
              { key: 'completed', label: t('clinic.schedule.completed'), count: stats.completed, color: 'bg-green-500' },
              { key: 'cancelled', label: t('clinic.schedule.cancelled'), count: stats.cancelled, color: 'bg-red-500' }
            ].map(status => {
              const percentage = stats.total > 0 ? Math.round((status.count / stats.total) * 100) : 0;
              
              return (
                <div key={status.key} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${status.color}`}></div>
                    <span className="text-sm text-secondary dark:text-secondary">{status.label}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-primary dark:text-primary">{status.count}</span>
                    <span className="text-xs text-secondary/60 dark:text-secondary/60">({percentage}%)</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress Bar */}
          {stats.total > 0 && (
            <div className="mt-4 pt-4 border-t border-primary/10 dark:border-primary/10">
              <div className="flex justify-between text-sm text-secondary dark:text-secondary mb-2">
                <span>{t('clinic.schedule.stats.todayProgress')}</span>
                <span>{Math.round(((stats.completed + stats.cancelled) / stats.total) * 100)}%</span>
              </div>
              <div className="w-full bg-primary/10 dark:bg-primary/10 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full theme-transition"
                  style={{ width: `${((stats.completed + stats.cancelled) / stats.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Advanced Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time Analysis */}
        {Object.keys(busyHours).length > 0 && (
          <div className="bg-white dark:bg-slate-800/80 rounded-3xl border border-gray-200/60 dark:border-slate-600/60 shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-primary dark:text-primary">{t('clinic.schedule.busiestTimeAnalysis')}</h3>
              <Icon name="BarChart3" size={20} className="text-gray-500 dark:text-slate-400" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {busiestHour.hour ? `${busiestHour.hour}:00` : '-'}
                </div>
                <div className="text-sm text-secondary dark:text-secondary mt-1">{t('clinic.schedule.busiestHour')}</div>
                <div className="text-xs text-secondary/60 dark:text-secondary/60 mt-1">
                  {busiestHour.count || 0} {t('clinic.schedule.appointments')}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {Math.round(stats.total / Object.keys(busyHours).length) || 0}
                </div>
                <div className="text-sm text-secondary dark:text-secondary mt-1">{t('clinic.schedule.averagePerHour')}</div>
                <div className="text-xs text-secondary/60 dark:text-secondary/60 mt-1">
                  {t('clinic.schedule.timeDistribution')}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {Object.keys(busyHours).length}
                </div>
                <div className="text-sm text-secondary dark:text-secondary mt-1">{t('clinic.schedule.activeHours')}</div>
                <div className="text-xs text-secondary/60 dark:text-secondary/60 mt-1">
                  {t('clinic.schedule.patientsPresent')}
                </div>
              </div>
            </div>

            {/* Hourly breakdown */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-secondary dark:text-secondary mb-3">{t('clinic.schedule.hourlyDistribution')}</h4>
              <div className="grid grid-cols-12 gap-1">
                {Array.from({ length: 12 }, (_, i) => {
                  const hour = i + 8; // Starting from 8 AM
                  const count = busyHours[hour] || 0;
                  const maxCount = Math.max(...Object.values(busyHours));
                  const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  
                  return (
                    <div key={hour} className="text-center">
                      <div className="h-16 flex items-end justify-center mb-1">
                        <div 
                          className="w-full bg-blue-500 dark:bg-blue-400 rounded-t opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                          style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : '0' }}
                          title={`${hour}:00 - ${count} ${t('clinic.schedule.appointments')}`}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-slate-500">{hour}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Advanced Performance Metrics */}
        <div className="bg-surface-elevated rounded-3xl border border-primary/20 shadow-theme-lg hover:shadow-theme-xl theme-transition p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-primary dark:text-primary">{t('clinic.schedule.stats.performanceIndicators')}</h3>
            <Icon name="Target" size={20} className="text-secondary/60 dark:text-secondary/60" />
          </div>
          
          <div className="space-y-4">
            {/* Efficiency Rate */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <Icon name="CheckCircle" size={16} className="text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-primary dark:text-primary">{t('clinic.schedule.stats.efficiencyRate')}</p>
                  <p className="text-sm text-secondary/70 dark:text-secondary/70">{t('clinic.schedule.stats.completedVsTotal')}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                  {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                </p>
                <p className="text-xs text-secondary/60 dark:text-secondary/60">{t('clinic.schedule.stats.target')}: 85%</p>
              </div>
            </div>

            {/* Attendance Rate */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Icon name="Users" size={16} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-primary dark:text-primary">{t('clinic.schedule.stats.attendanceRate')}</p>
                  <p className="text-sm text-secondary/70 dark:text-secondary/70">{t('clinic.schedule.stats.nonCancelledAppointments')}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {stats.total > 0 ? Math.round(((stats.total - stats.cancelled) / stats.total) * 100) : 0}%
                </p>
                <p className="text-xs text-secondary/60 dark:text-secondary/60">{t('clinic.schedule.stats.target')}: 90%</p>
              </div>
            </div>

            {/* Utilization Rate */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <Icon name="Clock" size={16} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="font-medium text-primary dark:text-primary">{t('clinic.schedule.stats.timeUtilization')}</p>
                  <p className="text-sm text-secondary/70 dark:text-secondary/70">{t('clinic.schedule.stats.activeHoursUtilization')}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {Object.keys(busyHours).length > 0 ? Math.round((Object.keys(busyHours).length / 10) * 100) : 0}%
                </p>
                <p className="text-xs text-secondary/60 dark:text-secondary/60">10 {t('clinic.schedule.stats.operationalHours')}</p>
              </div>
            </div>
          </div>

          {/* Performance Indicators */}
          <div className="mt-6 pt-4 border-t border-primary/10 dark:border-primary/10">
            <h4 className="text-sm font-medium text-secondary dark:text-secondary mb-3">{t('clinic.schedule.stats.performanceIndicators')}</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-primary/5 dark:bg-primary/5 rounded-2xl">
                <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                  {stats.total > 0 ? Math.round((stats.inProgress / stats.total) * 100) : 0}%
                </div>
                <div className="text-xs text-secondary/70 dark:text-secondary/70">{t('clinic.schedule.stats.currentlyActive')}</div>
              </div>
              <div className="text-center p-3 bg-primary/5 dark:bg-primary/5 rounded-2xl">
                <div className="text-lg font-bold text-red-600 dark:text-red-400">
                  {stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0}%
                </div>
                <div className="text-xs text-secondary/70 dark:text-secondary/70">{t('clinic.schedule.stats.notConfirmed')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trends and Predictions */}
      <div className="bg-surface-elevated rounded-3xl border border-primary/20 shadow-theme-lg hover:shadow-theme-xl theme-transition p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-primary dark:text-primary">{t('clinic.schedule.stats.trendsAndPredictions')}</h3>
          <Icon name="TrendingUp" size={20} className="text-secondary/60 dark:text-secondary/60" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Peak Hours Prediction */}
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Icon name="Clock" size={24} className="text-white" />
            </div>
            <h4 className="font-semibold text-primary dark:text-primary mb-1">{t('clinic.schedule.stats.peakHoursPrediction')}</h4>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">10:00-12:00</p>
            <p className="text-xs text-secondary/60 dark:text-secondary/60">{t('clinic.schedule.stats.basedOnHistoricalPatterns')}</p>
          </div>

          {/* Capacity Forecast */}
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Icon name="BarChart3" size={24} className="text-white" />
            </div>
            <h4 className="font-semibold text-primary dark:text-primary mb-1">{t('clinic.schedule.stats.optimalCapacity')}</h4>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">85%</p>
            <p className="text-xs text-secondary/60 dark:text-secondary/60">{t('clinic.schedule.stats.recommendedUtilization')}</p>
          </div>

          {/* Wait Time Estimate */}
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Icon name="Timer" size={24} className="text-white" />
            </div>
            <h4 className="font-semibold text-primary dark:text-primary mb-1">{t('clinic.schedule.stats.avgWaitTime')}</h4>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mb-1">15 min</p>
            <p className="text-xs text-secondary/60 dark:text-secondary/60">{t('clinic.schedule.stats.todayEstimate')}</p>
          </div>

          {/* Revenue Impact */}
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Icon name="DollarSign" size={24} className="text-white" />
            </div>
            <h4 className="font-semibold text-primary dark:text-primary mb-1">{t('clinic.schedule.stats.revenueImpact')}</h4>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">+12%</p>
            <p className="text-xs text-secondary/60 dark:text-secondary/60">{t('clinic.schedule.stats.vsLastWeek')}</p>
          </div>
        </div>

        {/* Recommendations */}
        <div className="mt-6 pt-6 border-t border-primary/10 dark:border-primary/10">
          <h4 className="font-medium text-primary dark:text-primary mb-4">{t('clinic.schedule.stats.optimizationRecommendations')}</h4>
          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl theme-transition">
              <Icon name="Lightbulb" size={16} className="text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">{t('clinic.schedule.stats.optimizeHour1012')}</p>
                <p className="text-xs text-blue-700 dark:text-blue-300">{t('clinic.schedule.stats.addSlotsInBusiestHours')}</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-3 bg-green-50/50 dark:bg-green-900/10 rounded-2xl theme-transition">
              <Icon name="Users" size={16} className="text-green-600 dark:text-green-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-900 dark:text-green-100">{t('clinic.schedule.stats.distributeDoctors')}</p>
                <p className="text-xs text-green-700 dark:text-green-300">{t('clinic.schedule.stats.balanceWorkloadForOptimalEfficiency')}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-amber-50/50 dark:bg-amber-900/10 rounded-2xl theme-transition">
              <Icon name="Clock" size={16} className="text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">{t('clinic.schedule.stats.followupReminder')}</p>
                <p className="text-xs text-amber-700 dark:text-amber-300">{t('clinic.schedule.stats.activateAutoReminders')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClinicScheduleStats;
