export function resolveReportRange(value, now = new Date()) {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  const days = value === 'last7days' ? 7 : value === 'last3months' ? 90 : value === 'lastyear' ? 365 : 30;
  start.setDate(start.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function reportQuery(dateRange, branchId, now) {
  const range = resolveReportRange(dateRange, now);
  return {
    ...range,
    ...(branchId && branchId !== 'all' ? { branchId } : {}),
  };
}

export function csvEscape(value) {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function compactNumber(value) {
  return new Intl.NumberFormat('id-ID', { notation: 'compact' })
    .format(Number(value) || 0)
    .replace(/\s+/g, ' ');
}

export function boundedPercent(value, max = 100) {
  const amount = Number(value) || 0;
  const ceiling = Number(max) || 100;
  return Math.max(0, Math.min(100, ceiling > 0 ? (amount / ceiling) * 100 : 0));
}

export function sparklineHeightPercent(value, max) {
  return Math.max(4, boundedPercent(value, max));
}

export function reportToCsv(report) {
  const rows = [
    ['Dokter', 'Cabang', 'Appointment', 'Selesai', 'Batal', 'No-show', 'Pasien unik', 'Revenue'],
    ...(report?.people || []).map(person => [
      person.name,
      person.branchName || '',
      person.appointments,
      person.completed,
      person.cancelled,
      person.noShow,
      person.uniquePatients,
      person.revenue,
    ]),
  ];
  return rows.map(row => row.map(csvEscape).join(',')).join('\n');
}
