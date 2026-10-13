import os
import glob
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
PHANTOM_ROOT = REPO_ROOT / ".experiment-scratch"
LOAD_DIR = REPO_ROOT / "experiments" / "load"

TIERS = [25, 100, 200]

def generate_k6_script(n_slices: int):
    phantom_dir = PHANTOM_ROOT / f"phantom-N{n_slices}"
    slices = sorted(glob.glob(str(phantom_dir / "*.dcm")))
    if len(slices) != n_slices:
        raise ValueError(f"Expected {n_slices} slices in {phantom_dir}, found {len(slices)}")

    rel_paths = [os.path.relpath(s, LOAD_DIR) for s in slices]

    open_statements = []
    for i, rel in enumerate(rel_paths):
        open_statements.append(f"const slice_{i+1} = open('{rel}', 'b');")

    append_statements = []
    for i in range(len(rel_paths)):
        fname = f"slice_{i+1:04d}.dcm"
        append_statements.append(f"  fd.append('files', http.file(slice_{i+1}, '{fname}', 'application/dicom'));")

    script_content = f"""// Auto-generated k6 workload for N = {n_slices} slices
import http from 'k6/http';
import {{ check, sleep }} from 'k6';
import {{ Trend, Rate, Counter }} from 'k6/metrics';
import {{ FormData }} from './formdata.js';

// Binary slices opened in init context
{chr(10).join(open_statements)}

function createPayload() {{
  const fd = new FormData();
{chr(10).join(append_statements)}
  return {{
    body: fd.body(),
    boundary: fd.boundary,
  }};
}}

const uploadTrend = new Trend('xcore_upload_duration_ms');
const pollTrend = new Trend('xcore_poll_duration_ms');
const e2eTrend = new Trend('xcore_e2e_duration_ms');
const conversionSuccessRate = new Rate('xcore_conversion_success_rate');
const errorCounter = new Counter('xcore_errors');

export const options = {{
  scenarios: {{
    cdss_load: {{
      executor: 'per-vu-iterations',
      vus: Number(__ENV.VUS || 10),
      iterations: 1,
      maxDuration: __ENV.MAX_DURATION || '180s',
    }},
  }},
  thresholds: {{
    xcore_conversion_success_rate: ['rate>0.95'],
  }},
}};

const API_BASE = __ENV.API_BASE_URL || 'http://127.0.0.1:4000/v1';
const PYTHON_BASE = __ENV.PYTHON_SERVICE_URL || 'http://127.0.0.1:8000';
const DENTIST_EMAIL = __ENV.DENTIST_EMAIL || 'dentist1@test.com';
const DENTIST_PASSWORD = __ENV.DENTIST_PASSWORD || 'password';

export function setup() {{
  const loginRes = http.post(`${{API_BASE}}/auth/login`, JSON.stringify({{
    email: DENTIST_EMAIL,
    password: DENTIST_PASSWORD,
  }}), {{
    headers: {{ 'Content-Type': 'application/json' }},
    timeout: '15s',
  }});

  if (loginRes.status !== 200) {{
    throw new Error(`k6 setup login failed: HTTP ${{loginRes.status}} - ${{loginRes.body}}`);
  }}
  const token = loginRes.json('accessToken');
  return {{ token }};
}}

export default function (data) {{
  const runId = __ENV.BENCHMARK_RUN_ID || 'manual_run';
  const arch = __ENV.BENCHMARK_ARCH || 'background';
  const vuId = __VU;
  const iterId = __ITER;

  // Stagger VU start slightly (30ms per VU) to prevent macOS loopback ENOBUFS buffer overflow
  sleep((vuId - 1) * 0.03);

  const uploadHeaders = {{
    'Authorization': `Bearer ${{data.token}}`,
    'X-Benchmark-Run-Id': runId,
    'X-Benchmark-Case-Id': `N{n_slices}_VU${{__ENV.VUS}}`,
    'X-Benchmark-Iteration': `${{iterId}}`,
  }};

  const payload = createPayload();

  const t0 = Date.now();
  const res = http.post(`${{API_BASE}}/x-core/upload`, payload.body, {{
    headers: {{
      ...uploadHeaders,
      'Content-Type': 'multipart/form-data; boundary=' + payload.boundary,
    }},
    timeout: '120s',
  }});

  const uploadLatency = Date.now() - t0;
  uploadTrend.add(uploadLatency);

  const uploadSuccess = check(res, {{
    'upload status 200': (r) => r.status === 200,
  }});

  if (!uploadSuccess) {{
    errorCounter.add(1);
    conversionSuccessRate.add(0);
    console.error(`[VU ${{vuId}}] Upload failed: status ${{res.status}} body: ${{res.body}}`);
    return;
  }}

  let folderName = res.json('folderName');
  if (!folderName) {{
    const studyId = res.json('id');
    folderName = String(studyId);
  }}

  // Status polling phase
  const pollStart = Date.now();
  let isReady = false;
  let attempts = 0;
  const maxAttempts = Number(__ENV.MAX_POLL_ATTEMPTS || 360); // 180s at 500ms

  while (!isReady && attempts < maxAttempts) {{
    attempts++;
    const statusRes = http.get(`${{PYTHON_BASE}}/status/${{folderName}}`, {{
      timeout: '5s',
    }});

    if (statusRes.status === 200) {{
      const statusData = statusRes.json();
      if (statusData.status === 'ready' || statusData.vti_ready === true) {{
        isReady = true;
        break;
      }} else if (statusData.status === 'failed' || statusData.status === 'error') {{
        console.error(`[VU ${{vuId}}] Conversion reported failure: ${{JSON.stringify(statusData)}}`);
        break;
      }}
    }}

    if (!isReady) {{
      sleep(0.5); // 500ms poll interval
    }}
  }}

  const pollLatency = Date.now() - pollStart;
  const totalE2ELatency = Date.now() - t0;

  pollTrend.add(pollLatency);
  e2eTrend.add(totalE2ELatency);

  if (isReady) {{
    conversionSuccessRate.add(1);
  }} else {{
    errorCounter.add(1);
    conversionSuccessRate.add(0);
    console.error(`[VU ${{vuId}}] Conversion timed out after ${{pollLatency}} ms for study ${{folderName}}`);
  }}
}}
"""
    out_file = LOAD_DIR / f"k6_workload_N{n_slices}.js"
    with open(out_file, "w") as f:
        f.write(script_content)
    print(f"Generated {out_file} ({len(script_content)} bytes)")

if __name__ == "__main__":
    for tier in TIERS:
        generate_k6_script(tier)
