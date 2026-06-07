import http from 'k6/http';
import { check, fail, group, sleep } from 'k6';
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
  authOnlyHeaders
} from './utils.js';

const SAMPLE_IMAGE_PATH = __ENV.SAMPLE_IMAGE_PATH || '../fixtures/sample-dental.jpg';
const sampleImage = open(SAMPLE_IMAGE_PATH, 'b');

export const options = {
  scenarios: {
    load_by_vu: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 10),
      duration: __ENV.DURATION || '3m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000'],
  },
};

export function setup() {
  const patientLogin = login(PATIENT_EMAIL, PATIENT_PASSWORD, 'setup patient login');
  const dentistLogin = login(DENTIST_EMAIL, DENTIST_PASSWORD, 'setup dentist login');

  const patientToken = extractAccessToken(patientLogin);
  const dentistToken = extractAccessToken(dentistLogin);

  if (!patientToken) {
    fail(`Setup gagal: token pasien tidak ditemukan. Status: ${patientLogin.status}`);
  }
  if (!dentistToken) {
    fail(`Setup gagal: token dentist tidak ditemukan. Status: ${dentistLogin.status}`);
  }

  const runSeed = Math.floor(Date.now() / 1000) % 100000;
  const appointmentId = FIXTURE_APPOINTMENT_ID || createConfirmedFixtureAppointment({
    patientToken,
    dentistToken,
    runSeed,
  });

  // WARMUP PHASE: Hit all target endpoints once to warm database pools & compilation
  const patientHeaders = jsonHeaders(patientToken);
  
  // Warmup 1: Login
  login(PATIENT_EMAIL, PATIENT_PASSWORD, 'warmup login');
  
  // Warmup 2: Fetch appointments list
  http.get(`${API_URL}/appointments?view=patient&limit=50&order=desc`, {
    headers: patientHeaders,
    tags: { name: 'SETUP GET /appointments' },
  });
  
  // Warmup 3: Fetch consultation details
  http.get(`${API_URL}/appointments/${appointmentId}`, {
    headers: patientHeaders,
    tags: { name: 'SETUP GET /appointments/:id' },
  });

  // Warmup 4: Send chat message
  http.post(
    `${API_URL}/communications/appointments/${appointmentId}/chat/messages`,
    JSON.stringify({ message: 'Warmup load test message', messageType: 'text' }),
    {
      headers: patientHeaders,
      tags: { name: 'SETUP POST /chat/messages' },
    }
  );

  // Warmup 5: Upload dental image attachment
  const formData = {
    file: http.file(sampleImage, 'warmup-dental.jpg', 'image/jpeg'),
  };
  http.post(
    `${API_URL}/communications/appointments/${appointmentId}/chat/attachments`,
    formData,
    {
      headers: authOnlyHeaders(patientToken),
      tags: { name: 'SETUP POST /chat/attachments' },
    }
  );

  return {
    patientToken,
    appointmentId,
  };
}

export default function (data) {
  const patientHeaders = jsonHeaders(data.patientToken);

  // 1. Login user
  group('1. Login pengguna', () => {
    const res = login(PATIENT_EMAIL, PATIENT_PASSWORD, 'POST /auth/login');
    check(res, {
      'login status 200': (r) => r.status === 200,
    });
  });

  // 2. Fetch appointments list
  group('2. Ambil daftar appointment', () => {
    const res = http.get(`${API_URL}/appointments?view=patient&limit=50&order=desc`, {
      headers: patientHeaders,
      tags: { name: 'GET /appointments', feature: 'list_appointment' },
    });
    check(res, {
      'list appointment status 200': (r) => r.status === 200,
    });
  });

  // 3. Fetch consultation details
  group('3. Ambil detail konsultasi', () => {
    const res = http.get(`${API_URL}/appointments/${data.appointmentId}`, {
      headers: patientHeaders,
      tags: { name: 'GET /appointments/:id', feature: 'detail_consultation' },
    });
    check(res, {
      'detail consultation status 200': (r) => r.status === 200,
    });
  });

  // 4. Send chat message
  group('4. Kirim pesan konsultasi', () => {
    const payload = {
      message: `Pesan load test mixed vu=${__VU} iter=${__ITER} ts=${Date.now()}`,
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
    check(res, {
      'send message status 201': (r) => r.status === 201,
    });
  });

  // 5. Upload dental image attachment
  group('5. Unggah citra gigi', () => {
    const formData = {
      file: http.file(sampleImage, `sample-dental-mixed-vu${__VU}-iter${__ITER}.jpg`, 'image/jpeg'),
    };
    const res = http.post(
      `${API_URL}/communications/appointments/${data.appointmentId}/chat/attachments`,
      formData,
      {
        headers: authOnlyHeaders(data.patientToken),
        tags: { name: 'POST /communications/appointments/:id/chat/attachments', feature: 'upload_image' },
      }
    );
    check(res, {
      'upload image accepted': (r) => r.status === 201,
    });
  });

  sleep(1);
}

export function handleSummary(data) {
  const summaryFile = __ENV.SUMMARY_FILE || 'results/load-summary.json';
  return {
    [summaryFile]: JSON.stringify(data, null, 2),
  };
}
