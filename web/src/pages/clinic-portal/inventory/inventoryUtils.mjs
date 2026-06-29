export const getStatusBadgeClass = (status) => {
  const map = {
    normal: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    low: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    expired: 'bg-slate-100 text-slate-700 dark:bg-slate-800/70 dark:text-slate-400',
    expiring: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
    approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    ordered: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    verified: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400',
    partial: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400',
    recorded: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400',
    'in-progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    operational: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400',
    'in-use': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    maintenance: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
    broken: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    due_maintenance: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400'
  };
  return map[status] || 'bg-slate-100 text-slate-700 dark:bg-slate-800/70 dark:text-slate-400';
};

export const getPriorityBadgeClass = (priority) => {
  const map = {
    high: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
    low: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400'
  };
  return map[priority] || 'bg-slate-100 text-slate-700 dark:bg-slate-800/70 dark:text-slate-400';
};

export const formatRupiah = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 'Rp 0';
  return amount >= 1_000_000
    ? `Rp ${(amount / 1_000_000).toFixed(1)}M`
    : `Rp ${amount.toLocaleString('id-ID')}`;
};

export const isSameLocalDay = (value, comparison = new Date()) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getFullYear() === comparison.getFullYear()
    && date.getMonth() === comparison.getMonth()
    && date.getDate() === comparison.getDate();
};

export const isWithinDays = (value, days, now = new Date()) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const difference = date.getTime() - now.getTime();
  return difference >= 0 && difference <= days * 24 * 60 * 60 * 1000;
};

export const isWithinCurrentMonth = (value, now = new Date()) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
};

export const getRecordDate = (record = {}) => (
  record.date
  || record.createdAt
  || record.created_at
  || record.receivedDate
  || record.receivedAt
  || record.received_at
  || null
);

