import React from 'react';
import Icon from '../../../../components/AppIcon';

const RecallManagerCard = ({ recalls = [] }) => {

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
            {recalls.filter(item => item.priority === 'urgent').length} Urgent
          </span>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {recalls.length === 0 ? (
          <div className="rounded-lg border border-primary/10 bg-surface p-5 text-center text-sm text-secondary">
            Tidak ada appointment yang memerlukan follow-up.
          </div>
        ) : recalls.slice(0, 4).map((recall, index) => {
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
          <p className="text-2xl font-bold text-emerald-500">{recalls.length}</p>
          <p className="text-xs text-muted theme-transition">Follow-up</p>
        </div>
        <div className="text-center p-3 bg-surface-elevated rounded-xl theme-transition">
          <p className="text-2xl font-bold text-blue-500">{recalls.filter((item) => item.priority === 'high').length}</p>
          <p className="text-xs text-muted theme-transition">Overdue</p>
        </div>
        <div className="text-center p-3 bg-surface-elevated rounded-xl theme-transition">
          <p className="text-2xl font-bold text-amber-500">{recalls.filter((item) => item.priority === 'urgent').length}</p>
          <p className="text-xs text-muted theme-transition">No-show</p>
        </div>
      </div>

    </div>
  );
};

export default RecallManagerCard;
