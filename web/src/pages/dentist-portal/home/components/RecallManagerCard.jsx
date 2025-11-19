import React from 'react';
import Icon from '../../../../components/AppIcon';

const RecallManagerCard = () => {
  const recallData = [
    { type: 'ortho-checkup', patient: 'Maya Putri', dueDate: '2025-09-16', treatment: 'Orthodontic Control', priority: 'high', lastVisit: '2025-07-16' },
    { type: 'scaling-recall', patient: 'Ahmad Rahman', dueDate: '2025-09-18', treatment: 'Scaling & Polish', priority: 'medium', lastVisit: '2025-03-18' },
    { type: 'missed-appointment', patient: 'Sari Indah', dueDate: '2025-09-14', treatment: 'Crown Follow-up', priority: 'urgent', lastVisit: '2025-08-28' },
    { type: 'implant-followup', patient: 'Budi Santoso', dueDate: '2025-09-20', treatment: 'Implant Check', priority: 'high', lastVisit: '2025-06-20' },
  ];

  const getPriorityInfo = (priority) => {
    switch (priority) {
      case 'urgent':
        return { color: 'bg-red-500', textColor: 'text-red-500', bgColor: 'bg-red-500/10' };
      case 'high':
        return { color: 'bg-orange-500', textColor: 'text-orange-500', bgColor: 'bg-orange-500/10' };
      case 'medium':
        return { color: 'bg-blue-500', textColor: 'text-blue-500', bgColor: 'bg-blue-500/10' };
      default:
        return { color: 'bg-gray-500', textColor: 'text-gray-500', bgColor: 'bg-gray-500/10' };
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'ortho-checkup': return 'Braces';
      case 'scaling-recall': return 'Sparkles';
      case 'missed-appointment': return 'AlertCircle';
      case 'implant-followup': return 'Drill';
      default: return 'Calendar';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    return `in ${diffDays} days`;
  };

  return (
    <div className="bg-surface-elevated rounded-3xl p-6 border border-primary/30 shadow-theme-lg hover:shadow-theme-xl transition-all duration-300 theme-transition dark:border-primary/40 dark:bg-surface-elevated/80">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-emerald-500/10">
            <Icon name="Bell" size={24} className="text-emerald-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-primary theme-transition">Recall Manager</h3>
            <p className="text-sm text-muted theme-transition">Patient follow-up tracking</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-sm font-medium">
            {recallData.filter(item => item.priority === 'urgent').length} Urgent
          </span>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {recallData.slice(0, 4).map((recall, index) => {
          const priorityInfo = getPriorityInfo(recall.priority);
          return (
            <div key={index} className="flex items-center justify-between p-4 bg-surface-elevated rounded-xl hover:bg-accent/5 transition-colors theme-transition">
              <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-lg ${priorityInfo.bgColor}`}>
                  <Icon name={getTypeIcon(recall.type)} size={16} className={priorityInfo.textColor} />
                </div>
                <div>
                  <p className="font-semibold text-primary theme-transition">{recall.patient}</p>
                  <p className="text-sm text-secondary theme-transition">{recall.treatment}</p>
                </div>
              </div>
              <div className="text-right">
                <div className={`px-2 py-1 rounded-md text-xs font-medium ${priorityInfo.bgColor} ${priorityInfo.textColor} mb-1`}>
                  {formatDate(recall.dueDate)}
                </div>
                <p className="text-xs text-muted theme-transition capitalize">{recall.priority}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-surface-elevated rounded-xl theme-transition">
          <p className="text-2xl font-bold text-emerald-500">12</p>
          <p className="text-xs text-muted theme-transition">This Week</p>
        </div>
        <div className="text-center p-3 bg-surface-elevated rounded-xl theme-transition">
          <p className="text-2xl font-bold text-blue-500">45</p>
          <p className="text-xs text-muted theme-transition">This Month</p>
        </div>
        <div className="text-center p-3 bg-surface-elevated rounded-xl theme-transition">
          <p className="text-2xl font-bold text-amber-500">88%</p>
          <p className="text-xs text-muted theme-transition">Response Rate</p>
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-primary/10">
        <button className="px-4 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-sm font-medium transition-colors flex items-center space-x-2">
          <Icon name="Send" size={14} />
          <span>Send Reminders</span>
        </button>
        <button className="px-4 py-2 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent text-sm font-medium transition-colors">
          View All Recalls
        </button>
      </div>
    </div>
  );
};

export default RecallManagerCard;
