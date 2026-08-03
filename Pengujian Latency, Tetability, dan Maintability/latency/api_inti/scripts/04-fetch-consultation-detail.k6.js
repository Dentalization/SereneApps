import http from 'k6/http';
import { check, fail, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import {
  API_URL,
  PATIENT_EMAIL,
  PATIENT_PASSWORD,
  DENTIST_EMAIL,
  DENTIST_PASSWORD,
  FIXTURE_APPOINTMENT_ID,
  login,
  extractAccessToken,
  createConfirmedFixtureAppointment,
  warmUpCommunicationFixture,
  jsonHeaders,
  recordResult,
  sanitizeSummary
} from './utils.js';

export const options = {
  scenarios: {
    fetch_consultation_detail: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 10),
      duration: __ENV.DURATION || '3m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    detail_consultation_failed: ['rate<0.01'],
    detail_consultation_response_time: ['p(95)<2000'],
  },
};

const detailConsultationTrend = new Trend('detail_consultation_response_time');
const detailConsultationFailed = new Rate('detail_consultation_failed');
const detailConsultationRequests = new Counter('detail_consultation_requests');

export function setup() {
  const patientLogin = login(PATIENT_EMAIL, PATIENT_PASSWORD, 'setup patient login');
  const dentistLogin = login(DENTIST_EMAIL, DENTIST_PASSWORD, 'setup dentist login');

  const patientToken = extractAccessToken(patientLogin);
  const dentistToken = extractAccessToken(dentistLogin);

  if (!patientToken) {
    fail(`Setup gagal: token pasien tidak ditemukan. Status login pasien: ${patientLogin.status}`);
  }
  if (!dentistToken) {
    fail(`Setup gagal: token dentist tidak ditemukan. Status login dentist: ${dentistLogin.status}`);
  }

  const runSeed = Math.floor(Date.now() / 1000) % 100000;
  const appointmentId = FIXTURE_APPOINTMENT_ID || createConfirmedFixtureAppointment({
    patientToken,
    dentistToken,
    runSeed,
  });

  warmUpCommunicationFixture({ patientToken, appointmentId });

  return {
    patientToken,
    appointmentId,
  };
}

export default function (data) {
  const headers = jsonHeaders(data.patientToken);
  const res = http.get(`${API_URL}/appointments/${data.appointmentId}`, {
    headers: headers,
    tags: { name: 'GET /appointments/:id', feature: 'detail_consultation' },
  });

  recordResult({
    res,
    trend: detailConsultationTrend,
    failedRate: detailConsultationFailed,
    counter: detailConsultationRequests,
    validStatuses: [200],
    checkName: 'detail consultation status 200',
    underName: 'detail consultation under 2s',
  });
  sleep(1);
}

export function handleSummary(data) {
  const summaryFile = __ENV.SUMMARY_FILE || 'tests/latency/results/04-fetch-consultation-detail-summary.json';
  return {
    [summaryFile]: JSON.stringify(sanitizeSummary(data), null, 2),
  };
}
