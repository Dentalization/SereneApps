const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');

const requiredFiles = [
  'sonar-project.properties',
  '.github/workflows/sonarqube-maintainability.yml',
  'scripts/maintainability/run-eslint-reports.sh',
  'scripts/maintainability/run-radon-reports.sh',
  'maintainability-results/.gitkeep',
  'docs/MAINTAINABILITY_TESTING.md',
  'backend/eslint.config.cjs',
  'web/eslint.config.cjs',
  'mobile/eslint.config.cjs',
];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function containsCommittedSonarToken(content) {
  const directPropertyToken = /sonar\.(?:token|login)\s*=\s*["']?[A-Za-z0-9_-]{20,}["']?/i;
  const directEnvironmentToken = /SONAR_TOKEN\s*[:=]\s*["']?(?!\$\{\{\s*secrets\.SONAR_TOKEN\s*\}\})(?!<)[A-Za-z0-9_-]{20,}["']?/;
  return directPropertyToken.test(content) || directEnvironmentToken.test(content);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

for (const file of requiredFiles) {
  assert(fs.existsSync(path.join(root, file)), `Missing required maintainability file: ${file}`);
}

const sonarProperties = fs.readFileSync(path.join(root, 'sonar-project.properties'), 'utf8');
assert(sonarProperties.includes('sonar.projectKey='), 'sonar-project.properties must define sonar.projectKey');
assert(sonarProperties.includes('sonar.organization='), 'sonar-project.properties must define sonar.organization');
assert(sonarProperties.includes('sonar.host.url=https://sonarcloud.io'), 'sonar-project.properties must define the SonarCloud host URL');
assert(sonarProperties.includes('sonar.sources='), 'sonar-project.properties must define sonar.sources');
assert(sonarProperties.includes('sonar.inclusions='), 'sonar-project.properties must define the thesis core Sonar scope');
assert(sonarProperties.includes('sonar.exclusions='), 'sonar-project.properties must define sonar.exclusions');
assert(!sonarProperties.includes('SERENEAPPS_PROJECT_KEY_REPLACE_ME'), 'sonar.projectKey placeholder must be replaced before final analysis');
assert(!sonarProperties.includes('SERENEAPPS_ORGANIZATION_REPLACE_ME'), 'sonar.organization placeholder must be replaced before final analysis');

const workflow = fs.readFileSync(path.join(root, '.github/workflows/sonarqube-maintainability.yml'), 'utf8');
assert(workflow.includes('SonarSource/sonarqube-scan-action@v7'), 'workflow must use the official SonarSource scan action');
assert(workflow.includes('secrets.SONAR_TOKEN'), 'workflow must read SONAR_TOKEN from GitHub Actions secrets');
assert(workflow.includes('SONAR_HOST_URL: https://sonarcloud.io'), 'workflow must target SonarCloud explicitly');
assert(workflow.includes('SONAR_SCANNER_JAVA_OPTS: -Xmx4096m'), 'workflow must provide enough heap for the Sonar scanner');
assert(workflow.includes('maintainability-results'), 'workflow must upload maintainability-results artifacts');

const rootPackage = readJson('package.json');
assert(rootPackage.scripts?.['maintainability:eslint'], 'root package must define maintainability:eslint');
assert(rootPackage.scripts?.['maintainability:radon'], 'root package must define maintainability:radon');

for (const component of ['backend', 'web', 'mobile']) {
  const pkg = readJson(`${component}/package.json`);
  assert(pkg.scripts?.['lint:report'], `${component}/package.json must define lint:report`);
  assert(pkg.scripts?.['maintainability:eslint'], `${component}/package.json must define maintainability:eslint`);
}

const searchableFiles = [
  ...requiredFiles,
  'package.json',
  'backend/package.json',
  'web/package.json',
  'mobile/package.json',
];

for (const file of searchableFiles) {
  const content = fs.readFileSync(path.join(root, file), 'utf8');
  assert(!containsCommittedSonarToken(content), `Secret-like Sonar token value must not be committed in ${file}`);
}

console.log('Maintainability setup validation passed.');
