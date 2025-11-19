import React from 'react';
import Icon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';

const ChairStatusCard = () => {
  const { t } = useLanguage();
  
  const chairData = [
    { id: 1, status: 'occupied', patient: 'Budi S.', treatment: 'Scaling', doctor: 'drg. Sarah', startTime: '09:00', duration: 45 },
    { id: 2, status: 'cleaning', patient: null, treatment: null, doctor: null, startTime: null, duration: 15 },
    { id: 3, status: 'available', patient: null, treatment: null, doctor: null, startTime: null, duration: null },
    { id: 4, status: 'maintenance', patient: null, treatment: null, doctor: null, startTime: null, duration: null },
  ];

  const getStatusInfo = (status) => {
    switch (status) {
      case 'occupied':
        return { color: 'bg-blue-500', icon: 'User', label: t('home.occupied'), textColor: 'text-blue-500' };
      case 'cleaning':
        return { color: 'bg-amber-500', icon: 'Sparkles', label: t('home.cleaning'), textColor: 'text-amber-500' };
      case 'available':
        return { color: 'bg-emerald-500', icon: 'Check', label: t('home.available'), textColor: 'text-emerald-500' };
      case 'maintenance':
        return { color: 'bg-red-500', icon: 'AlertTriangle', label: t('home.maintenance'), textColor: 'text-red-500' };
      default:
        return { color: 'bg-gray-500', icon: 'Circle', label: t('home.unknown'), textColor: 'text-gray-500' };
    }
  };

  const getUtilizationPercentage = () => {
    const occupied = chairData.filter(chair => chair.status === 'occupied').length;
    return Math.round((occupied / chairData.length) * 100);
  };

  return (
    <div className="bg-surface rounded-3xl p-6 border border-primary/20 shadow-theme-lg hover:shadow-theme-xl transition-all duration-300 theme-transition">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-blue-500/10">
            <Icon name="Armchair" size={24} className="text-blue-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-primary theme-transition">{t('home.chairStatus')}</h3>
            <p className="text-sm text-muted theme-transition">{t('home.realTimeChairUtilization')}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted theme-transition">{t('home.utilization')}</p>
          <p className="text-2xl font-bold text-primary theme-transition">{getUtilizationPercentage()}%</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {chairData.map((chair) => {
          const statusInfo = getStatusInfo(chair.status);
          return (
            <div key={chair.id} className="relative">
              <div className="bg-surface-elevated rounded-xl p-4 border-2 border-transparent hover:border-accent/20 transition-all duration-200 theme-transition">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 ${statusInfo.color} rounded-full`}></div>
                    <span className="font-semibold text-primary theme-transition">Chair {chair.id}</span>
                  </div>
                  <Icon name={statusInfo.icon} size={16} className={statusInfo.textColor} />
                </div>
                
                <div className="space-y-1">
                  <p className={`text-sm font-medium ${statusInfo.textColor}`}>{statusInfo.label}</p>
                  {chair.patient && (
                    <>
                      <p className="text-sm text-primary font-medium theme-transition">{chair.patient}</p>
                      <p className="text-xs text-secondary theme-transition">{chair.treatment}</p>
                      <p className="text-xs text-muted theme-transition">{chair.doctor} • {chair.startTime}</p>
                    </>
                  )}
                  {chair.status === 'cleaning' && (
                    <p className="text-xs text-amber-600">Est. {chair.duration} min remaining</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-primary/10">
        <div className="flex space-x-4 text-sm">
          <span className="text-muted theme-transition">Avg Turnover: <span className="font-semibold text-primary">8 min</span></span>
          <span className="text-muted theme-transition">Next Available: <span className="font-semibold text-primary">Chair 3</span></span>
        </div>
        <button className="px-4 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 text-sm font-medium transition-colors">
          Manage Chairs
        </button>
      </div>
    </div>
  );
};

export default ChairStatusCard;
