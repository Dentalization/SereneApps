#!/usr/bin/env node
/**
 * run-sweep.mjs
 * 
 * Characterizes the real X-Core CDSS pipeline across payload tiers:
 *   N ∈ {25, 50, 100, 200, 401} slices, 5 runs each.
 * 
 * Run order is randomized with a logged seed.
 * 
 * Strict Preflight:
 *   - Unconditional gate check at startup and before EVERY run.
 *   - No bypass flags or environment overrides allowed.
 * 
 * Idle Baseline & Memory Metrics:
 *   - Starts fresh FastAPI process per run.
 *   - Samples RSS every 250 ms for 3 s before upload -> median `idle_rss_mb`.
 *   - Samples RSS every 250 ms during execution -> `peak_rss_mb`.
 *   - Computes `delta_rss_mb = peak_rss_mb - idle_rss_mb`.
 * 
 * Disk Guard & Manifest:
 *   - Checks volume free space with `df -k` (MIN_FREE_GB = 5).
 *   - Appends study entries to `.experiment-scratch/manifest.jsonl`.
 *   - Cleans artifacts via `cleanup.mjs` before each run and after completion.
 * 
 * Secondary runs (N=25 only):
 *   - 5 additional runs with legacy polling (500 ms initial sleep, 500 ms interval).
 * 
 * Abort Rules:
 *   - Swap growth > 500 MB over pre-run value -> ABORT.
 *   - Available memory < 1,000 MB -> ABORT.
 *   - Per-run timeout 180 s -> TIMEOUT and abort whole script.
 * 
 * Outputs:
 *   - docs/experiments/results/cdss-payload/sweep.csv
 *   - docs/experiments/results/cdss-payload/sweep.jsonl
 */

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn, execSync } from 'node:child_process';
import process from 'node:process';
import FormData from 'form-data';
import { runPreflightGate, getSystemState, PREFLIGHT_CONFIG } from './preflight.mjs';
import {
  MIN_FREE_GB,
  getVolumeFreeSpaceGb,
  recordManifestEntry,
  runDiskCleanup,
  cleanupStudyArtifact,
} from './cleanup.mjs';

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');

const CONFIG = {
  apiBaseUrl: process.env.API_BASE_URL || 'http://127.0.0.1:4000/v1',
  pythonServiceUrl: process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:8000',
  dentistEmail: process.env.DENTIST_EMAIL || 'dentist1@test.com',
  dentistPassword: process.env.DENTIST_PASSWORD || 'password',
  tiers: [25, 50, 100, 200, 401],
  runsPerTier: 5,
  legacyRunsTier: 25,
  legacyRunsCount: 5,
  immediatePollIntervalMs: 100,
  legacyInitialSleepMs: 500,
  legacyPollIntervalMs: 500,
  timeoutMs: 180000, // 180 seconds per-run timeout
  abortMaxSwapGrowthMb: 500, // Strict default per prompt
  abortMinAvailableMemMb: 1000, // Strict default per prompt
  resultsDir: path.join(REPO_ROOT, 'docs/experiments/results/cdss-payload'),
  scratchDir: path.join(REPO_ROOT, '.experiment-scratch'),
  pythonVenvPath: path.join(REPO_ROOT, 'backend/python_service/venv/bin/python'),
  backendDir: path.join(REPO_ROOT, 'backend'),
};

// Seeded pseudorandom number generator (Mulberry32)
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(array, rng) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function inspectMemory() {
  return getSystemState();
}

/**
 * Measure total RSS in MB for a root process and its child processes.
 */
function measureProcessTreeRssMb(rootPid) {
  try {
    const pids = [rootPid];
    try {
      const childOut = execSync(`pgrep -P ${rootPid}`, { encoding: 'utf8' }).trim();
      if (childOut) {
        const childPids = childOut.split(/\s+/).map((p) => parseInt(p, 10)).filter(Boolean);
        pids.push(...childPids);
      }
    } catch {}

    let totalRssKb = 0;
    for (const pid of pids) {
      try {
        const out = execSync(`ps -o rss= -p ${pid}`, { encoding: 'utf8' }).trim();
        const kb = parseInt(out, 10);
        if (!isNaN(kb)) totalRssKb += kb;
      } catch {}
    }
    return totalRssKb / 1024;
  } catch {
    return 0;
  }
}

/**
 * Sample idle baseline RSS every 250 ms for 3.0 seconds (12 samples) and return the median.
 */
async function measureIdleBaselineRssMb(rootPid) {
  const samples = [];
  const count = 12; // 12 * 250ms = 3000ms
  for (let i = 0; i < count; i++) {
    samples.push(measureProcessTreeRssMb(rootPid));
    await new Promise((r) => setTimeout(r, 250));
  }
  samples.sort((a, b) => a - b);
  const mid = Math.floor(samples.length / 2);
  const median = samples.length % 2 !== 0 ? samples[mid] : (samples[mid - 1] + samples[mid]) / 2;
  return parseFloat(median.toFixed(1));
}

/**
 * Start active RSS sampling every 250 ms with watchdog callbacks.
 */
function startRssSampler(rootPid, sampleIntervalMs = 250, onSample = null) {
  let peakRssMb = 0;
  let minAvailMemMb = Infinity;
  let running = true;

  const sample = () => {
    if (!running) return;
    try {
      const currentRssMb = measureProcessTreeRssMb(rootPid);
      if (currentRssMb > peakRssMb) peakRssMb = currentRssMb;

      const mem = inspectMemory();
      if (mem.availableMemMb !== null && mem.availableMemMb < minAvailMemMb) {
        minAvailMemMb = mem.availableMemMb;
      }

      if (onSample) {
        onSample({
          rssMb: currentRssMb,
          availableMemMb: mem.availableMemMb,
          swapUsedMb: mem.swapUsedMb,
        });
      }
    } catch {}
  };

  const timer = setInterval(sample, sampleIntervalMs);
  sample();

  return {
    stop: () => {
      running = false;
      clearInterval(timer);
      sample();
      return {
        peakRssMb: parseFloat(peakRssMb.toFixed(1)),
        minAvailMemMb: minAvailMemMb === Infinity ? null : parseFloat(minAvailMemMb.toFixed(1)),
      };
    },
  };
}

let activePythonProcess = null;

async function stopPythonService() {
  if (activePythonProcess) {
    try {
      activePythonProcess.kill('SIGTERM');
    } catch {}
    activePythonProcess = null;
  }

  try {
    const pids = execSync('lsof -ti:8000 -sTCP:LISTEN', { encoding: 'utf8' }).trim();
    if (pids) {
      for (const pid of pids.split(/\s+/)) {
        if (pid) {
          try {
            process.kill(parseInt(pid, 10), 'SIGKILL');
          } catch {}
        }
      }
    }
  } catch {}

  await new Promise((r) => setTimeout(r, 600));
}

async function startPythonService() {
  await stopPythonService();

  activePythonProcess = spawn(
    CONFIG.pythonVenvPath,
    ['-m', 'uvicorn', 'main:app', '--app-dir', 'python_service', '--host', '127.0.0.1', '--port', '8000'],
    {
      cwd: CONFIG.backendDir,
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
      stdio: ['ignore', 'ignore', 'pipe'],
    }
  );

  activePythonProcess.stderr.on('data', (chunk) => {
    const msg = chunk.toString();
    if (msg.includes('ERROR') || msg.includes('Traceback')) {
      console.error(`[Python stderr] ${msg.trim()}`);
    }
  });

  const started = Date.now();
  while (Date.now() - started < 30000) {
    try {
      const resp = await fetch(`${CONFIG.pythonServiceUrl}/health`, { signal: AbortSignal.timeout(1000) });
      if (resp.ok) {
        return activePythonProcess.pid;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Python service failed to become healthy within 30 seconds');
}

async function authenticate() {
  const resp = await fetch(`${CONFIG.apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: CONFIG.dentistEmail, password: CONFIG.dentistPassword }),
  });
  if (!resp.ok) {
    const errBody = await resp.text();
    throw new Error(`Authentication failed: HTTP ${resp.status} - ${errBody}`);
  }
  const data = await resp.json();
  const token = data.data?.accessToken || data.token || data.accessToken;
  if (!token) throw new Error('No access token in auth response');
  return `Bearer ${token}`;
}

function uploadStudy(url, form, headers) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method: 'POST',
        headers: {
          ...form.getHeaders(),
          ...headers,
        },
      },
      (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(body));
            } catch (err) {
              reject(new Error(`Failed to parse upload JSON response: ${err.message}`));
            }
          } else {
            reject(new Error(`Upload failed with HTTP ${res.statusCode}: ${body}`));
          }
        });
      }
    );
    req.on('error', reject);
    form.pipe(req);
  });
}

function readEvents(runId) {
  const logDir = path.join(REPO_ROOT, 'scripts/xcore-benchmark/results/raw');
  const pyPath = path.join(logDir, `python-events-${runId}.jsonl`);
  const readLines = (p) => {
    if (!fs.existsSync(p)) return [];
    return fs
      .readFileSync(p, 'utf8')
      .split('\n')
      .filter((l) => l.trim())
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  };
  return {
    pythonEvents: readLines(pyPath),
  };
}

function appendResults(row) {
  fs.mkdirSync(CONFIG.resultsDir, { recursive: true });
  const csvFile = path.join(CONFIG.resultsDir, 'sweep.csv');
  const jsonlFile = path.join(CONFIG.resultsDir, 'sweep.jsonl');

  const headers = [
    'runId',
    'timestamp',
    'tierN',
    'iteration',
    'pollingMode',
    'status',
    'uploadDurationMs',
    'responseToReadyMs',
    'totalUploadToReadyMs',
    'volumePrepDurationMs',
    'thumbnailDurationMs',
    'uploadSizeBytes',
    'idleRssMb',
    'peakRssMb',
    'deltaRssMb',
    'preSwapUsedMb',
    'postSwapUsedMb',
    'swapGrowthMb',
    'minAvailableMemMb',
    'studyId',
    'folderName',
    'gate_swap_max_mb',
    'gate_avail_min_mb',
    'gate_ac_required',
    'swap_used_before_mb',
    'avail_before_mb',
    'on_ac_power',
    'uvicorn_pid',
    'error',
  ];

  if (!fs.existsSync(csvFile)) {
    fs.writeFileSync(csvFile, headers.join(',') + '\n');
  }

  const csvRow = headers.map((h) => {
    const val = row[h] !== undefined && row[h] !== null ? row[h] : '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  });

  fs.appendFileSync(csvFile, csvRow.join(',') + '\n');
  fs.appendFileSync(jsonlFile, JSON.stringify(row) + '\n');
}

async function executeRun({
  runId,
  tierN,
  iteration,
  pollingMode,
  authHeader,
  plannedRemainingTiers,
}) {
  console.log(`\n========================================================`);
  console.log(`[SWEEP] Run: ${runId}`);
  console.log(`Tier: N=${tierN} slices | Iteration: ${iteration} | Polling: ${pollingMode}`);
  console.log(`========================================================`);

  // Unconditional Preflight Gate Check before EVERY run
  const preflightOk = runPreflightGate(undefined, false);
  if (!preflightOk) {
    console.error(`\n[Preflight Gate] UNCONDITIONAL FAILURE before run ${runId}. Terminating.`);
    throw new Error('Preflight gate failed before run.');
  }

  // Disk Space Guard Check & Cleanup before run
  const cleanupRes = await runDiskCleanup({
    plannedRemainingTiers,
    authHeader,
    apiBaseUrl: CONFIG.apiBaseUrl,
  });
  if (!cleanupRes.ok) {
    throw new Error(`ABORT: Free disk space (${cleanupRes.freeGb?.toFixed(2)} GB) is below minimum threshold ${MIN_FREE_GB} GB.`);
  }

  const phantomDir = path.join(CONFIG.scratchDir, `phantom-N${tierN}`);
  if (!fs.existsSync(phantomDir)) {
    throw new Error(`Phantom dataset not found at ${phantomDir}. Run generate_phantom_series.py first.`);
  }

  const files = fs.readdirSync(phantomDir).filter((f) => f.endsWith('.dcm')).sort();
  if (files.length !== tierN) {
    throw new Error(`Expected ${tierN} DICOM files in ${phantomDir}, found ${files.length}`);
  }

  const fileEntries = files.map((f) => ({
    absolutePath: path.join(phantomDir, f),
    relativePath: f,
    size: fs.statSync(path.join(phantomDir, f)).size,
  }));
  const uploadSizeBytes = fileEntries.reduce((acc, f) => acc + f.size, 0);

  const preMem = inspectMemory();
  console.log(`[Memory Before] Swap Used: ${preMem.swapUsedMb?.toFixed(1)} MB | Available: ${preMem.availableMemMb?.toFixed(1)} MB`);

  // Start fresh Python service
  const pyPid = await startPythonService();
  console.log(`[Runner] Started fresh FastAPI service (PID: ${pyPid})`);

  // Idle baseline measurement (3.0 seconds)
  console.log('[Runner] Measuring idle baseline RSS (250 ms interval for 3.0 s)...');
  const idleRssMb = await measureIdleBaselineRssMb(pyPid);
  console.log(`[Runner] Measured idle baseline RSS: ${idleRssMb} MB`);

  let abortReason = null;
  let isTimeout = false;

  const rssSampler = startRssSampler(pyPid, 250, (sample) => {
    if (sample.availableMemMb !== null && sample.availableMemMb < CONFIG.abortMinAvailableMemMb) {
      abortReason = `Available memory fell below ${CONFIG.abortMinAvailableMemMb} MB (${sample.availableMemMb.toFixed(1)} MB)`;
    }
    if (preMem.swapUsedMb !== null && sample.swapUsedMb !== null) {
      const growth = sample.swapUsedMb - preMem.swapUsedMb;
      if (growth > CONFIG.abortMaxSwapGrowthMb) {
        abortReason = `Swap usage grew by > ${CONFIG.abortMaxSwapGrowthMb} MB (+${growth.toFixed(1)} MB)`;
      }
    }
  });

  const row = {
    runId,
    timestamp: new Date().toISOString(),
    tierN,
    iteration,
    pollingMode,
    status: 'failed',
    uploadDurationMs: null,
    responseToReadyMs: null,
    totalUploadToReadyMs: null,
    volumePrepDurationMs: null,
    thumbnailDurationMs: 'NOT SEPARABLE',
    uploadSizeBytes,
    idleRssMb,
    peakRssMb: null,
    deltaRssMb: null,
    preSwapUsedMb: preMem.swapUsedMb !== null ? parseFloat(preMem.swapUsedMb.toFixed(1)) : null,
    postSwapUsedMb: null,
    swapGrowthMb: null,
    minAvailableMemMb: null,
    studyId: null,
    folderName: null,
    gate_swap_max_mb: PREFLIGHT_CONFIG.MAX_SWAP_USED_MB,
    gate_avail_min_mb: PREFLIGHT_CONFIG.MIN_AVAILABLE_MEM_MB,
    gate_ac_required: PREFLIGHT_CONFIG.REQUIRE_AC_POWER,
    swap_used_before_mb: preMem.swapUsedMb !== null ? parseFloat(preMem.swapUsedMb.toFixed(1)) : null,
    avail_before_mb: preMem.availableMemMb !== null ? parseFloat(preMem.availableMemMb.toFixed(1)) : null,
    on_ac_power: preMem.isAcPower,
    uvicorn_pid: pyPid,
    error: null,
  };

  let studyId = null;
  let folderName = null;

  try {
    if (abortReason) throw new Error(`ABORT: ${abortReason}`);

    const form = new FormData();
    form.append('originalFolderName', `cdss-payload-${runId}`);
    for (const f of fileEntries) {
      form.append('files', fs.createReadStream(f.absolutePath), {
        filename: f.relativePath,
        filepath: f.relativePath,
      });
    }

    const startTotalTime = performance.now();

    // 1. Upload
    console.log(`[Upload] Uploading ${files.length} slices (${(uploadSizeBytes / (1024 * 1024)).toFixed(1)} MB)...`);
    const uploadStart = performance.now();
    const uploadResp = await uploadStudy(`${CONFIG.apiBaseUrl}/x-core/upload`, form, {
      Authorization: authHeader,
      'X-Benchmark-Run-Id': runId,
      'X-Benchmark-Case-Id': `N${tierN}`,
      'X-Benchmark-Iteration': String(iteration),
    });
    row.uploadDurationMs = parseFloat((performance.now() - uploadStart).toFixed(2));
    studyId = uploadResp.id;
    folderName = uploadResp.folderName;
    row.studyId = studyId;
    row.folderName = folderName;
    console.log(`[Upload] Completed in ${row.uploadDurationMs} ms. Study ID: ${studyId}, Folder: ${folderName}`);

    // Record study folder in manifest
    const studyUploadPath = path.join(REPO_ROOT, 'backend/uploads/x-core', folderName);
    recordManifestEntry({
      type: 'study',
      studyId,
      folderName,
      path: studyUploadPath,
      runId,
      tierN,
    });

    if (abortReason) throw new Error(`ABORT: ${abortReason}`);

    // 2. Poll Status
    console.log(`[Poll] Polling /status/${folderName} using '${pollingMode}' mode...`);
    const pollStart = performance.now();
    let isReady = false;
    const pollTimeoutAt = Date.now() + CONFIG.timeoutMs;

    if (pollingMode === 'legacy') {
      await new Promise((r) => setTimeout(r, CONFIG.legacyInitialSleepMs));
    }

    while (!isReady && Date.now() < pollTimeoutAt) {
      if (abortReason) throw new Error(`ABORT: ${abortReason}`);

      try {
        const sResp = await fetch(`${CONFIG.pythonServiceUrl}/status/${folderName}`);
        if (sResp.ok) {
          const sData = await sResp.json();
          if (sData.status === 'ready') {
            isReady = true;
            break;
          } else if (sData.status === 'failed' || sData.status === 'error') {
            throw new Error(`Pipeline reported conversion error: ${JSON.stringify(sData)}`);
          }
        }
      } catch (err) {
        if (err.message.includes('Pipeline reported conversion error')) throw err;
      }

      const interval = pollingMode === 'legacy' ? CONFIG.legacyPollIntervalMs : CONFIG.immediatePollIntervalMs;
      await new Promise((r) => setTimeout(r, interval));
    }

    row.responseToReadyMs = parseFloat((performance.now() - pollStart).toFixed(2));
    row.totalUploadToReadyMs = parseFloat((performance.now() - startTotalTime).toFixed(2));

    if (!isReady) {
      isTimeout = true;
      throw new Error(`Per-run timeout (${CONFIG.timeoutMs / 1000}s) exceeded.`);
    }

    row.status = 'ready';
    console.log(`[Ready] Upload-to-Ready: ${row.totalUploadToReadyMs} ms (Poll duration: ${row.responseToReadyMs} ms)`);

    // 3. Inspect Python Events
    const { pythonEvents } = readEvents(runId);
    const volStart = pythonEvents.find((e) => e.eventType === 'volume_preparation_start');
    const volEnd = pythonEvents.find((e) => e.eventType === 'volume_preparation_end');
    if (volStart && volEnd) {
      row.volumePrepDurationMs = new Date(volEnd.timestamp).getTime() - new Date(volStart.timestamp).getTime();
      console.log(`[Timing] Python volume preparation: ${row.volumePrepDurationMs} ms`);
    }

    const thumbEvent = pythonEvents.find((e) => e.eventType === 'thumbnail_generation_completed');
    if (thumbEvent && thumbEvent.details?.duration_ms) {
      row.thumbnailDurationMs = thumbEvent.details.duration_ms;
    } else {
      row.thumbnailDurationMs = 'NOT SEPARABLE';
    }
  } catch (err) {
    console.error(`[Error] Run failed: ${err.message}`);
    if (isTimeout) {
      row.status = 'TIMEOUT';
    } else if (abortReason) {
      row.status = 'ABORTED';
    } else {
      row.status = 'failed';
    }
    row.error = err.message;
  } finally {
    const stats = rssSampler.stop();
    await stopPythonService();

    const postMem = inspectMemory();
    row.peakRssMb = stats.peakRssMb;
    row.deltaRssMb = parseFloat(Math.max(0, row.peakRssMb - row.idleRssMb).toFixed(1));
    row.minAvailableMemMb = stats.minAvailMemMb;
    row.postSwapUsedMb = postMem.swapUsedMb !== null ? parseFloat(postMem.swapUsedMb.toFixed(1)) : null;

    if (row.preSwapUsedMb !== null && row.postSwapUsedMb !== null) {
      row.swapGrowthMb = parseFloat((row.postSwapUsedMb - row.preSwapUsedMb).toFixed(1));
    }

    console.log(`[Metrics] Idle RSS: ${row.idleRssMb} MB | Peak RSS: ${row.peakRssMb} MB | Delta RSS: ${row.deltaRssMb} MB`);
    console.log(`[Metrics] Swap Growth: ${row.swapGrowthMb} MB | Min Avail Mem: ${row.minAvailableMemMb} MB`);

    // Plausibility checks on completed runs (Fix 2)
    if (row.status === 'ready') {
      const plausibilityErrors = [];
      const minIdleMb = parseInt(process.env.IDLE_RSS_MIN_MB || '80', 10);
      if (row.idleRssMb < minIdleMb || row.idleRssMb > 2000) {
        plausibilityErrors.push(`idle_rss_mb out of [${minIdleMb}, 2000]: ${row.idleRssMb}`);
      }
      if (row.deltaRssMb < 0) {
        plausibilityErrors.push(`delta_rss_mb < 0: ${row.deltaRssMb}`);
      }
      const timingSumDiff = Math.abs(row.uploadDurationMs + row.responseToReadyMs - row.totalUploadToReadyMs);
      if (timingSumDiff > 50) {
        plausibilityErrors.push(`abs(upload_ms + resp_to_ready_ms - total_ms) > 50: diff=${timingSumDiff.toFixed(2)}ms`);
      }
      if (row.volumePrepDurationMs !== null && row.volumePrepDurationMs > row.totalUploadToReadyMs) {
        plausibilityErrors.push(`python_volume_prep_ms (${row.volumePrepDurationMs}) > total_upload_to_ready_ms (${row.totalUploadToReadyMs})`);
      }
      if (row.peakRssMb < row.idleRssMb) {
        plausibilityErrors.push(`peak_rss_mb (${row.peakRssMb}) < idle_rss_mb (${row.idleRssMb})`);
      }

      if (plausibilityErrors.length > 0) {
        row.status = 'SUSPECT';
        row.error = `Plausibility checks failed: ${plausibilityErrors.join('; ')}`;
        console.error(`\n🚨 [SUSPECT ROW DETECTED]: ${row.error}`);
        console.error(JSON.stringify(row, null, 2));
      }
    }

    appendResults(row);

    // Clean up study artifact
    if (studyId || folderName) {
      await cleanupStudyArtifact(studyId, folderName, authHeader, CONFIG.apiBaseUrl);
    }
  }

  if (row.status === 'ABORTED' || row.status === 'TIMEOUT' || row.status === 'SUSPECT') {
    throw new Error(`FATAL: Execution halted on ${row.status}: ${row.error}`);
  }

  return row;
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log('================================================================');
  console.log(`X-Core Payload-Tier Scaling Sweep (run-sweep.mjs)`);
  console.log(`Mode: ${isDryRun ? 'DRY-RUN' : 'FULL EXECUTION'}`);
  console.log('================================================================');

  // Dry-Run Planning Printout (C2)
  if (isDryRun) {
    console.log('\n[Dry-Run Plan]');
    console.log(`- Configured Tiers: ${CONFIG.tiers.join(', ')} slices`);
    console.log(`- Runs per Tier: ${CONFIG.runsPerTier} (Immediate polling at 100 ms)`);
    console.log(`- Secondary Legacy Runs: ${CONFIG.legacyRunsCount} for Tier N=${CONFIG.legacyRunsTier} (500 ms sleep + 500 ms poll)`);
    console.log(`- Total Runs: ${CONFIG.tiers.length * CONFIG.runsPerTier + CONFIG.legacyRunsCount}`);
    console.log(`- Disk Guard Threshold: MIN_FREE_GB = ${MIN_FREE_GB} GB`);
    console.log(`- Current Free Disk Space: ${getVolumeFreeSpaceGb(REPO_ROOT)?.toFixed(2)} GB`);
    console.log(`- Gate Thresholds: Max Swap = 500 MB, Min Available Memory = 3000 MB, AC Power Required`);
    console.log(`- Abort Thresholds: Swap Growth > 500 MB, Available Memory < 1000 MB, Timeout = 180 s`);
    console.log(`- Deletion Allowlist: Only manifest study folders in backend/uploads/x-core/ and unneeded .experiment-scratch/phantom-N*/`);
    console.log('\n[Dry-Run Completed]: Zero state modified.');
    return;
  }

  // Unconditional Preflight Gate Check at Startup
  console.log('\nChecking Preflight Gate at startup...');
  const preflightOk = runPreflightGate(undefined, true);
  if (!preflightOk) {
    console.error('\nFATAL: Preflight gate failed. Per experimental protocol, execution is stopped.');
    process.exit(1);
  }

  // Initial Disk Guard Check
  const diskOk = await runDiskCleanup({ plannedRemainingTiers: CONFIG.tiers });
  if (!diskOk.ok) {
    console.error(`\nFATAL: Free disk space (${diskOk.freeGb?.toFixed(2)} GB) is below minimum threshold ${MIN_FREE_GB} GB.`);
    process.exit(1);
  }

  // Authenticate
  const authHeader = await authenticate();
  console.log('[Auth] Authenticated successfully with backend.');

  const runSeed = Date.now();
  console.log(`[Sweep] Randomization Seed: ${runSeed}`);

  const jobPlan = [];
  for (const n of CONFIG.tiers) {
    for (let iter = 1; iter <= CONFIG.runsPerTier; iter++) {
      jobPlan.push({ tierN: n, iteration: iter, pollingMode: 'immediate' });
    }
  }

  const rng = mulberry32(runSeed);
  const shuffledPlan = shuffle(jobPlan, rng);

  const legacyPlan = [];
  for (let iter = 1; iter <= CONFIG.legacyRunsCount; iter++) {
    legacyPlan.push({ tierN: CONFIG.legacyRunsTier, iteration: iter, pollingMode: 'legacy' });
  }

  const allJobs = [...shuffledPlan, ...legacyPlan];
  const totalRuns = allJobs.length;
  console.log(`[Sweep] Total planned runs: ${totalRuns} (${shuffledPlan.length} immediate + ${legacyPlan.length} legacy)`);

  let runCounter = 1;

  for (let i = 0; i < allJobs.length; i++) {
    const job = allJobs[i];
    console.log(`\n>>> Progress: Run ${runCounter}/${totalRuns} <<<`);

    const remainingTiers = [...new Set(allJobs.slice(i).map((j) => j.tierN))];
    const runId = `sweep_N${job.tierN}_iter${job.iteration}_${job.pollingMode === 'legacy' ? 'legacy_' : ''}${Date.now()}`;

    await executeRun({
      runId,
      tierN: job.tierN,
      iteration: job.iteration,
      pollingMode: job.pollingMode,
      authHeader,
      plannedRemainingTiers: remainingTiers,
    });
    runCounter++;
  }

  // Final Cleanup (D5)
  console.log('\n[Sweep Complete] Performing final Level 1 study artifact cleanup...');
  await runDiskCleanup({
    forceLevel1: true,
    authHeader,
    apiBaseUrl: CONFIG.apiBaseUrl,
  });

  console.log('\n================================================================');
  console.log('✓ ALL SWEEP RUNS COMPLETED SUCCESSFULLY!');
  console.log(`Raw results saved to: ${CONFIG.resultsDir}`);
  console.log('================================================================');
}

main().catch((err) => {
  console.error('\n[FATAL SWEEP FAILURE]:', err.message);
  process.exit(1);
});
