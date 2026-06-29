import test from 'node:test';
import assert from 'node:assert/strict';
import { extractInventoryCollection } from '../src/pages/clinic-portal/inventory/inventoryData.mjs';

test('inventory extractor merges equipment and sterilization records from the real API shape', () => {
  const collection = extractInventoryCollection({
    status: 'fulfilled',
    value: {
      data: {
        equipment: [{ id: 'eq-1', name: 'Autoclave' }],
        sterilizationRecords: [{ id: 'st-1', batchNumber: 'B-001' }]
      }
    }
  }, ['equipment', 'items']);

  assert.deepEqual(collection, [
    { id: 'eq-1', name: 'Autoclave' },
    { id: 'st-1', batchNumber: 'B-001', recordType: 'sterilization' }
  ]);
});

test('inventory extractor treats failed services as an empty section instead of crashing', () => {
  const collection = extractInventoryCollection({ status: 'rejected', reason: new Error('404') }, ['items']);
  assert.deepEqual(collection, []);
});
