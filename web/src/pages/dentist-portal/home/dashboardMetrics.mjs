const PAID_STATUSES = new Set(['paid', 'settled', 'succeeded', 'completed']);
const CLOSED_PLAN_STATUSES = new Set(['COMPLETED', 'CANCELLED', 'REJECTED']);
const FOLLOW_UP_STATUSES = new Set(['overdue', 'no-show', 'no_show']);

function jakartaParts(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    key: `${values.year}-${values.month}-${values.day}`
  };
}

function paidAmount(appointment) {
  const payment = appointment?.payment;
  if (!payment || !PAID_STATUSES.has(String(payment.status || '').toLowerCase())) return 0;
  const amount = Number(payment.amount);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function collectionDate(appointment) {
  return appointment?.payment?.createdAt
    || appointment?.payment?.updatedAt
    || appointment?.startsAt
    || appointment?.starts_at;
}

function durationMinutes(appointment) {
  const start = new Date(appointment?.startsAt || appointment?.starts_at);
  const end = new Date(appointment?.endsAt || appointment?.ends_at);
  const duration = (end.getTime() - start.getTime()) / 60000;
  return Number.isFinite(duration) && duration > 0 ? duration : null;
}

function resolvePlanInvoice(plan) {
  return plan?.invoice || plan?.invoices?.[0] || null;
}

function isPaidInvoice(invoice) {
  if (!invoice) return false;
  return PAID_STATUSES.has(String(invoice.paymentStatus || invoice.status || '').toLowerCase());
}

function buildClaimMetrics(treatmentPlans, now) {
  const invoices = treatmentPlans.map(resolvePlanInvoice).filter(Boolean);
  const outstanding = invoices.filter((invoice) => (
    !isPaidInvoice(invoice)
    && !['cancelled', 'refunded'].includes(String(invoice.status || '').toLowerCase())
  ));
  const aging = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  let totalDays = 0;

  outstanding.forEach((invoice) => {
    const issuedAt = new Date(invoice.issuedAt || invoice.createdAt);
    const days = Number.isNaN(issuedAt.getTime())
      ? 0
      : Math.max(0, Math.floor((now.getTime() - issuedAt.getTime()) / 86400000));
    totalDays += days;
    if (days <= 30) aging['0-30'] += 1;
    else if (days <= 60) aging['31-60'] += 1;
    else if (days <= 90) aging['61-90'] += 1;
    else aging['90+'] += 1;
  });

  return {
    outstanding: outstanding.length,
    avgDays: outstanding.length ? Math.round(totalDays / outstanding.length) : 0,
    aging
  };
}

function buildDailySeries(monthAppointments, now) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getTime() - ((6 - index) * 86400000));
    return jakartaParts(date)?.key;
  });

  const production = days.map((key) => monthAppointments
    .filter((appointment) => jakartaParts(appointment.startsAt || appointment.starts_at)?.key === key)
    .reduce((sum, appointment) => {
      const fee = Number(appointment.fee);
      return sum + (Number.isFinite(fee) && fee > 0 ? fee : 0);
    }, 0));
  const collections = days.map((key) => monthAppointments
    .filter((appointment) => jakartaParts(collectionDate(appointment))?.key === key)
    .reduce((sum, appointment) => sum + paidAmount(appointment), 0));

  return { production, collections };
}

export function buildDentistDashboardMetrics({
  appointments = [],
  patients = [],
  treatmentPlans = [],
  now = new Date(),
  workingMinutes = null
} = {}) {
  const nowParts = jakartaParts(now);
  const validAppointments = appointments.filter((appointment) => (
    jakartaParts(appointment.startsAt || appointment.starts_at)
  ));
  const monthAppointments = validAppointments.filter((appointment) => {
    const parts = jakartaParts(appointment.startsAt || appointment.starts_at);
    return parts.year === nowParts.year && parts.month === nowParts.month;
  });
  const todayAppointments = monthAppointments.filter((appointment) => (
    jakartaParts(appointment.startsAt || appointment.starts_at)?.key === nowParts.key
  ));
  const monthCollectionsAppointments = validAppointments.filter((appointment) => {
    const parts = jakartaParts(collectionDate(appointment));
    return parts.year === nowParts.year && parts.month === nowParts.month;
  });
  const todayCollectionsAppointments = monthCollectionsAppointments.filter((appointment) => (
    jakartaParts(collectionDate(appointment))?.key === nowParts.key
  ));
  const completed = monthAppointments.filter((appointment) => appointment.status === 'completed');
  const cancelled = monthAppointments.filter((appointment) => appointment.status === 'cancelled');
  const noShows = monthAppointments.filter((appointment) => FOLLOW_UP_STATUSES.has(appointment.status));
  const resolvedCount = completed.length + cancelled.length;
  const pastCount = resolvedCount + noShows.length;
  const completedDurations = completed.map(durationMinutes).filter(Number.isFinite);
  const todayBookedMinutes = todayAppointments.map(durationMinutes).filter(Number.isFinite)
    .reduce((sum, duration) => sum + duration, 0);

  const followUps = monthAppointments
    .filter((appointment) => FOLLOW_UP_STATUSES.has(appointment.status))
    .sort((a, b) => new Date(b.startsAt || b.starts_at) - new Date(a.startsAt || a.starts_at));
  const risks = followUps.slice(0, 3).map((appointment) => ({
    patient: appointment.patient?.name || 'Pasien',
    status: appointment.status,
    statusLabel: ['no-show', 'no_show'].includes(appointment.status) ? 'No-show' : 'Overdue',
    reason: `${appointment.status === 'overdue' ? 'Kunjungan lewat' : 'Tidak hadir'} - ${appointment.reason || 'Konsultasi'}`
  }));
  const recalls = followUps.slice(0, 4).map((appointment) => ({
    id: appointment.id,
    type: 'missed-appointment',
    patient: appointment.patient?.name || 'Pasien',
    dueDate: appointment.startsAt || appointment.starts_at,
    treatment: appointment.reason || 'Konsultasi',
    priority: ['no-show', 'no_show'].includes(appointment.status) ? 'urgent' : 'high'
  }));

  const pipelineItems = treatmentPlans
    .filter((plan) => !CLOSED_PLAN_STATUSES.has(String(plan.status || '').toUpperCase()))
    .slice(0, 3)
    .map((plan) => ({
      patient: plan.patient?.name || 'Pasien',
      treatment: plan.title || 'Rencana perawatan',
      value: Number(plan.estimatedTotal || plan.estimatedCost || 0)
    }));

  return {
    todayAppointments,
    monthAppointments,
    todayCollections: todayCollectionsAppointments.reduce((sum, appointment) => sum + paidAmount(appointment), 0),
    monthCollections: monthCollectionsAppointments.reduce((sum, appointment) => sum + paidAmount(appointment), 0),
    totalPatients: patients.length,
    activePatients: patients.filter((patient) => ['active', 'new'].includes(patient.status)).length,
    walkInPatients: patients.filter((patient) => patient.source === 'clinic_walk_in').length,
    mobilePatients: patients.filter((patient) => patient.source === 'serene_mobile').length,
    treatmentSuccessRate: resolvedCount ? (completed.length / resolvedCount) * 100 : null,
    noShowRate: pastCount ? (noShows.length / pastCount) * 100 : null,
    averageTreatmentMinutes: completedDurations.length
      ? Math.round(completedDurations.reduce((sum, duration) => sum + duration, 0) / completedDurations.length)
      : null,
    chairUtilization: Number.isFinite(workingMinutes) && workingMinutes > 0
      ? Math.min(100, Math.round((todayBookedMinutes / workingMinutes) * 100))
      : null,
    risks,
    recalls,
    pipelineItems,
    claims: buildClaimMetrics(treatmentPlans, now),
    financeSeries: buildDailySeries(monthAppointments, now)
  };
}
