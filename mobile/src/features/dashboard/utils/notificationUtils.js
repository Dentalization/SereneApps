import { NOTIFICATION_TYPE_META } from '../data/notifications';

export const withOpacity = (hex, alpha = 0.15) => {
  if (!hex) return `rgba(0,0,0,${alpha})`;
  const value = hex.replace('#', '');
  const bigint = parseInt(value, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
};

export const formatNotificationTime = (iso) => {
  if (!iso) return '';
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return '';
  const now = Date.now();
  const diffMs = now - target.getTime();
  if (diffMs < 0) return 'Now';

  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'Now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';

  return target.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const getTypeMeta = (type) => NOTIFICATION_TYPE_META[type] || NOTIFICATION_TYPE_META.system;
