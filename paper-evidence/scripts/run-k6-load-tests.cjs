const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const {
  ensureDir,
  environmentMetadata,
  formatMs,
  markdownTable,
  repoRootFromScript,
  writeJson,
} = require('./experiment-utils.cjs');

const root = repoRootFromScript();
const outputDir = path.join(root, 'paper-evidence', 'load_tests');
const scriptPath = path.join(outputDir, 'core_api_high_vu.k6.js');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item.startsWith('--')) {
      const key = item.slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      args[key] = value;
    }
  }
  return args;
}

function configFromEnv(args) {
  return {
    apiUrl: (args.apiUrl || process.env.API_URL || process.env.BASE_URL || 'http://localhost:4000/v1').replace(/\/$/, ''),
    duration: args.duration || process.env.DURATION || '5m',
    vus: String(args.vus || process.env.LOAD_VUS || '100,200')
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value) && value > 0),
    writeNotRun: Boolean(args.writeNotRun || process.env.WRITE_NOT_RUN === 'true'),
  };
}

async function backendHealth(apiUrl) {
  try {
    const response = await fetch(`${apiUrl.replace(/\/v1$/, '')}/health`);
    const body = await response.text();
    return { ok: response.ok, status: response.status, body: body.slice(0, 500) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function metric(summary, name, valueName) {
  const value = summary?.metrics?.[name]?.values?.[valueName];
  return Number.isFinite(value) ? value : null;
}

function count(summary, name) {
  const value = summary?.metrics?.[name]?.values?.count;
  return Number.isFinite(value) ? value : 0;
}

function parseSummary(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeNotRunSummary(vu, config, reason) {
  writeJson(path.join(outputDir, `load_${vu}vu_summary.json`), {
    status: 'not_run',
    scenario: `${vu} VU for ${config.duration}`,
    reason,
    metadata: environmentMetadata({
      apiUrl: config.apiUrl,
      script: path.relative(root, scriptPath),
    }),
  });
}

function normalizeVuFileName(vu) {
  return path.join(outputDir, `load_${vu}vu_summary.json`);
}

function writeMarkdown(config) {
  ensureDir(outputDir);
  const rows = config.vus.map((vu) => {
    const summaryPath = normalizeVuFileName(vu);
    const summary = parseSummary(summaryPath);
    if (!summary || summary.status === 'not_run') {
      return [
        `${vu} VU`,
        summary?.status || 'missing',
        'N/A',
        'N/A',
        'N/A',
        'N/A',
        'N/A',
        'N/A',
        'N/A',
        summary?.reason || 'Summary file not found',
      ];
    }
    if (summary.status === 'failed') {
      return [
        `${vu} VU`,
        'failed',
        'N/A',
        'N/A',
        'N/A',
        'N/A',
        'N/A',
        'N/A',
        'N/A',
        summary.reason || `k6 exit code ${summary.exitCode}`,
      ];
    }

    const avg = metric(summary, 'http_req_duration', 'avg');
    const p90 = metric(summary, 'http_req_duration', 'p(90)');
    const p95 = metric(summary, 'http_req_duration', 'p(95)');
    const p99 = metric(summary, 'http_req_duration', 'p(99)');
    const errorRate = metric(summary, 'http_req_failed', 'rate');
    const throughput = metric(summary, 'http_reqs', 'rate');
    const totalRequests = count(summary, 'http_reqs');
    const failedRequests = Math.round(totalRequests * (errorRate || 0));

    return [
      `${vu} VU`,
      'completed',
      formatMs(avg),
      formatMs(p90),
      formatMs(p95),
      formatMs(p99),
      throughput === null ? 'N/A' : throughput.toFixed(2),
      totalRequests,
      failedRequests,
      errorRate === null ? 'N/A' : `${(errorRate * 100).toFixed(2)}%`,
    ];
  });

  const content = `# Core API Load Test Summary

## Metadata
- Generated at: ${new Date().toISOString()}
- API URL: ${config.apiUrl}
- Duration per scenario: ${config.duration}
- k6 script: \`${path.relative(root, scriptPath)}\`

## Results
${markdownTable(['Scenario', 'Status', 'Avg ms', 'p90 ms', 'p95 ms', 'p99 ms', 'Throughput req/s', 'Total requests', 'Failed requests', 'Error rate / notes'], rows)}

## Bottleneck Notes
Interpret bottlenecks from p95/p99 latency, error rate, and backend logs. If a scenario is marked \`not_run\`, the local backend was unavailable when this report was generated. If a 200 VU scenario fails, keep that failure as machine-limit evidence rather than deleting it.
`;
  fs.writeFileSync(path.join(outputDir, 'load_test_summary.md'), content);
}

async function main() {
  const config = configFromEnv(parseArgs(process.argv.slice(2)));
  ensureDir(outputDir);

  const health = await backendHealth(config.apiUrl);
  if (!health.ok) {
    const reason = `Backend unavailable at ${config.apiUrl.replace(/\/v1$/, '')}/health: ${JSON.stringify(health)}`;
    if (!config.writeNotRun) {
      throw new Error(`${reason}. Set WRITE_NOT_RUN=true to write traceable not_run artifacts.`);
    }
    for (const vu of config.vus) writeNotRunSummary(vu, config, reason);
    writeMarkdown(config);
    console.log(`[paper-evidence] ${reason}`);
    return;
  }

  const k6Check = spawnSync('k6', ['version'], { encoding: 'utf8' });
  if (k6Check.status !== 0) {
    const reason = `k6 is not available in PATH: ${k6Check.stderr || k6Check.stdout}`;
    if (!config.writeNotRun) throw new Error(reason);
    for (const vu of config.vus) writeNotRunSummary(vu, config, reason);
    writeMarkdown(config);
    console.log(`[paper-evidence] ${reason}`);
    return;
  }

  for (const vu of config.vus) {
    const summaryFile = normalizeVuFileName(vu);
    const env = {
      ...process.env,
      API_URL: config.apiUrl,
      VUS: String(vu),
      DURATION: config.duration,
      SUMMARY_FILE: path.relative(root, summaryFile),
    };
    const result = spawnSync('k6', ['run', scriptPath], {
      cwd: root,
      env,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (result.status !== 0) {
      writeJson(summaryFile, {
        status: 'failed',
        scenario: `${vu} VU for ${config.duration}`,
        exitCode: result.status,
        reason: result.stderr.slice(-4000) || result.stdout.slice(-4000),
        metadata: environmentMetadata({
          apiUrl: config.apiUrl,
          script: path.relative(root, scriptPath),
        }),
      });
    }
  }
  writeMarkdown(config);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
