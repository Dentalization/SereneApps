const normalizeDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDateLabel = (value, fallback = '-') => {
  const date = normalizeDate(value);
  if (!date) {
    return value || fallback;
  }
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateTimeLabel = (value, fallback = '-') => {
  const date = normalizeDate(value);
  if (!date) {
    return value || fallback;
  }
  return date.toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};
