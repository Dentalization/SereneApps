export const parseDateValue = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  let date = new Date(trimmed);
  if (!Number.isNaN(date.getTime())) return date;

  const normalized = trimmed.replace(' ', 'T');
  date = new Date(normalized);
  if (!Number.isNaN(date.getTime())) return date;

  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{2})[-/](\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (isoMatch) {
    const [, year, month, day, hour = '0', minute = '0', second = '0'] = isoMatch;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    );
  }

  const dmyMatch = trimmed.match(/^(\d{2})[-/](\d{2})[-/](\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (dmyMatch) {
    const [, day, month, year, hour = '0', minute = '0', second = '0'] = dmyMatch;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    );
  }

  return null;
};
