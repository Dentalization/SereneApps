#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const RESULT_FILES = [
  'backend-auth-summary.json',
  'backend-appointment-summary.json',
  'backend-consultation-chat-summary.json',
  'backend-cdss-summary.json',
  'web-summary.json',
  'mobile-summary.json',
];

function parseNodeTestOutput(output) {
  const counts = parseTestCounts(output);
  const total = counts.total;
  const passed = counts.passed;
  const failed = counts.failed;
  const skipped = counts.skipped;
  const coverage = parseCoverage(output);

  return {
    total,
    passed,
    failed,
    skipped,
    passRate: total > 0 ? (passed / total) * 100 : null,
    coverage,
  };
}

function parseTestCounts(output) {
  const nodeCounts = {
    total: parseFooterNumber(output, 'tests'),
    passed: parseFooterNumber(output, 'pass'),
    failed: parseFooterNumber(output, 'fail'),
    skipped: parseFooterNumber(output, 'skipped'),
  };

  if (nodeCounts.total > 0 || nodeCounts.passed > 0 || nodeCounts.failed > 0 || nodeCounts.skipped > 0) {
    return nodeCounts;
  }

  return parseJestTestCounts(output) || {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
  };
}

function parseFooterNumber(output, field) {
  const match = output.match(new RegExp(`^# ${field}\\s+(\\d+)\\s*$`, 'm'));
  return match ? Number(match[1]) : 0;
}

function parseJestTestCounts(output) {
  const match = output.match(/^Tests:\s+(.+)$/m);
  if (!match) {
    return null;
  }

  const counts = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
  };

  for (const token of match[1].matchAll(/(\d+)\s+(failed|passed|skipped|pending|todo|total)\b/g)) {
    const value = Number(token[1]);
    const field = token[2];
    if (field === 'passed') counts.passed = value;
    if (field === 'failed') counts.failed = value;
    if (field === 'skipped' || field === 'pending' || field === 'todo') counts.skipped += value;
    if (field === 'total') counts.total = value;
  }

  return counts;
}

function parseCoverage(output) {
  const nodeMatch = output.match(/^# all files\s+\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|/m);
  if (nodeMatch) {
    return {
      linesPct: Number(nodeMatch[1]),
      branchesPct: Number(nodeMatch[2]),
      functionsPct: Number(nodeMatch[3]),
      source: 'node:test --experimental-test-coverage',
    };
  }

  const jestMatch = output.match(/^All files\s+\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|/m);
  if (jestMatch) {
    return {
      statementsPct: Number(jestMatch[1]),
      branchesPct: Number(jestMatch[2]),
      functionsPct: Number(jestMatch[3]),
      linesPct: Number(jestMatch[4]),
      source: 'Jest coverage',
    };
  }

  return {
    linesPct: null,
    branchesPct: null,
    functionsPct: null,
    source: null,
  };
}

function buildMarkdownTable(summaries) {
  const lines = [
    '| Komponen | Tool | Jumlah Test Case | Passed | Failed | Pass Rate | Code Coverage |',
    '|---|---|---:|---:|---:|---:|---:|',
  ];

  for (const summary of summaries) {
    lines.push([
      '|',
      summary.component,
      '|',
      summary.tool,
      '|',
      String(summary.total),
      '|',
      String(summary.passed),
      '|',
      String(summary.failed),
      '|',
      formatPercent(summary.passRate),
      '|',
      formatPercent(summary.coverage && summary.coverage.linesPct),
      '|',
    ].join(' '));
  }

  return lines.join('\n');
}

function buildCsv(summaries) {
  const lines = [
    ['Komponen', 'Tool', 'Jumlah Test Case', 'Passed', 'Failed', 'Pass Rate', 'Code Coverage'].map(csvCell).join(','),
  ];

  for (const summary of summaries) {
    lines.push([
      csvCell(summary.component),
      csvCell(summary.tool),
      summary.total,
      summary.passed,
      summary.failed,
      formatPercent(summary.passRate),
      formatPercent(summary.coverage && summary.coverage.linesPct),
    ].join(','));
  }

  return `${lines.join('\n')}\n`;
}

function csvCell(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function formatPercent(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'N/A';
  }
  return `${value.toFixed(2)}%`;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function parseArgs(argv) {
  const args = {};
  const positional = [];
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === '--') {
      positional.push(...argv.slice(i + 1));
      break;
    }
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        args[key] = true;
        i += 1;
      } else {
        args[key] = next;
        i += 2;
      }
    } else {
      positional.push(arg);
      i += 1;
    }
  }
  args._ = positional;
  return args;
}

function runNodeSummary(args) {
  const command = args._;
  if (!command.length) {
    throw new Error('run-node requires a command after --');
  }

  const cwd = path.resolve(args.cwd || process.cwd());
  const summaryPath = path.resolve(args.summary);
  const coverageDir = path.resolve(args['coverage-dir']);
  const outputPath = path.join(coverageDir, 'coverage.txt');
  const stdoutPath = path.join(coverageDir, 'stdout.tap');
  const stderrPath = path.join(coverageDir, 'stderr.log');
  const v8CoverageDir = path.join(coverageDir, 'v8');
  ensureDir(coverageDir);
  ensureDir(v8CoverageDir);

  const startedAt = new Date().toISOString();
  const result = spawnSync(command[0], command.slice(1), {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      FORCE_COLOR: '0',
      NODE_V8_COVERAGE: v8CoverageDir,
    },
    maxBuffer: 1024 * 1024 * 64,
  });
  const finishedAt = new Date().toISOString();
  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  const combined = `${stdout}${stderr ? `\n${stderr}` : ''}`;
  const parsed = parseNodeTestOutput(combined);

  fs.writeFileSync(stdoutPath, stdout);
  fs.writeFileSync(stderrPath, stderr);
  fs.writeFileSync(outputPath, combined);

  const summary = {
    componentId: args['component-id'],
    component: args.component,
    tool: args.tool,
    status: result.status === 0 && parsed.failed === 0 ? 'passed' : 'failed',
    command,
    cwd,
    startedAt,
    finishedAt,
    exitCode: result.status,
    signal: result.signal,
    total: parsed.total,
    passed: parsed.passed,
    failed: parsed.failed,
    skipped: parsed.skipped,
    passRate: parsed.passRate,
    coverage: {
      ...parsed.coverage,
      evidencePath: outputPath,
      rawV8CoverageDir: v8CoverageDir,
    },
  };

  writeJson(summaryPath, summary);
  return summary;
}

function recordMissingSummary(args) {
  const summaryPath = path.resolve(args.summary);
  const coverageDir = path.resolve(args['coverage-dir']);
  const evidencePath = path.join(coverageDir, 'coverage.txt');
  ensureDir(coverageDir);
  fs.writeFileSync(evidencePath, [
    `Component: ${args.component}`,
    `Tool: ${args.tool}`,
    'Status: not_configured',
    `Reason: ${args.reason || 'Test runner is not configured for this component.'}`,
    '',
  ].join('\n'));

  const summary = {
    componentId: args['component-id'],
    component: args.component,
    tool: args.tool,
    status: 'not_configured',
    command: [],
    cwd: args.cwd ? path.resolve(args.cwd) : null,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    exitCode: null,
    signal: null,
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    passRate: null,
    coverage: {
      linesPct: null,
      branchesPct: null,
      functionsPct: null,
      source: null,
      evidencePath,
      rawV8CoverageDir: null,
    },
    notes: args.reason || 'Test runner is not configured for this component.',
  };

  writeJson(summaryPath, summary);
  return summary;
}

function buildReports(args) {
  const resultsDir = path.resolve(args['results-dir']);
  const reportsDir = path.resolve(args['reports-dir']);
  ensureDir(reportsDir);

  const summaries = RESULT_FILES.map((fileName) => {
    const filePath = path.join(resultsDir, fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing component summary: ${filePath}`);
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  });

  const markdown = [
    '# Tabel 4.7 Hasil Pengujian Testability',
    '',
    buildMarkdownTable(summaries),
    '',
    '## Catatan Evidence',
    '',
    ...summaries.map((summary) => {
      const coverageText = summary.coverage && summary.coverage.evidencePath
        ? summary.coverage.evidencePath
        : 'N/A';
      const note = summary.notes ? ` ${summary.notes}` : '';
      return `- ${summary.component}: status \`${summary.status}\`, evidence coverage: \`${coverageText}\`.${note}`;
    }),
    '',
  ].join('\n');

  const raw = {
    generatedAt: new Date().toISOString(),
    summaries,
  };

  fs.writeFileSync(path.join(reportsDir, 'table-4-7-testability.md'), markdown);
  fs.writeFileSync(path.join(reportsDir, 'table-4-7-testability.csv'), buildCsv(summaries));
  writeJson(path.join(reportsDir, 'testability-raw-summary.json'), raw);

  return raw;
}

function main() {
  const [commandName, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);

  if (commandName === 'run-node') {
    runNodeSummary(args);
    return;
  }

  if (commandName === 'record-missing') {
    recordMissingSummary(args);
    return;
  }

  if (commandName === 'build-report') {
    buildReports(args);
    return;
  }

  throw new Error(`Unknown command: ${commandName || '(empty)'}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

module.exports = {
  parseNodeTestOutput,
  buildMarkdownTable,
  buildCsv,
  buildReports,
};
