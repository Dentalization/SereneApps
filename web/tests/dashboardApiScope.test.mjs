import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.resolve(root, file), 'utf8');

test('dentist dashboard loads appointments, profile, continuity data, and clinical widgets from API services', () => {
  const dashboard = read('src/pages/dentist-portal/home/index.jsx');
  const dentistService = read('src/services/dentistPortalService.js');
  const appointmentService = read('src/services/appointmentService.js');

  assert.match(dashboard, /fetchAppointments/);
  assert.match(dashboard, /getDentistDashboardContinuity/);
  assert.match(dashboard, /getDentistProfileApi/);
  assert.match(dashboard, /KpiCard/);
  assert.match(dashboard, /ScheduleWidget/);
  assert.match(dashboard, /TreatmentPlanCard/);
  assert.match(dentistService, /\/dentist-portal\/dashboard\/continuity/);
  assert.match(dentistService, /\/dentist-portal\/patients/);
  assert.match(appointmentService, /authHttp\.get\('\/appointments'/);
});

test('clinic dashboard loads appointment and financial API data for clinic operations', () => {
  const dashboard = read('src/pages/clinic-portal/home/index.jsx');
  const clinicService = read('src/services/clinicService.js');
  const staffService = read('src/services/staffService.js');

  assert.match(dashboard, /fetchAppointments/);
  assert.match(dashboard, /view:\s*'clinic'/);
  assert.match(dashboard, /authHttp\.get\('\/financials\/clinic\/history'\)/);
  assert.match(dashboard, /todayStats/);
  assert.match(dashboard, /recentActivities/);
  assert.match(dashboard, /dentistLoadData/);
  assert.match(clinicService, /getClinicPatients/);
  assert.match(clinicService, /getClinicStaffList/);
  assert.match(staffService, /authHttp\.get\(`\$\{API_BASE\}\/staff`\)/);
});

test('admin dashboard loads platform metrics, revenue trends, user growth, and map/chart views', () => {
  const dashboard = read('src/pages/admin-portal/home/index.jsx');
  const routes = read('src/Routes.jsx');

  assert.match(dashboard, /authHttp\.get\('\/admin\/dashboard\/metrics'\)/);
  assert.match(dashboard, /authHttp\.get\('\/admin\/dashboard\/revenue-trends'\)/);
  assert.match(dashboard, /authHttp\.get\('\/admin\/dashboard\/user-growth'\)/);
  assert.match(dashboard, /ClinicMap/);
  assert.match(dashboard, /LineChart/);
  assert.match(dashboard, /BarChart/);
  assert.match(routes, /admin-portal/);
  assert.match(routes, /ProtectedRoute/);
});

test('authenticated web HTTP client injects bearer tokens and refreshes API sessions', () => {
  const httpClient = read('src/utils/httpClient.js');
  const tokenStorage = read('src/utils/auth/tokenStorage.js');

  assert.match(httpClient, /authHttp\.interceptors\.request\.use/);
  assert.match(httpClient, /headers\.Authorization = `Bearer \$\{token\}`/);
  assert.match(httpClient, /\/refresh/);
  assert.match(httpClient, /setTokens/);
  assert.match(httpClient, /forceLogout/);
  assert.match(tokenStorage, /getAccessToken/);
  assert.match(tokenStorage, /getRefreshToken/);
});
