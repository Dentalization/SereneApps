import React from 'react';
import Icon from '../../../../components/AppIcon';

const QueueBoardCard = () => {
  const queueData = [
    { patient: 'Budi S.', chair: 'Kursi 1', status: 'in-chair', treatment: 'Scaling', waitTime: '15 min', doctor: 'drg. Sarah' },
    { patient: 'Sari I.', chair: 'Kursi 2', status: 'cleaning', treatment: 'Crown Prep', waitTime: '5 min', doctor: 'drg. Ahmad' },
    { patient: 'Maya P.', chair: 'Waiting', status: 'waiting', treatment: 'Konsultasi', waitTime: '25 min', doctor: 'drg. Sarah' },
    { patient: 'Ahmad R.', chair: 'Check-in', status: 'check-in', treatment: 'RCT Follow-up', waitTime: '2 min', doctor: 'drg. Ahmad' },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'in-chair': return 'bg-blue-500 text-white';
      case 'cleaning': return 'bg-amber-500 text-white';
      case 'waiting': return 'bg-orange-500 text-white';
      case 'check-in': return 'bg-emerald-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'in-chair': return 'User';
      case 'cleaning': return 'Sparkles';
      case 'waiting': return 'Clock';
      case 'check-in': return 'CheckCircle';
      default: return 'Circle';
    }
  };

  return (
    <div className="bg-surface rounded-3xl p-6 border border-primary/20 shadow-theme-lg hover:shadow-theme-xl transition-all duration-300 theme-transition">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-purple-500/10">
            <Icon name="Monitor" size={24} className="text-purple-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-primary theme-transition">Queue Board</h3>
            <p className="text-sm text-muted theme-transition">Real-time patient flow</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-emerald-500 font-medium">Live</span>
        </div>
      </div>

      <div className="space-y-3">
        {queueData.map((item, index) => (
          <div key={index} className="flex items-center justify-between p-4 bg-surface-elevated rounded-xl hover:bg-accent/5 transition-colors theme-transition">
            <div className="flex items-center space-x-4">
              <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${getStatusColor(item.status)} flex items-center space-x-1`}>
                <Icon name={getStatusIcon(item.status)} size={12} />
                <span className="capitalize">{item.status.replace('-', ' ')}</span>
              </div>
              <div>
                <p className="font-semibold text-primary theme-transition">{item.patient}</p>
                <p className="text-sm text-secondary theme-transition">{item.treatment} • {item.doctor}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-primary theme-transition">{item.chair}</p>
              <p className="text-xs text-muted theme-transition">{item.waitTime}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-primary/10">
        <div className="flex justify-between items-center">
          <div className="flex space-x-4 text-sm">
            <span className="text-muted theme-transition">Avg Wait: <span className="font-semibold text-primary">12 min</span></span>
            <span className="text-muted theme-transition">Active Chairs: <span className="font-semibold text-primary">2/3</span></span>
          </div>
          <button className="px-4 py-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-500 text-sm font-medium transition-colors">
            View Full Board
          </button>
        </div>
      </div>
    </div>
  );
};

export default QueueBoardCard;
