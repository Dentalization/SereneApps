import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDentistDashboardMetrics } from '../src/pages/dentist-portal/home/dashboardMetrics.mjs';

test('dashboard revenue only counts persisted paid payments', () => {
  const metrics = buildDentistDashboardMetrics({
    now: new Date('2026-06-27T12:00:00.000Z'),
    appointments: [
      {
        id: '1',
        startsAt: '2026-06-27T02:00:00.000Z',
        endsAt: '2026-06-27T02:30:00.000Z',
        status: 'completed',
        fee: 500000,
        payment: { status: 'settled', amount: 300000 },
        patient: { id: '10', name: 'Walk-in One' }
      },
      {
        id: '2',
        startsAt: '2026-06-30T03:00:00.000Z',
        endsAt: '2026-06-30T03:30:00.000Z',
        status: 'confirmed',
        fee: 900000,
        payment: {
          status: 'settled',
          amount: 900000,
          createdAt: '2026-06-27T04:00:00.000Z'
        },
        patient: { id: '11', name: 'Unpaid Patient' }
      }
    ],
    patients: [
      { id: '10', source: 'clinic_walk_in', status: 'completed' },
      { id: '11', source: 'serene_mobile', status: 'active' }
    ],
    treatmentPlans: []
  });

  assert.equal(metrics.todayCollections, 1200000);
  assert.equal(metrics.monthCollections, 1200000);
  assert.equal(metrics.totalPatients, 2);
  assert.equal(metrics.walkInPatients, 1);
  assert.equal(metrics.averageTreatmentMinutes, 30);
});

test('dashboard exposes empty metrics instead of invented percentages', () => {
  const metrics = buildDentistDashboardMetrics({
    now: new Date('2026-06-27T12:00:00.000Z'),
    appointments: [],
    patients: [],
    treatmentPlans: []
  });

  assert.equal(metrics.treatmentSuccessRate, null);
  assert.equal(metrics.noShowRate, null);
  assert.equal(metrics.averageTreatmentMinutes, null);
  assert.deepEqual(metrics.risks, []);
  assert.deepEqual(metrics.pipelineItems, []);
});

test('dashboard follow-up rows use persisted appointment patients', () => {
  const metrics = buildDentistDashboardMetrics({
    now: new Date('2026-06-27T12:00:00.000Z'),
    appointments: [{
      id: '3',
      startsAt: '2026-06-26T03:00:00.000Z',
      endsAt: '2026-06-26T03:30:00.000Z',
      status: 'overdue',
      reason: 'Konsultasi Klinik',
      patient: { id: '12', name: 'Mail Sadikin' }
    }],
    patients: [{ id: '12', source: 'clinic_walk_in', status: 'completed' }],
    treatmentPlans: []
  });

  assert.equal(metrics.risks[0].patient, 'Mail Sadikin');
  assert.equal(metrics.recalls[0].patient, 'Mail Sadikin');
});
