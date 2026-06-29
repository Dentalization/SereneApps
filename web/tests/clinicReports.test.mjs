import test from 'node:test';
import assert from 'node:assert/strict';
import {
  boundedPercent,
  compactNumber,
  reportQuery,
  reportToCsv,
  resolveReportRange,
  sparklineHeightPercent
} from '../src/pages/clinic-portal/reports/reportUtils.mjs';

test('report range uses the selected rolling period', () => {
  const { start, end } = resolveReportRange('last7days', new Date('2026-06-29T12:00:00Z'));
  assert.equal(Math.round((new Date(end) - new Date(start) + 1) / 86400000), 7);
});

test('report query only sends a concrete branch filter', () => {
  assert.equal('branchId' in reportQuery('last30days', 'all', new Date()), false);
  assert.equal(reportQuery('last30days', '42', new Date()).branchId, '42');
});

test('CSV export contains actual leaderboard rows and escapes names', () => {
  const csv = reportToCsv({ people: [{ name: 'Dr. A, Sp.KG', branchName: 'Pusat', appointments: 2, completed: 1, cancelled: 1, noShow: 0, uniquePatients: 2, revenue: 1000 }] });
  assert.match(csv, /"Dr. A, Sp.KG",Pusat,2,1,1,0,2,1000/);
});

test('report UI helpers format compact counts and clamp dynamic bar percentages', () => {
  assert.equal(compactNumber(1200), '1,2 rb');
  assert.equal(boundedPercent(120, 100), 100);
  assert.equal(boundedPercent(-10, 100), 0);
  assert.equal(sparklineHeightPercent(0, 100), 4);
});
