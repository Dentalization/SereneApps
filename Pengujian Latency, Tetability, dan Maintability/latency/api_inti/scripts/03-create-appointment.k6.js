import http from 'k6/http';
import { check, fail, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import {
  API_URL,
  PATIENT_EMAIL,
  PATIENT_PASSWORD,
  DENTIST_PROFILE_ID,
  CLINIC_BRANCH_ID,
  login,
  extractAccessToken,
  jsonHeaders,
  buildAppointmentPayload,
  recordResult,
  sanitizeSummary
} from './utils.js';

export const options = {
  scenarios: {
    create_appointment: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 10),
      duration: __ENV.DURATION || '3m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    create_appointment_failed: ['rate<0.01'],
    create_appointment_response_time: ['p(95)<2000'],
  },
};

const createAppointmentTrend = new Trend('create_appointment_response_time');
const createAppointmentFailed = new Rate('create_appointment_failed');
const createAppointmentRequests = new Counter('create_appointment_requests');

export function setup() {
  const patientLogin = login(PATIENT_EMAIL, PATIENT_PASSWORD, 'setup patient login');
  const patientToken = extractAccessToken(patientLogin);
  if (!patientToken) {
    fail(`Setup gagal: token pasien tidak ditemukan. Status login pasien: ${patientLogin.status}`);
  }
  const runSeed = Math.floor(Date.now() / 1000) % 100000;
  return {
    patientToken,
    dentistProfileId: DENTIST_PROFILE_ID,
    clinicBranchId: CLINIC_BRANCH_ID,
    runSeed,
  };
}

export default function (data) {
  const headers = jsonHeaders(data.patientToken);
  const payload = buildAppointmentPayload({
    dentistProfileId: data.dentistProfileId,
    clinicBranchId: data.clinicBranchId,
    runSeed: data.runSeed,
    vu: __VU,
    iter: __ITER,
    reason: 'Nyeri gigi untuk pengujian latency',
  });

  const res = http.post(`${API_URL}/appointments`, JSON.stringify(payload), {
    headers: headers,
    tags: { name: 'POST /appointments', feature: 'create_appointment' },
  });

  recordResult({
    res,
    trend: createAppointmentTrend,
    failedRate: createAppointmentFailed,
    counter: createAppointmentRequests,
    validStatuses: [201, 409],
    checkName: 'create appointment valid response',
    underName: 'create appointment under 2s',
  });
  sleep(1);
}

export function handleSummary(data) {
  const summaryFile = __ENV.SUMMARY_FILE || 'tests/latency/results/03-create-appointment-summary.json';
  return {
    [summaryFile]: JSON.stringify(sanitizeSummary(data), null, 2),
  };
}
