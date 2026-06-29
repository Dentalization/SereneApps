export const EMPTY_INVENTORY = {
  stock: [],
  purchaseRequests: [],
  receipts: [],
  usage: [],
  equipment: []
};

export const INVENTORY_REQUESTS = [
  { key: 'stock', path: '/clinic/inventory/stock', responseKeys: ['items', 'stock'] },
  { key: 'purchaseRequests', path: '/clinic/inventory/purchase-requests', responseKeys: ['requests', 'purchaseRequests'] },
  { key: 'receipts', path: '/clinic/inventory/receipts', responseKeys: ['receipts', 'items'] },
  { key: 'usage', path: '/clinic/inventory/usage', responseKeys: ['records', 'usage'] },
  { key: 'equipment', path: '/clinic/inventory/equipment', responseKeys: ['equipment', 'items'] }
];

export function extractInventoryCollection(result, responseKeys) {
  if (result.status !== 'fulfilled') return [];
  const payload = result.value?.data;
  if (Array.isArray(payload)) return payload;
  if (responseKeys.includes('equipment')) {
    const equipment = Array.isArray(payload?.equipment) ? payload.equipment : [];
    const sterilization = [
      ...(Array.isArray(payload?.sterilizationRecords) ? payload.sterilizationRecords : []),
      ...(Array.isArray(payload?.sterilization_records) ? payload.sterilization_records : []),
      ...(Array.isArray(payload?.sterilization) ? payload.sterilization : [])
    ].map((record) => ({ ...record, recordType: record.recordType || 'sterilization' }));
    if (equipment.length || sterilization.length) return [...equipment, ...sterilization];
  }
  for (const key of responseKeys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}
