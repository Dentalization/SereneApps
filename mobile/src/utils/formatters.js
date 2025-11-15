import { format, parseISO, formatDistanceToNow, isToday, isTomorrow, isYesterday } from 'date-fns';
import { id } from 'date-fns/locale';

export const formatDate = (date, formatStr = 'dd MMMM yyyy') => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr, { locale: id });
};

export const formatTime = (date) => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'HH:mm', { locale: id });
};

export const formatDateTime = (date) => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'dd MMMM yyyy, HH:mm', { locale: id });
};

export const formatRelativeTime = (date) => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (isToday(dateObj)) {
    return `Hari ini, ${format(dateObj, 'HH:mm', { locale: id })}`;
  }
  
  if (isTomorrow(dateObj)) {
    return `Besok, ${format(dateObj, 'HH:mm', { locale: id })}`;
  }
  
  if (isYesterday(dateObj)) {
    return `Kemarin, ${format(dateObj, 'HH:mm', { locale: id })}`;
  }
  
  return format(dateObj, 'dd MMM, HH:mm', { locale: id });
};

export const formatTimeAgo = (date) => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true, locale: id });
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

export const formatNumber = (num) => {
  return new Intl.NumberFormat('id-ID').format(num);
};

export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  // Format +628123456789 to +62 812-3456-789
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('62')) {
    const match = cleaned.match(/^(\d{2})(\d{3})(\d{4})(\d+)$/);
    if (match) {
      return `+${match[1]} ${match[2]}-${match[3]}-${match[4]}`;
    }
  }
  return phone;
};

export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const getInitials = (name) => {
  if (!name) return '';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};
