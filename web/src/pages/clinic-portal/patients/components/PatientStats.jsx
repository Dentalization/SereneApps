import React from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import Icon from '../../../../components/AppIcon';

const StatCard = ({ icon, title, value, change, changeType, color = "primary" }) => {
  const getColorClasses = (color) => {
    const colors = {
      primary: "bg-primary/10 text-primary border-primary/20",
      success: "bg-green-500/10 text-green-600 border-green-500/20",
      warning: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
      info: "bg-blue-500/10 text-blue-600 border-blue-500/20"
    };
    return colors[color] || colors.primary;
  };

  return (
    <div className="bg-surface-elevated rounded-xl p-6 border border-border/50 hover:border-border transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${getColorClasses(color)}`}>
          <Icon name={icon} className="w-6 h-6" />
        </div>
        {change && (
          <div className={`flex items-center text-sm ${changeType === 'increase' ? 'text-green-500' : 'text-red-500'
            }`}>
            <Icon
              name={changeType === 'increase' ? 'trending-up' : 'trending-down'}
              className="w-4 h-4 mr-1"
            />
            {change}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-2xl font-bold text-text-primary mb-1">{value}</h3>
        <p className="text-text-secondary text-sm">{title}</p>
      </div>
    </div>
  );
};

const PatientStats = ({ patients = [] }) => {
  const { t } = useLanguage();

  // Calculate statistics
  const totalPatients = patients.length;
  const activePatients = patients.filter(p => p.status === 'active').length;
  const vipPatients = patients.filter(p => p.status === 'vip').length;
  const newThisMonth = patients.filter(p => {
    const patientDate = new Date(p.createdAt || p.lastVisit);
    const now = new Date();
    return patientDate.getMonth() === now.getMonth() &&
      patientDate.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatCard
        icon="users"
        title={t('patients.registry.stats.totalPatients')}
        value={totalPatients.toLocaleString()}
        change="+5.2%"
        changeType="increase"
        color="primary"
      />

      <StatCard
        icon="user-check"
        title={t('patients.registry.stats.activePatients')}
        value={activePatients.toLocaleString()}
        change="+2.1%"
        changeType="increase"
        color="success"
      />

      <StatCard
        icon="star"
        title={t('patients.registry.stats.vipPatients')}
        value={vipPatients.toLocaleString()}
        change="+8.7%"
        changeType="increase"
        color="warning"
      />

      <StatCard
        icon="user-plus"
        title={t('patients.registry.stats.newThisMonth')}
        value={newThisMonth.toLocaleString()}
        change="+12.3%"
        changeType="increase"
        color="info"
      />
    </div>
  );
};

export default PatientStats;