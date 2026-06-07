import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { API_URL, PATIENT_EMAIL, PATIENT_PASSWORD, login, recordResult } from './utils.js';

export const options = {
  scenarios: {
    login: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 10),
      duration: __ENV.DURATION || '3m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    login_failed: ['rate<0.01'],
    login_response_time: ['p(95)<2000'],
  },
};

const loginTrend = new Trend('login_response_time');
const loginFailed = new Rate('login_failed');
const loginRequests = new Counter('login_requests');

export default function () {
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
  sleep(1);
}

export function handleSummary(data) {
  const summaryFile = __ENV.SUMMARY_FILE || 'tests/latency/results/01-login-summary.json';
  return {
    [summaryFile]: JSON.stringify(data, null, 2),
  };
}
