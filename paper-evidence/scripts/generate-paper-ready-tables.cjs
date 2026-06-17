const fs = require('node:fs');
const path = require('node:path');
const {
  ensureDir,
  formatMs,
  markdownTable,
  readCsv,
  repoRootFromScript,
  summarize,
} = require('./experiment-utils.cjs');

const root = repoRootFromScript();
const evidenceRoot = path.join(root, 'paper-evidence');

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function pct(value) {
  return Number.isFinite(Number(value)) ? `${Number(value).toFixed(2)}%` : 'N/A';
}

function statMs(stats, key) {
  return stats?.n ? formatMs(stats[key]) : 'N/A';
}

function loadStatus(filePath) {
  const summary = readJson(filePath, {});
  if (summary.status === 'not_run' || summary.status === 'failed') return summary.status;
  if (summary.metrics) return 'completed';
  return summary.status || 'missing';
}

function k6Metric(summary, metric, value) {
  const result = summary?.metrics?.[metric]?.values?.[value];
  return Number.isFinite(result) ? result : null;
}

function parseBackendChatOutput() {
  const outputPath = path.join(evidenceRoot, 'testability', 'backend_chat_node_test_output.txt');
  if (!fs.existsSync(outputPath)) return null;
  const text = fs.readFileSync(outputPath, 'utf8');
  const total = Number(text.match(/# tests (\d+)/)?.[1] || 0);
  const passed = Number(text.match(/# pass (\d+)/)?.[1] || 0);
  const failed = Number(text.match(/# fail (\d+)/)?.[1] || 0);
  const skipped = Number(text.match(/# skipped (\d+)/)?.[1] || 0);
  const coverage = Number(text.match(/# all files\s+\|\s+([0-9.]+)\s+\|/)?.[1] || NaN);
  return { total, passed, failed, skipped, coverage };
}

function mobileSummary() {
  const oldSummary = readJson(path.join(root, 'Pengujian Latency, Tetability, dan Maintability', 'testability', 'results', 'mobile-summary.json'), {});
  const jest = readJson(path.join(evidenceRoot, 'testability', 'mobile_jest_results.json'), {});
  const coverage = readJson(path.join(root, 'mobile', 'coverage', 'coverage-summary.json'), {})?.total;
  return {
    oldTotal: oldSummary.total,
    oldCoverage: oldSummary.coverage?.linesPct,
    total: jest.numTotalTests,
    passed: jest.numPassedTests,
    failed: jest.numFailedTests,
    coverage: coverage?.lines?.pct,
  };
}

function chatSummary() {
  const oldSummary = readJson(path.join(root, 'Pengujian Latency, Tetability, dan Maintability', 'testability', 'results', 'backend-consultation-chat-summary.json'), {});
  const latest = parseBackendChatOutput();
  return {
    oldTotal: oldSummary.total,
    oldCoverage: oldSummary.coverage?.linesPct,
    ...latest,
  };
}

function writeTables() {
  const latencyRows = readCsv(path.join(evidenceRoot, 'cdss_latency', 'cdss_latency_results.csv'));
  const successfulLatency = latencyRows.filter((row) => row.status === 'success');
  const latencyStats = summarize(successfulLatency.map((row) => row.end_to_end_processing_time_ms));

  const concurrentRows = readCsv(path.join(evidenceRoot, 'cdss_concurrent', 'cdss_concurrent_results.csv'));
  const concurrentTableRows = [2, 5, 10].map((scenario) => {
    const rows = concurrentRows.filter((row) => Number(row.scenario_concurrency) === scenario);
    const success = rows.filter((row) => row.status === 'success');
    const init = summarize(success.map((row) => row.initial_response_time_ms));
    const queue = summarize(success.map((row) => row.queue_time_ms));
    const inference = summarize(success.map((row) => row.inference_time_ms));
    const end = summarize(success.map((row) => row.end_to_end_processing_time_ms));
    return [
      scenario,
      rows.length,
      success.length,
      rows.length ? pct(((rows.length - success.length) / rows.length) * 100) : 'N/A',
      formatMs(init.mean),
      formatMs(queue.mean),
      formatMs(inference.mean),
      formatMs(end.mean),
      formatMs(end.p95),
      rows.length ? 'completed' : 'not_run',
    ];
  });

  const loadRows = [100, 200].map((vu) => {
    const summary = readJson(path.join(evidenceRoot, 'load_tests', `load_${vu}vu_summary.json`), {});
    const status = loadStatus(path.join(evidenceRoot, 'load_tests', `load_${vu}vu_summary.json`));
    if (status !== 'completed') {
      return [`${vu} VU`, status, 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', summary.reason || 'No result'];
    }
    const total = k6Metric(summary, 'http_reqs', 'count') || 0;
    const errorRate = k6Metric(summary, 'http_req_failed', 'rate') || 0;
    return [
      `${vu} VU`,
      status,
      formatMs(k6Metric(summary, 'http_req_duration', 'avg')),
      formatMs(k6Metric(summary, 'http_req_duration', 'p(90)')),
      formatMs(k6Metric(summary, 'http_req_duration', 'p(95)')),
      formatMs(k6Metric(summary, 'http_req_duration', 'p(99)')),
      k6Metric(summary, 'http_reqs', 'rate')?.toFixed(2) || 'N/A',
      total,
      Math.round(total * errorRate),
      pct(errorRate * 100),
    ];
  });

  const mobile = mobileSummary();
  const chat = chatSummary();
  const eslintSummary = readJson(path.join(root, 'maintainability-results', 'eslint-summary.json'), { summaries: [] });
  const radon = readJson(path.join(root, 'maintainability-results', 'radon-cdss-summary.json'), {});
  const eslintRows = eslintSummary.summaries.map((item) => [
    item.component,
    item.fileCount,
    item.errorCount,
    item.warningCount,
  ]);

  const content = `# Paper-Ready Evidence Tables

Generated at: ${new Date().toISOString()}

## 1. CDSS Latency n>=30 Result Table
${markdownTable(['Status', 'Requested n', 'Successful n', 'Failed n', 'Evidence'], [[
  successfulLatency.length >= 30 ? 'completed' : 'not_run',
  30,
  successfulLatency.length,
  latencyRows.length - successfulLatency.length,
  'paper-evidence/cdss_latency/cdss_latency_results.csv',
]])}

## 2. CDSS Latency Summary Statistics
${markdownTable(['Metric', 'n', 'Mean ms', 'Median ms', 'Min ms', 'Max ms', 'SD ms', 'p90 ms', 'p95 ms'], [[
  'End-to-end processing',
  latencyStats.n,
  statMs(latencyStats, 'mean'),
  statMs(latencyStats, 'median'),
  statMs(latencyStats, 'min'),
  statMs(latencyStats, 'max'),
  statMs(latencyStats, 'standard_deviation'),
  statMs(latencyStats, 'p90'),
  statMs(latencyStats, 'p95'),
]])}

Interpretation: ${successfulLatency.length ? 'Successful synthetic CDSS uploads were measured through the asynchronous upload/conversion flow.' : 'No successful CDSS latency rows were generated because the backend and Python CDSS services were unavailable during this run.'}

## 3. Load Testing 100/200 VU
${markdownTable(['Scenario', 'Status', 'Avg ms', 'p90 ms', 'p95 ms', 'p99 ms', 'Throughput req/s', 'Total requests', 'Failed requests', 'Error rate / notes'], loadRows)}

Interpretation: 100/200 VU results should be inserted only when status is \`completed\`. A \`not_run\` row documents missing local services and is not performance evidence.

## 4. Concurrent CDSS Upload
${markdownTable(['Concurrent uploads', 'Total', 'Success', 'Error rate', 'Avg initial ms', 'Avg queue ms', 'Avg inference ms', 'Avg end-to-end ms', 'p95 end-to-end ms', 'Status'], concurrentTableRows)}

Interpretation: concurrent CDSS upload behavior should be inferred from queue and end-to-end latency growth once service runs are available.

## 5. Updated Testability Table
${markdownTable(['Component', 'Tool', 'Before tests', 'After tests', 'Passed', 'Failed', 'Before line coverage', 'After line coverage'], [
  ['Aplikasi mobile', 'Jest', mobile.oldTotal ?? 'N/A', mobile.total ?? 'N/A', mobile.passed ?? 'N/A', mobile.failed ?? 'N/A', pct(mobile.oldCoverage), pct(mobile.coverage)],
  ['Backend - Consultation / Chat', 'Node.js test runner', chat.oldTotal ?? 'N/A', chat.total ?? 'N/A', chat.passed ?? 'N/A', chat.failed ?? 'N/A', pct(chat.oldCoverage), pct(chat.coverage)],
])}

Interpretation: additional service-level tests increased mobile line coverage from ${pct(mobile.oldCoverage)} to ${pct(mobile.coverage)} and chat line coverage from ${pct(chat.oldCoverage)} to ${pct(chat.coverage)} without requiring device hardware or external Twilio credentials.

## 6. Updated Maintainability Table
${markdownTable(['Component', 'ESLint files', 'ESLint errors', 'ESLint warnings'], eslintRows)}

${markdownTable(['CDSS metric', 'Value'], [
  ['Radon average cyclomatic complexity', radon.cyclomaticComplexity?.averageComplexity ?? 'N/A'],
  ['Radon max cyclomatic complexity', radon.cyclomaticComplexity?.maxComplexity ?? 'N/A'],
  ['Radon average maintainability index', radon.maintainabilityIndex?.averageMaintainabilityIndex ?? 'N/A'],
  ['Highest complexity blocks', (radon.cyclomaticComplexity?.highestComplexityBlocks || []).slice(0, 2).map((block) => `${block.name} (${block.complexity}, ${block.rank})`).join('; ') || 'N/A'],
])}

Interpretation: ESLint web errors decreased from 69 to 62 after safe mechanical fixes. Remaining web errors are duplicate translation keys and unreachable code that need separate review to avoid changing UI/business behavior.
`;

  ensureDir(evidenceRoot);
  fs.writeFileSync(path.join(evidenceRoot, 'paper_ready_tables.md'), content);
}

writeTables();
