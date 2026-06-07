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
  authOnlyHeaders,
  recordResult
} from './utils.js';

const SAMPLE_IMAGE_PATH = __ENV.SAMPLE_IMAGE_PATH || '../fixtures/sample-dental.jpg';
const sampleImage = open(SAMPLE_IMAGE_PATH, 'b');

export const options = {
  scenarios: {
    upload_attachment: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 10),
      duration: __ENV.DURATION || '3m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    upload_image_failed: ['rate<0.01'],
    upload_image_response_time: ['p(95)<2000'],
  },
};

const uploadImageTrend = new Trend('upload_image_response_time');
const uploadImageFailed = new Rate('upload_image_failed');
const uploadImageRequests = new Counter('upload_image_requests');

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
  const formData = {
    file: http.file(sampleImage, `sample-dental-vu${__VU}-iter${__ITER}.jpg`, 'image/jpeg'),
  };

  const res = http.post(
    `${API_URL}/communications/appointments/${data.appointmentId}/chat/attachments`,
    formData,
    {
      headers: authOnlyHeaders(data.patientToken),
      tags: { name: 'POST /communications/appointments/:id/chat/attachments', feature: 'upload_image' },
    }
  );

  recordResult({
    res,
    trend: uploadImageTrend,
    failedRate: uploadImageFailed,
    counter: uploadImageRequests,
    validStatuses: [201],
    checkName: 'upload image accepted',
    underName: 'upload initial response under 2s',
  });
  sleep(1);
}

export function handleSummary(data) {
  const summaryFile = __ENV.SUMMARY_FILE || 'tests/latency/results/06-upload-attachment-summary.json';
  return {
    [summaryFile]: JSON.stringify(data, null, 2),
  };
}
