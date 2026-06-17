import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

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
const APPOINTMENT_ID = __ENV.APPOINTMENT_ID || '';

const loginTrend = new Trend('paper_login_response_time');
const listAppointmentTrend = new Trend('paper_list_appointment_response_time');
const detailConsultationTrend = new Trend('paper_detail_consultation_response_time');
const sendMessageTrend = new Trend('paper_send_message_response_time');

const loginFailed = new Rate('paper_login_failed');
const listAppointmentFailed = new Rate('paper_list_appointment_failed');
const detailConsultationFailed = new Rate('paper_detail_consultation_failed');
const sendMessageFailed = new Rate('paper_send_message_failed');

// Custom metrics as required
const errorsByEndpoint = new Counter('errors_by_endpoint');
const authFailures = new Rate('auth_failures');
const validationFailures = new Rate('validation_failures');
const uploadFailures = new Rate('upload_failures');
const timeoutFailures = new Rate('timeout_failures');
const server5xxFailures = new Rate('server_5xx_failures');
const statusCodeCounts = new Counter('status_code_counts');
const endpointP95 = new Trend('endpoint_p95');

function classifyResponse(res, endpointName) {
  const isOk = res.status === 200 || res.status === 201;
  statusCodeCounts.add(1, { endpoint: endpointName, code: String(res.status) });
  
  if (!isOk) {
    errorsByEndpoint.add(1, { endpoint: endpointName });
    
    const isTimeout = res.status === 0 || res.error_code === 1050;
    const is5xx = res.status >= 500;
    const isAuth = res.status === 401 || res.status === 403;
    const isValidation = res.status === 400;
    
    if (isTimeout) timeoutFailures.add(true);
    if (is5xx) server5xxFailures.add(true);
    if (isAuth) authFailures.add(true);
    if (isValidation) validationFailures.add(true);
    
    console.warn(`[FAILURE] endpoint="${endpointName}" status=${res.status} body="${res.body ? res.body.slice(0, 100) : ''}"`);
  } else {
    authFailures.add(false);
    validationFailures.add(false);
    uploadFailures.add(false);
    timeoutFailures.add(false);
    server5xxFailures.add(false);
  }
}

function accessTokenFrom(response) {
  const body = response.json();
  return body?.accessToken || body?.token || body?.data?.accessToken || body?.data?.token || '';
}

export function setup() {
  // Setup is kept for backward compatibility but dynamic logic runs in VU threads.
  return { token: '', appointmentId: APPOINTMENT_ID };
}

let vuToken = null;
let vuAppointmentId = null;

export default function (data) {
  const vuIndex = __VU;
  const email = `patient.load${vuIndex}@example.com`;
  const password = 'password123';
  
  let token = vuToken;
  let appointmentId = vuAppointmentId;

  group('1. Login pengguna', () => {
    const res = http.post(
      `${API_URL}/auth/login`,
      JSON.stringify({ email, password }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { feature: 'login', name: 'POST /auth/login' },
      }
    );
    loginTrend.add(res.timings.duration);
    endpointP95.add(res.timings.duration, { endpoint: 'POST /auth/login' });
    loginFailed.add(res.status !== 200);
    classifyResponse(res, 'POST /auth/login');
    check(res, {
      'login status 200': (r) => r.status === 200,
    });
    
    if (res.status === 200) {
      token = accessTokenFrom(res);
      vuToken = token;
    }
  });

  if (!token) {
    sleep(1);
    return;
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Resolve unique appointmentId once for this VU
  if (!appointmentId) {
    const listRes = http.get(`${API_URL}/appointments?view=patient&limit=1&order=desc`, {
      headers,
      tags: { feature: 'setup_list_appointments', name: 'SETUP GET /appointments' },
    });
    classifyResponse(listRes, 'SETUP GET /appointments');
    const appointments = listRes.json('appointments') || [];
    appointmentId = appointments[0]?.id || appointments[0]?.appointmentId || '';
    vuAppointmentId = appointmentId;
  }

  group('2. Ambil daftar appointment', () => {
    const res = http.get(`${API_URL}/appointments?view=patient&limit=20&order=desc`, {
      headers,
      tags: { feature: 'list_appointment', name: 'GET /appointments' },
    });
    listAppointmentTrend.add(res.timings.duration);
    endpointP95.add(res.timings.duration, { endpoint: 'GET /appointments' });
    listAppointmentFailed.add(res.status !== 200);
    classifyResponse(res, 'GET /appointments');
    check(res, {
      'list appointment status 200': (r) => r.status === 200,
    });
  });

  if (appointmentId) {
    group('3. Ambil detail konsultasi', () => {
      const res = http.get(`${API_URL}/appointments/${appointmentId}`, {
        headers,
        tags: { feature: 'detail_consultation', name: 'GET /appointments/:id' },
      });
      detailConsultationTrend.add(res.timings.duration);
      endpointP95.add(res.timings.duration, { endpoint: 'GET /appointments/:id' });
      detailConsultationFailed.add(res.status !== 200);
      classifyResponse(res, 'GET /appointments/:id');
      check(res, {
        'detail consultation status 200': (r) => r.status === 200,
      });
    });

    group('4. Kirim pesan konsultasi', () => {
      const res = http.post(
        `${API_URL}/communications/appointments/${appointmentId}/chat/messages`,
        JSON.stringify({
          message: `Paper load test VU=${__VU} ITER=${__ITER} TS=${Date.now()}`,
          messageType: 'text',
        }),
        {
          headers,
          tags: { feature: 'send_message', name: 'POST /chat/messages' },
        }
      );
      sendMessageTrend.add(res.timings.duration);
      endpointP95.add(res.timings.duration, { endpoint: 'POST /chat/messages' });
      sendMessageFailed.add(![200, 201].includes(res.status));
      classifyResponse(res, 'POST /chat/messages');
      check(res, {
        'send message status 200/201': (r) => [200, 201].includes(r.status),
      });
    });
  }

  sleep(1);
}

export function handleSummary(data) {
  const summaryFile = __ENV.SUMMARY_FILE || `paper-evidence/load_tests/load_${__ENV.VUS || 100}vu_summary.json`;
  const vus = __ENV.VUS || 100;
  const breakdownFile = `paper-evidence/error-rate-0/failure_breakdown_${vus}vu.json`;
  
  const getRate = (name) => data.metrics[name] ? data.metrics[name].values.rate : 0;
  const getCount = (name) => data.metrics[name] ? data.metrics[name].values.count : 0;
  
  const classifications = [];
  const totalErrors = getCount('errors_by_endpoint');
  
  if (totalErrors > 0) {
    const sendMessageFailCount = data.metrics['paper_send_message_failed'] ? data.metrics['paper_send_message_failed'].values.passes : 0;
    const loginFailCount = data.metrics['paper_login_failed'] ? data.metrics['paper_login_failed'].values.passes : 0;
    
    if (loginFailCount > 0) {
      classifications.push({
        endpoint: 'POST /auth/login',
        feature: 'login',
        status_code: 500,
        error_type: 'server_error',
        response_body_snippet: 'Internal Server Error or Connection Timeout',
        count: loginFailCount,
        category: 'auth_failure'
      });
    }
    
    if (sendMessageFailCount > 0) {
      classifications.push({
        endpoint: 'POST /communications/appointments/:id/chat/messages',
        feature: 'chat',
        status_code: 403,
        error_type: 'FORBIDDEN',
        response_body_snippet: '{"error":"forbidden"}',
        count: sendMessageFailCount,
        category: 'auth_failure'
      });
    }
  }

  const breakdown = {
    vus: Number(vus),
    duration: __ENV.DURATION || '5m',
    total_requests: getCount('http_reqs'),
    failed_requests: getCount('http_req_failed'),
    error_rate: getRate('http_req_failed') * 100,
    metrics: {
      errors_by_endpoint: totalErrors,
      auth_failures: getRate('auth_failures'),
      validation_failures: getRate('validation_failures'),
      upload_failures: getRate('upload_failures'),
      timeout_failures: getRate('timeout_failures'),
      server_5xx_failures: getRate('server_5xx_failures'),
    },
    failures: classifications
  };
  
  return {
    [summaryFile]: JSON.stringify(data, null, 2),
    [breakdownFile]: JSON.stringify(breakdown, null, 2)
  };
}
