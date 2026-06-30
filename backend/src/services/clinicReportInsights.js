const REVIEW_STARS = [5, 4, 3, 2, 1];

function asNumber(value) {
  return Number(value) || 0;
}

function asId(value) {
  return value == null ? null : value.toString();
}

function dateOnly(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : null;
}

function safeDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sqlDate(value) {
  return safeDate(value)?.toISOString() || new Date(0).toISOString();
}

function referralFromMetadata(metadata = {}) {
  if (!metadata || typeof metadata !== 'object') return null;
  return metadata.referralSource
    || metadata.referral_source
    || metadata.source
    || metadata.marketingSource
    || metadata.marketing_source
    || null;
}

function sourceAvailability(sources, missingSources, notes = []) {
  return {
    available: sources.length > 0,
    sources,
    missingSources,
    notes
  };
}

export function buildComplianceReport({ appointments = [], staff = [], securityMetrics = null, backupMetrics = null, checklistItems = [], optionalSourceStatus = {} }) {
  const totalAppointments = appointments.length;
  const submittedHealthForms = appointments.filter(appointment => Boolean(appointment.preSessionHealthForm)).length;
  const missingHealthForms = Math.max(0, totalAppointments - submittedHealthForms);
  const healthFormRate = totalAppointments ? Number(((submittedHealthForms / totalAppointments) * 100).toFixed(1)) : 0;
  const activeStaffWithAccess = staff.filter(member => member.isActive).length;

  const sources = ['appointment_pre_session_health_forms', 'clinic_staff'];
  const missingSources = [];
  const notes = [
    'Kelengkapan formulir kesehatan dihitung dari appointment_pre_session_health_forms; ini bukan informed consent.',
    'Akses aktif dihitung dari clinic_staff.is_active.'
  ];

  if (optionalSourceStatus.securityEvents) {
    sources.push('security_events');
  } else {
    missingSources.push('security_events');
    notes.push('Tabel security_events belum tersedia; failed login dan insiden keamanan dikembalikan 0.');
  }
  if (optionalSourceStatus.backupHealth) {
    sources.push('clinic_backup_health');
  } else {
    missingSources.push('clinic_backup_health');
    notes.push('Tabel clinic_backup_health belum tersedia; status backup default warning.');
  }
  if (optionalSourceStatus.checklist) {
    sources.push('clinic_compliance_checklist_items');
  } else {
    missingSources.push('clinic_compliance_checklist_items');
    notes.push('Tabel checklist kepatuhan belum tersedia; checklist dikembalikan kosong.');
  }

  return {
    compliance: {
      healthFormRate,
      submittedHealthForms,
      missingHealthForms,
      // Backward-compatible aliases. Consumers should migrate to the health-form fields above.
      consentRate: healthFormRate,
      totalConsents: submittedHealthForms,
      missingConsents: missingHealthForms,
      metricSource: 'appointment_pre_session_health_forms',
      backupStatus: backupMetrics?.backupStatus || 'warning',
      lastBackupAt: backupMetrics?.lastBackupAt || null,
      backupSuccessRate: asNumber(backupMetrics?.backupSuccessRate),
      securityIncidents: asNumber(securityMetrics?.securityIncidents),
      failedLogins: asNumber(securityMetrics?.failedLogins),
      activeStaffWithAccess,
      checklistItems: checklistItems.map(item => ({
        id: asId(item.id) || item.key || item.label,
        label: item.label || item.key || 'Kontrol kepatuhan',
        done: Boolean(item.done),
        dueDate: dateOnly(item.dueDate || item.due_date)
      }))
    },
    availability: sourceAvailability(sources, missingSources, notes)
  };
}

export function buildMarketingReport({ appointments = [], appointmentHistory = [], periodStart = null, attributionByPatient = new Map(), reviewSummary = null, campaignPerformance = [], optionalSourceStatus = {} }) {
  const periodPatientIds = [...new Set(appointments.map(appointment => asId(appointment.patientId)).filter(Boolean))];
  const firstSeenByPatient = new Map();

  for (const appointment of appointmentHistory) {
    const patientId = asId(appointment.patientId);
    const startsAt = safeDate(appointment.startsAt);
    if (!patientId || !startsAt) continue;
    const current = firstSeenByPatient.get(patientId);
    if (!current || startsAt < current) firstSeenByPatient.set(patientId, startsAt);
  }

  const periodStarts = appointments
    .map(appointment => safeDate(appointment.startsAt))
    .filter(Boolean)
    .sort((left, right) => left - right);
  const effectivePeriodStart = safeDate(periodStart) || periodStarts[0] || null;
  const newPatientIds = [];
  const returningPatientIds = [];

  for (const patientId of periodPatientIds) {
    const firstSeen = firstSeenByPatient.get(patientId);
    if (effectivePeriodStart && firstSeen && firstSeen < effectivePeriodStart) returningPatientIds.push(patientId);
    else newPatientIds.push(patientId);
  }

  const referralCounts = new Map();
  const appointmentByPatient = new Map();
  for (const appointment of appointments) {
    const patientId = asId(appointment.patientId);
    if (patientId && !appointmentByPatient.has(patientId)) appointmentByPatient.set(patientId, appointment);
  }

  for (const patientId of newPatientIds) {
    const source = attributionByPatient.get(patientId) || referralFromMetadata(appointmentByPatient.get(patientId)?.metadata);
    if (!source) continue;
    referralCounts.set(source, (referralCounts.get(source) || 0) + 1);
  }

  const referralTotal = [...referralCounts.values()].reduce((sum, count) => sum + count, 0);
  const referralSources = [...referralCounts.entries()]
    .map(([source, count]) => ({
      source,
      count,
      percentage: referralTotal ? Number(((count / referralTotal) * 100).toFixed(1)) : 0
    }))
    .sort((left, right) => right.count - left.count || left.source.localeCompare(right.source));

  const returningPatients = returningPatientIds.length;
  const newPatients = newPatientIds.length;
  const retentionDenominator = newPatients + returningPatients;

  const sources = ['appointments'];
  const missingSources = [];
  const notes = ['Pasien baru/kembali dihitung dari histori appointments klinik.'];
  if (referralSources.length > 0) {
    sources.push(attributionByPatient.size ? 'clinic_patient_attributions' : 'appointments.metadata');
  } else if (optionalSourceStatus.attributions) {
    sources.push('clinic_patient_attributions');
    notes.push('Tabel attribution tersedia, tetapi belum ada attribution untuk pasien baru pada periode ini.');
  } else {
    missingSources.push('clinic_patient_attributions');
    notes.push('Referral source belum tersedia di clinic_patient_attributions atau appointments.metadata.');
  }

  if (optionalSourceStatus.reviews) sources.push('clinic_reviews');
  else missingSources.push('clinic_reviews');
  if (optionalSourceStatus.campaigns) sources.push('clinic_campaign_metrics');
  else missingSources.push('clinic_campaign_metrics');

  return {
    marketing: {
      newPatients,
      returningPatients,
      retentionRate: retentionDenominator ? Number(((returningPatients / retentionDenominator) * 100).toFixed(1)) : 0,
      referralSources,
      reviewSummary: reviewSummary || emptyReviewSummary(),
      campaignPerformance: campaignPerformance.map(campaign => ({
        name: campaign.name || 'Campaign tanpa nama',
        reach: asNumber(campaign.reach),
        conversions: asNumber(campaign.conversions),
        cost: asNumber(campaign.cost)
      }))
    },
    availability: sourceAvailability(sources, missingSources, notes)
  };
}

export function emptyReviewSummary() {
  return {
    averageRating: null,
    totalReviews: 0,
    breakdown: REVIEW_STARS.map(stars => ({ stars, count: 0 }))
  };
}

async function tableExists(db, tableName) {
  const rows = await db.$queryRawUnsafe(`SELECT to_regclass('public.${tableName}') IS NOT NULL AS exists`);
  return Boolean(rows?.[0]?.exists);
}

export async function fetchOptionalReportSources({ db, clinicProfileId, branchId = null, start, end, newPatientIds = [] }) {
  const clinicId = clinicProfileId.toString();
  const startIso = sqlDate(start);
  const endIso = sqlDate(end);
  const startDate = startIso.slice(0, 10);
  const endDate = endIso.slice(0, 10);
  const branchCondition = branchId ? `AND branch_id = ${branchId.toString()}` : '';

  const [
    hasSecurityEvents,
    hasBackupHealth,
    hasChecklist,
    hasAttributions,
    hasReviews,
    hasCampaigns
  ] = await Promise.all([
    tableExists(db, 'security_events'),
    tableExists(db, 'clinic_backup_health'),
    tableExists(db, 'clinic_compliance_checklist_items'),
    tableExists(db, 'clinic_patient_attributions'),
    tableExists(db, 'clinic_reviews'),
    tableExists(db, 'clinic_campaign_metrics')
  ]);

  const securityMetrics = hasSecurityEvents
    ? await fetchSecurityMetrics(db, clinicId, startIso, endIso)
    : null;
  const backupMetrics = hasBackupHealth
    ? await fetchBackupMetrics(db, clinicId, endIso)
    : null;
  const checklistItems = hasChecklist
    ? await fetchChecklistItems(db, clinicId, startDate, endDate)
    : [];
  const attributionByPatient = hasAttributions
    ? await fetchAttributions(db, clinicId, newPatientIds)
    : new Map();
  const reviewSummary = hasReviews
    ? await fetchReviewSummary(db, clinicId, startIso, endIso, branchCondition)
    : emptyReviewSummary();
  const campaignPerformance = hasCampaigns
    ? await fetchCampaignPerformance(db, clinicId, startDate, endDate)
    : [];

  return {
    securityMetrics,
    backupMetrics,
    checklistItems,
    attributionByPatient,
    reviewSummary,
    campaignPerformance,
    optionalSourceStatus: {
      securityEvents: hasSecurityEvents,
      backupHealth: hasBackupHealth,
      checklist: hasChecklist,
      attributions: hasAttributions,
      reviews: hasReviews,
      campaigns: hasCampaigns
    }
  };
}

async function fetchSecurityMetrics(db, clinicId, startIso, endIso) {
  const rows = await db.$queryRawUnsafe(`
    SELECT
      COUNT(*) FILTER (WHERE event_type = 'failed_login')::int AS failed_logins,
      COUNT(*) FILTER (
        WHERE severity IN ('medium', 'high', 'critical')
           OR event_type IN ('suspicious_access', 'security_incident', 'incident')
      )::int AS security_incidents
    FROM security_events
    WHERE clinic_profile_id = ${clinicId}
      AND created_at >= '${startIso}'
      AND created_at <= '${endIso}'
  `);
  return {
    failedLogins: asNumber(rows?.[0]?.failed_logins),
    securityIncidents: asNumber(rows?.[0]?.security_incidents)
  };
}

async function fetchBackupMetrics(db, clinicId, endIso) {
  const since = new Date(new Date(endIso).getTime() - 29 * 86400000).toISOString();
  const [latest, totals] = await Promise.all([
    db.$queryRawUnsafe(`
      SELECT status, checked_at
      FROM clinic_backup_health
      WHERE clinic_profile_id = ${clinicId}
      ORDER BY checked_at DESC
      LIMIT 1
    `),
    db.$queryRawUnsafe(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE success = true)::int AS successful
      FROM clinic_backup_health
      WHERE clinic_profile_id = ${clinicId}
        AND checked_at >= '${since}'
        AND checked_at <= '${endIso}'
    `)
  ]);
  const total = asNumber(totals?.[0]?.total);
  const successful = asNumber(totals?.[0]?.successful);
  return {
    backupStatus: latest?.[0]?.status || 'warning',
    lastBackupAt: latest?.[0]?.checked_at?.toISOString?.() || null,
    backupSuccessRate: total ? Number(((successful / total) * 100).toFixed(1)) : 0
  };
}

async function fetchChecklistItems(db, clinicId, startDate, endDate) {
  return db.$queryRawUnsafe(`
    SELECT id, key, label, done, due_date
    FROM clinic_compliance_checklist_items
    WHERE clinic_profile_id = ${clinicId}
      AND (period_start IS NULL OR period_start <= '${endDate}')
      AND (period_end IS NULL OR period_end >= '${startDate}')
    ORDER BY due_date ASC NULLS LAST, created_at ASC
  `);
}

async function fetchAttributions(db, clinicId, patientIds) {
  if (!patientIds.length) return new Map();
  const ids = patientIds.map(id => id.toString()).filter(id => /^\d+$/.test(id));
  if (!ids.length) return new Map();
  const rows = await db.$queryRawUnsafe(`
    SELECT patient_id, source
    FROM clinic_patient_attributions
    WHERE clinic_profile_id = ${clinicId}
      AND patient_id IN (${ids.join(',')})
  `);
  return new Map(rows.map(row => [row.patient_id.toString(), row.source]));
}

async function fetchReviewSummary(db, clinicId, startIso, endIso, branchCondition) {
  const rows = await db.$queryRawUnsafe(`
    SELECT rating::int AS rating, COUNT(*)::int AS count
    FROM clinic_reviews
    WHERE clinic_profile_id = ${clinicId}
      ${branchCondition}
      AND reviewed_at >= '${startIso}'
      AND reviewed_at <= '${endIso}'
    GROUP BY rating
  `);
  const counts = new Map(rows.map(row => [asNumber(row.rating), asNumber(row.count)]));
  const totalReviews = [...counts.values()].reduce((sum, count) => sum + count, 0);
  const ratingTotal = [...counts.entries()].reduce((sum, [rating, count]) => sum + rating * count, 0);
  return {
    averageRating: totalReviews ? Number((ratingTotal / totalReviews).toFixed(1)) : null,
    totalReviews,
    breakdown: REVIEW_STARS.map(stars => ({ stars, count: counts.get(stars) || 0 }))
  };
}

async function fetchCampaignPerformance(db, clinicId, startDate, endDate) {
  const rows = await db.$queryRawUnsafe(`
    SELECT name, reach, conversions, cost
    FROM clinic_campaign_metrics
    WHERE clinic_profile_id = ${clinicId}
      AND period_start <= '${endDate}'
      AND period_end >= '${startDate}'
    ORDER BY period_start DESC, name ASC
  `);
  return rows;
}
