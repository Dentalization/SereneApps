const fs = require('node:fs');
const http = require('node:http');
const https = require('node:https');
const path = require('node:path');
const FormData = require('form-data');
const {
  ensureDir,
  environmentMetadata,
  formatMs,
  markdownTable,
  nowIso,
  readCsv,
  readJsonl,
  repoRootFromScript,
  summarize,
  wait,
  writeCsv,
  writeJson,
} = require('./experiment-utils.cjs');
const { generateFixtures } = require('./generate-synthetic-dental-fixtures.cjs');

const root = repoRootFromScript();
const evidenceRoot = path.join(root, 'paper-evidence');
const defaultFixtureDir = path.join(evidenceRoot, 'fixtures', 'synthetic_dental_images');
const rawEventDir = path.join(root, 'scripts', 'xcore-benchmark', 'results', 'raw');

const latencyColumns = [
  'run_id',
  'image_file',
  'image_size_kb',
  'initial_response_time_ms',
  'queue_time_ms',
  'inference_time_ms',
  'persistence_time_ms',
  'end_to_end_processing_time_ms',
  'status',
  'error_message',
  'timestamp',
];

const concurrentColumns = [
  'scenario_concurrency',
  'upload_index',
  ...latencyColumns,
];

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item.startsWith('--')) {
      const key = item.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        args[key] = true;
      } else {
        args[key] = next;
        i += 1;
      }
    } else {
      args._.push(item);
    }
  }
  return args;
}

function getConfig(args) {
  return {
    mode: args.mode || args._[0] || 'latency',
    apiBaseUrl: (args.apiBaseUrl || process.env.API_BASE_URL || 'http://localhost:4000/v1').replace(/\/$/, ''),
    pythonServiceUrl: (args.pythonServiceUrl || process.env.PYTHON_SERVICE_URL || 'http://localhost:8000').replace(/\/$/, ''),
    dentistEmail: args.dentistEmail || process.env.TEST_DENTIST_EMAIL || process.env.DENTIST_EMAIL || '',
    dentistPassword: args.dentistPassword || process.env.TEST_DENTIST_PASSWORD || process.env.DENTIST_PASSWORD || '',
    fixtureDir: path.resolve(args.fixtureDir || process.env.CDSS_FIXTURE_DIR || defaultFixtureDir),
    runs: Number(args.runs || process.env.CDSS_RUNS || 30),
    pollIntervalMs: Number(args.pollIntervalMs || process.env.CDSS_POLL_INTERVAL_MS || 500),
    timeoutMs: Number(args.timeoutMs || process.env.CDSS_TIMEOUT_MS || 120000),
    cleanup: String(args.cleanup ?? process.env.CDSS_CLEANUP ?? 'true') !== 'false',
    writeNotRun: Boolean(args.writeNotRun || process.env.WRITE_NOT_RUN === 'true'),
    concurrencyScenarios: String(args.concurrency || process.env.CDSS_CONCURRENCY || '2,5,10')
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value) && value > 0),
  };
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status} from ${url}: ${text.slice(0, 500)}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

async function healthCheck(config) {
  const checks = {};
  try {
    checks.backend = await fetchJson(`${config.apiBaseUrl.replace(/\/v1$/, '')}/health`);
  } catch (error) {
    checks.backend = { ok: false, error: error.message };
  }
  try {
    checks.python = await fetchJson(`${config.pythonServiceUrl}/health`);
  } catch (firstError) {
    try {
      checks.python = await fetchJson(`${config.pythonServiceUrl}/`);
    } catch (error) {
      checks.python = { ok: false, error: firstError.message || error.message };
    }
  }
  return checks;
}

async function login(config) {
  if (!config.dentistEmail || !config.dentistPassword) {
    throw new Error('Set TEST_DENTIST_EMAIL and TEST_DENTIST_PASSWORD to run authenticated X-Core benchmarks.');
  }
  const body = await fetchJson(`${config.apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: config.dentistEmail, password: config.dentistPassword }),
  });
  const token = body.accessToken || body.token || body.data?.accessToken;
  if (!token) throw new Error('Login succeeded but no access token was returned.');
  return `Bearer ${token}`;
}

function uploadForm(urlStr, form, headers) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const transport = url.protocol === 'https:' ? https : http;
    const startedAt = performance.now();
    const request = transport.request({
      method: 'POST',
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      headers: {
        ...form.getHeaders(),
        ...headers,
      },
    }, (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        const durationMs = performance.now() - startedAt;
        let body;
        try {
          body = data ? JSON.parse(data) : {};
        } catch {
          body = { raw: data };
        }
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve({ body, durationMs });
        } else {
          const error = new Error(`Upload failed with HTTP ${response.statusCode}: ${data.slice(0, 500)}`);
          error.status = response.statusCode;
          error.body = body;
          error.durationMs = durationMs;
          reject(error);
        }
      });
    });
    request.on('error', reject);
    form.pipe(request);
  });
}

function fixtureFiles(config) {
  if (!fs.existsSync(config.fixtureDir) || fs.readdirSync(config.fixtureDir).filter((name) => name.endsWith('.png')).length < config.runs) {
    generateFixtures({ outDir: config.fixtureDir, count: Math.max(config.runs, 30) });
  }
  return fs.readdirSync(config.fixtureDir)
    .filter((name) => name.endsWith('.png'))
    .sort()
    .map((name) => path.join(config.fixtureDir, name));
}

function eventTime(events, eventType) {
  const event = events.find((item) => item.eventType === eventType);
  return event ? new Date(event.timestamp).getTime() : null;
}

function computeEventTimings(runId) {
  const backendEvents = readJsonl(path.join(rawEventDir, `backend-events-${runId}.jsonl`));
  const pythonEvents = readJsonl(path.join(rawEventDir, `python-events-${runId}.jsonl`));
  const allEvents = [...backendEvents, ...pythonEvents]
    .filter((event) => event.runId === runId)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const conversionRequested = eventTime(allEvents, 'conversion_requested');
  const pickup = eventTime(allEvents, 'dicom_scan_start')
    ?? eventTime(allEvents, 'volume_preparation_start')
    ?? eventTime(allEvents, 'image_generation_start');
  const inferenceStart = eventTime(allEvents, 'volume_preparation_start')
    ?? eventTime(allEvents, 'image_generation_start')
    ?? pickup;
  const inferenceEnd = eventTime(allEvents, 'volume_preparation_end')
    ?? eventTime(allEvents, 'image_generation_end')
    ?? eventTime(allEvents, 'conversion_completed');
  const persisted = eventTime(allEvents, 'manifest_persisted')
    ?? eventTime(allEvents, 'conversion_completed');

  return {
    queue_time_ms: conversionRequested && pickup ? pickup - conversionRequested : '',
    inference_time_ms: inferenceStart && inferenceEnd ? inferenceEnd - inferenceStart : '',
    persistence_time_ms: inferenceEnd && persisted ? Math.max(0, persisted - inferenceEnd) : '',
    event_count: allEvents.length,
  };
}

function hasCompletionEvent(runId) {
  const backendEvents = readJsonl(path.join(rawEventDir, `backend-events-${runId}.jsonl`));
  const pythonEvents = readJsonl(path.join(rawEventDir, `python-events-${runId}.jsonl`));
  return [...backendEvents, ...pythonEvents].some((event) => (
    event.runId === runId
    && ['manifest_persisted', 'conversion_completed'].includes(event.eventType)
  ));
}

async function pollConversionReady(config, folderName, runId) {
  const startedAt = performance.now();
  let status = 'pending';
  let lastPayload = null;
  while (performance.now() - startedAt < config.timeoutMs) {
    if (hasCompletionEvent(runId)) {
      return { status: 'ready', durationMs: performance.now() - startedAt, payload: { source: 'benchmark_event_log' } };
    }
    try {
      lastPayload = await fetchJson(`${config.pythonServiceUrl}/status/${folderName}`);
      status = lastPayload.status;
      if (status === 'ready') {
        return { status, durationMs: performance.now() - startedAt, payload: lastPayload };
      }
      if (status === 'failed' || status === 'error') {
        throw new Error(`Conversion failed: ${JSON.stringify(lastPayload)}`);
      }
    } catch (error) {
      if (error.status === 404) throw error;
      lastPayload = { error: error.message };
    }
    await wait(config.pollIntervalMs);
  }
  throw new Error(`Timed out waiting for conversion readiness. Last status: ${status}; payload=${JSON.stringify(lastPayload)}`);
}

async function cleanupStudy(config, authHeader, studyId) {
  if (!config.cleanup || !studyId) return;
  try {
    await fetchJson(`${config.apiBaseUrl}/x-core/benchmark/studies/${studyId}`, {
      method: 'DELETE',
      headers: { Authorization: authHeader },
    });
  } catch (error) {
    console.warn(`[paper-evidence] Cleanup failed for study ${studyId}: ${error.message}`);
  }
}

async function runSingleUpload({ config, authHeader, imageFile, runId, caseId, iteration, scenarioConcurrency = '', uploadIndex = '' }) {
  const imageSizeKb = fs.statSync(imageFile).size / 1024;
  const uploadStartedAt = performance.now();
  const timestamp = nowIso();
  let studyId = null;
  try {
    const form = new FormData();
    form.append('files', fs.createReadStream(imageFile), {
      filename: path.basename(imageFile),
      filepath: path.basename(imageFile),
    });
    form.append('originalFolderName', `paper-evidence-${runId}`);

    const upload = await uploadForm(`${config.apiBaseUrl}/x-core/upload`, form, {
      Authorization: authHeader,
      'X-Benchmark-Run-Id': runId,
      'X-Benchmark-Case-Id': caseId,
      'X-Benchmark-Iteration': String(iteration),
    });
    studyId = upload.body.id;
    const folderName = upload.body.folderName;
    if (!folderName) throw new Error(`Upload response did not include folderName: ${JSON.stringify(upload.body)}`);

    const ready = await pollConversionReady(config, folderName, runId);
    const endToEndMs = performance.now() - uploadStartedAt;
    const eventTimings = computeEventTimings(runId);

    await cleanupStudy(config, authHeader, studyId);

    return {
      scenario_concurrency: scenarioConcurrency,
      upload_index: uploadIndex,
      run_id: runId,
      image_file: path.relative(root, imageFile),
      image_size_kb: imageSizeKb.toFixed(2),
      initial_response_time_ms: upload.durationMs.toFixed(2),
      queue_time_ms: eventTimings.queue_time_ms,
      inference_time_ms: eventTimings.inference_time_ms,
      persistence_time_ms: eventTimings.persistence_time_ms,
      end_to_end_processing_time_ms: endToEndMs.toFixed(2),
      status: ready.status === 'ready' ? 'success' : ready.status,
      error_message: '',
      timestamp,
    };
  } catch (error) {
    await cleanupStudy(config, authHeader, studyId);
    return {
      scenario_concurrency: scenarioConcurrency,
      upload_index: uploadIndex,
      run_id: runId,
      image_file: path.relative(root, imageFile),
      image_size_kb: imageSizeKb.toFixed(2),
      initial_response_time_ms: error.durationMs ? error.durationMs.toFixed(2) : '',
      queue_time_ms: '',
      inference_time_ms: '',
      persistence_time_ms: '',
      end_to_end_processing_time_ms: (performance.now() - uploadStartedAt).toFixed(2),
      status: 'failed',
      error_message: error.message,
      timestamp,
    };
  }
}

function writeLatencySummary(rows, config, outPath, title = 'CDSS Asynchronous Latency Benchmark') {
  const successfulRows = rows.filter((row) => row.status === 'success');
  const stats = summarize(successfulRows.map((row) => row.end_to_end_processing_time_ms));
  const initialStats = summarize(successfulRows.map((row) => row.initial_response_time_ms));
  const queueStats = summarize(successfulRows.map((row) => row.queue_time_ms));
  const inferenceStats = summarize(successfulRows.map((row) => row.inference_time_ms));
  const persistenceStats = summarize(successfulRows.map((row) => row.persistence_time_ms));
  const metadata = environmentMetadata({
    apiBaseUrl: config.apiBaseUrl,
    pythonServiceUrl: config.pythonServiceUrl,
    fixtureDir: config.fixtureDir,
  });

  const table = markdownTable(
    ['Metric', 'n', 'Mean ms', 'Median ms', 'Min ms', 'Max ms', 'SD ms', 'p90 ms', 'p95 ms'],
    [
      ['Initial response', initialStats.n, formatMs(initialStats.mean), formatMs(initialStats.median), formatMs(initialStats.min), formatMs(initialStats.max), formatMs(initialStats.standard_deviation), formatMs(initialStats.p90), formatMs(initialStats.p95)],
      ['Queue time', queueStats.n, formatMs(queueStats.mean), formatMs(queueStats.median), formatMs(queueStats.min), formatMs(queueStats.max), formatMs(queueStats.standard_deviation), formatMs(queueStats.p90), formatMs(queueStats.p95)],
      ['Inference/conversion', inferenceStats.n, formatMs(inferenceStats.mean), formatMs(inferenceStats.median), formatMs(inferenceStats.min), formatMs(inferenceStats.max), formatMs(inferenceStats.standard_deviation), formatMs(inferenceStats.p90), formatMs(inferenceStats.p95)],
      ['Persistence', persistenceStats.n, formatMs(persistenceStats.mean), formatMs(persistenceStats.median), formatMs(persistenceStats.min), formatMs(persistenceStats.max), formatMs(persistenceStats.standard_deviation), formatMs(persistenceStats.p90), formatMs(persistenceStats.p95)],
      ['End-to-end', stats.n, formatMs(stats.mean), formatMs(stats.median), formatMs(stats.min), formatMs(stats.max), formatMs(stats.standard_deviation), formatMs(stats.p90), formatMs(stats.p95)],
    ],
  );

  const failed = rows.length - successfulRows.length;
  const coldStartNote = successfulRows.length >= 2
    ? `First successful end-to-end run: ${successfulRows[0].end_to_end_processing_time_ms} ms; median of later successful runs: ${formatMs(summarize(successfulRows.slice(1).map((row) => row.end_to_end_processing_time_ms)).median)} ms.`
    : 'Cold-start behavior cannot be assessed with fewer than two successful runs.';

  const content = `# ${title}

## Metadata
- Generated at: ${metadata.generated_at}
- Environment: ${metadata.platform}, Node ${metadata.node}
- API base URL: ${metadata.apiBaseUrl}
- Python service URL: ${metadata.pythonServiceUrl}
- Synthetic fixture directory: \`${path.relative(root, config.fixtureDir)}\`
- Requested runs: ${rows.length}
- Successful runs: ${successfulRows.length}
- Failed runs: ${failed}

## Summary Statistics
${table}

## Interpretation
The benchmark uses synthetic dental-like PNG images and the existing asynchronous X-Core upload/conversion flow. It does not use real patient data and does not evaluate clinical diagnostic accuracy. Initial response time represents the backend upload response. Queue, inference/conversion, and persistence timings are derived from benchmark event logs emitted by the backend and Python service when \`X-Benchmark-Run-Id\` headers are present.

## Cold-Start Notes
${coldStartNote}

## Limitations
- If queue/inference/persistence values are blank, the current services did not expose the corresponding benchmark event for that run.
- Results are local-environment performance evidence and should be reported with hardware/service assumptions.
`;
  fs.writeFileSync(outPath, content);
}

function writeNotRun(kind, config, reason) {
  const common = {
    status: 'not_run',
    reason,
    metadata: environmentMetadata({
      apiBaseUrl: config.apiBaseUrl,
      pythonServiceUrl: config.pythonServiceUrl,
    }),
  };
  if (kind === 'latency') {
    const dir = path.join(evidenceRoot, 'cdss_latency');
    ensureDir(dir);
    writeCsv(path.join(dir, 'cdss_latency_results.csv'), [], latencyColumns);
    fs.writeFileSync(path.join(dir, 'cdss_latency_summary.md'), `# CDSS Asynchronous Latency Benchmark

Status: not run

Reason: ${reason}

Command: \`node paper-evidence/scripts/xcore-cdss-benchmark.cjs latency --runs 30\`

${markdownTable(['Metric', 'n', 'Mean ms', 'Median ms', 'Min ms', 'Max ms', 'SD ms', 'p90 ms', 'p95 ms'], [
  ['Initial response', 0, 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A'],
  ['Queue time', 0, 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A'],
  ['Inference/conversion', 0, 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A'],
  ['Persistence', 0, 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A'],
  ['End-to-end', 0, 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A'],
])}

Interpretation: no latency values were produced because the required backend and Python CDSS services were unavailable. This file is a traceable placeholder and must not be used as performance evidence.
`);
    writeJson(path.join(dir, 'cdss_latency_not_run.json'), common);
  }
  if (kind === 'concurrent') {
    const dir = path.join(evidenceRoot, 'cdss_concurrent');
    ensureDir(dir);
    writeCsv(path.join(dir, 'cdss_concurrent_results.csv'), [], concurrentColumns);
    fs.writeFileSync(path.join(dir, 'cdss_concurrent_summary.md'), `# CDSS Concurrent Upload Benchmark

Status: not run

Reason: ${reason}

Command: \`node paper-evidence/scripts/xcore-cdss-benchmark.cjs concurrent --concurrency 2,5,10\`

${markdownTable(['Concurrent uploads', 'Total', 'Success', 'Error rate', 'Avg initial ms', 'Avg queue ms', 'Avg inference ms', 'Avg end-to-end ms', 'p95 end-to-end ms'], [
  [2, 0, 0, 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A'],
  [5, 0, 0, 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A'],
  [10, 0, 0, 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A'],
])}

Queue saturation notes: no queue saturation can be inferred because no upload requests were executed.
`);
    writeJson(path.join(dir, 'cdss_concurrent_not_run.json'), common);
  }
}

async function assertRunnableOrWriteNotRun(kind, config) {
  const checks = await healthCheck(config);
  const backendOk = checks.backend?.ok === true;
  const pythonOk = checks.python?.service === 'x-core-streamer' || checks.python?.ok === true || checks.python?.status === 'ok';
  if (backendOk && pythonOk) return;
  const reason = `Required services unavailable. Health checks: ${JSON.stringify(checks)}`;
  if (config.writeNotRun) {
    writeNotRun(kind, config, reason);
    console.log(`[paper-evidence] ${reason}`);
    return false;
  }
  throw new Error(reason);
}

async function runLatency(config) {
  const runnable = await assertRunnableOrWriteNotRun('latency', config);
  if (runnable === false) return;
  const authHeader = await login(config);
  const files = fixtureFiles(config);
  const rows = [];
  const batchRunId = `paper_cdss_latency_${Date.now()}`;
  for (let i = 0; i < config.runs; i += 1) {
    const runId = `${batchRunId}_${String(i + 1).padStart(3, '0')}`;
    rows.push(await runSingleUpload({
      config,
      authHeader,
      imageFile: files[i % files.length],
      runId,
      caseId: 'synthetic-opg',
      iteration: i + 1,
    }));
  }
  const dir = path.join(evidenceRoot, 'cdss_latency');
  ensureDir(dir);
  writeCsv(path.join(dir, 'cdss_latency_results.csv'), rows, latencyColumns);
  writeLatencySummary(rows, config, path.join(dir, 'cdss_latency_summary.md'));
}

async function runConcurrent(config) {
  const runnable = await assertRunnableOrWriteNotRun('concurrent', config);
  if (runnable === false) return;
  const authHeader = await login(config);
  const files = fixtureFiles({ ...config, runs: Math.max(...config.concurrencyScenarios) });
  const allRows = [];
  for (const concurrency of config.concurrencyScenarios) {
    const scenarioId = `paper_cdss_concurrent_${concurrency}_${Date.now()}`;
    const rows = await Promise.all(Array.from({ length: concurrency }, (_, index) => runSingleUpload({
      config,
      authHeader,
      imageFile: files[index % files.length],
      runId: `${scenarioId}_${String(index + 1).padStart(2, '0')}`,
      caseId: `synthetic-opg-c${concurrency}`,
      iteration: index + 1,
      scenarioConcurrency: concurrency,
      uploadIndex: index + 1,
    })));
    allRows.push(...rows);
  }
  const dir = path.join(evidenceRoot, 'cdss_concurrent');
  ensureDir(dir);
  writeCsv(path.join(dir, 'cdss_concurrent_results.csv'), allRows, concurrentColumns);

  const scenarioRows = config.concurrencyScenarios.map((concurrency) => {
    const rows = allRows.filter((row) => Number(row.scenario_concurrency) === concurrency);
    const success = rows.filter((row) => row.status === 'success');
    const endStats = summarize(success.map((row) => row.end_to_end_processing_time_ms));
    const initStats = summarize(success.map((row) => row.initial_response_time_ms));
    const queueStats = summarize(success.map((row) => row.queue_time_ms));
    const inferenceStats = summarize(success.map((row) => row.inference_time_ms));
    const errorRate = rows.length ? ((rows.length - success.length) / rows.length) * 100 : 0;
    return [
      concurrency,
      rows.length,
      success.length,
      `${errorRate.toFixed(2)}%`,
      formatMs(initStats.mean),
      formatMs(queueStats.mean),
      formatMs(inferenceStats.mean),
      formatMs(endStats.mean),
      formatMs(endStats.p95),
    ];
  });
  const summary = `# CDSS Concurrent Upload Benchmark

## Metadata
- Generated at: ${nowIso()}
- API base URL: ${config.apiBaseUrl}
- Python service URL: ${config.pythonServiceUrl}
- Synthetic fixture directory: \`${path.relative(root, config.fixtureDir)}\`

## Results
${markdownTable(['Concurrent uploads', 'Total', 'Success', 'Error rate', 'Avg initial ms', 'Avg queue ms', 'Avg inference ms', 'Avg end-to-end ms', 'p95 end-to-end ms'], scenarioRows)}

## Queue Saturation Notes
Queue saturation should be inferred from increasing queue/end-to-end times and failed uploads. Blank queue fields indicate missing benchmark timestamp events, not zero queueing.
`;
  fs.writeFileSync(path.join(dir, 'cdss_concurrent_summary.md'), summary);
}

function runBaseline(config) {
  const latencyPath = path.join(evidenceRoot, 'cdss_latency', 'cdss_latency_results.csv');
  const rows = readCsv(latencyPath).filter((row) => row.status === 'success');
  const dir = path.join(evidenceRoot, 'cdss_baseline');
  ensureDir(dir);
  if (!rows.length) {
    fs.writeFileSync(path.join(dir, 'sync_baseline_not_possible.md'), `# Synchronous CDSS Baseline Not Possible

No successful asynchronous latency rows were available at \`${path.relative(root, latencyPath)}\`.

This repository currently exposes the X-Core upload/conversion flow asynchronously: the backend returns after upload/metadata persistence and triggers Python conversion in the background. A direct synchronous production route is not exposed. To avoid changing application behavior, this benchmark only computes a simulated synchronous baseline after asynchronous measurements exist.
`);
    return;
  }
  const baselineRows = rows.map((row) => {
    const initial = Number(row.initial_response_time_ms);
    const queue = Number(row.queue_time_ms || 0);
    const inference = Number(row.inference_time_ms || 0);
    const persistence = Number(row.persistence_time_ms || 0);
    const estimatedSync = Number.isFinite(initial + queue + inference + persistence)
      ? initial + queue + inference + persistence
      : Number(row.end_to_end_processing_time_ms);
    return {
      run_id: row.run_id,
      image_file: row.image_file,
      async_initial_response_time_ms: row.initial_response_time_ms,
      direct_inference_time_ms: row.inference_time_ms,
      estimated_synchronous_user_facing_latency_ms: estimatedSync.toFixed(2),
      async_end_to_end_processing_time_ms: row.end_to_end_processing_time_ms,
      timestamp: nowIso(),
    };
  });
  writeCsv(path.join(dir, 'sync_vs_async_results.csv'), baselineRows, [
    'run_id',
    'image_file',
    'async_initial_response_time_ms',
    'direct_inference_time_ms',
    'estimated_synchronous_user_facing_latency_ms',
    'async_end_to_end_processing_time_ms',
    'timestamp',
  ]);
  const asyncStats = summarize(baselineRows.map((row) => row.async_initial_response_time_ms));
  const syncStats = summarize(baselineRows.map((row) => row.estimated_synchronous_user_facing_latency_ms));
  fs.writeFileSync(path.join(dir, 'sync_vs_async_summary.md'), `# Synchronous vs Asynchronous CDSS Baseline

This is a benchmark-only simulated baseline derived from successful asynchronous measurements. No production route behavior was changed.

${markdownTable(['Metric', 'n', 'Mean ms', 'Median ms', 'p95 ms'], [
  ['Async initial response', asyncStats.n, formatMs(asyncStats.mean), formatMs(asyncStats.median), formatMs(asyncStats.p95)],
  ['Estimated synchronous user-facing latency', syncStats.n, formatMs(syncStats.mean), formatMs(syncStats.median), formatMs(syncStats.p95)],
])}

Interpretation: the asynchronous flow limits user-facing upload response time to backend ingest/metadata persistence, while conversion continues in the background. The synchronous estimate approximates the latency users would experience if queueing, inference/conversion, and persistence blocked the upload response.
`);
}

async function main() {
  const config = getConfig(parseArgs(process.argv.slice(2)));
  if (config.mode === 'latency') {
    await runLatency(config);
  } else if (config.mode === 'concurrent') {
    await runConcurrent(config);
  } else if (config.mode === 'baseline') {
    runBaseline(config);
  } else if (config.mode === 'fixtures') {
    const files = generateFixtures({ outDir: config.fixtureDir, count: Math.max(config.runs, 30) });
    console.log(JSON.stringify({ fixtureDir: config.fixtureDir, count: files.length }, null, 2));
  } else {
    throw new Error(`Unknown mode: ${config.mode}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
