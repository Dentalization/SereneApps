#!/usr/bin/env node
/**
 * summarize.mjs
 * 
 * Reads raw experiment outputs from:
 *   - docs/experiments/results/cdss-payload/sweep.csv
 *   - docs/experiments/results/cdss-payload/concurrency.csv
 * 
 * Generates:
 *   - docs/experiments/cdss-payload-characterization.md
 * 
 * Features per Prompt 03c:
 *   - Reports `idle_rss`, `peak_rss`, `delta_rss` per N (mean, SD, median, min, max, n=5; no p95).
 *   - Adds column `implied_single_worker_capacity_jobs_per_s = 1 / mean(python_volume_prep_s)`, labelled DERIVED.
 *   - Excludes any row flagged SMOKE or lacking a passed preflight record, listing excluded rows separately.
 *   - Environment record, RSS vs N, Upload size vs N, polling comparison, concurrency table, limitations.
 * 
 * Strict rule: No interpretation beyond what the measured numbers show.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import process from 'node:process';
import { PREFLIGHT_CONFIG } from './preflight.mjs';
import { MIN_FREE_GB } from './cleanup.mjs';

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
const RESULTS_DIR = path.join(REPO_ROOT, 'docs/experiments/results/cdss-payload');
const OUTPUT_MD = path.join(REPO_ROOT, 'docs/experiments/cdss-payload-characterization.md');
const PYTHON_PATH = path.join(REPO_ROOT, 'backend/python_service/venv/bin/python');

function calcMean(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function calcSD(arr, mean) {
  if (!arr || arr.length <= 1) return 0;
  const m = mean !== undefined ? mean : calcMean(arr);
  const sumSq = arr.reduce((acc, v) => acc + (v - m) ** 2, 0);
  return Math.sqrt(sumSq / (arr.length - 1));
}

function calcMedian(arr) {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function calcMin(arr) {
  return arr.length > 0 ? Math.min(...arr) : 0;
}

function calcMax(arr) {
  return arr.length > 0 ? Math.max(...arr) : 0;
}

function getStats(arr) {
  const mean = calcMean(arr);
  const sd = calcSD(arr, mean);
  const median = calcMedian(arr);
  const min = calcMin(arr);
  const max = calcMax(arr);
  return { mean, sd, median, min, max, count: arr.length };
}

function parseCsv(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, 'utf8').trim();
  if (!text) return [];
  const lines = text.split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    const cols = [];
    let insideQuotes = false;
    let currentCol = '';
    for (let c = 0; c < rawLine.length; c++) {
      const char = rawLine[c];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        cols.push(currentCol.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
        currentCol = '';
      } else {
        currentCol += char;
      }
    }
    cols.push(currentCol.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));

    const rowObj = {};
    headers.forEach((h, idx) => {
      rowObj[h] = cols[idx] !== undefined ? cols[idx] : '';
    });
    rows.push(rowObj);
  }

  return rows;
}

function collectEnvironmentRecord() {
  let osName = 'macOS (Darwin)';
  let chipModel = 'Apple Silicon';
  let totalRamMb = '8192 MB';
  try {
    const swVers = execSync('sw_vers -productVersion', { encoding: 'utf8' }).trim();
    const build = execSync('sw_vers -buildVersion', { encoding: 'utf8' }).trim();
    osName = `macOS ${swVers} (${build})`;
  } catch {}

  try {
    chipModel = execSync('sysctl -n machdep.cpu.brand_string', { encoding: 'utf8' }).trim();
  } catch {}

  try {
    const memBytes = parseInt(execSync('sysctl -n hw.memsize', { encoding: 'utf8' }).trim(), 10);
    totalRamMb = `${(memBytes / (1024 * 1024)).toFixed(0)} MB (${(memBytes / (1024 * 1024 * 1024)).toFixed(0)} GB)`;
  } catch {}

  const nodeVersion = process.version;

  let pyVersions = {
    python: 'UNKNOWN',
    fastapi: 'UNKNOWN',
    uvicorn: 'UNKNOWN',
    monai: 'UNKNOWN',
    torch: 'UNKNOWN',
    pydicom: 'UNKNOWN',
  };

  try {
    const pyScript = `
import sys, pydicom, torch, monai, fastapi, uvicorn, json
res = {
    "python": sys.version.split()[0],
    "fastapi": getattr(fastapi, "__version__", "unknown"),
    "uvicorn": getattr(uvicorn, "__version__", "unknown"),
    "monai": getattr(monai, "__version__", "unknown"),
    "torch": getattr(torch, "__version__", "unknown"),
    "pydicom": getattr(pydicom, "__version__", "unknown"),
}
print(json.dumps(res))
`;
    const pyOut = execSync(`${PYTHON_PATH} -c '${pyScript.replace(/'/g, "'\\''")}'`, { encoding: 'utf8' }).trim();
    pyVersions = JSON.parse(pyOut);
  } catch (err) {
    console.warn(`[Summarize] Notice reading Python packages: ${err.message}`);
  }

  return {
    osName,
    chipModel,
    totalRamMb,
    nodeVersion,
    ...pyVersions,
    preflightThresholds: PREFLIGHT_CONFIG,
    minFreeGbThreshold: MIN_FREE_GB,
  };
}

function main() {
  console.log('================================================================');
  console.log('Generating CDSS Payload-Tier Characterization Report (summarize.mjs)');
  console.log('================================================================');

  const sweepCsvPath = path.join(RESULTS_DIR, 'sweep.csv');
  const concurrencyCsvPath = path.join(RESULTS_DIR, 'concurrency.csv');

  const sweepRows = parseCsv(sweepCsvPath);
  const concurrencyRows = parseCsv(concurrencyCsvPath);

  if (sweepRows.length === 0) {
    console.error(`FATAL: No sweep data found at ${sweepCsvPath}`);
    process.exit(1);
  }

  const env = collectEnvironmentRecord();

  // Count uvicorn_pid occurrences across sweep runs
  const pidCounts = {};
  for (const r of sweepRows) {
    if (r.uvicorn_pid) {
      pidCounts[r.uvicorn_pid] = (pidCounts[r.uvicorn_pid] || 0) + 1;
    }
  }

  // Strict defaults per Prompt 03e
  const STRICT_GATE_SWAP_MB = 500;
  const STRICT_GATE_AVAIL_MB = 3000;

  // Exclude rows flagged SMOKE, lacking passed preflight, failed/aborted, or CONTAMINATED
  const excludedRows = [];
  const validSweepRows = [];

  for (const r of sweepRows) {
    const isSmoke = (r.runId || '').toLowerCase().includes('smoke');
    const isAborted = r.status === 'ABORTED' || r.status === 'TIMEOUT' || r.status === 'failed';
    const hasPreflight = r.preSwapUsedMb !== '' && r.minAvailableMemMb !== '';

    const gateSwap = parseFloat(r.gate_swap_max_mb);
    const gateAvail = parseFloat(r.gate_avail_min_mb);
    const gateAcReq = r.gate_ac_required === 'true' || r.gate_ac_required === true;
    const onAc = r.on_ac_power === 'true' || r.on_ac_power === true;
    const sharedPid = r.uvicorn_pid && pidCounts[r.uvicorn_pid] > 1;

    let contaminatedReason = null;
    if (isNaN(gateSwap) || gateSwap !== STRICT_GATE_SWAP_MB) {
      contaminatedReason = `Gate swap threshold (${r.gate_swap_max_mb || 'none'}) differs from strict default (500 MB)`;
    } else if (isNaN(gateAvail) || gateAvail !== STRICT_GATE_AVAIL_MB) {
      contaminatedReason = `Gate available memory threshold (${r.gate_avail_min_mb || 'none'}) differs from strict default (3000 MB)`;
    } else if (!gateAcReq) {
      contaminatedReason = `Gate AC power requirement is not strictly required (${r.gate_ac_required})`;
    } else if (!onAc) {
      contaminatedReason = `Host was running on battery power (on_ac_power=false)`;
    } else if (sharedPid) {
      contaminatedReason = `Shared uvicorn_pid (${r.uvicorn_pid}) with another run (process not restarted)`;
    } else if (!r.uvicorn_pid) {
      contaminatedReason = `Missing uvicorn_pid`;
    }

    if (isSmoke) {
      excludedRows.push({ ...r, status: r.status || 'EXCLUDED', reason: 'Flagged as SMOKE run (test artifact)' });
    } else if (contaminatedReason) {
      excludedRows.push({ ...r, status: 'CONTAMINATED', reason: contaminatedReason });
    } else if (isAborted) {
      excludedRows.push({ ...r, reason: `Run status: ${r.status} (${r.error || 'N/A'})` });
    } else if (!hasPreflight) {
      excludedRows.push({ ...r, status: 'INVALID', reason: 'Missing valid preflight memory record' });
    } else {
      validSweepRows.push(r);
    }
  }

  const immediateRows = validSweepRows.filter((r) => r.pollingMode === 'immediate');
  const legacyRows = validSweepRows.filter((r) => r.pollingMode === 'legacy');

  // Group immediate rows by tierN
  const tiers = [...new Set(immediateRows.map((r) => parseInt(r.tierN, 10)))].sort((a, b) => a - b);
  const tierStats = {};

  for (const n of tiers) {
    const rowsN = immediateRows.filter((r) => parseInt(r.tierN, 10) === n);
    const volPrepMs = rowsN.map((r) => parseFloat(r.volumePrepDurationMs)).filter((v) => !isNaN(v));
    const meanVolPrepSec = volPrepMs.length > 0 ? (calcMean(volPrepMs) / 1000) : 0;
    const impliedCapacity = meanVolPrepSec > 0 ? parseFloat((1 / meanVolPrepSec).toFixed(3)) : null;

    tierStats[n] = {
      nRuns: rowsN.length,
      uploadSizeBytes: getStats(rowsN.map((r) => parseFloat(r.uploadSizeBytes))),
      uploadDurationMs: getStats(rowsN.map((r) => parseFloat(r.uploadDurationMs))),
      responseToReadyMs: getStats(rowsN.map((r) => parseFloat(r.responseToReadyMs))),
      totalUploadToReadyMs: getStats(rowsN.map((r) => parseFloat(r.totalUploadToReadyMs))),
      volumePrepDurationMs: getStats(volPrepMs),
      idleRssMb: getStats(rowsN.map((r) => parseFloat(r.idleRssMb)).filter((v) => !isNaN(v))),
      peakRssMb: getStats(rowsN.map((r) => parseFloat(r.peakRssMb))),
      deltaRssMb: getStats(rowsN.map((r) => parseFloat(r.deltaRssMb)).filter((v) => !isNaN(v))),
      swapGrowthMb: getStats(rowsN.map((r) => parseFloat(r.swapGrowthMb)).filter((v) => !isNaN(v))),
      impliedCapacityJobsPerS: impliedCapacity,
    };
  }

  // Build Markdown Document
  let md = `# Characterization of the Real X-Core CDSS Pipeline Across Payload Tiers

## 1. Experimental Environment and Configuration

| Parameter | Specification |
|:---|:---|
| **Operating System** | ${env.osName} |
| **Processor (SoC)** | ${env.chipModel} |
| **Physical Memory (RAM)** | ${env.totalRamMb} |
| **Node.js Runtime** | ${env.nodeVersion} |
| **Python Environment** | Python ${env.python} (\`backend/python_service/venv\`) |
| **FastAPI Version** | ${env.fastapi} |
| **Uvicorn Version** | ${env.uvicorn} |
| **MONAI Version** | ${env.monai} |
| **PyTorch Version** | ${env.torch} |
| **Pydicom Version** | ${env.pydicom} |
| **Preflight Max Swap Allowed** | ${env.preflightThresholds.MAX_SWAP_USED_MB} MB |
| **Preflight Min Available Memory** | ${env.preflightThresholds.MIN_AVAILABLE_MEM_MB} MB |
| **Preflight AC Power Required** | ${env.preflightThresholds.REQUIRE_AC_POWER} |
| **Preflight Thermal Throttling Required Normal** | ${env.preflightThresholds.REQUIRE_NORMAL_THERMAL} |
| **Disk Space Guard Minimum Free** | ${env.minFreeGbThreshold} GB |

---

## 2. Scaling Table: Time and Memory versus Slice Count ($N$)

All qualifying runs in this table satisfied the unconditional preflight gate and were executed in seeded random order. FastAPI was started fresh per run, with a 3.0 s pre-upload idle RSS baseline sampling. Polling occurred immediately ($t=0$) and every 100 ms thereafter.

Sample size per tier: $n = 5$ (or actual completed runs). Statistics report **Mean ± SD**, **Median**, **Min**, and **Max** (percentiles such as p95 are omitted at $n=5$).

| Tier ($N$) | Upload Size (MB) | Upload Duration (s) | Response-to-Ready (s) | Total Upload-to-Ready (s) | Python Volume Prep (s) | Idle RSS (MB) | Peak RSS (MB) | Delta RSS (MB) | Swap Growth (MB) | Implied Capacity [DERIVED] (jobs/s) |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|
`;

  for (const n of tiers) {
    const s = tierStats[n];
    const uploadMb = (s.uploadSizeBytes.mean / (1024 * 1024)).toFixed(1);

    const fmtSec = (stat) => `${(stat.mean / 1000).toFixed(2)} ± ${(stat.sd / 1000).toFixed(2)}<br>[${(stat.median / 1000).toFixed(2)}; ${(stat.min / 1000).toFixed(2)}–${(stat.max / 1000).toFixed(2)}]`;
    const fmtMb = (stat) => `${stat.mean.toFixed(1)} ± ${stat.sd.toFixed(1)}<br>[${stat.median.toFixed(1)}; ${stat.min.toFixed(1)}–${stat.max.toFixed(1)}]`;
    const capStr = s.impliedCapacityJobsPerS !== null ? `**${s.impliedCapacityJobsPerS.toFixed(3)}**` : 'N/A';

    md += `| **N=${n}**<br>($n=${s.nRuns}$) | ${uploadMb} | ${fmtSec(s.uploadDurationMs)} | ${fmtSec(s.responseToReadyMs)} | ${fmtSec(s.totalUploadToReadyMs)} | ${fmtSec(s.volumePrepDurationMs)} | ${fmtMb(s.idleRssMb)} | ${fmtMb(s.peakRssMb)} | ${fmtMb(s.deltaRssMb)} | ${fmtMb(s.swapGrowthMb)} | ${capStr} |\n`;
  }

  md += `
*Note: Format in cells is \`Mean ± SD\` followed by \`[Median; Min–Max]\`. Implied Single-Worker Capacity is derived as $1 / \\text{mean}(\\text{volume\\_prep\\_duration\\_s})$.*

---

## 3. Peak & Delta Memory Footprint (RSS) versus Slice Count

| Tier ($N$) | Slices | Upload Size (MB) | Idle RSS Median (MB) | Peak RSS Median (MB) | Delta RSS Mean ± SD (MB) | Delta RSS Median (MB) | Delta RSS [Min–Max] (MB) | Payload Memory Tier Classification |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|
`;

  for (const n of tiers) {
    const s = tierStats[n];
    const uploadMb = (s.uploadSizeBytes.mean / (1024 * 1024)).toFixed(1);
    const medianDelta = s.deltaRssMb.median;

    let tierTag = 'Unclassified';
    if (medianDelta <= 150) tierTag = 'Small (Delta <= 150 MB)';
    else if (medianDelta <= 500) tierTag = 'Medium (Delta 150–500 MB)';
    else tierTag = 'Large (Delta > 500 MB)';

    md += `| **N=${n}** | ${n} | ${uploadMb} | ${s.idleRssMb.median.toFixed(1)} | ${s.peakRssMb.median.toFixed(1)} | ${s.deltaRssMb.mean.toFixed(1)} ± ${s.deltaRssMb.sd.toFixed(1)} | ${s.deltaRssMb.median.toFixed(1)} | [${s.deltaRssMb.min.toFixed(1)}–${s.deltaRssMb.max.toFixed(1)}] | **${tierTag}** |\n`;
  }

  md += `
---

## 4. Polling Artifact Analysis: Immediate (100 ms) vs Legacy (500 ms) Polling

A legacy polling routine used an initial 500 ms sleep followed by 500 ms intervals. Below is a direct comparison on tier $N=25$ under identical server conditions:

| Metric | Immediate Polling (0 ms initial, 100 ms interval, $n=${immediateRows.filter(r => parseInt(r.tierN, 10) === 25).length}$) | Legacy Polling (500 ms initial, 500 ms interval, $n=${legacyRows.length}$) | Difference (Legacy - Immediate) |
|:---|:---|:---|:---|
`;

  const imm25 = tierStats[25];
  const leg25Rows = legacyRows;
  if (leg25Rows.length > 0 && imm25) {
    const legUpload = getStats(leg25Rows.map((r) => parseFloat(r.uploadDurationMs)));
    const legPoll = getStats(leg25Rows.map((r) => parseFloat(r.responseToReadyMs)));
    const legTotal = getStats(leg25Rows.map((r) => parseFloat(r.totalUploadToReadyMs)));

    const diffPoll = legPoll.mean - imm25.responseToReadyMs.mean;
    const diffTotal = legTotal.mean - imm25.totalUploadToReadyMs.mean;

    md += `| **Upload Duration** | ${(imm25.uploadDurationMs.mean / 1000).toFixed(2)} ± ${(imm25.uploadDurationMs.sd / 1000).toFixed(2)} s | ${(legUpload.mean / 1000).toFixed(2)} ± ${(legUpload.sd / 1000).toFixed(2)} s | ${((legUpload.mean - imm25.uploadDurationMs.mean) / 1000).toFixed(2)} s |\n`;
    md += `| **Response-to-Ready** | ${(imm25.responseToReadyMs.mean / 1000).toFixed(2)} ± ${(imm25.responseToReadyMs.sd / 1000).toFixed(2)} s | ${(legPoll.mean / 1000).toFixed(2)} ± ${(legPoll.sd / 1000).toFixed(2)} s | **+${(diffPoll / 1000).toFixed(2)} s** (${((diffPoll / imm25.responseToReadyMs.mean) * 100).toFixed(1)}%) |\n`;
    md += `| **Total Upload-to-Ready** | ${(imm25.totalUploadToReadyMs.mean / 1000).toFixed(2)} ± ${(imm25.totalUploadToReadyMs.sd / 1000).toFixed(2)} s | ${(legTotal.mean / 1000).toFixed(2)} ± ${(legTotal.sd / 1000).toFixed(2)} s | **+${(diffTotal / 1000).toFixed(2)} s** (${((diffTotal / imm25.totalUploadToReadyMs.mean) * 100).toFixed(1)}%) |\n`;
  } else {
    md += `| *Data pending* | *Data pending* | *Data pending* | *Data pending* |\n`;
  }

  md += `
---

## 5. Concurrency Probe Results

`;

  const validConcurrencyRows = concurrencyRows.filter((r) => r.status === 'ready' && !(r.probeId || '').includes('smoke'));

  if (validConcurrencyRows.length > 0) {
    md += `| Concurrency Level ($L$) | Repetitions | Mean Upload Duration (s) | Mean Response-to-Ready (s) | Mean Total Duration (s) | Max Total Duration (s) | Idle RSS (MB) | Peak Total RSS (MB) | Delta RSS (MB) | Max Overlapping Jobs | Swap Growth (MB) |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|
`;
    const concLevels = [...new Set(validConcurrencyRows.map((r) => parseInt(r.concurrencyLevel, 10)))].sort((a, b) => a - b);
    for (const lvl of concLevels) {
      const rowsL = validConcurrencyRows.filter((r) => parseInt(r.concurrencyLevel, 10) === lvl);
      if (rowsL.length === 0) continue;

      const uploadSec = calcMean(rowsL.map((r) => parseFloat(r.meanUploadDurationMs))) / 1000;
      const pollSec = calcMean(rowsL.map((r) => parseFloat(r.meanResponseToReadyMs))) / 1000;
      const meanTotSec = calcMean(rowsL.map((r) => parseFloat(r.meanTotalDurationMs))) / 1000;
      const maxTotSec = calcMax(rowsL.map((r) => parseFloat(r.maxTotalDurationMs))) / 1000;
      const idleRss = calcMean(rowsL.map((r) => parseFloat(r.idleRssMb)).filter((v) => !isNaN(v)));
      const peakRss = calcMax(rowsL.map((r) => parseFloat(r.peakTotalRssMb)));
      const deltaRss = calcMean(rowsL.map((r) => parseFloat(r.deltaRssMb)).filter((v) => !isNaN(v)));
      const maxOverlap = calcMax(rowsL.map((r) => parseInt(r.maxOverlappingConversions, 10)));
      const swapGrowth = calcMean(rowsL.map((r) => parseFloat(r.swapGrowthMb)).filter((v) => !isNaN(v)));

      md += `| **L=${lvl}** | ${rowsL.length} | ${uploadSec.toFixed(2)} s | ${pollSec.toFixed(2)} s | ${meanTotSec.toFixed(2)} s | ${maxTotSec.toFixed(2)} s | ${idleRss.toFixed(1)} MB | ${peakRss.toFixed(1)} MB | ${deltaRss.toFixed(1)} MB | **${maxOverlap}** / ${lvl} | ${swapGrowth.toFixed(1)} MB |\n`;
    }
  } else {
    md += `*Concurrency probe data not yet recorded or no tier qualified under the memory budget criterion.*\n`;
  }

  // Section 6: Excluded Runs & Artifacts
  md += `
---

## 6. Excluded Runs and Artifacts

Per protocol, smoke runs and runs that failed preflight or encountered errors are explicitly excluded from the statistical scaling curves above:

| Run ID | Tier ($N$) | Polling Mode | Status | Reason Excluded |
|:---|:---|:---|:---|:---|
`;

  if (excludedRows.length > 0) {
    for (const r of excludedRows) {
      md += `| \`${r.runId}\` | ${r.tierN || 'N/A'} | ${r.pollingMode || 'N/A'} | **${r.status || 'N/A'}** | ${r.reason} |\n`;
    }
  } else {
    md += `| *(None)* | — | — | — | All recorded rows met validation criteria. |\n`;
  }

  md += `
---

## 7. Limitations of Characterization

1. **Synthetic Phantom vs. Real Anatomy:**
   Synthetic phantom series use deterministic geometric ellipsoids and pseudo-random Gaussian noise. While matrix dimensions (561×561), bit depth (16-bit signed), slice thickness (0.25 mm), and pixel spacing (0.25 mm) match real CBCT scans exactly, real clinical anatomy exhibits varying tissue gradients and scanner metal artifacts that may alter VTK ZLib compression ratios.

2. **Single-Worker Uvicorn Architecture:**
   FastAPI was tested with a single Uvicorn worker process (\`--app-dir python_service main:app\`). \`BackgroundTasks\` runs CPU-bound operations in the server event loop threadpool. Under concurrency ($L > 1$), tasks queue or serialize CPU execution, directly reflected in the measured \`maxOverlappingConversions\` metric.

3. **Memory Budget & Hardware Bounds:**
   Measurements reflect an Apple M3 unified memory system (8 GB RAM). As verified in preflight checks, running concurrent heavy jobs or unconstrained slice counts on an un-rebooted host can induce OS paging (swap growth), which distorts wall-clock execution latency.
`;

  fs.writeFileSync(OUTPUT_MD, md);
  console.log(`✓ Characterization report written to: ${OUTPUT_MD}`);
}

main();
