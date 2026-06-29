import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  formatRupiah,
  getPriorityBadgeClass,
  getStatusBadgeClass,
  isSameLocalDay,
  isWithinCurrentMonth,
  isWithinDays
} from '../src/pages/clinic-portal/inventory/inventoryUtils.mjs';

const webRoot = path.resolve(new URL('..', import.meta.url).pathname);
const read = (relativePath) => fs.readFileSync(path.resolve(webRoot, relativePath), 'utf8');

test('inventory utilities format real values and centralize status presentation', () => {
  assert.equal(formatRupiah(500000), 'Rp 500.000');
  assert.equal(formatRupiah(2500000), 'Rp 2.5M');
  assert.match(getStatusBadgeClass('in-progress'), /bg-blue-100/);
  assert.match(getStatusBadgeClass('due_maintenance'), /bg-amber-100/);
  assert.match(getPriorityBadgeClass('high'), /bg-red-100/);

  const now = new Date(2026, 5, 29, 12, 0, 0);
  assert.equal(isSameLocalDay(new Date(2026, 5, 29, 8, 0, 0), now), true);
  assert.equal(isWithinDays(new Date(2026, 5, 30, 12, 0, 0), 30, now), true);
  assert.equal(isWithinCurrentMonth(new Date(2026, 5, 1), now), true);
});

test('inventory page fetches all real collections independently and has one loading guard', () => {
  const source = read('src/pages/clinic-portal/inventory/index.jsx');

  assert.match(source, /Promise\.allSettled/);
  for (const endpoint of [
    '/clinic/inventory/stock',
    '/clinic/inventory/purchase-requests',
    '/clinic/inventory/receipts',
    '/clinic/inventory/usage',
    '/clinic/inventory/equipment'
  ]) {
    assert.match(source, new RegExp(endpoint.replaceAll('/', '\\/')));
  }
  assert.equal((source.match(/if \(loading\)/g) || []).length, 1);
  assert.doesNotMatch(source, /setTimeout\(|Dental Composite A2|Rp 45M|>156</);
});

test('inventory subviews consume props, use shared cards, and expose honest disabled actions', () => {
  const files = [
    'src/pages/clinic-portal/inventory/components/PurchaseRequestsView.jsx',
    'src/pages/clinic-portal/inventory/components/ReceiptsView.jsx',
    'src/pages/clinic-portal/inventory/components/UsageView.jsx',
    'src/pages/clinic-portal/inventory/components/EquipmentView.jsx'
  ];

  for (const file of files) {
    const source = read(file);
    assert.match(source, /data = \[\]/, file);
    assert.match(source, /InventoryStatCard/, file);
    assert.match(source, /DisabledPrimaryAction/, file);
    assert.doesNotMatch(source, /Mock data|getStatusColor|getPriorityColor|show(Add|Receive|Record)Modal/, file);
  }
});

test('stock UX and sterilization progress are data-driven', () => {
  const stock = read('src/pages/clinic-portal/inventory/index.jsx');
  const equipment = read('src/pages/clinic-portal/inventory/components/EquipmentView.jsx');

  assert.match(stock, /quantity \/ \(minimum \* 3\)/);
  assert.match(stock, /Sudah expired/);
  assert.match(stock, /hari lagi/);
  assert.match(equipment, /record\.status === 'in-progress'/);
  assert.match(equipment, /animate-pulse/);
  assert.match(equipment, /style=\{\{ width: `\$\{progress\}%` \}\}/);
});
