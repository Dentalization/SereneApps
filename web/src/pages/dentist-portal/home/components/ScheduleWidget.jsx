import React from 'react';
import Icon from '../../../../components/AppIcon';

const ScheduleWidget = ({ schedules = [], onQuickAction }) => {
  const statusConfig = {
    scheduled: {
      color: 'blue',
      label: 'Scheduled',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-700 dark:text-blue-300',
      dot: 'bg-blue-500'
    },
    pending: {
      color: 'amber',
      label: 'Pending',
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-300',
      dot: 'bg-amber-500'
    },
    confirmed: {
      color: 'blue',
      label: 'Confirmed',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-700 dark:text-blue-300',
      dot: 'bg-blue-500'
    },
    'check-in': {
      color: 'amber',
      label: 'Check-in',
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-300',
      dot: 'bg-amber-500'
    },
    'in-chair': {
      color: 'emerald',
      label: 'In Chair',
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      text: 'text-emerald-700 dark:text-emerald-300',
      dot: 'bg-emerald-500'
    },
    completed: {
      color: 'slate',
      label: 'Completed',
      bg: 'bg-slate-100 dark:bg-slate-800/50',
      text: 'text-slate-700 dark:text-slate-300',
      dot: 'bg-slate-500'
    },
    cancelled: {
      color: 'red',
      label: 'Cancelled',
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-300',
      dot: 'bg-red-500'
    },
    'no-show': {
      color: 'red',
      label: 'No Show',
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-300',
      dot: 'bg-red-500'
    },
    overdue: {
      color: 'red',
      label: 'Overdue',
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-300',
      dot: 'bg-red-500'
    }
  };

  return (
    <div className="bg-surface-elevated rounded-3xl p-6 border border-primary/30 shadow-theme-lg hover:shadow-theme-xl transition-all duration-300 theme-transition dark:border-primary/40 dark:bg-surface-elevated/80">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-accent/10">
            <Icon name="Calendar" size={24} className="text-accent" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-primary theme-transition">Jadwal Hari Ini</h2>
            <p className="text-sm text-muted theme-transition">Manage today's appointments</p>
          </div>
        </div>
        <button className="p-2 rounded-xl bg-surface-elevated hover:bg-accent/10 transition-colors theme-transition">
          <Icon name="MoreHorizontal" size={20} className="text-muted theme-transition" />
        </button>
      </div>

      {/* Schedule list */}
      <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
        {schedules.length > 0 ? schedules.map((schedule, index) => {
          const cfg = statusConfig[schedule.status] || statusConfig.confirmed;
          return (
            <div 
              key={index} 
              className="group/item relative bg-surface-elevated rounded-2xl border border-primary/10 p-4 hover:bg-surface hover:shadow-theme-sm transition-all duration-300 theme-transition"
            >
              <div className="flex items-center justify-between">
                {/* Patient info */}
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${cfg.dot} shadow-sm`}></div>
                  <div>
                    <p className="font-semibold text-primary group-hover/item:text-accent transition-colors theme-transition">
                      {schedule.patient}
                    </p>
                    <p className="text-sm text-secondary theme-transition">
                      {schedule.time} • {schedule.treatment}
                    </p>
                  </div>
                </div>

                {/* Status and action */}
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1.5 text-xs font-medium rounded-full ${cfg.bg} ${cfg.text}`}>
                    {cfg.label}
                  </span>
                  <button 
                    onClick={() => onQuickAction?.(schedule)}
                    className="p-2 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent opacity-0 group-hover/item:opacity-100 transition-all duration-300"
                  >
                    <Icon name="ChevronRight" size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="text-center py-8">
            <Icon name="Calendar" size={48} className="mx-auto text-muted/50 mb-3" />
            <p className="text-secondary theme-transition">Tidak ada jadwal hari ini</p>
            <p className="text-xs text-muted theme-transition">Semua jadwal sudah selesai atau belum ada yang terjadwal</p>
          </div>
        )}
      </div>

      {/* Footer action */}
      <div className="mt-6 pt-4 border-t border-primary/10">
        <button className="w-full py-3 px-4 rounded-xl bg-accent/10 hover:bg-accent/20 text-accent font-medium transition-all duration-300 hover:scale-[1.02] theme-transition flex items-center justify-center space-x-2">
          <Icon name="Plus" size={16} />
          <span>Tambah Appointment</span>
        </button>
      </div>
    </div>
  );
};

export default ScheduleWidget;
