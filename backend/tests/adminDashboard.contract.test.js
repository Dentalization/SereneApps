import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const serverSource = fs.readFileSync(new URL('../src/server.js', import.meta.url), 'utf8');
const dashboardSource = fs.readFileSync(new URL('../src/routes/admin-dashboard.js', import.meta.url), 'utf8');
const adminSource = fs.readFileSync(new URL('../src/routes/admin.js', import.meta.url), 'utf8');

test('admin dashboard router is mounted before generic admin router', () => {
  const dashboardIndex = serverSource.indexOf('app.use(`${prefix}/admin/dashboard`, adminDashboardRouter)');
  const genericAdminIndex = serverSource.indexOf('app.use(`${prefix}/admin`, adminRouter)');

  assert.notEqual(dashboardIndex, -1);
  assert.notEqual(genericAdminIndex, -1);
  assert.ok(dashboardIndex < genericAdminIndex);
});

test('admin dashboard metrics use real Prisma schema fields', () => {
  assert.equal(dashboardSource.includes('verificationStatus'), false);
  assert.equal(dashboardSource.includes('apt.clinic?.brandName'), false);
  assert.match(dashboardSource, /status:\s*'verified'/);
  assert.match(dashboardSource, /clinicBranch/);
  assert.match(dashboardSource, /ownerClinic/);
});

test('admin dentist API does not send generated professional-network metrics', () => {
  const randomMetrics = [
    /rating:\s*4\.5\s*\+\s*Math\.random/,
    /totalReviews:\s*Math\.floor\(Math\.random/,
    /patientsServed:\s*Math\.floor\(Math\.random/,
    /networkConnections:\s*Math\.floor\(Math\.random/,
    /referralsMade:\s*Math\.floor\(Math\.random/,
    /referralsReceived:\s*Math\.floor\(Math\.random/,
  ];

  for (const pattern of randomMetrics) {
    assert.equal(pattern.test(adminSource), false, String(pattern));
  }
});
