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
  recordResult
} from './utils.js';

export const options = {
  scenarios: {
    send_chat_message: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 10),
      duration: __ENV.DURATION || '3m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    send_message_failed: ['rate<0.01'],
    send_message_response_time: ['p(95)<2000'],
  },
};

const sendMessageTrend = new Trend('send_message_response_time');
const sendMessageFailed = new Rate('send_message_failed');
const sendMessageRequests = new Counter('send_message_requests');

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
  const payload = {
    message: `Pesan latency test vu=${__VU} iter=${__ITER} ts=${Date.now()}`,
    messageType: 'text',
  };

  const res = http.post(
    `${API_URL}/communications/appointments/${data.appointmentId}/chat/messages`,
    JSON.stringify(payload),
    {
      headers: headers,
      tags: { name: 'POST /communications/appointments/:id/chat/messages', feature: 'send_message' },
    }
  );

  recordResult({
    res,
    trend: sendMessageTrend,
    failedRate: sendMessageFailed,
    counter: sendMessageRequests,
    validStatuses: [201],
    checkName: 'send message status 201',
    underName: 'send message under 2s',
  });
  sleep(1);
}

export function handleSummary(data) {
  const summaryFile = __ENV.SUMMARY_FILE || 'tests/latency/results/05-send-chat-message-summary.json';
  return {
    [summaryFile]: JSON.stringify(data, null, 2),
  };
}
