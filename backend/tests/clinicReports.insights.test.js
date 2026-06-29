import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildComplianceReport,
  buildMarketingReport,
  emptyReviewSummary
} from '../src/services/clinicReportInsights.js';

test('compliance report always returns the frontend contract with real consent counts', () => {
  const { compliance, availability } = buildComplianceReport({
    appointments: [
      { id: 1n, preSessionHealthForm: { id: 10n } },
      { id: 2n, preSessionHealthForm: null }
    ],
    staff: [{ isActive: true }, { isActive: false }],
    optionalSourceStatus: { securityEvents: false, backupHealth: false, checklist: false }
  });

  assert.equal(compliance.totalConsents, 1);
  assert.equal(compliance.missingConsents, 1);
  assert.equal(compliance.consentRate, 50);
  assert.equal(compliance.activeStaffWithAccess, 1);
  assert.equal(compliance.backupStatus, 'warning');
  assert.ok(availability.missingSources.includes('security_events'));
});

test('marketing report calculates new and returning patients from appointment history', () => {
  const { marketing } = buildMarketingReport({
    appointments: [
      { patientId: 1n, startsAt: new Date('2026-06-10T01:00:00Z'), metadata: { referralSource: 'Google' } },
      { patientId: 2n, startsAt: new Date('2026-06-11T01:00:00Z'), metadata: { referral_source: 'Halodoc' } }
    ],
    appointmentHistory: [
      { patientId: 1n, startsAt: new Date('2026-05-01T01:00:00Z') },
      { patientId: 1n, startsAt: new Date('2026-06-10T01:00:00Z') },
      { patientId: 2n, startsAt: new Date('2026-06-11T01:00:00Z') }
    ],
    periodStart: new Date('2026-06-01T00:00:00Z')
  });

  assert.equal(marketing.newPatients, 1);
  assert.equal(marketing.returningPatients, 1);
  assert.equal(marketing.retentionRate, 50);
  assert.deepEqual(marketing.referralSources, [{ source: 'Halodoc', count: 1, percentage: 100 }]);
});

test('empty review summary returns all five star buckets', () => {
  assert.deepEqual(emptyReviewSummary().breakdown.map(row => row.stars), [5, 4, 3, 2, 1]);
});
