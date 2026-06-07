const assert = require('node:assert/strict');
const test = require('node:test');

const {
  parseNodeTestOutput,
  buildMarkdownTable,
  buildCsv,
} = require('./generate-table-4-7.js');

test('parseNodeTestOutput extracts test counts and all-files coverage', () => {
  const output = [
    'TAP version 13',
    '# tests 12',
    '# pass 10',
    '# fail 2',
    '# skipped 1',
    '# start of coverage report',
    '# all files                |  87.65 |    66.67 |   70.00 |',
    '# end of coverage report',
  ].join('\n');

  const parsed = parseNodeTestOutput(output);

  assert.equal(parsed.total, 12);
  assert.equal(parsed.passed, 10);
  assert.equal(parsed.failed, 2);
  assert.equal(parsed.skipped, 1);
  assert.equal(parsed.coverage.linesPct, 87.65);
});

test('parseNodeTestOutput extracts Jest test counts and coverage', () => {
  const output = [
    'PASS __tests__/mobile-i18n.test.js',
    'PASS __tests__/mobile-validation.test.js',
    'Test Suites: 2 passed, 2 total',
    'Tests:       1 failed, 11 passed, 12 total',
    'Snapshots:   0 total',
    'Time:        2.45 s',
    'All files       |      88 |       50 |      70 |   64.28 |',
  ].join('\n');

  const parsed = parseNodeTestOutput(output);

  assert.equal(parsed.total, 12);
  assert.equal(parsed.passed, 11);
  assert.equal(parsed.failed, 1);
  assert.equal(parsed.coverage.linesPct, 64.28);
  assert.equal(parsed.coverage.source, 'Jest coverage');
});

test('buildMarkdownTable renders pass rate and N/A coverage without invented values', () => {
  const summaries = [
    {
      component: 'Backend - Authentication',
      tool: 'Node.js test runner',
      total: 8,
      passed: 8,
      failed: 0,
      passRate: 100,
      coverage: { linesPct: 45.28 },
    },
    {
      component: 'Aplikasi mobile',
      tool: 'Jest (not configured)',
      total: 0,
      passed: 0,
      failed: 0,
      passRate: null,
      coverage: { linesPct: null },
    },
  ];

  const markdown = buildMarkdownTable(summaries);
  const csv = buildCsv(summaries);

  assert.match(markdown, /\| Backend - Authentication \| Node\.js test runner \| 8 \| 8 \| 0 \| 100\.00% \| 45\.28% \|/);
  assert.match(markdown, /\| Aplikasi mobile \| Jest \(not configured\) \| 0 \| 0 \| 0 \| N\/A \| N\/A \|/);
  assert.match(csv, /"Backend - Authentication","Node.js test runner",8,8,0,100.00%,45.28%/);
});
