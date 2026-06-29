import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { buildScheduleAnalytics } from '../src/pages/clinic-portal/schedule/scheduleAnalytics.mjs';

const selectedDate = new Date(2026, 5, 29, 12, 0, 0);

function appointment({
  id,
  day = 29,
  hour = 9,
  duration = 30,
  status = 'confirmed',
  dentistId = '10',
  payment = null,
  statusHistory = []
}) {
  return {
    id,
    status,
    provider: { id: dentistId },
    start: new Date(2026, 5, day, hour, 0, 0),
    end: new Date(2026, 5, day, hour, duration, 0),
    payment,
    statusHistory
  };
}

test('schedule analytics derives selected-day status, workload, duration, and paid revenue', () => {
  const result = buildScheduleAnalytics({
    selectedDate,
    doctors: [
      { id: 10, name: 'Dokter A' },
      { id: 11, name: 'Dokter B' }
    ],
    appointments: [
      appointment({
        id: 'a',
        status: 'completed',
        duration: 45,
        payment: { status: 'succeeded', amount: 250000 }
      }),
      appointment({ id: 'b', hour: 10, status: 'pending', duration: 30 }),
      appointment({
        id: 'c',
        hour: 11,
        status: 'cancelled',
        dentistId: '11',
        payment: { status: 'pending', amount: 999999 }
      })
    ]
  });

  assert.deepEqual(result.stats, {
    total: 3,
    confirmed: 0,
    pending: 1,
    completed: 1,
    cancelled: 1,
    noShow: 0,
    overdue: 0,
    inProgress: 0
  });
  assert.equal(result.doctorStats[0].appointmentCount, 2);
  assert.equal(result.doctorStats[0].bookedMinutes, 75);
  assert.equal(result.doctorStats[1].appointmentCount, 1);
  assert.equal(result.bookedMinutes, 75);
  assert.equal(result.averageDuration, 38);
  assert.equal(result.selectedRevenue, 250000);
  assert.match(result.recommendations[0].title, /Konfirmasi 1 appointment/);
});

test('historical metrics require real samples and use status transition timestamps', () => {
  const historical = Array.from({ length: 5 }, (_, index) => appointment({
    id: `history-${index}`,
    day: 20 + index,
    hour: 10,
    status: 'completed',
    statusHistory: [
      { newStatus: 'check-in', createdAt: new Date(2026, 5, 20 + index, 9, 50, 0) },
      { newStatus: 'in-chair', createdAt: new Date(2026, 5, 20 + index, 10, 0, 0) }
    ]
  }));

  const result = buildScheduleAnalytics({
    selectedDate,
    doctors: [{ id: '10', name: 'Dokter A' }],
    appointments: historical
  });

  assert.equal(result.historicalPeak.hour, 10);
  assert.equal(result.historicalPeak.sampleSize, 5);
  assert.equal(result.attendanceRate, 100);
  assert.equal(result.attendanceSampleSize, 5);
  assert.equal(result.averageWait, 10);
  assert.equal(result.waitSampleSize, 5);
});

test('empty schedules expose unavailable metrics instead of fabricated values', () => {
  const result = buildScheduleAnalytics({
    selectedDate,
    doctors: [],
    appointments: []
  });

  assert.equal(result.stats.total, 0);
  assert.equal(result.historicalPeak.hour, null);
  assert.equal(result.averageWait, null);
  assert.equal(result.attendanceRate, null);
  assert.equal(result.revenueChange, null);
  assert.match(result.recommendations[0].title, /Belum ada appointment/);
});

test('schedule UI contains no legacy fabricated analytics', () => {
  const webRoot = path.resolve(new URL('..', import.meta.url).pathname);
  const read = (relativePath) => fs.readFileSync(path.resolve(webRoot, relativePath), 'utf8');
  const statsSource = read('src/pages/clinic-portal/schedule/components/ClinicScheduleStats.jsx');
  const pageSource = read('src/pages/clinic-portal/schedule/index.jsx');
  const runtimeSource = `${statsSource}\n${pageSource}`;

  for (const fabricatedValue of [
    '10:00-12:00',
    'Rp 485M',
    'Low (8%)',
    'X-Ray Room',
    'Add 2 more slots',
    'Reduce bottleneck by 15 minutes'
  ]) {
    assert.equal(runtimeSource.includes(fabricatedValue), false, fabricatedValue);
  }

  assert.match(pageSource, /includeHistory:\s*true/);
  assert.match(pageSource, /limit:\s*500/);
  assert.match(pageSource, /statusHistory:/);
  assert.match(pageSource, /payment:/);
});

