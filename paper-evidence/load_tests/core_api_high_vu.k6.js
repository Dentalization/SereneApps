import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

export const options = {
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  scenarios: {
    core_api_high_vu: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 100),
      duration: __ENV.DURATION || '5m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<3000'],
  },
};

const API_URL = (__ENV.API_URL || __ENV.BASE_URL || 'http://localhost:4000/v1').replace(/\/$/, '');
const PATIENT_EMAIL = __ENV.TEST_PATIENT_EMAIL || __ENV.PATIENT_EMAIL;
const PATIENT_PASSWORD = __ENV.TEST_PATIENT_PASSWORD || __ENV.PATIENT_PASSWORD;
const APPOINTMENT_ID = __ENV.APPOINTMENT_ID || '';

const loginTrend = new Trend('paper_login_response_time');
const listAppointmentTrend = new Trend('paper_list_appointment_response_time');
const detailConsultationTrend = new Trend('paper_detail_consultation_response_time');
const sendMessageTrend = new Trend('paper_send_message_response_time');

const loginFailed = new Rate('paper_login_failed');
const listAppointmentFailed = new Rate('paper_list_appointment_failed');
const detailConsultationFailed = new Rate('paper_detail_consultation_failed');
const sendMessageFailed = new Rate('paper_send_message_failed');

function login() {
  return http.post(
    `${API_URL}/auth/login`,
    JSON.stringify({
      email: PATIENT_EMAIL,
      password: PATIENT_PASSWORD,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { feature: 'login', name: 'POST /auth/login' },
    },
  );
}

function accessTokenFrom(response) {
  const body = response.json();
  return body?.accessToken || body?.token || body?.data?.accessToken || body?.data?.token || '';
}

export function setup() {
  if (!PATIENT_EMAIL || !PATIENT_PASSWORD) {
    throw new Error('Set TEST_PATIENT_EMAIL and TEST_PATIENT_PASSWORD before running load tests.');
  }

  const loginRes = login();
  check(loginRes, {
    'setup patient login status 200': (r) => r.status === 200,
  });

  const token = accessTokenFrom(loginRes);
  if (!token) {
    throw new Error(`Patient login did not return an access token. Status=${loginRes.status}`);
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  let appointmentId = APPOINTMENT_ID;
  if (!appointmentId) {
    const listRes = http.get(`${API_URL}/appointments?view=patient&limit=1&order=desc`, {
      headers,
      tags: { feature: 'setup_list_appointments', name: 'SETUP GET /appointments' },
    });
    const appointments = listRes.json('appointments') || [];
    appointmentId = appointments[0]?.id || appointments[0]?.appointmentId || '';
  }

  return { token, appointmentId };
}

export default function (data) {
  const headers = {
    Authorization: `Bearer ${data.token}`,
    'Content-Type': 'application/json',
  };

  group('1. Login pengguna', () => {
    const res = login();
    loginTrend.add(res.timings.duration);
    loginFailed.add(res.status !== 200);
    check(res, {
      'login status 200': (r) => r.status === 200,
    });
  });

  group('2. Ambil daftar appointment', () => {
    const res = http.get(`${API_URL}/appointments?view=patient&limit=20&order=desc`, {
      headers,
      tags: { feature: 'list_appointment', name: 'GET /appointments' },
    });
    listAppointmentTrend.add(res.timings.duration);
    listAppointmentFailed.add(res.status !== 200);
    check(res, {
      'list appointment status 200': (r) => r.status === 200,
    });
  });

  if (data.appointmentId) {
    group('3. Ambil detail konsultasi', () => {
      const res = http.get(`${API_URL}/appointments/${data.appointmentId}`, {
        headers,
        tags: { feature: 'detail_consultation', name: 'GET /appointments/:id' },
      });
      detailConsultationTrend.add(res.timings.duration);
      detailConsultationFailed.add(res.status !== 200);
      check(res, {
        'detail consultation status 200': (r) => r.status === 200,
      });
    });

    group('4. Kirim pesan konsultasi', () => {
      const res = http.post(
        `${API_URL}/communications/appointments/${data.appointmentId}/chat/messages`,
        JSON.stringify({
          message: `Paper load test VU=${__VU} ITER=${__ITER} TS=${Date.now()}`,
          messageType: 'text',
        }),
        {
          headers,
          tags: { feature: 'send_message', name: 'POST /chat/messages' },
        },
      );
      sendMessageTrend.add(res.timings.duration);
      sendMessageFailed.add(![200, 201].includes(res.status));
      check(res, {
        'send message status 200/201': (r) => [200, 201].includes(r.status),
      });
    });
  }

  sleep(1);
}

export function handleSummary(data) {
  const summaryFile = __ENV.SUMMARY_FILE || `paper-evidence/load_tests/load_${__ENV.VUS || 100}vu_summary.json`;
  return {
    [summaryFile]: JSON.stringify(data, null, 2),
  };
}
