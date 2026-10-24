import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn, execSync } from 'node:child_process';
import FormData from 'form-data';

// Configuration
const CONFIG = {
  apiBaseUrl: process.env.API_BASE_URL || 'http://127.0.0.1:4000/v1',
  pythonServiceUrl: process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:8000',
  dentistEmail: process.env.DENTIST_EMAIL || 'dentist1@test.com',
  dentistPassword: process.env.DENTIST_PASSWORD || 'password',
  patientId: process.env.XCORE_BENCHMARK_PATIENT_ID || '1',
  datasetPath: process.env.XCORE_DATASET_DIR || '/Users/adrianhalim/Downloads/Patient - 1295.SL',
  nRuns: parseInt(process.env.N_RUNS || '10', 10),
  pollIntervalMs: 500,
  timeoutMs: 180000,
  resultsDir: '/Users/adrianhalim/SereneApps/docs/experiments/results/cdss-baseline',
  pythonVenvPath: process.env.PYTHON_PATH || '/Users/adrianhalim/SereneApps/backend/python_service/venv/bin/python',
  backendDir: '/Users/adrianhalim/SereneApps/backend',
};

// System Memory and Swap Inspection
export function getSystemMemoryState() {
  const swapOutput = execSync('sysctl vm.swapusage', { encoding: 'utf8' }).trim();
  // vm.swapusage: total = 7168.00M  used = 6443.62M  free = 724.38M  (encrypted)
  const matchUsed = swapOutput.match(/used\s*=\s*([0-9.]+)([MGK]?)/);
  const matchTotal = swapOutput.match(/total\s*=\s*([0-9.]+)([MGK]?)/);
  const matchFree = swapOutput.match(/free\s*=\s*([0-9.]+)([MGK]?)/);

  const parseUnits = (val, unit) => {
    const num = parseFloat(val);
    if (unit === 'G') return num * 1024;
    if (unit === 'M') return num;
    if (unit === 'K') return num / 1024;
    return num / (1024 * 1024);
  };

  const swapUsedMb = matchUsed ? parseUnits(matchUsed[1], matchUsed[2]) : null;
  const swapTotalMb = matchTotal ? parseUnits(matchTotal[1], matchTotal[2]) : null;
  const swapFreeMb = matchFree ? parseUnits(matchFree[1], matchFree[2]) : null;

  const vmStat = execSync('vm_stat', { encoding: 'utf8' });
  const pageSize = 16384;
  const getPages = (key) => {
    const m = vmStat.match(new RegExp(`${key}:\\s+([0-9]+)\\.`));
    return m ? parseInt(m[1], 10) : 0;
  };

  const freePages = getPages('Pages free');
  const inactivePages = getPages('Pages inactive');
  const speculativePages = getPages('Pages speculative');
  const availableMb = ((freePages + inactivePages + speculativePages) * pageSize) / (1024 * 1024);

  return {
    swapUsedMb,
    swapTotalMb,
    swapFreeMb,
    availableMemoryMb: availableMb,
    rawSwap: swapOutput,
  };
}

// Thermal state
export function getThermalState() {
  try {
    return execSync('pmset -g therm', { encoding: 'utf8' }).trim();
  } catch {
    return 'UNKNOWN';
  }
}

// Gather files from dataset directory
export function getFilesRecursive(dir, rootDir = dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    // skip server-generated / converted files
    if (entry.name.startsWith('thumb_') ||
        entry.name.startsWith('volume_') ||
        entry.name.startsWith('image_') ||
        entry.name.endsWith('.vti')) {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getFilesRecursive(fullPath, rootDir));
    } else {
      results.push({
        absolutePath: fullPath,
        relativePath: path.relative(rootDir, fullPath),
        size: fs.statSync(fullPath).size,
      });
    }
  }
  return results;
}

// Manage Python FastAPI process
let pythonProcess = null;

export async function startPythonService() {
  await stopPythonService();

  console.log('[Runner] Starting fresh Python FastAPI service...');
  pythonProcess = spawn(
    CONFIG.pythonVenvPath,
    ['-m', 'uvicorn', 'main:app', '--app-dir', 'python_service', '--host', '127.0.0.1', '--port', '8000'],
    { cwd: CONFIG.backendDir, env: process.env, stdio: ['ignore', 'ignore', 'pipe'] }
  );

  pythonProcess.stderr.on('data', (data) => {
    const msg = data.toString();
    if (msg.includes('ERROR') || msg.includes('Traceback')) {
      console.error(`[Python stderr] ${msg.trim()}`);
    }
  });

  pythonProcess.on('exit', (code, sig) => {
    if (code !== null && code !== 0) {
      console.warn(`[Runner] Python service exited with code ${code}, signal ${sig}`);
    }
  });

  // Wait for /health
  const started = Date.now();
  while (Date.now() - started < 30000) {
    try {
      const resp = await fetch(`${CONFIG.pythonServiceUrl}/health`, { signal: AbortSignal.timeout(1000) });
      if (resp.ok) {
        console.log(`[Runner] Python service is online (PID: ${pythonProcess.pid})`);
        return pythonProcess.pid;
      }
    } catch {
      // wait
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Python service failed to become healthy within 30s');
}

export async function stopPythonService() {
  if (pythonProcess && pythonProcess.exitCode === null) {
    console.log(`[Runner] Stopping Python service (PID: ${pythonProcess.pid})...`);
    pythonProcess.kill('SIGTERM');
    await new Promise((resolve) => {
      const timer = setTimeout(() => {
        try { pythonProcess.kill('SIGKILL'); } catch {}
        resolve();
      }, 3000);
      pythonProcess.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
    });
    pythonProcess = null;
  } else {
    // If an external uvicorn is listening on port 8000, find PID and kill it
    try {
      const lsof = execSync('lsof -ti:8000 -sTCP:LISTEN 2>/dev/null', { encoding: 'utf8' }).trim();
      if (lsof) {
        for (const pid of lsof.split('\n')) {
          const p = pid.trim();
          if (p) {
            console.log(`[Runner] Killing existing listening process on port 8000 (PID: ${p})...`);
            try { execSync(`kill -9 ${p}`); } catch {}
          }
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
    } catch {
      // not running
    }
  }
}

// Sampler for Process RSS
export function startRssSampler(pid, intervalMs = 250) {
  let peakRssKb = 0;
  let running = true;

  const timer = setInterval(() => {
    if (!running) return;
    try {
      // Sample PID and any child processes
      const out = execSync(`ps -o pid=,rss= --ppid ${pid} 2>/dev/null; ps -o pid=,rss= -p ${pid} 2>/dev/null`, { encoding: 'utf8' }).trim();
      if (out) {
        let totalRss = 0;
        for (const line of out.split('\n')) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 2) {
            const rss = parseInt(parts[1], 10);
            if (!isNaN(rss)) totalRss += rss;
          }
        }
        if (totalRss > peakRssKb) peakRssKb = totalRss;
      }
    } catch {
      // process might be exiting
    }
  }, intervalMs);

  return {
    stop: () => {
      running = false;
      clearInterval(timer);
      return peakRssKb / 1024; // Return Peak RSS in MB
    },
    getPeak: () => peakRssKb / 1024,
  };
}

// Authenticate with Node backend
export async function authenticate() {
  const resp = await fetch(`${CONFIG.apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: CONFIG.dentistEmail, password: CONFIG.dentistPassword }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Login failed (${resp.status}): ${text}`);
  }
  const data = await resp.json();
  const token = data.accessToken || data.token || data.data?.accessToken;
  if (!token) throw new Error('No access token in login response');
  return `Bearer ${token}`;
}

// Upload folder using form-data stream
function uploadStudy(urlStr, form, headers) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const transport = http;
    const req = transport.request({
      method: 'POST',
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      headers: {
        ...form.getHeaders(),
        ...headers,
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let body;
        try { body = data ? JSON.parse(data) : {}; } catch { body = { raw: data }; }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body);
        } else {
          const err = new Error(`Upload failed HTTP ${res.statusCode}: ${data}`);
          err.statusCode = res.statusCode;
          err.body = body;
          reject(err);
        }
      });
    });
    req.on('error', reject);
    form.pipe(req);
  });
}

// Read raw event files
function readEvents(runId) {
  const rawDir = '/Users/adrianhalim/SereneApps/scripts/xcore-benchmark/results/raw';
  const pyPath = path.join(rawDir, `python-events-${runId}.jsonl`);
  const bePath = path.join(rawDir, `backend-events-${runId}.jsonl`);

  const readLines = (p) => {
    if (!fs.existsSync(p)) return [];
    return fs.readFileSync(p, 'utf8')
      .split('\n')
      .filter((l) => l.trim())
      .map((l) => {
        try { return JSON.parse(l); } catch { return null; }
      })
      .filter(Boolean);
  };

  return {
    pythonEvents: readLines(pyPath),
    backendEvents: readLines(bePath),
  };
}

// Clean up study artifacts
async function cleanupStudy(authHeader, studyId) {
  if (!studyId) return;
  try {
    const resp = await fetch(`${CONFIG.apiBaseUrl}/x-core/benchmark/studies/${studyId}`, {
      method: 'DELETE',
      headers: { Authorization: authHeader },
    });
    if (!resp.ok) {
      console.warn(`[Cleanup] DELETE study ${studyId} returned ${resp.status}`);
    }
  } catch (e) {
    console.warn(`[Cleanup] Error cleaning study ${studyId}: ${e.message}`);
  }
}

// Main execution
async function main() {
  console.log('================================================================');
  console.log('PROMPT 02: X-Core Real CDSS Baseline Measurement (Part B2 & B3)');
  console.log('================================================================');

  if (!fs.existsSync(CONFIG.datasetPath)) {
    console.error(`FATAL: Dataset not found at ${CONFIG.datasetPath}`);
    process.exit(1);
  }

  fs.mkdirSync(CONFIG.resultsDir, { recursive: true });

  const files = getFilesRecursive(CONFIG.datasetPath);
  const totalBytes = files.reduce((acc, f) => acc + f.size, 0);
  const dcmFiles = files.filter((f) => f.relativePath.endsWith('.dcm'));

  console.log(`[Dataset] Path: ${CONFIG.datasetPath}`);
  console.log(`[Dataset] Total Files: ${files.length}`);
  console.log(`[Dataset] DICOM Slices: ${dcmFiles.length}`);
  console.log(`[Dataset] Total Bytes: ${totalBytes} (${(totalBytes / (1024 * 1024)).toFixed(2)} MB)`);

  const initialMem = getSystemMemoryState();
  console.log(`[Safety] Initial Swap: Used=${initialMem.swapUsedMb.toFixed(2)} MB / Total=${initialMem.swapTotalMb.toFixed(2)} MB`);
  console.log(`[Safety] Initial Available Memory: ${initialMem.availableMemoryMb.toFixed(2)} MB`);

  if (initialMem.availableMemoryMb < 1000) {
    console.error(`FATAL: Available memory is below 1 GB (${initialMem.availableMemoryMb.toFixed(2)} MB). Aborting per safety rule.`);
    process.exit(1);
  }

  const authHeader = await authenticate();
  console.log('[Auth] Authenticated successfully with backend.');

  const results = [];
  const runIdBase = `cdss_real_baseline_${Date.now()}`;
  let swapGrewInB2 = false;

  console.log(`\nStarting N=${CONFIG.nRuns} Sequential Cold-Start Runs (Part B2)...`);

  for (let i = 1; i <= CONFIG.nRuns; i++) {
    console.log(`\n----------------------------------------------------`);
    console.log(`[Run ${i}/${CONFIG.nRuns}] Beginning independent measurement`);
    console.log(`----------------------------------------------------`);

    // Safety check before run
    const preMem = getSystemMemoryState();
    console.log(`[Run ${i}] Pre-run Available Memory: ${preMem.availableMemoryMb.toFixed(2)} MB; Swap Used: ${preMem.swapUsedMb.toFixed(2)} MB`);
    if (preMem.availableMemoryMb < 1000) {
      console.error(`ABORT: Memory fell below 1 GB threshold (${preMem.availableMemoryMb.toFixed(2)} MB). Halting.`);
      break;
    }

    // Restart FastAPI process for clean in-memory state
    const pyPid = await startPythonService();
    const rssSampler = startRssSampler(pyPid, 250);

    const iterationRunId = `${runIdBase}_iter${i}`;
    let uploadDurationMs = null;
    let pollDurationMs = null;
    let totalDurationMs = null;
    let status = 'failed';
    let studyId = null;
    let folderName = null;
    let conversionDurationMs = null;
    let thumbnailDurationMs = null;

    const startRunWall = performance.now();

    try {
      // 1. Prepare form and upload
      const form = new FormData();
      if (CONFIG.patientId && CONFIG.patientId !== 'optional') {
        // Only append if explicitly configured
      }
      form.append('originalFolderName', `cdss-baseline-${iterationRunId}`);
      for (const file of files) {
        form.append('files', fs.createReadStream(file.absolutePath), {
          filename: file.relativePath,
          filepath: file.relativePath,
        });
      }

      console.log(`[Run ${i}] Uploading ${files.length} files to /v1/x-core/upload...`);
      const uploadStart = performance.now();
      const uploadResp = await uploadStudy(`${CONFIG.apiBaseUrl}/x-core/upload`, form, {
        Authorization: authHeader,
        'X-Benchmark-Run-Id': iterationRunId,
        'X-Benchmark-Case-Id': 'B001',
        'X-Benchmark-Iteration': String(i),
      });
      uploadDurationMs = performance.now() - uploadStart;

      studyId = uploadResp.id;
      folderName = uploadResp.folderName;
      console.log(`[Run ${i}] Upload completed in ${uploadDurationMs.toFixed(2)} ms. Study ID: ${studyId}, Folder: ${folderName}`);

      // 2. Poll Python service /status/{folderName} until ready
      console.log(`[Run ${i}] Polling /status/${folderName} until ready...`);
      const pollStart = performance.now();
      let isReady = false;
      const pollTimeoutAt = Date.now() + CONFIG.timeoutMs;

      while (!isReady && Date.now() < pollTimeoutAt) {
        await new Promise((r) => setTimeout(r, CONFIG.pollIntervalMs));
        try {
          const sResp = await fetch(`${CONFIG.pythonServiceUrl}/status/${folderName}`);
          if (sResp.ok) {
            const sData = await sResp.json();
            if (sData.status === 'ready') {
              isReady = true;
            } else if (sData.status === 'failed' || sData.status === 'error') {
              throw new Error(`Python conversion reported failure: ${JSON.stringify(sData)}`);
            }
          }
        } catch (e) {
          if (e.message.includes('Python conversion reported failure')) throw e;
        }
      }

      pollDurationMs = performance.now() - pollStart;
      totalDurationMs = performance.now() - startRunWall;

      if (!isReady) {
        throw new Error(`Conversion timed out after ${CONFIG.timeoutMs / 1000}s`);
      }

      status = 'success';
      console.log(`[Run ${i}] Conversion ready! Time from upload response to ready: ${pollDurationMs.toFixed(2)} ms. Total: ${totalDurationMs.toFixed(2)} ms`);

      // 3. Inspect raw event logs for stage timings
      const { pythonEvents } = readEvents(iterationRunId);
      const volStart = pythonEvents.find((e) => e.eventType === 'volume_preparation_start');
      const volEnd = pythonEvents.find((e) => e.eventType === 'volume_preparation_end');
      if (volStart && volEnd) {
        conversionDurationMs = new Date(volEnd.timestamp).getTime() - new Date(volStart.timestamp).getTime();
        console.log(`[Run ${i}] Volume preparation duration inside Python: ${conversionDurationMs} ms`);
      }

      // Thumbnail generation is called synchronously in /convert before background task
      // Check if separate log exists
      const thumbEvent = pythonEvents.find((e) => e.eventType === 'thumbnail_generation_completed');
      if (thumbEvent && thumbEvent.details?.duration_ms) {
        thumbnailDurationMs = thumbEvent.details.duration_ms;
      } else {
        thumbnailDurationMs = 'NOT SEPARABLE';
      }
    } catch (err) {
      console.error(`[Run ${i}] Error during run:`, err.message);
      status = 'failed';
    }

    const peakRssMb = rssSampler.stop();
    await stopPythonService();

    const postMem = getSystemMemoryState();
    const swapGrowthMb = postMem.swapUsedMb - preMem.swapUsedMb;
    console.log(`[Run ${i}] Peak RSS: ${peakRssMb.toFixed(2)} MB; Swap growth: ${swapGrowthMb.toFixed(2)} MB (After: ${postMem.swapUsedMb.toFixed(2)} MB)`);

    if (swapGrowthMb > 50) {
      console.warn(`[Run ${i}] Significant swap growth detected (+${swapGrowthMb.toFixed(2)} MB)`);
      swapGrewInB2 = true;
    }

    // Cleanup study artifacts
    if (studyId) {
      console.log(`[Run ${i}] Cleaning up study artifacts...`);
      await cleanupStudy(authHeader, studyId);
    }

    const record = {
      run_number: i,
      run_id: iterationRunId,
      upload_duration_ms: uploadDurationMs !== null ? Number(uploadDurationMs.toFixed(2)) : null,
      response_to_ready_ms: pollDurationMs !== null ? Number(pollDurationMs.toFixed(2)) : null,
      thumbnail_generation_ms: thumbnailDurationMs,
      python_conversion_ms: conversionDurationMs,
      total_upload_to_ready_ms: totalDurationMs !== null ? Number(totalDurationMs.toFixed(2)) : null,
      peak_rss_mb: Number(peakRssMb.toFixed(2)),
      swap_before_mb: Number(preMem.swapUsedMb.toFixed(2)),
      swap_after_mb: Number(postMem.swapUsedMb.toFixed(2)),
      swap_growth_mb: Number(swapGrowthMb.toFixed(2)),
      status,
    };

    results.push(record);

    // Append to JSONL
    fs.appendFileSync(
      path.join(CONFIG.resultsDir, 'sequential-n10.jsonl'),
      JSON.stringify(record) + '\n'
    );
  }

  // Write CSV
  const csvHeaders = [
    'run_number',
    'run_id',
    'upload_duration_ms',
    'response_to_ready_ms',
    'thumbnail_generation_ms',
    'python_conversion_ms',
    'total_upload_to_ready_ms',
    'peak_rss_mb',
    'swap_before_mb',
    'swap_after_mb',
    'swap_growth_mb',
    'status',
  ];
  const csvRows = [csvHeaders.join(',')];
  for (const r of results) {
    csvRows.push(csvHeaders.map((h) => r[h] ?? '').join(','));
  }
  fs.writeFileSync(path.join(CONFIG.resultsDir, 'sequential-n10.csv'), csvRows.join('\n') + '\n');

  console.log('\n====================================================');
  console.log('B2 Measurements Complete! Summary:');
  console.log('====================================================');
  console.table(results);

  // Check safety for B3 Concurrency Probe
  console.log('\nEvaluating criteria for Part B3 Concurrency Probe...');
  const successfulRuns = results.filter((r) => r.status === 'success');
  const meanRss = successfulRuns.length ? successfulRuns.reduce((a, b) => a + b.peak_rss_mb, 0) / successfulRuns.length : 0;
  console.log(`Mean Peak RSS per conversion: ${meanRss.toFixed(2)} MB`);
  console.log(`Swap grew in B2: ${swapGrewInB2}`);

  const postB2Mem = getSystemMemoryState();
  console.log(`Current Available Memory: ${postB2Mem.availableMemoryMb.toFixed(2)} MB`);

  if (swapGrewInB2) {
    console.log('[Part B3] ABORTED: Swap usage grew during B2. Hard Rule 6 prohibits concurrency probe.');
    return;
  }
  if (postB2Mem.availableMemoryMb < 1500) {
    console.log('[Part B3] ABORTED: Available memory headroom is insufficient (< 1.5 GB).');
    return;
  }
  if (meanRss * 2 > postB2Mem.availableMemoryMb) {
    console.log(`[Part B3] ABORTED: Projected RSS for 2 concurrent jobs (${(meanRss * 2).toFixed(0)} MB) exceeds available memory (${postB2Mem.availableMemoryMb.toFixed(0)} MB).`);
    return;
  }

  console.log('[Part B3] Headroom verified. Concurrency probe can be evaluated.');
}

main().catch((err) => {
  console.error('Fatal benchmark runner error:', err);
  process.exit(1);
});
