// Auto-generated k6 workload for N = 100 slices
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { FormData } from './formdata.js';

// Binary slices opened in init context
const slice_1 = open('../../.experiment-scratch/phantom-N100/slice_0001.dcm', 'b');
const slice_2 = open('../../.experiment-scratch/phantom-N100/slice_0002.dcm', 'b');
const slice_3 = open('../../.experiment-scratch/phantom-N100/slice_0003.dcm', 'b');
const slice_4 = open('../../.experiment-scratch/phantom-N100/slice_0004.dcm', 'b');
const slice_5 = open('../../.experiment-scratch/phantom-N100/slice_0005.dcm', 'b');
const slice_6 = open('../../.experiment-scratch/phantom-N100/slice_0006.dcm', 'b');
const slice_7 = open('../../.experiment-scratch/phantom-N100/slice_0007.dcm', 'b');
const slice_8 = open('../../.experiment-scratch/phantom-N100/slice_0008.dcm', 'b');
const slice_9 = open('../../.experiment-scratch/phantom-N100/slice_0009.dcm', 'b');
const slice_10 = open('../../.experiment-scratch/phantom-N100/slice_0010.dcm', 'b');
const slice_11 = open('../../.experiment-scratch/phantom-N100/slice_0011.dcm', 'b');
const slice_12 = open('../../.experiment-scratch/phantom-N100/slice_0012.dcm', 'b');
const slice_13 = open('../../.experiment-scratch/phantom-N100/slice_0013.dcm', 'b');
const slice_14 = open('../../.experiment-scratch/phantom-N100/slice_0014.dcm', 'b');
const slice_15 = open('../../.experiment-scratch/phantom-N100/slice_0015.dcm', 'b');
const slice_16 = open('../../.experiment-scratch/phantom-N100/slice_0016.dcm', 'b');
const slice_17 = open('../../.experiment-scratch/phantom-N100/slice_0017.dcm', 'b');
const slice_18 = open('../../.experiment-scratch/phantom-N100/slice_0018.dcm', 'b');
const slice_19 = open('../../.experiment-scratch/phantom-N100/slice_0019.dcm', 'b');
const slice_20 = open('../../.experiment-scratch/phantom-N100/slice_0020.dcm', 'b');
const slice_21 = open('../../.experiment-scratch/phantom-N100/slice_0021.dcm', 'b');
const slice_22 = open('../../.experiment-scratch/phantom-N100/slice_0022.dcm', 'b');
const slice_23 = open('../../.experiment-scratch/phantom-N100/slice_0023.dcm', 'b');
const slice_24 = open('../../.experiment-scratch/phantom-N100/slice_0024.dcm', 'b');
const slice_25 = open('../../.experiment-scratch/phantom-N100/slice_0025.dcm', 'b');
const slice_26 = open('../../.experiment-scratch/phantom-N100/slice_0026.dcm', 'b');
const slice_27 = open('../../.experiment-scratch/phantom-N100/slice_0027.dcm', 'b');
const slice_28 = open('../../.experiment-scratch/phantom-N100/slice_0028.dcm', 'b');
const slice_29 = open('../../.experiment-scratch/phantom-N100/slice_0029.dcm', 'b');
const slice_30 = open('../../.experiment-scratch/phantom-N100/slice_0030.dcm', 'b');
const slice_31 = open('../../.experiment-scratch/phantom-N100/slice_0031.dcm', 'b');
const slice_32 = open('../../.experiment-scratch/phantom-N100/slice_0032.dcm', 'b');
const slice_33 = open('../../.experiment-scratch/phantom-N100/slice_0033.dcm', 'b');
const slice_34 = open('../../.experiment-scratch/phantom-N100/slice_0034.dcm', 'b');
const slice_35 = open('../../.experiment-scratch/phantom-N100/slice_0035.dcm', 'b');
const slice_36 = open('../../.experiment-scratch/phantom-N100/slice_0036.dcm', 'b');
const slice_37 = open('../../.experiment-scratch/phantom-N100/slice_0037.dcm', 'b');
const slice_38 = open('../../.experiment-scratch/phantom-N100/slice_0038.dcm', 'b');
const slice_39 = open('../../.experiment-scratch/phantom-N100/slice_0039.dcm', 'b');
const slice_40 = open('../../.experiment-scratch/phantom-N100/slice_0040.dcm', 'b');
const slice_41 = open('../../.experiment-scratch/phantom-N100/slice_0041.dcm', 'b');
const slice_42 = open('../../.experiment-scratch/phantom-N100/slice_0042.dcm', 'b');
const slice_43 = open('../../.experiment-scratch/phantom-N100/slice_0043.dcm', 'b');
const slice_44 = open('../../.experiment-scratch/phantom-N100/slice_0044.dcm', 'b');
const slice_45 = open('../../.experiment-scratch/phantom-N100/slice_0045.dcm', 'b');
const slice_46 = open('../../.experiment-scratch/phantom-N100/slice_0046.dcm', 'b');
const slice_47 = open('../../.experiment-scratch/phantom-N100/slice_0047.dcm', 'b');
const slice_48 = open('../../.experiment-scratch/phantom-N100/slice_0048.dcm', 'b');
const slice_49 = open('../../.experiment-scratch/phantom-N100/slice_0049.dcm', 'b');
const slice_50 = open('../../.experiment-scratch/phantom-N100/slice_0050.dcm', 'b');
const slice_51 = open('../../.experiment-scratch/phantom-N100/slice_0051.dcm', 'b');
const slice_52 = open('../../.experiment-scratch/phantom-N100/slice_0052.dcm', 'b');
const slice_53 = open('../../.experiment-scratch/phantom-N100/slice_0053.dcm', 'b');
const slice_54 = open('../../.experiment-scratch/phantom-N100/slice_0054.dcm', 'b');
const slice_55 = open('../../.experiment-scratch/phantom-N100/slice_0055.dcm', 'b');
const slice_56 = open('../../.experiment-scratch/phantom-N100/slice_0056.dcm', 'b');
const slice_57 = open('../../.experiment-scratch/phantom-N100/slice_0057.dcm', 'b');
const slice_58 = open('../../.experiment-scratch/phantom-N100/slice_0058.dcm', 'b');
const slice_59 = open('../../.experiment-scratch/phantom-N100/slice_0059.dcm', 'b');
const slice_60 = open('../../.experiment-scratch/phantom-N100/slice_0060.dcm', 'b');
const slice_61 = open('../../.experiment-scratch/phantom-N100/slice_0061.dcm', 'b');
const slice_62 = open('../../.experiment-scratch/phantom-N100/slice_0062.dcm', 'b');
const slice_63 = open('../../.experiment-scratch/phantom-N100/slice_0063.dcm', 'b');
const slice_64 = open('../../.experiment-scratch/phantom-N100/slice_0064.dcm', 'b');
const slice_65 = open('../../.experiment-scratch/phantom-N100/slice_0065.dcm', 'b');
const slice_66 = open('../../.experiment-scratch/phantom-N100/slice_0066.dcm', 'b');
const slice_67 = open('../../.experiment-scratch/phantom-N100/slice_0067.dcm', 'b');
const slice_68 = open('../../.experiment-scratch/phantom-N100/slice_0068.dcm', 'b');
const slice_69 = open('../../.experiment-scratch/phantom-N100/slice_0069.dcm', 'b');
const slice_70 = open('../../.experiment-scratch/phantom-N100/slice_0070.dcm', 'b');
const slice_71 = open('../../.experiment-scratch/phantom-N100/slice_0071.dcm', 'b');
const slice_72 = open('../../.experiment-scratch/phantom-N100/slice_0072.dcm', 'b');
const slice_73 = open('../../.experiment-scratch/phantom-N100/slice_0073.dcm', 'b');
const slice_74 = open('../../.experiment-scratch/phantom-N100/slice_0074.dcm', 'b');
const slice_75 = open('../../.experiment-scratch/phantom-N100/slice_0075.dcm', 'b');
const slice_76 = open('../../.experiment-scratch/phantom-N100/slice_0076.dcm', 'b');
const slice_77 = open('../../.experiment-scratch/phantom-N100/slice_0077.dcm', 'b');
const slice_78 = open('../../.experiment-scratch/phantom-N100/slice_0078.dcm', 'b');
const slice_79 = open('../../.experiment-scratch/phantom-N100/slice_0079.dcm', 'b');
const slice_80 = open('../../.experiment-scratch/phantom-N100/slice_0080.dcm', 'b');
const slice_81 = open('../../.experiment-scratch/phantom-N100/slice_0081.dcm', 'b');
const slice_82 = open('../../.experiment-scratch/phantom-N100/slice_0082.dcm', 'b');
const slice_83 = open('../../.experiment-scratch/phantom-N100/slice_0083.dcm', 'b');
const slice_84 = open('../../.experiment-scratch/phantom-N100/slice_0084.dcm', 'b');
const slice_85 = open('../../.experiment-scratch/phantom-N100/slice_0085.dcm', 'b');
const slice_86 = open('../../.experiment-scratch/phantom-N100/slice_0086.dcm', 'b');
const slice_87 = open('../../.experiment-scratch/phantom-N100/slice_0087.dcm', 'b');
const slice_88 = open('../../.experiment-scratch/phantom-N100/slice_0088.dcm', 'b');
const slice_89 = open('../../.experiment-scratch/phantom-N100/slice_0089.dcm', 'b');
const slice_90 = open('../../.experiment-scratch/phantom-N100/slice_0090.dcm', 'b');
const slice_91 = open('../../.experiment-scratch/phantom-N100/slice_0091.dcm', 'b');
const slice_92 = open('../../.experiment-scratch/phantom-N100/slice_0092.dcm', 'b');
const slice_93 = open('../../.experiment-scratch/phantom-N100/slice_0093.dcm', 'b');
const slice_94 = open('../../.experiment-scratch/phantom-N100/slice_0094.dcm', 'b');
const slice_95 = open('../../.experiment-scratch/phantom-N100/slice_0095.dcm', 'b');
const slice_96 = open('../../.experiment-scratch/phantom-N100/slice_0096.dcm', 'b');
const slice_97 = open('../../.experiment-scratch/phantom-N100/slice_0097.dcm', 'b');
const slice_98 = open('../../.experiment-scratch/phantom-N100/slice_0098.dcm', 'b');
const slice_99 = open('../../.experiment-scratch/phantom-N100/slice_0099.dcm', 'b');
const slice_100 = open('../../.experiment-scratch/phantom-N100/slice_0100.dcm', 'b');

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
  fd.append('files', http.file(slice_26, 'slice_0026.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_27, 'slice_0027.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_28, 'slice_0028.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_29, 'slice_0029.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_30, 'slice_0030.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_31, 'slice_0031.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_32, 'slice_0032.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_33, 'slice_0033.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_34, 'slice_0034.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_35, 'slice_0035.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_36, 'slice_0036.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_37, 'slice_0037.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_38, 'slice_0038.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_39, 'slice_0039.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_40, 'slice_0040.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_41, 'slice_0041.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_42, 'slice_0042.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_43, 'slice_0043.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_44, 'slice_0044.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_45, 'slice_0045.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_46, 'slice_0046.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_47, 'slice_0047.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_48, 'slice_0048.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_49, 'slice_0049.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_50, 'slice_0050.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_51, 'slice_0051.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_52, 'slice_0052.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_53, 'slice_0053.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_54, 'slice_0054.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_55, 'slice_0055.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_56, 'slice_0056.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_57, 'slice_0057.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_58, 'slice_0058.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_59, 'slice_0059.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_60, 'slice_0060.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_61, 'slice_0061.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_62, 'slice_0062.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_63, 'slice_0063.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_64, 'slice_0064.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_65, 'slice_0065.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_66, 'slice_0066.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_67, 'slice_0067.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_68, 'slice_0068.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_69, 'slice_0069.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_70, 'slice_0070.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_71, 'slice_0071.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_72, 'slice_0072.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_73, 'slice_0073.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_74, 'slice_0074.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_75, 'slice_0075.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_76, 'slice_0076.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_77, 'slice_0077.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_78, 'slice_0078.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_79, 'slice_0079.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_80, 'slice_0080.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_81, 'slice_0081.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_82, 'slice_0082.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_83, 'slice_0083.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_84, 'slice_0084.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_85, 'slice_0085.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_86, 'slice_0086.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_87, 'slice_0087.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_88, 'slice_0088.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_89, 'slice_0089.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_90, 'slice_0090.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_91, 'slice_0091.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_92, 'slice_0092.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_93, 'slice_0093.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_94, 'slice_0094.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_95, 'slice_0095.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_96, 'slice_0096.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_97, 'slice_0097.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_98, 'slice_0098.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_99, 'slice_0099.dcm', 'application/dicom'));
  fd.append('files', http.file(slice_100, 'slice_0100.dcm', 'application/dicom'));
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
    'X-Benchmark-Case-Id': `N100_VU${__ENV.VUS}`,
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
