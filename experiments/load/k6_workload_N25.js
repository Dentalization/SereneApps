// Auto-generated k6 workload for N = 25 slices
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { FormData } from './formdata.js';

// Binary slices opened in init context
const slice_1 = open('../../.experiment-scratch/phantom-N25/slice_0001.dcm', 'b');
const slice_2 = open('../../.experiment-scratch/phantom-N25/slice_0002.dcm', 'b');
const slice_3 = open('../../.experiment-scratch/phantom-N25/slice_0003.dcm', 'b');
const slice_4 = open('../../.experiment-scratch/phantom-N25/slice_0004.dcm', 'b');
const slice_5 = open('../../.experiment-scratch/phantom-N25/slice_0005.dcm', 'b');
const slice_6 = open('../../.experiment-scratch/phantom-N25/slice_0006.dcm', 'b');
const slice_7 = open('../../.experiment-scratch/phantom-N25/slice_0007.dcm', 'b');
const slice_8 = open('../../.experiment-scratch/phantom-N25/slice_0008.dcm', 'b');
const slice_9 = open('../../.experiment-scratch/phantom-N25/slice_0009.dcm', 'b');
const slice_10 = open('../../.experiment-scratch/phantom-N25/slice_0010.dcm', 'b');
const slice_11 = open('../../.experiment-scratch/phantom-N25/slice_0011.dcm', 'b');
const slice_12 = open('../../.experiment-scratch/phantom-N25/slice_0012.dcm', 'b');
const slice_13 = open('../../.experiment-scratch/phantom-N25/slice_0013.dcm', 'b');
const slice_14 = open('../../.experiment-scratch/phantom-N25/slice_0014.dcm', 'b');
const slice_15 = open('../../.experiment-scratch/phantom-N25/slice_0015.dcm', 'b');
const slice_16 = open('../../.experiment-scratch/phantom-N25/slice_0016.dcm', 'b');
const slice_17 = open('../../.experiment-scratch/phantom-N25/slice_0017.dcm', 'b');
const slice_18 = open('../../.experiment-scratch/phantom-N25/slice_0018.dcm', 'b');
const slice_19 = open('../../.experiment-scratch/phantom-N25/slice_0019.dcm', 'b');
const slice_20 = open('../../.experiment-scratch/phantom-N25/slice_0020.dcm', 'b');
const slice_21 = open('../../.experiment-scratch/phantom-N25/slice_0021.dcm', 'b');
const slice_22 = open('../../.experiment-scratch/phantom-N25/slice_0022.dcm', 'b');
const slice_23 = open('../../.experiment-scratch/phantom-N25/slice_0023.dcm', 'b');
const slice_24 = open('../../.experiment-scratch/phantom-N25/slice_0024.dcm', 'b');
const slice_25 = open('../../.experiment-scratch/phantom-N25/slice_0025.dcm', 'b');

function createPayload() {
  const fd = new FormData();
  fd.append('files', http.file(slice_1, 'slice_0001.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_2, 'slice_0002.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_3, 'slice_0003.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_4, 'slice_0004.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_5, 'slice_0005.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_6, 'slice_0006.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_7, 'slice_0007.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_8, 'slice_0008.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_9, 'slice_0009.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_10, 'slice_0010.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_11, 'slice_0011.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_12, 'slice_0012.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_13, 'slice_0013.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_14, 'slice_0014.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_15, 'slice_0015.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_16, 'slice_0016.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_17, 'slice_0017.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_18, 'slice_0018.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_19, 'slice_0019.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_20, 'slice_0020.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_21, 'slice_0021.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_22, 'slice_0022.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_23, 'slice_0023.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_24, 'slice_0024.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_25, 'slice_0025.dcm', 'application/dicom'));
  return {
    body: fd.body(),
    boundary: fd.boundary,
  };
}

const uploadTrend = new Trend('xcore_upload_duration_ms');
const pollTrend = new Trend('xcore_poll_duration_ms');
const e2eTrend = new Trend('xcore_e2e_duration_ms');
const conversionSuccessRate = new Rate('xcore_conversion_success_rate');
const errorCounter = new Counter('xcore_errors');

export const options = {
  scenarios: {
    cdss_load: {
      executor: 'per-vu-iterations',
      vus: Number(__ENV.VUS || 10),
      iterations: 1,
      maxDuration: __ENV.MAX_DURATION || '180s',
    },
  },
  thresholds: {
    xcore_conversion_success_rate: ['rate>0.95'],
  },
};

const API_BASE = __ENV.API_BASE_URL || 'http://127.0.0.1:4000/v1';
const PYTHON_BASE = __ENV.PYTHON_SERVICE_URL || 'http://127.0.0.1:8000';
const DENTIST_EMAIL = __ENV.DENTIST_EMAIL || 'dentist1@test.com';
const DENTIST_PASSWORD = __ENV.DENTIST_PASSWORD || 'password';

export function setup() {
  const loginRes = http.post(`${API_BASE}/auth/login`, JSON.stringify({
    email: DENTIST_EMAIL,
    password: DENTIST_PASSWORD,
  }), {
    headers: { 'Content-Type': 'application/json' },
    timeout: '15s',
  });

  if (loginRes.status !== 200) {
    throw new Error(`k6 setup login failed: HTTP ${loginRes.status} - ${loginRes.body}`);
  }
  const token = loginRes.json('accessToken');
  return { token };
}

export default function (data) {
  const runId = __ENV.BENCHMARK_RUN_ID || 'manual_run';
  const arch = __ENV.BENCHMARK_ARCH || 'background';
  const vuId = __VU;
  const iterId = __ITER;

  // Stagger VU start slightly (30ms per VU) to prevent macOS loopback ENOBUFS buffer overflow
  sleep((vuId - 1) * 0.03);

  const uploadHeaders = {
    'Authorization': `Bearer ${data.token}`,
    'X-Benchmark-Run-Id': runId,
    'X-Benchmark-Case-Id': `N25_VU${__ENV.VUS}`,
    'X-Benchmark-Iteration': `${iterId}`,
  };

  const payload = createPayload();

  const t0 = Date.now();
  const res = http.post(`${API_BASE}/x-core/upload`, payload.body, {
    headers: {
      ...uploadHeaders,
      'Content-Type': 'multipart/form-data; boundary=' + payload.boundary,
    },
    timeout: '120s',
  });

  const uploadLatency = Date.now() - t0;
  uploadTrend.add(uploadLatency);

  const uploadSuccess = check(res, {
    'upload status 200': (r) => r.status === 200,
  });

  if (!uploadSuccess) {
    errorCounter.add(1);
    conversionSuccessRate.add(0);
    console.error(`[VU ${vuId}] Upload failed: status ${res.status} body: ${res.body}`);
    return;
  }

  let folderName = res.json('folderName');
  if (!folderName) {
    const studyId = res.json('id');
    folderName = String(studyId);
  }

  // Status polling phase
  const pollStart = Date.now();
  let isReady = false;
  let attempts = 0;
  const maxAttempts = Number(__ENV.MAX_POLL_ATTEMPTS || 360); // 180s at 500ms

  while (!isReady && attempts < maxAttempts) {
    attempts++;
    const statusRes = http.get(`${PYTHON_BASE}/status/${folderName}`, {
      timeout: '5s',
    });

    if (statusRes.status === 200) {
      const statusData = statusRes.json();
      if (statusData.status === 'ready' || statusData.vti_ready === true) {
        isReady = true;
        break;
      } else if (statusData.status === 'failed' || statusData.status === 'error') {
        console.error(`[VU ${vuId}] Conversion reported failure: ${JSON.stringify(statusData)}`);
        break;
      }
    }

    if (!isReady) {
      sleep(0.5); // 500ms poll interval
    }
  }

  const pollLatency = Date.now() - pollStart;
  const totalE2ELatency = Date.now() - t0;

  pollTrend.add(pollLatency);
  e2eTrend.add(totalE2ELatency);

  if (isReady) {
    conversionSuccessRate.add(1);
  } else {
    errorCounter.add(1);
    conversionSuccessRate.add(0);
    console.error(`[VU ${vuId}] Conversion timed out after ${pollLatency} ms for study ${folderName}`);
  }
}
