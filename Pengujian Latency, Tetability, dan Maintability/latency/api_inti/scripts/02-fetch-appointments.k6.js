import http from 'k6/http';
import { check, fail, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { API_URL, PATIENT_EMAIL, PATIENT_PASSWORD, login, extractAccessToken, jsonHeaders, recordResult } from './utils.js';

export const options = {
  scenarios: {
    fetch_appointments: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 10),
      duration: __ENV.DURATION || '3m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    list_appointment_failed: ['rate<0.01'],
    list_appointment_response_time: ['p(95)<2000'],
  },
};

const listAppointmentTrend = new Trend('list_appointment_response_time');
const listAppointmentFailed = new Rate('list_appointment_failed');
const listAppointmentRequests = new Counter('list_appointment_requests');

export function setup() {
  const patientLogin = login(PATIENT_EMAIL, PATIENT_PASSWORD, 'setup patient login');
  const patientToken = extractAccessToken(patientLogin);
  if (!patientToken) {
    fail(`Setup gagal: token pasien tidak ditemukan. Status login pasien: ${patientLogin.status}`);
  }
  return { patientToken };
}

export default function (data) {
  const headers = jsonHeaders(data.patientToken);
  const res = http.get(`${API_URL}/appointments?view=patient&limit=50&order=desc`, {
    headers: headers,
    tags: { name: 'GET /appointments', feature: 'list_appointment' },
  });

  recordResult({
    res,
    trend: listAppointmentTrend,
    failedRate: listAppointmentFailed,
    counter: listAppointmentRequests,
    validStatuses: [200],
    checkName: 'list appointment status 200',
    underName: 'list appointment under 2s',
  });
  sleep(1);
}

export function handleSummary(data) {
  const summaryFile = __ENV.SUMMARY_FILE || 'tests/latency/results/02-fetch-appointments-summary.json';
  return {
    [summaryFile]: JSON.stringify(data, null, 2),
  };
}
