import http from 'k6/http';
import { check, fail, group, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const DEFAULT_BASE_URL = 'http://127.0.0.1:4000';
const BASE_URL = (__ENV.BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
const API_PREFIX = normalizePrefix(__ENV.API_PREFIX || '/v1');
const API_URL = `${BASE_URL}${API_PREFIX}`;

const PATIENT_EMAIL = __ENV.PATIENT_EMAIL || __ENV.TEST_EMAIL || 'adrianhhhalim@gmail.com';
const DENTIST_EMAIL = __ENV.DENTIST_EMAIL || 'dentist10.clinic2@dentists.com';
const PATIENT_PASSWORD = __ENV.PATIENT_PASSWORD || __ENV.TEST_PASSWORD || 'password123';
const DENTIST_PASSWORD = __ENV.DENTIST_PASSWORD || __ENV.TEST_PASSWORD || 'password123';
const DENTIST_PROFILE_ID = __ENV.DENTIST_PROFILE_ID || __ENV.DENTIST_ID || '365';
const CLINIC_BRANCH_ID = __ENV.CLINIC_BRANCH_ID || '';
const FIXTURE_APPOINTMENT_ID = __ENV.APPOINTMENT_ID || '';
const SAMPLE_IMAGE_PATH = __ENV.SAMPLE_IMAGE_PATH || './sample-dental.jpg';
const SUMMARY_PREFIX = __ENV.SUMMARY_PREFIX || 'hasil_latency_api_inti';
const SCENARIO_DURATION = __ENV.DURATION || '3m';
const SCENARIO_VUS = Number(__ENV.VUS || 10);

const sampleImage = open(SAMPLE_IMAGE_PATH, 'b');

http.setResponseCallback(http.expectedStatuses({ min: 200, max: 399 }, 409));

export const options = {
  scenarios: {
    core_api_latency: {
      executor: 'constant-vus',
      vus: SCENARIO_VUS,
      duration: SCENARIO_DURATION,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000'],
    login_failed: ['rate<0.01'],
    list_appointment_failed: ['rate<0.01'],
    create_appointment_failed: ['rate<0.01'],
    detail_consultation_failed: ['rate<0.01'],
    send_message_failed: ['rate<0.01'],
    upload_image_failed: ['rate<0.01'],
    login_response_time: ['p(95)<2000'],
    list_appointment_response_time: ['p(95)<2000'],
    create_appointment_response_time: ['p(95)<2000'],
    detail_consultation_response_time: ['p(95)<2000'],
    send_message_response_time: ['p(95)<2000'],
    upload_image_response_time: ['p(95)<2000'],
  },
};

const loginTrend = new Trend('login_response_time');
const listAppointmentTrend = new Trend('list_appointment_response_time');
const createAppointmentTrend = new Trend('create_appointment_response_time');
const detailConsultationTrend = new Trend('detail_consultation_response_time');
const sendMessageTrend = new Trend('send_message_response_time');
const uploadImageTrend = new Trend('upload_image_response_time');

const loginFailed = new Rate('login_failed');
const listAppointmentFailed = new Rate('list_appointment_failed');
const createAppointmentFailed = new Rate('create_appointment_failed');
const detailConsultationFailed = new Rate('detail_consultation_failed');
const sendMessageFailed = new Rate('send_message_failed');
const uploadImageFailed = new Rate('upload_image_failed');

const loginRequests = new Counter('login_requests');
const listAppointmentRequests = new Counter('list_appointment_requests');
const createAppointmentRequests = new Counter('create_appointment_requests');
const detailConsultationRequests = new Counter('detail_consultation_requests');
const sendMessageRequests = new Counter('send_message_requests');
const uploadImageRequests = new Counter('upload_image_requests');

const featureRows = [
  {
    no: 1,
    feature: 'Login pengguna',
    trend: 'login_response_time',
    failed: 'login_failed',
    requests: 'login_requests',
  },
  {
    no: 2,
    feature: 'Ambil daftar appointment',
    trend: 'list_appointment_response_time',
    failed: 'list_appointment_failed',
    requests: 'list_appointment_requests',
  },
  {
    no: 3,
    feature: 'Buat appointment',
    trend: 'create_appointment_response_time',
    failed: 'create_appointment_failed',
    requests: 'create_appointment_requests',
  },
  {
    no: 4,
    feature: 'Ambil detail konsultasi',
    trend: 'detail_consultation_response_time',
    failed: 'detail_consultation_failed',
    requests: 'detail_consultation_requests',
  },
  {
    no: 5,
    feature: 'Kirim pesan konsultasi',
    trend: 'send_message_response_time',
    failed: 'send_message_failed',
    requests: 'send_message_requests',
  },
  {
    no: 6,
    feature: 'Unggah citra gigi',
    trend: 'upload_image_response_time',
    failed: 'upload_image_failed',
    requests: 'upload_image_requests',
  },
];

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
    dentistToken,
    appointmentId,
    dentistProfileId: DENTIST_PROFILE_ID,
    clinicBranchId: CLINIC_BRANCH_ID,
    runSeed,
  };
}

export default function (data) {
  const patientHeaders = jsonHeaders(data.patientToken);

  group('1. Login pengguna', () => {
    const res = login(PATIENT_EMAIL, PATIENT_PASSWORD, 'POST /auth/login');
    recordResult({
      res,
      trend: loginTrend,
      failedRate: loginFailed,
      counter: loginRequests,
      validStatuses: [200],
      checkName: 'login status 200',
      underName: 'login under 2s',
    });
  });

  group('2. Ambil daftar appointment', () => {
    const res = http.get(`${API_URL}/appointments?view=patient&limit=50&order=desc`, {
      headers: patientHeaders,
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
  });

  group('3. Buat appointment', () => {
    const payload = buildAppointmentPayload({
      dentistProfileId: data.dentistProfileId,
      clinicBranchId: data.clinicBranchId,
      runSeed: data.runSeed,
      vu: __VU,
      iter: __ITER,
      reason: 'Nyeri gigi untuk pengujian latency',
    });

    const res = http.post(`${API_URL}/appointments`, JSON.stringify(payload), {
      headers: patientHeaders,
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
  });

  group('4. Ambil detail konsultasi', () => {
    const res = http.get(`${API_URL}/appointments/${data.appointmentId}`, {
      headers: patientHeaders,
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
  });

  group('5. Kirim pesan konsultasi', () => {
    const payload = {
      message: `Pesan latency test vu=${__VU} iter=${__ITER} ts=${Date.now()}`,
      messageType: 'text',
    };

    const res = http.post(
      `${API_URL}/communications/appointments/${data.appointmentId}/chat/messages`,
      JSON.stringify(payload),
      {
        headers: patientHeaders,
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
  });

  group('6. Unggah citra gigi', () => {
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
  });

  sleep(1);
}

export function handleSummary(data) {
  const table = buildLatencyTable(data);
  const metadata = [
    '# Hasil Pengujian Latency API Inti',
    '',
    `- Base URL: ${BASE_URL}`,
    `- API Prefix: ${API_PREFIX}`,
    `- VUs: ${SCENARIO_VUS}`,
    `- Duration: ${SCENARIO_DURATION}`,
    `- Patient: ${PATIENT_EMAIL}`,
    `- Dentist: ${DENTIST_EMAIL}`,
    `- Dentist Profile ID: ${DENTIST_PROFILE_ID}`,
    `- Sample image: ${SAMPLE_IMAGE_PATH}`,
    '',
  ].join('\n');

  return {
    stdout: `${metadata}${table}\n`,
    [`${SUMMARY_PREFIX}.json`]: JSON.stringify(data, null, 2),
    [`${SUMMARY_PREFIX}.md`]: `${metadata}${table}\n`,
  };
}

function normalizePrefix(prefix) {
  if (!prefix) return '';
  const withLeadingSlash = prefix[0] === '/' ? prefix : `/${prefix}`;
  return withLeadingSlash.replace(/\/$/, '');
}

function login(email, password, tagName) {
  return http.post(
    `${API_URL}/auth/login`,
    JSON.stringify({ email, password }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: tagName, feature: 'login' },
    }
  );
}

function extractAccessToken(res) {
  const body = safeJson(res);
  return body.accessToken || body.token || body.access_token || nested(body, ['data', 'accessToken']) || '';
}

function createConfirmedFixtureAppointment({ patientToken, dentistToken, runSeed }) {
  const payload = buildAppointmentPayload({
    dentistProfileId: DENTIST_PROFILE_ID,
    clinicBranchId: CLINIC_BRANCH_ID,
    runSeed,
    vu: 0,
    iter: 0,
    reason: 'Fixture confirmed appointment untuk pengujian latency chat dan upload',
  });

  const createRes = http.post(`${API_URL}/appointments`, JSON.stringify(payload), {
    headers: jsonHeaders(patientToken),
    tags: { name: 'SETUP POST /appointments', feature: 'setup_create_fixture' },
  });

  check(createRes, {
    'setup create appointment status 201': (r) => r.status === 201,
  });

  if (createRes.status !== 201) {
    fail(`Setup gagal: tidak bisa membuat appointment fixture. Status=${createRes.status}, body=${createRes.body}`);
  }

  const createBody = safeJson(createRes);
  const appointmentId = nested(createBody, ['appointment', 'id']);
  if (!appointmentId) {
    fail(`Setup gagal: appointment.id tidak ditemukan. Body=${createRes.body}`);
  }

  const confirmRes = http.patch(`${API_URL}/appointments/${appointmentId}/confirm`, null, {
    headers: jsonHeaders(dentistToken),
    tags: { name: 'SETUP PATCH /appointments/:id/confirm', feature: 'setup_confirm_fixture' },
  });

  check(confirmRes, {
    'setup confirm appointment status 200': (r) => r.status === 200,
  });

  if (confirmRes.status !== 200) {
    fail(`Setup gagal: tidak bisa confirm appointment fixture ${appointmentId}. Status=${confirmRes.status}, body=${confirmRes.body}`);
  }

  return String(appointmentId);
}

function warmUpCommunicationFixture({ patientToken, appointmentId }) {
  const headers = jsonHeaders(patientToken);
  const messageRes = http.post(
    `${API_URL}/communications/appointments/${appointmentId}/chat/messages`,
    JSON.stringify({
      message: `Warmup latency fixture ${Date.now()}`,
      messageType: 'text',
    }),
    {
      headers,
      tags: { name: 'SETUP POST /communications/appointments/:id/chat/messages', feature: 'setup_warmup_message' },
    }
  );

  check(messageRes, {
    'setup warmup message status 201': (r) => r.status === 201,
  });

  if (messageRes.status !== 201) {
    fail(`Setup gagal: warmup chat message untuk appointment ${appointmentId} gagal. Status=${messageRes.status}, body=${messageRes.body}`);
  }

  const listRes = http.get(`${API_URL}/communications/appointments/${appointmentId}/chat/messages?limit=5`, {
    headers,
    tags: { name: 'SETUP GET /communications/appointments/:id/chat/messages', feature: 'setup_warmup_messages_list' },
  });

  check(listRes, {
    'setup warmup messages list status 200': (r) => r.status === 200,
  });
}

function buildAppointmentPayload({ dentistProfileId, clinicBranchId, runSeed, vu, iter, reason }) {
  const slotIndex = (runSeed * 45) + (vu * 10000 * 45) + (iter * 45);
  const start = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000) + (slotIndex * 60 * 1000));
  const end = new Date(start.getTime() + (30 * 60 * 1000));
  const payload = {
    dentistId: String(dentistProfileId),
    start: start.toISOString(),
    end: end.toISOString(),
    appointmentType: 'virtual',
    reason,
    notes: 'Generated by k6 latency test',
    metadata: {
      source: 'k6_latency_test',
      vu,
      iter,
      runSeed,
    },
  };

  if (clinicBranchId) {
    payload.clinicBranchId = String(clinicBranchId);
  }

  return payload;
}

function recordResult({ res, trend, failedRate, counter, validStatuses, checkName, underName }) {
  const isValid = validStatuses.indexOf(res.status) !== -1;
  trend.add(res.timings.duration);
  failedRate.add(!isValid);
  counter.add(1);

  const checks = {};
  checks[checkName] = () => isValid;
  checks[underName] = (r) => r.timings.duration < 2000;
  check(res, checks);
}

function jsonHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function authOnlyHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

function safeJson(res) {
  try {
    return res.json();
  } catch (_) {
    return {};
  }
}

function nested(value, path) {
  let current = value;
  for (let i = 0; i < path.length; i += 1) {
    if (!current || typeof current !== 'object') return undefined;
    current = current[path[i]];
  }
  return current;
}

function buildLatencyTable(data) {
  const seconds = getRunDurationSeconds(data);
  const lines = [
    '## Tabel 4.4 Hasil Pengujian Latency API Inti',
    '',
    '| No | Fitur | Avg. Response Time | p95 | Throughput | Error Rate | Status Target < 2 Detik |',
    '|---:|---|---:|---:|---:|---:|---|',
  ];

  for (let i = 0; i < featureRows.length; i += 1) {
    const row = featureRows[i];
    const avg = metricValue(data, row.trend, 'avg');
    const p95 = metricValue(data, row.trend, 'p(95)');
    const count = metricValue(data, row.requests, 'count');
    const errorRate = metricValue(data, row.failed, 'rate');
    const throughput = seconds > 0 ? count / seconds : 0;
    const status = p95 < 2000 && errorRate < 0.01 ? 'Memenuhi' : 'Tidak';

    lines.push(
      `| ${row.no} | ${row.feature} | ${formatMs(avg)} | ${formatMs(p95)} | ${throughput.toFixed(2)} req/s | ${formatPercent(errorRate)} | ${status} |`
    );
  }

  return lines.join('\n');
}

function metricValue(data, metricName, valueName) {
  if (!data.metrics || !data.metrics[metricName] || !data.metrics[metricName].values) return 0;
  const value = data.metrics[metricName].values[valueName];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function getRunDurationSeconds(data) {
  const durationMs = data.state && typeof data.state.testRunDurationMs === 'number'
    ? data.state.testRunDurationMs
    : 0;
  if (durationMs > 0) return durationMs / 1000;
  return durationToSeconds(SCENARIO_DURATION) || 1;
}

function durationToSeconds(value) {
  const match = String(value || '').trim().match(/^(\d+(?:\.\d+)?)(ms|s|m|h)$/);
  if (!match) return 0;
  const amount = Number(match[1]);
  const unit = match[2];
  if (unit === 'ms') return amount / 1000;
  if (unit === 's') return amount;
  if (unit === 'm') return amount * 60;
  if (unit === 'h') return amount * 3600;
  return 0;
}

function formatMs(value) {
  return `${value.toFixed(2)} ms`;
}

function formatPercent(value) {
  return `${(value * 100).toFixed(2)}%`;
}
