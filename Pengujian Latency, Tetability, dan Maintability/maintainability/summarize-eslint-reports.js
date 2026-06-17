const fs = require('node:fs');
const path = require('node:path');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (current.startsWith('--')) {
      args[current.slice(2)] = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function readReport(filePath) {
  if (!fs.existsSync(filePath)) {
    return {
      files: [],
      missing: true,
    };
  }

  const raw = fs.readFileSync(filePath, 'utf8').trim();
  return {
    files: raw ? JSON.parse(raw) : [],
    missing: false,
  };
}

function summarizeComponent(component, filePath) {
  const report = readReport(filePath);
  const totals = report.files.reduce((acc, file) => {
    acc.fileCount += 1;
    acc.errorCount += file.errorCount || 0;
    acc.warningCount += file.warningCount || 0;
    acc.fixableErrorCount += file.fixableErrorCount || 0;
    acc.fixableWarningCount += file.fixableWarningCount || 0;
    return acc;
  }, {
    fileCount: 0,
    errorCount: 0,
    warningCount: 0,
    fixableErrorCount: 0,
    fixableWarningCount: 0,
  });

  return {
    component,
    reportPath: filePath,
    missing: report.missing,
    ...totals,
  };
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

const args = parseArgs(process.argv.slice(2));
const resultsDir = path.resolve(args['results-dir'] || 'maintainability-results');

const summaries = [
  summarizeComponent('Backend', path.join(resultsDir, 'eslint-backend.json')),
  summarizeComponent('Web application', path.join(resultsDir, 'eslint-web.json')),
  summarizeComponent('Mobile application', path.join(resultsDir, 'eslint-mobile.json')),
];

const output = {
  generatedAt: new Date().toISOString(),
  summaries,
};

writeJson(path.join(resultsDir, 'eslint-summary.json'), output);
console.log(JSON.stringify(output, null, 2));
