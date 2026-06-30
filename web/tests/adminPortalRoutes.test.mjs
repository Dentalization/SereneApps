import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const srcRoot = path.resolve(new URL('../src', import.meta.url).pathname);
const adminRoot = path.join(srcRoot, 'pages/admin-portal');

const read = (relativePath) => fs.readFileSync(path.join(srcRoot, relativePath), 'utf8');

const walkSource = (dir, files = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkSource(fullPath, files);
    } else if (/\.(js|jsx|mjs)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
};

test('admin sidebar paths are registered in Routes.jsx', () => {
  const routesSource = read('Routes.jsx');
  const sidebarSource = read('pages/admin-portal/ui/sidebar-admin.jsx');

  const registeredRoutes = new Set(
    [...routesSource.matchAll(/<Route\s+path="([^"]+)"/g)].map((match) => match[1])
  );

  const sidebarPaths = [
    ...sidebarSource.matchAll(/\bpath:\s*'([^']+)'/g)
  ].map((match) => match[1]).filter((route) => route.startsWith('/admin'));

  const missing = sidebarPaths.filter((route) => {
    if (registeredRoutes.has(route)) return false;
    return ![...registeredRoutes].some((registered) => {
      if (!registered.endsWith('/*')) return false;
      const base = registered.slice(0, -2);
      return route === base || route.startsWith(`${base}/`);
    });
  });

  assert.deepEqual(missing, []);
});

test('admin portal source does not hardcode backend localhost or generated fake metrics', () => {
  const offenders = [];

  for (const file of walkSource(adminRoot)) {
    const source = fs.readFileSync(file, 'utf8');
    if (source.includes('http://localhost:4000') || source.includes('Math.random()')) {
      offenders.push(path.relative(srcRoot, file));
    }
  }

  assert.deepEqual(offenders, []);
});

test('admin dentist pages use centralized authHttp token handling', () => {
  const dentistRoot = path.join(adminRoot, 'dentist-management');
  const offenders = [];

  for (const file of walkSource(dentistRoot)) {
    const source = fs.readFileSync(file, 'utf8');
    const matched = [];
    if (/http:\/\/localhost:4000\/v1/.test(source)) matched.push('hardcoded localhost v1 API');
    if (/localStorage\.getItem\(['"]auth\.accessToken/.test(source)) matched.push('manual auth token read');
    if (/\bfetch\s*\(/.test(source)) matched.push('direct fetch');
    if (matched.length) offenders.push({ file: path.relative(srcRoot, file), matched });
  }

  assert.deepEqual(offenders, []);
});

test('admin sidebar role filtering uses all resolved roles', () => {
  const sidebarSource = read('pages/admin-portal/ui/sidebar-admin.jsx');

  assert.equal(sidebarSource.includes("user?.roles?.[0]"), false);
  assert.match(sidebarSource, /const resolvedRoles = useMemo\(\(\) => normalizeAdminRoles\(user\), \[user\]\)/);
  assert.match(sidebarSource, /hasAdminAccess\(resolvedRoles,\s*itemRoles\)/);
  assert.match(sidebarSource, /filteredMenuItems = menuItems\.filter\(item => hasRoleAccess\(item\.roles\)\)/);
});

test('admin analytics, AI, and support fallback metrics are labelled or empty-state only', () => {
  const analyticsSource = [
    'pages/admin-portal/analytic-report/index.jsx',
    'pages/admin-portal/analytic-report/components/AnalyticsOverview.jsx',
    'pages/admin-portal/analytic-report/components/PerformanceMetrics.jsx',
    'pages/admin-portal/analytic-report/components/FinancialReports.jsx',
  ].map(read).join('\n');
  const aiSource = [
    'pages/admin-portal/ai-platform/index.jsx',
    'pages/admin-portal/ai-platform/components/AIOverviewCards.jsx',
    'pages/admin-portal/ai-platform/components/AIUsageChart.jsx',
    'pages/admin-portal/ai-platform/components/ModelPerformance.jsx',
    'pages/admin-portal/ai-platform/components/RecentActivity.jsx',
  ].map(read).join('\n');
  const supportSource = [
    'pages/admin-portal/support-helpdesk/index.jsx',
    'pages/admin-portal/support-helpdesk/components/SupportOverviewCards.jsx',
    'pages/admin-portal/support-helpdesk/components/TicketVolumeChart.jsx',
    'pages/admin-portal/support-helpdesk/components/RecentTickets.jsx',
    'pages/admin-portal/support-helpdesk/components/TeamPerformance.jsx',
    'pages/admin-portal/support-helpdesk/components/LiveChat.jsx',
    'pages/admin-portal/support-helpdesk/components/KnowledgeBase.jsx',
  ].map(read).join('\n');

  assert.equal(/Dummy|dummy|mock|Live Data Stream|Math\.random/.test(analyticsSource), false);
  assert.equal(/Smile Dental|Healthy Teeth|Bright Smile|Gentle Care|Ortho Plus|TKT-\d+/.test(supportSource), false);
  assert.equal(/Healthy Teeth|Smile Dental|850K|980K|23900/.test(aiSource), false);
  assert.match(analyticsSource, /Analytics source unavailable/);
  assert.match(aiSource, /Demo\/Fallback metrics/);
  assert.match(supportSource, /Demo\/Fallback metrics/);
});

test('admin subroute tab maps include every sidebar-only child route', () => {
  const accessSource = read('pages/admin-portal/ui/adminAccess.js');
  const aiSource = read('pages/admin-portal/ai-platform/index.jsx');
  const systemSource = read('pages/admin-portal/system-administration/index.jsx');

  assert.match(accessSource, /billing:\s*'\/admin\/ai-platform\/billing'/);
  assert.match(aiSource, /case 'billing'/);
  assert.match(aiSource, /handleTabChange\('billing'\)/);

  assert.match(accessSource, /monitoring:\s*'\/admin\/system-administration\/monitoring'/);
  assert.match(systemSource, /activeTab === 'monitoring'/);
  assert.match(systemSource, /handleTabChange\('monitoring'\)/);
});

test('admin revenue billing page does not ship hardcoded finance rows or fake totals', () => {
  const revenueRoot = path.join(adminRoot, 'revenue-billing');
  const forbiddenPatterns = [
    /TRX-\d+/,
    /INV-2024/,
    /Smile Dental/i,
    /Professional Plan/i,
    /Enterprise Plan/i,
    /Basic Plan/i,
    /Rp\s*18\.679/,
    /Dummy/i,
    /mock/i,
  ];

  const offenders = [];
  for (const file of walkSource(revenueRoot)) {
    const source = fs.readFileSync(file, 'utf8');
    const matched = forbiddenPatterns.filter((pattern) => pattern.test(source)).map((pattern) => String(pattern));
    if (matched.length) offenders.push({ file: path.relative(srcRoot, file), matched });
  }

  assert.deepEqual(offenders, []);
});

test('admin dashboard does not present missing API metrics as production zeroes', () => {
  const dashboardSource = read('pages/admin-portal/home/index.jsx');

  assert.equal(/Platform Status:\s*Active/.test(dashboardSource), false);
  assert.equal(/\|\|\s*0/.test(dashboardSource), false);
  assert.match(dashboardSource, /Platform status unavailable/);
  assert.match(dashboardSource, /Failed to load dashboard data/);
  assert.match(dashboardSource, /formatMetric\(metrics\?\.clinics\?\.active\)/);
});

test('admin role contract keeps aliases and restricted dashboard access explicit', () => {
  const accessSource = read('pages/admin-portal/ui/adminAccess.js');

  assert.match(accessSource, /customer_success:\s*'customer_success_manager'/);
  assert.match(accessSource, /dashboard:\s*\[[^\]]*finance_manager[^\]]*\]/);
  assert.doesNotMatch(accessSource, /dashboard:\s*\[[^\]]*technical_support[^\]]*\]/);
  assert.doesNotMatch(accessSource, /dashboard:\s*\[[^\]]*ai_engineer[^\]]*\]/);
});
