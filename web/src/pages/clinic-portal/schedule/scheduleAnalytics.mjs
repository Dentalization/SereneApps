const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

const IN_PROGRESS_STATUSES = new Set(['check-in', 'in-chair']);
const OCCUPANCY_EXCLUDED_STATUSES = new Set(['cancelled', 'no-show', 'overdue']);
const PAID_STATUSES = new Set(['paid', 'succeeded', 'settled']);

function asDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(value) {
  const date = asDate(value) || new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isWithin(date, from, to) {
  return date && date >= from && date < to;
}

function sameId(left, right) {
  return left != null && right != null && String(left) === String(right);
}

function percent(numerator, denominator) {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : null;
}

function durationMinutes(appointment) {
  const start = asDate(appointment?.start);
  const end = asDate(appointment?.end);
  if (!start || !end || end <= start) return 0;
  return Math.min(Math.round((end - start) / MINUTE_MS), 12 * 60);
}

function paymentAmount(appointment) {
  const status = String(appointment?.payment?.status || '').toLowerCase();
  const amount = Number(appointment?.payment?.amount);
  return PAID_STATUSES.has(status) && Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function transitionTime(appointment, statuses) {
  const accepted = new Set(statuses);
  const entries = Array.isArray(appointment?.statusHistory) ? appointment.statusHistory : [];
  const matches = entries
    .filter((entry) => accepted.has(entry?.newStatus))
    .map((entry) => asDate(entry?.createdAt))
    .filter(Boolean)
    .sort((left, right) => left - right);
  return matches[0] || null;
}

function appointmentWaitMinutes(appointment) {
  const checkedInAt = transitionTime(appointment, ['check-in']);
  const startedAt = transitionTime(appointment, ['in-chair']);
  if (!checkedInAt || !startedAt || startedAt < checkedInAt) return null;
  const wait = Math.round((startedAt - checkedInAt) / MINUTE_MS);
  return wait <= 8 * 60 ? wait : null;
}

function countByStatus(appointments) {
  const count = (status) => appointments.filter((appointment) => appointment.status === status).length;
  return {
    total: appointments.length,
    confirmed: count('confirmed'),
    pending: count('pending'),
    completed: count('completed'),
    cancelled: count('cancelled'),
    noShow: count('no-show'),
    overdue: count('overdue'),
    inProgress: appointments.filter((appointment) => IN_PROGRESS_STATUSES.has(appointment.status)).length
  };
}

function buildHistoricalPeak(appointments) {
  const eligible = appointments.filter(
    (appointment) => !OCCUPANCY_EXCLUDED_STATUSES.has(appointment.status) && asDate(appointment.start)
  );
  if (eligible.length < 5) {
    return { hour: null, count: 0, sampleSize: eligible.length };
  }

  const hours = eligible.reduce((accumulator, appointment) => {
    const hour = asDate(appointment.start).getHours();
    accumulator[hour] = (accumulator[hour] || 0) + 1;
    return accumulator;
  }, {});
  const [hour, count] = Object.entries(hours).sort((left, right) => {
    if (right[1] !== left[1]) return right[1] - left[1];
    return Number(left[0]) - Number(right[0]);
  })[0];
  return { hour: Number(hour), count, sampleSize: eligible.length };
}

function buildRecommendations({ stats, doctorStats, historicalPeak, historicalResolved, cancellationRate }) {
  if (stats.total === 0) {
    return [{
      icon: 'CalendarX',
      tone: 'slate',
      title: 'Belum ada appointment pada tanggal ini',
      description: 'Tidak ada tindakan operasional yang disarankan sampai jadwal terisi.'
    }];
  }

  const recommendations = [];
  if (stats.pending > 0) {
    recommendations.push({
      icon: 'BellRing',
      tone: 'amber',
      title: `Konfirmasi ${stats.pending} appointment`,
      description: 'Hubungi pasien yang statusnya masih pending sebelum waktu kunjungan.'
    });
  }

  if (stats.inProgress > 0) {
    recommendations.push({
      icon: 'Activity',
      tone: 'cyan',
      title: `${stats.inProgress} pasien sedang diproses`,
      description: 'Pantau perpindahan status check-in, in-chair, lalu completed agar antrean akurat.'
    });
  }

  const workloads = doctorStats.map((doctor) => doctor.appointmentCount);
  const maxWorkload = workloads.length ? Math.max(...workloads) : 0;
  const minWorkload = workloads.length ? Math.min(...workloads) : 0;
  if (doctorStats.length > 1 && maxWorkload - minWorkload >= 2) {
    recommendations.push({
      icon: 'Users',
      tone: 'violet',
      title: 'Tinjau distribusi jadwal dokter',
      description: `Selisih beban tertinggi dan terendah hari ini adalah ${maxWorkload - minWorkload} appointment.`
    });
  }

  if (historicalResolved >= 5 && cancellationRate >= 15) {
    recommendations.push({
      icon: 'MessageSquareText',
      tone: 'rose',
      title: 'Perkuat pengingat appointment',
      description: `${cancellationRate}% appointment historis yang selesai diproses berakhir cancelled atau no-show.`
    });
  }

  if (historicalPeak.hour != null) {
    const endHour = (historicalPeak.hour + 1) % 24;
    recommendations.push({
      icon: 'Clock3',
      tone: 'blue',
      title: `Tinjau kapasitas pukul ${String(historicalPeak.hour).padStart(2, '0')}:00`,
      description: `Jam ini paling sering terisi pada ${historicalPeak.sampleSize} appointment historis yang tersedia.`
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      icon: 'BadgeCheck',
      tone: 'slate',
      title: 'Tidak ada tindak lanjut operasional mendesak',
      description: 'Status appointment pada tanggal ini sudah tertata berdasarkan data yang tersedia.'
    });
  }

  return recommendations.slice(0, 4);
}

export function buildScheduleAnalytics({ appointments = [], doctors = [], selectedDate = new Date() } = {}) {
  const selectedStart = startOfDay(selectedDate);
  const selectedEnd = new Date(selectedStart.getTime() + DAY_MS);
  const previousStart = new Date(selectedStart.getTime() - DAY_MS);
  const weekStart = new Date(selectedStart.getTime() - (7 * DAY_MS));
  const priorWeekStart = new Date(selectedStart.getTime() - (14 * DAY_MS));

  const validAppointments = appointments.filter((appointment) => asDate(appointment?.start));
  const selectedAppointments = validAppointments.filter((appointment) => (
    isWithin(asDate(appointment.start), selectedStart, selectedEnd)
  ));
  const previousDayAppointments = validAppointments.filter((appointment) => (
    isWithin(asDate(appointment.start), previousStart, selectedStart)
  ));
  const historicalAppointments = validAppointments.filter((appointment) => (
    asDate(appointment.start) < selectedStart
  ));

  const stats = countByStatus(selectedAppointments);
  const previousDayTotal = previousDayAppointments.length;
  const dayChange = previousDayTotal > 0
    ? Math.round(((stats.total - previousDayTotal) / previousDayTotal) * 100)
    : null;

  const doctorStats = doctors.map((doctor) => {
    const assigned = selectedAppointments.filter((appointment) => sameId(appointment.provider?.id, doctor.id));
    const bookedMinutes = assigned
      .filter((appointment) => !OCCUPANCY_EXCLUDED_STATUSES.has(appointment.status))
      .reduce((sum, appointment) => sum + durationMinutes(appointment), 0);
    return {
      ...doctor,
      appointmentCount: assigned.length,
      confirmedCount: assigned.filter((appointment) => appointment.status === 'confirmed').length,
      completedCount: assigned.filter((appointment) => appointment.status === 'completed').length,
      bookedMinutes
    };
  }).sort((left, right) => {
    if (right.appointmentCount !== left.appointmentCount) return right.appointmentCount - left.appointmentCount;
    return String(left.name || '').localeCompare(String(right.name || ''));
  });

  const activeSelected = selectedAppointments.filter(
    (appointment) => !OCCUPANCY_EXCLUDED_STATUSES.has(appointment.status)
  );
  const bookedMinutes = activeSelected.reduce((sum, appointment) => sum + durationMinutes(appointment), 0);
  const appointmentsWithDuration = activeSelected.filter((appointment) => durationMinutes(appointment) > 0);
  const averageDuration = appointmentsWithDuration.length
    ? Math.round(bookedMinutes / appointmentsWithDuration.length)
    : null;

  const hourlyDistribution = Object.entries(activeSelected.reduce((accumulator, appointment) => {
    const hour = asDate(appointment.start).getHours();
    accumulator[hour] = (accumulator[hour] || 0) + 1;
    return accumulator;
  }, {}))
    .map(([hour, count]) => ({ hour: Number(hour), count }))
    .sort((left, right) => left.hour - right.hour);

  const historicalPeak = buildHistoricalPeak(historicalAppointments);
  const historicalAttendanceCandidates = historicalAppointments.filter(
    (appointment) => ['completed', 'no-show'].includes(appointment.status)
  );
  const historicalResolved = historicalAppointments.filter(
    (appointment) => ['completed', 'cancelled', 'no-show'].includes(appointment.status)
  );
  const attendanceRate = percent(
    historicalAttendanceCandidates.filter((appointment) => appointment.status === 'completed').length,
    historicalAttendanceCandidates.length
  );
  const cancellationRate = percent(
    historicalResolved.filter((appointment) => ['cancelled', 'no-show'].includes(appointment.status)).length,
    historicalResolved.length
  );

  const waits = historicalAppointments
    .map(appointmentWaitMinutes)
    .filter((wait) => wait != null);
  const averageWait = waits.length
    ? Math.round(waits.reduce((sum, wait) => sum + wait, 0) / waits.length)
    : null;

  const selectedRevenue = selectedAppointments.reduce((sum, appointment) => sum + paymentAmount(appointment), 0);
  const currentWeekRevenue = validAppointments
    .filter((appointment) => isWithin(asDate(appointment.start), weekStart, selectedStart))
    .reduce((sum, appointment) => sum + paymentAmount(appointment), 0);
  const priorWeekRevenue = validAppointments
    .filter((appointment) => isWithin(asDate(appointment.start), priorWeekStart, weekStart))
    .reduce((sum, appointment) => sum + paymentAmount(appointment), 0);
  const revenueChange = priorWeekRevenue > 0
    ? Math.round(((currentWeekRevenue - priorWeekRevenue) / priorWeekRevenue) * 100)
    : null;

  const recommendations = buildRecommendations({
    stats,
    doctorStats,
    historicalPeak,
    historicalResolved: historicalResolved.length,
    cancellationRate
  });

  return {
    selectedAppointments,
    stats,
    previousDayTotal,
    dayChange,
    doctorStats,
    hourlyDistribution,
    bookedMinutes,
    averageDuration,
    historicalPeak,
    attendanceRate,
    attendanceSampleSize: historicalAttendanceCandidates.length,
    cancellationRate,
    resolvedSampleSize: historicalResolved.length,
    averageWait,
    waitSampleSize: waits.length,
    selectedRevenue,
    currentWeekRevenue,
    priorWeekRevenue,
    revenueChange,
    recommendations
  };
}
