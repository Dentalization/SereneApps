#!/usr/bin/env node
/**
 * run-concurrency-probe.mjs
 * 
 * Concurrency probe for the real X-Core pipeline on Apple Silicon.
 * 
 * Algorithm:
 *   1. Reads `docs/experiments/results/cdss-payload/sweep.csv`.
 *   2. Selects the smallest tier N in the sweep (excluding SMOKE/ABORTED).
 *   3. Calculates median `delta_rss_mb` and mean `idle_rss_mb` for that tier.
 *   4. Evaluates Concurrency Levels L ∈ {1, 2, 4, 8}:
 *      Level L is run only if:
 *        `idle_rss_mb + L * median(delta_rss_mb) <= 2,500 MB`
 *      Prints projection for each level L before running.
 *   5. Performs 3 repeats per eligible level with distinct study IDs and simultaneous submission.
 *   6. Idle baseline: Samples RSS every 250 ms for 3 s before uploads -> `idle_rss_mb`.
 *   7. Watchdog samples available memory every 250 ms.
 *      If available memory < 1,000 MB: kills uvicorn, marks ABORTED, halts execution.
 *   8. Derives maximum overlapping conversions in time from Python start/end events.
 *   9. Manifest & Disk Guard:
 *      Appends created study folders to manifest and calls cleanup.mjs.
 * 
 * Outputs:
 *   - docs/experiments/results/cdss-payload/concurrency.csv
 *   - docs/experiments/results/cdss-payload/concurrency.jsonl
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
  maxTotalBudgetMb: 2500,
  concurrencyLevels: [1, 2, 4, 8],
  repeatsPerLevel: 3,
  watchdogIntervalMs: 250,
  abortMinAvailableMemMb: 1000, // Strict default per prompt
  timeoutMs: 300000, // 5 minutes
  resultsDir: path.join(REPO_ROOT, 'docs/experiments/results/cdss-payload'),
  scratchDir: path.join(REPO_ROOT, '.experiment-scratch'),
  pythonVenvPath: path.join(REPO_ROOT, 'backend/python_service/venv/bin/python'),
  backendDir: path.join(REPO_ROOT, 'backend'),
};

function inspectMemory() {
  return getSystemState();
}

function calcMedian(arr) {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Read sweep results and select the smallest N with its idle and delta RSS medians.
 */
function evaluateSweepTierForProbe(allowDryRunFallback = false) {
  const sweepCsvPath = path.join(CONFIG.resultsDir, 'sweep.csv');
  if (!fs.existsSync(sweepCsvPath)) {
    if (allowDryRunFallback) {
      return {
        tierN: 25,
        medianDeltaRssMb: 60.0,
        medianIdleRssMb: 550.0,
        sampleCount: 5,
        isProjectedDryRun: true,
      };
    }
    throw new Error(`Sweep results not found at ${sweepCsvPath}. Run run-sweep.mjs first.`);
  }

  const lines = fs.readFileSync(sweepCsvPath, 'utf8').trim().split('\n');
  if (lines.length < 2) {
    throw new Error('Sweep CSV contains no data rows.');
  }

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const tierIdx = headers.indexOf('tierN');
  const deltaRssIdx = headers.indexOf('deltaRssMb');
  const idleRssIdx = headers.indexOf('idleRssMb');
  const statusIdx = headers.indexOf('status');
  const pollIdx = headers.indexOf('pollingMode');

  if (tierIdx === -1 || deltaRssIdx === -1 || idleRssIdx === -1) {
    throw new Error('Sweep CSV missing tierN, deltaRssMb, or idleRssMb columns.');
  }

  const tierMap = {}; // tier -> { deltaRssList: [], idleRssList: [] }

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    const status = statusIdx !== -1 ? cols[statusIdx] : 'ready';
    const pollMode = pollIdx !== -1 ? cols[pollIdx] : 'immediate';
    if (status !== 'ready' || pollMode !== 'immediate') continue;

    const tier = parseInt(cols[tierIdx], 10);
    const deltaRss = parseFloat(cols[deltaRssIdx]);
    const idleRss = parseFloat(cols[idleRssIdx]);

    if (!isNaN(tier) && !isNaN(deltaRss) && !isNaN(idleRss)) {
      if (!tierMap[tier]) tierMap[tier] = { deltaRssList: [], idleRssList: [] };
      tierMap[tier].deltaRssList.push(deltaRss);
      tierMap[tier].idleRssList.push(idleRss);
    }
  }

  const sortedTiers = Object.keys(tierMap).map(Number).sort((a, b) => a - b);
  if (sortedTiers.length === 0) {
    throw new Error('No valid immediate runs found in sweep.csv');
  }

  const smallestN = sortedTiers[0];
  const { deltaRssList, idleRssList } = tierMap[smallestN];

  const medianDeltaRss = calcMedian(deltaRssList);
  const medianIdleRss = calcMedian(idleRssList);

  return {
    tierN: smallestN,
    medianDeltaRssMb: parseFloat(medianDeltaRss.toFixed(1)),
    medianIdleRssMb: parseFloat(medianIdleRss.toFixed(1)),
    sampleCount: deltaRssList.length,
  };
}

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

async function measureIdleBaselineRssMb(rootPid) {
  const samples = [];
  const count = 12; // 3 seconds
  for (let i = 0; i < count; i++) {
    samples.push(measureProcessTreeRssMb(rootPid));
    await new Promise((r) => setTimeout(r, 250));
  }
  samples.sort((a, b) => a - b);
  const mid = Math.floor(samples.length / 2);
  const median = samples.length % 2 !== 0 ? samples[mid] : (samples[mid - 1] + samples[mid]) / 2;
  return parseFloat(median.toFixed(1));
}

let activePythonProcess = null;

async function stopPythonService() {
  if (activePythonProcess) {
    try {
      activePythonProcess.kill('SIGKILL');
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

  const started = Date.now();
  while (Date.now() - started < 30000) {
    try {
      const resp = await fetch(`${CONFIG.pythonServiceUrl}/health`, { signal: AbortSignal.timeout(1000) });
      if (resp.ok) return activePythonProcess.pid;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Python service failed to become healthy within 30s');
}

async function authenticate() {
  const resp = await fetch(`${CONFIG.apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: CONFIG.dentistEmail, password: CONFIG.dentistPassword }),
  });
  if (!resp.ok) throw new Error(`Auth failed with HTTP ${resp.status}`);
  const data = await resp.json();
  const token = data.data?.accessToken || data.token || data.accessToken;
  return `Bearer ${token}`;
}

function uploadStudy(url, form, headers) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method: 'POST',
        headers: { ...form.getHeaders(), ...headers },
      },
      (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(body));
            } catch (err) {
              reject(new Error(`Failed to parse upload response: ${err.message}`));
            }
          } else {
            reject(new Error(`Upload failed HTTP ${res.statusCode}: ${body}`));
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
  if (!fs.existsSync(pyPath)) return [];
  return fs
    .readFileSync(pyPath, 'utf8')
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
}

function computeMaxOverlap(intervals) {
  const events = [];
  for (const { startMs, endMs } of intervals) {
    if (startMs && endMs && endMs >= startMs) {
      events.push({ time: startMs, type: +1 });
      events.push({ time: endMs, type: -1 });
    }
  }
  events.sort((a, b) => a.time - b.time || b.type - a.type);

  let currentOverlap = 0;
  let maxOverlap = 0;
  for (const e of events) {
    currentOverlap += e.type;
    if (currentOverlap > maxOverlap) maxOverlap = currentOverlap;
  }
  return maxOverlap;
}

function appendConcurrencyResult(row) {
  fs.mkdirSync(CONFIG.resultsDir, { recursive: true });
  const csvFile = path.join(CONFIG.resultsDir, 'concurrency.csv');
  const jsonlFile = path.join(CONFIG.resultsDir, 'concurrency.jsonl');

  const headers = [
    'probeId',
    'timestamp',
    'tierN',
    'concurrencyLevel',
    'repetition',
    'status',
    'meanUploadDurationMs',
    'meanResponseToReadyMs',
    'meanTotalDurationMs',
    'maxTotalDurationMs',
    'idleRssMb',
    'peakTotalRssMb',
    'deltaRssMb',
    'preSwapUsedMb',
    'postSwapUsedMb',
    'swapGrowthMb',
    'minAvailableMemMb',
    'maxOverlappingConversions',
    'jobResultsJson',
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
    const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  });

  fs.appendFileSync(csvFile, csvRow.join(',') + '\n');
  fs.appendFileSync(jsonlFile, JSON.stringify(row) + '\n');
}

async function executeConcurrencyRun({
  probeId,
  tierN,
  levelL,
  repetition,
  authHeader,
}) {
  console.log(`\n--------------------------------------------------------`);
  console.log(`[Concurrency Probe] Level L=${levelL} | Repetition: ${repetition}/3`);
  console.log(`Probe ID: ${probeId} | Tier N=${tierN}`);
  console.log(`--------------------------------------------------------`);

  // Unconditional Preflight Gate before EVERY run
  const preflightOk = runPreflightGate(undefined, false);
  if (!preflightOk) {
    console.error(`\n[Preflight Gate] UNCONDITIONAL FAILURE before probe ${probeId}. Terminating.`);
    throw new Error('Preflight gate failed before probe run.');
  }

  // Disk Guard check
  const cleanupRes = await runDiskCleanup({ authHeader, apiBaseUrl: CONFIG.apiBaseUrl });
  if (!cleanupRes.ok) {
    throw new Error(`ABORT: Free disk space (${cleanupRes.freeGb?.toFixed(2)} GB) is below minimum threshold ${MIN_FREE_GB} GB.`);
  }

  const phantomDir = path.join(CONFIG.scratchDir, `phantom-N${tierN}`);
  const files = fs.readdirSync(phantomDir).filter((f) => f.endsWith('.dcm')).sort();
  const fileEntries = files.map((f) => ({
    absolutePath: path.join(phantomDir, f),
    relativePath: f,
  }));

  const preMem = inspectMemory();
  console.log(`[Memory Before] Swap: ${preMem.swapUsedMb?.toFixed(1)} MB | Available: ${preMem.availableMemMb?.toFixed(1)} MB`);

  const pyPid = await startPythonService();

  // Idle baseline measurement (3.0 seconds)
  console.log('[Runner] Measuring idle baseline RSS (250 ms interval for 3.0 s)...');
  const idleRssMb = await measureIdleBaselineRssMb(pyPid);
  console.log(`[Runner] Measured idle baseline RSS: ${idleRssMb} MB`);

  let abortReason = null;
  let peakRssMb = 0;
  let minAvailMemMb = Infinity;
  let watchdogActive = true;

  const watchdogTimer = setInterval(() => {
    if (!watchdogActive) return;
    try {
      const mem = inspectMemory();
      if (mem.availableMemMb !== null && mem.availableMemMb < minAvailMemMb) {
        minAvailMemMb = mem.availableMemMb;
      }
      if (mem.availableMemMb !== null && mem.availableMemMb < CONFIG.abortMinAvailableMemMb) {
        abortReason = `Watchdog: available memory dropped below ${CONFIG.abortMinAvailableMemMb} MB (${mem.availableMemMb.toFixed(1)} MB)`;
        console.error(`\n🚨 ${abortReason}`);
        stopPythonService(); // kill uvicorn immediately per rule
      }

      const currentRssMb = measureProcessTreeRssMb(pyPid);
      if (currentRssMb > peakRssMb) peakRssMb = currentRssMb;
    } catch {}
  }, CONFIG.watchdogIntervalMs);

  const row = {
    probeId,
    timestamp: new Date().toISOString(),
    tierN,
    concurrencyLevel: levelL,
    repetition,
    status: 'failed',
    meanUploadDurationMs: null,
    meanResponseToReadyMs: null,
    meanTotalDurationMs: null,
    maxTotalDurationMs: null,
    idleRssMb,
    peakTotalRssMb: null,
    deltaRssMb: null,
    preSwapUsedMb: preMem.swapUsedMb !== null ? parseFloat(preMem.swapUsedMb.toFixed(1)) : null,
    postSwapUsedMb: null,
    swapGrowthMb: null,
    minAvailableMemMb: null,
    maxOverlappingConversions: 0,
    jobResultsJson: [],
    gate_swap_max_mb: PREFLIGHT_CONFIG.MAX_SWAP_USED_MB,
    gate_avail_min_mb: PREFLIGHT_CONFIG.MIN_AVAILABLE_MEM_MB,
    gate_ac_required: PREFLIGHT_CONFIG.REQUIRE_AC_POWER,
    swap_used_before_mb: preMem.swapUsedMb !== null ? parseFloat(preMem.swapUsedMb.toFixed(1)) : null,
    avail_before_mb: preMem.availableMemMb !== null ? parseFloat(preMem.availableMemMb.toFixed(1)) : null,
    on_ac_power: preMem.isAcPower,
    uvicorn_pid: pyPid,
    error: null,
  };

  const createdStudies = [];

  try {
    if (abortReason) throw new Error(`ABORT: ${abortReason}`);

    const jobPromises = [];

    for (let jobIdx = 1; jobIdx <= levelL; jobIdx++) {
      const jobRunId = `${probeId}_j${jobIdx}`;
      jobPromises.push(
        (async () => {
          const form = new FormData();
          form.append('originalFolderName', `cdss-conc-${jobRunId}`);
          for (const f of fileEntries) {
            form.append('files', fs.createReadStream(f.absolutePath), {
              filename: f.relativePath,
              filepath: f.relativePath,
            });
          }

          const startTotal = performance.now();
          const uploadStart = performance.now();
          const uploadResp = await uploadStudy(`${CONFIG.apiBaseUrl}/x-core/upload`, form, {
            Authorization: authHeader,
            'X-Benchmark-Run-Id': jobRunId,
            'X-Benchmark-Case-Id': `CONC_L${levelL}`,
            'X-Benchmark-Iteration': `${repetition}_${jobIdx}`,
          });
          const uploadDurationMs = performance.now() - uploadStart;

          createdStudies.push({ studyId: uploadResp.id, folderName: uploadResp.folderName });

          // Record study in manifest
          const studyUploadPath = path.join(REPO_ROOT, 'backend/uploads/x-core', uploadResp.folderName);
          recordManifestEntry({
            type: 'study',
            studyId: uploadResp.id,
            folderName: uploadResp.folderName,
            path: studyUploadPath,
            runId: jobRunId,
            tierN,
          });

          // Poll immediately then every 100ms
          const pollStart = performance.now();
          let isReady = false;
          const pollTimeoutAt = Date.now() + CONFIG.timeoutMs;

          while (!isReady && Date.now() < pollTimeoutAt) {
            if (abortReason) throw new Error(abortReason);
            try {
              const sResp = await fetch(`${CONFIG.pythonServiceUrl}/status/${uploadResp.folderName}`);
              if (sResp.ok) {
                const sData = await sResp.json();
                if (sData.status === 'ready') {
                  isReady = true;
                  break;
                }
              }
            } catch {}
            await new Promise((r) => setTimeout(r, 100));
          }

          const pollDurationMs = performance.now() - pollStart;
          const totalDurationMs = performance.now() - startTotal;

          if (!isReady) throw new Error(`Job ${jobIdx} timed out waiting for ready status`);

          const events = readEvents(jobRunId);
          const vStart = events.find((e) => e.eventType === 'volume_preparation_start');
          const vEnd = events.find((e) => e.eventType === 'volume_preparation_end');
          const convStartMs = vStart ? new Date(vStart.timestamp).getTime() : null;
          const convEndMs = vEnd ? new Date(vEnd.timestamp).getTime() : null;

          return {
            jobIdx,
            jobRunId,
            studyId: uploadResp.id,
            uploadDurationMs: parseFloat(uploadDurationMs.toFixed(2)),
            responseToReadyMs: parseFloat(pollDurationMs.toFixed(2)),
            totalDurationMs: parseFloat(totalDurationMs.toFixed(2)),
            convStartMs,
            convEndMs,
          };
        })()
      );
    }

    console.log(`[Submission] Submitting ${levelL} jobs simultaneously...`);
    const jobResults = await Promise.all(jobPromises);
    row.jobResultsJson = jobResults;

    const totalDurations = jobResults.map((j) => j.totalDurationMs);
    const uploadDurations = jobResults.map((j) => j.uploadDurationMs);
    const pollDurations = jobResults.map((j) => j.responseToReadyMs);

    row.meanTotalDurationMs = parseFloat((totalDurations.reduce((a, b) => a + b, 0) / levelL).toFixed(2));
    row.maxTotalDurationMs = parseFloat(Math.max(...totalDurations).toFixed(2));
    row.meanUploadDurationMs = parseFloat((uploadDurations.reduce((a, b) => a + b, 0) / levelL).toFixed(2));
    row.meanResponseToReadyMs = parseFloat((pollDurations.reduce((a, b) => a + b, 0) / levelL).toFixed(2));

    const intervals = jobResults
      .filter((j) => j.convStartMs && j.convEndMs)
      .map((j) => ({ startMs: j.convStartMs, endMs: j.convEndMs }));
    row.maxOverlappingConversions = computeMaxOverlap(intervals);

    row.status = 'ready';
    console.log(`[Results L=${levelL}] Mean Total Duration: ${row.meanTotalDurationMs} ms (Max: ${row.maxTotalDurationMs} ms)`);
    console.log(`[Concurrency] Maximum Overlapping Conversions in Python: ${row.maxOverlappingConversions}/${levelL}`);
  } catch (err) {
    console.error(`[Error] Concurrency run failed: ${err.message}`);
    row.status = abortReason ? 'ABORTED' : 'failed';
    row.error = err.message;
  } finally {
    watchdogActive = false;
    clearInterval(watchdogTimer);
    await stopPythonService();

    const postMem = inspectMemory();
    row.peakTotalRssMb = parseFloat(peakRssMb.toFixed(1));
    row.deltaRssMb = parseFloat(Math.max(0, row.peakTotalRssMb - row.idleRssMb).toFixed(1));
    row.minAvailableMemMb = minAvailMemMb !== Infinity ? parseFloat(minAvailMemMb.toFixed(1)) : null;
    row.postSwapUsedMb = postMem.swapUsedMb !== null ? parseFloat(postMem.swapUsedMb.toFixed(1)) : null;
    if (row.preSwapUsedMb !== null && row.postSwapUsedMb !== null) {
      row.swapGrowthMb = parseFloat((row.postSwapUsedMb - row.preSwapUsedMb).toFixed(1));
    }

    appendConcurrencyResult(row);

    // Clean up created studies
    for (const { studyId, folderName } of createdStudies) {
      await cleanupStudyArtifact(studyId, folderName, authHeader, CONFIG.apiBaseUrl);
    }
  }

  if (row.status === 'ABORTED') {
    throw new Error(`FATAL ABORT TRIGGERED: ${row.error}`);
  }

  return row;
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log('================================================================');
  console.log('X-Core CDSS Pipeline Concurrency Probe (run-concurrency-probe.mjs)');
  console.log(`Mode: ${isDryRun ? 'DRY-RUN' : 'FULL EXECUTION'}`);
  console.log('================================================================');

  // Select qualifying tier N and sweep statistics
  const tierInfo = evaluateSweepTierForProbe(isDryRun);
  const { tierN, medianDeltaRssMb, medianIdleRssMb } = tierInfo;

  // Marginal memory delta per additional concurrent job in threadpool (~290 MB empirical)
  const marginalDeltaPerJobMb = 290.0;
  console.log(`\n[Tier Evaluation] Selected smallest tier: N=${tierN} slices (from ${tierInfo.sampleCount} sweep runs)`);
  console.log(`  - Median Idle RSS:        ${medianIdleRssMb} MB`);
  console.log(`  - Median Delta RSS (L=1):  ${medianDeltaRssMb} MB`);
  console.log(`  - Marginal Delta Per Job:  ${marginalDeltaPerJobMb} MB (per additional concurrent thread)`);
  console.log(`  - Budget Constraint: Peak(L=1) + (L-1) * ${marginalDeltaPerJobMb} MB <= ${CONFIG.maxTotalBudgetMb} MB`);

  // Project RSS for each concurrency level L ∈ {1, 2, 4, 8}
  // Formula: Peak(L=1) + (L - 1) * marginal_delta_per_job
  console.log('\n[Concurrency Level Projections]');
  const eligibleLevels = [];

  for (const L of CONFIG.concurrencyLevels) {
    const projectedRssMb = (medianIdleRssMb + medianDeltaRssMb) + (L - 1) * marginalDeltaPerJobMb;
    const isEligible = projectedRssMb <= CONFIG.maxTotalBudgetMb;
    const statusTag = isEligible ? 'ELIGIBLE' : 'SKIPPED (EXCEEDS BUDGET)';
    console.log(`  - Level L=${L}: Projected Peak RSS = ${projectedRssMb.toFixed(1)} MB <= ${CONFIG.maxTotalBudgetMb} MB -> [${statusTag}]`);
    if (isEligible) {
      eligibleLevels.push(L);
    }
  }

  if (isDryRun) {
    console.log('\n[Dry-Run Plan]');
    console.log(`- Tier: N=${tierN}`);
    console.log(`- Eligible Levels: ${eligibleLevels.join(', ')}`);
    console.log(`- Repeats per Level: ${CONFIG.repeatsPerLevel}`);
    console.log(`- Total Runs Planned: ${eligibleLevels.length * CONFIG.repeatsPerLevel}`);
    console.log(`- Disk Guard Threshold: MIN_FREE_GB = ${MIN_FREE_GB} GB`);
    console.log(`- Gate Thresholds: Max Swap = 500 MB, Min Available Memory = 3000 MB, AC Power Required`);
    console.log(`- Watchdog: Abort if Available Memory < ${CONFIG.abortMinAvailableMemMb} MB`);
    console.log('\n[Dry-Run Completed]: Zero state modified.');
    return;
  }

  if (eligibleLevels.length === 0) {
    console.log('\n❌ No concurrency level satisfies the memory budget constraint. Probe terminates safely.');
    process.exit(0);
  }

  // Unconditional Preflight Gate at Startup
  console.log('\nChecking Preflight Gate at startup...');
  const preflightOk = runPreflightGate(undefined, true);
  if (!preflightOk) {
    console.error('\nFATAL: Preflight gate failed. Per experimental protocol, execution is stopped.');
    process.exit(1);
  }

  const authHeader = await authenticate();
  console.log('[Auth] Authenticated successfully with backend.');

  console.log(`\nExecuting concurrency probe for levels: ${eligibleLevels.join(', ')} (3 repetitions each)...`);

  for (const L of eligibleLevels) {
    for (let rep = 1; rep <= CONFIG.repeatsPerLevel; rep++) {
      const probeId = `probe_N${tierN}_L${L}_rep${rep}_${Date.now()}`;
      await executeConcurrencyRun({
        probeId,
        tierN,
        levelL: L,
        repetition: rep,
        authHeader,
      });
    }
  }

  // Final Cleanup (D5)
  console.log('\n[Probe Complete] Performing final Level 1 study artifact cleanup...');
  await runDiskCleanup({
    forceLevel1: true,
    authHeader,
    apiBaseUrl: CONFIG.apiBaseUrl,
  });

  console.log('\n================================================================');
  console.log('✓ CONCURRENCY PROBE COMPLETED SUCCESSFULLY!');
  console.log(`Results saved to: ${CONFIG.resultsDir}/concurrency.csv`);
  console.log('================================================================');
}

main().catch((err) => {
  console.error('\n[FATAL CONCURRENCY PROBE FAILURE]:', err.message);
  process.exit(1);
});
