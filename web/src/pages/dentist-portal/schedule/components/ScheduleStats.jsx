import React, { useState } from 'react';
import Icon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';

const ScheduleStats = ({ appointments, selectedDate }) => {
  const { t, language } = useLanguage();
  const locale = React.useMemo(() => (language === 'id' ? 'id-ID' : 'en-US'), [language]);
  const [selectedMetric, setSelectedMetric] = useState('overview');

  // Calculate statistics
  const stats = React.useMemo(() => {
    const total = appointments.length;
    const pending = appointments.filter(apt => apt.status === 'pending').length;
    const confirmed = appointments.filter(apt => apt.status === 'confirmed').length;
    const active = appointments.filter(apt => ['check-in', 'in-chair'].includes(apt.status)).length;
    const completed = appointments.filter(apt => apt.status === 'completed').length;
    const cancelled = appointments.filter(apt => ['cancelled', 'no-show'].includes(apt.status)).length;
    const tele = appointments.filter(apt => apt.channel === 'tele').length;
    const clinic = appointments.filter(apt => apt.channel === 'clinic').length;
    const urgent = appointments.filter(apt => apt.risk >= 0.75).length;
    const depositRequired = appointments.filter(apt => apt.depositRequired).length;

    const revenue = appointments
      .filter(apt => apt.status === 'completed')
      .reduce((sum, apt) => sum + (apt.fee || 0), 0);

    return {
      total,
      pending,
      confirmed,
      active,
      completed,
      cancelled,
      tele,
      clinic,
      urgent,
      depositRequired,
      revenue
    };
  }, [appointments]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const StatCard = ({ title, value, subtitle, icon, color = 'text-primary', bgColor = 'bg-surface', trend, onClick, isSelected = false }) => (
    <div
      onClick={onClick}
      className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-md ${
        isSelected 
          ? 'border-accent bg-accent/5 shadow-md' 
          : 'border-primary/10 hover:border-primary/20'
      } ${bgColor} theme-transition`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <Icon name={icon} size={18} className={color} />
            <span className="text-sm font-medium text-secondary">{title}</span>
          </div>
          <div className={`text-2xl font-bold ${color} theme-transition`}>
            {value}
          </div>
          {subtitle && (
            <div className="text-xs text-muted mt-1">{subtitle}</div>
          )}
        </div>
        
        {trend && (
          <div className={`text-xs font-medium px-2 py-1 rounded-full ${
            trend > 0 
              ? 'bg-emerald-100 text-emerald-700' 
              : trend < 0 
                ? 'bg-red-100 text-red-700'
                : 'bg-slate-100 text-slate-700'
          }`}>
            {trend > 0 ? '+' : ''}{trend}%
          </div>
        )}
      </div>
    </div>
  );

  const progressBars = [
    {
      label: t('dentistSchedule.stats.completionRate'),
      value: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
      color: 'bg-emerald-500'
    },
    {
      label: t('dentistSchedule.stats.confirmationRate'),
      value: stats.total > 0 ? Math.round(((stats.confirmed + stats.active + stats.completed) / stats.total) * 100) : 0,
      color: 'bg-blue-500'
    },
    {
      label: t('dentistSchedule.stats.teledentistryUsage'),
      value: stats.total > 0 ? Math.round((stats.tele / stats.total) * 100) : 0,
      color: 'bg-cyan-500'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('dentistSchedule.stats.totalAppointments')}
          value={stats.total}
          subtitle={`${stats.active} ${t('dentistSchedule.stats.currentlyActive')}`}
          icon="Calendar"
          color="text-primary"
          isSelected={selectedMetric === 'overview'}
          onClick={() => setSelectedMetric('overview')}
        />
        
        <StatCard
          title={t('dentistSchedule.stats.pending')}
          value={stats.pending}
          subtitle={t('dentistSchedule.stats.needsConfirmation')}
          icon="Clock"
          color="text-amber-600"
          bgColor="bg-amber-50 dark:bg-amber-900/10"
          isSelected={selectedMetric === 'pending'}
          onClick={() => setSelectedMetric('pending')}
        />
        
        <StatCard
          title={t('dentistSchedule.stats.confirmed')}
          value={stats.confirmed}
          subtitle={t('dentistSchedule.stats.readyToGo')}
          icon="CheckCircle"
          color="text-blue-600"
          bgColor="bg-blue-50 dark:bg-blue-900/10"
          isSelected={selectedMetric === 'confirmed'}
          onClick={() => setSelectedMetric('confirmed')}
        />
        
        <StatCard
          title={t('dentistSchedule.stats.completed')}
          value={stats.completed}
          subtitle={t('dentistSchedule.stats.successfullyFinished')}
          icon="Check"
          color="text-emerald-600"
          bgColor="bg-emerald-50 dark:bg-emerald-900/10"
          isSelected={selectedMetric === 'completed'}
          onClick={() => setSelectedMetric('completed')}
        />
      </div>

      {/* Channel & Priority Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StatCard
          title={t('dentistSchedule.stats.teledentistry')}
          value={stats.tele}
          subtitle={`${stats.clinic} ${t('dentistSchedule.stats.inClinic')}`}
          icon="Video"
          color="text-cyan-600"
          bgColor="bg-cyan-50 dark:bg-cyan-900/10"
          isSelected={selectedMetric === 'tele'}
          onClick={() => setSelectedMetric('tele')}
        />
        
        <StatCard
          title={t('dentistSchedule.stats.highRisk')}
          value={stats.urgent}
          subtitle={t('dentistSchedule.stats.requiresAttention')}
          icon="AlertTriangle"
          color="text-red-600"
          bgColor="bg-red-50 dark:bg-red-900/10"
          isSelected={selectedMetric === 'urgent'}
          onClick={() => setSelectedMetric('urgent')}
        />
        
        <StatCard
          title={t('dentistSchedule.stats.depositRequired')}
          value={stats.depositRequired}
          subtitle={t('dentistSchedule.stats.paymentPending')}
          icon="DollarSign"
          color="text-purple-600"
          bgColor="bg-purple-50 dark:bg-purple-900/10"
          isSelected={selectedMetric === 'deposit'}
          onClick={() => setSelectedMetric('deposit')}
        />
      </div>

      {/* Progress Indicators */}
      <div className="bg-surface-elevated border border-primary/10 rounded-2xl p-6 theme-transition">
        <h3 className="text-lg font-semibold text-primary mb-4">{t('dentistSchedule.stats.performanceMetrics')}</h3>
        
        <div className="space-y-4">
          {progressBars.map((bar, index) => (
            <div key={index}>
            <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-secondary">{bar.label}</span>
                <span className="text-sm font-semibold text-primary">{bar.value}%</span>
              </div>
              <div className="w-full bg-surface rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full ${bar.color} transition-all duration-500 ease-out`}
                  style={{ width: `${bar.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-surface-elevated border border-primary/10 rounded-2xl p-6 theme-transition">
        <h3 className="text-lg font-semibold text-primary mb-4">{t('dentistSchedule.stats.quickActions')}</h3>
        
        <div className="grid grid-cols-2 gap-3">
          <button className="p-3 text-left rounded-xl bg-accent/10 hover:bg-accent/20 text-accent transition-all duration-200">
            <div className="flex items-center space-x-2 mb-1">
              <Icon name="Plus" size={16} />
              <span className="font-medium text-sm">{t('dentistSchedule.stats.newAppointment')}</span>
            </div>
            <div className="text-xs opacity-75">{t('dentistSchedule.stats.scheduleNewConsultation')}</div>
          </button>
          
          <button className="p-3 text-left rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 transition-all duration-200">
            <div className="flex items-center space-x-2 mb-1">
              <Icon name="UserCheck" size={16} />
              <span className="font-medium text-sm">{t('dentistSchedule.stats.bulkCheckIn')}</span>
            </div>
            <div className="text-xs opacity-75">{t('dentistSchedule.stats.checkInMultiplePatients')}</div>
          </button>
          
          <button className="p-3 text-left rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 transition-all duration-200">
            <div className="flex items-center space-x-2 mb-1">
              <Icon name="Send" size={16} />
              <span className="font-medium text-sm">{t('dentistSchedule.stats.sendReminders')}</span>
            </div>
            <div className="text-xs opacity-75">{t('dentistSchedule.stats.notifyPendingPatients')}</div>
          </button>
          
          <button className="p-3 text-left rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 transition-all duration-200">
            <div className="flex items-center space-x-2 mb-1">
              <Icon name="Download" size={16} />
              <span className="font-medium text-sm">{t('dentistSchedule.stats.exportSchedule')}</span>
            </div>
            <div className="text-xs opacity-75">{t('dentistSchedule.stats.downloadDailyReport')}</div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleStats;
